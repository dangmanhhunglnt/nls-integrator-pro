import PizZip from 'pizzip';

export interface PPCTLessonSchedule {
  week: number;
  periodDisplay: string;
  periodCount: number;
  hasIntegration: boolean;
  requirement: string;
}

export interface ParsedPPCTResult {
  hasPPCT: boolean;
  lessonTitle: string;
  schedules: PPCTLessonSchedule[];
  allPeriods: string;
  totalPeriods: number;
  isMultiWeek: boolean;
  weeksList: number[];
  integrationType: 'NONE' | 'STEM' | 'NLS_AI' | 'NLS' | 'NAI';
  requirementNote: string;
}

function normalizeSearchText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function parsePPCTDirectFromZip(ppctFile: File, lessonDocText: string, fileName: string = ''): Promise<ParsedPPCTResult> {
  let extractedTitle = '';
  const titleMatch = lessonDocText.match(/(?:TÊN BÀI DẠY:\s*|BÀI\s+\d+[\.:]?\s*)([^\n\r]+)/i);
  if (titleMatch && titleMatch[1]) {
    extractedTitle = titleMatch[1].trim();
  }

  const rawSearchName = extractedTitle || fileName.replace(/\.docx$/i, '');
  const normalizedTarget = normalizeSearchText(rawSearchName);
  
  // Lọc lấy tên cốt lõi của bài học, loại bỏ từ khóa phụ như "bài", "chương"
  let coreLessonName = normalizedTarget
    .replace(/bai\s*[0-9]+/i, '')
    .replace(/chuong\s*[0-9]+/i, '')
    .trim();
  
  if (!coreLessonName) {
    coreLessonName = normalizedTarget;
  }

  const schedules: PPCTLessonSchedule[] = [];

  try {
    const arrayBuffer = await ppctFile.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const docXml = zip.file("word/document.xml")?.asText() || "";

    const rowMatches = docXml.match(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gis) || [];
    let currentWeek = 1;

    for (const rowXml of rowMatches) {
      const cellMatches = rowXml.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gis) || [];
      if (cellMatches.length < 2) continue;

      const cellTexts = cellMatches.map(cXml => {
        const textNodes = cXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gis) || [];
        return textNodes.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
      });

      const rowFullText = normalizeSearchText(cellTexts.join(' '));

      // Bỏ qua dòng tiêu đề bảng
      if (rowFullText.includes('tuan') && (rowFullText.includes('tiet') || rowFullText.includes('ten bai'))) {
        continue;
      }

      // Cập nhật số tuần từ cột đầu tiên
      const firstCellClean = (cellTexts[0] || '').replace(/\D/g, '');
      const potentialWeek = parseInt(firstCellClean, 10);
      if (!isNaN(potentialWeek) && potentialWeek >= 1 && potentialWeek <= 35) {
        currentWeek = potentialWeek;
      }

      let isMatched = false;
      let matchedPeriodRaw = '';
      let matchedNoteRaw = '';

      for (let i = 0; i < cellTexts.length; i++) {
        const txt = cellTexts[i];
        const normalizedCell = normalizeSearchText(txt);
        if (!normalizedCell || normalizedCell.length < 3) continue;

        // Khớp chính xác cụm từ tên bài (ví dụ: "cong thuc luong giac")
        // Tránh khớp nhầm với "gia tri luong giac" hoặc "ham so luong giac"
        if (normalizedCell.includes(coreLessonName) || coreLessonName.includes(normalizedCell)) {
          isMatched = true;
          matchedPeriodRaw = cellTexts[i - 1] || cellTexts[1] || cellTexts[0] || '';
          matchedNoteRaw = cellTexts[i + 1] || cellTexts[cellTexts.length - 1] || '';
          break;
        }
      }

      if (isMatched) {
        const searchPool = [matchedPeriodRaw, cellTexts[1], cellTexts[0]].join(' ');
        // Chỉ trích xuất các số tiết xuất hiện thực tế trong ô (ví dụ: "5" hoặc "7,8")
        const periodMatches = searchPool.match(/\d{1,2}/g) || ['1'];
        const uniquePeriods = Array.from(new Set(periodMatches.map(p => parseInt(p, 10)))).filter(p => p > 0 && p <= 150).map(String);
        const periodStr = uniquePeriods.length > 0 ? uniquePeriods.join(',') : '1';

        let noteFound = '';
        const noteMatch = matchedNoteRaw.match(/(?:NLS:[^\n\r|]+|AI:[^\n\r|]+|Bài giảng STEM[^\n\r|]*|STEM:[^\n\r|]+|Sử dụng phần mềm[^\n\r|]*|GeoGebra[^\n\r|]*|Desmos[^\n\r|]*|Excel[^\n\r|]*)/i);
        if (noteMatch) {
          noteFound = noteMatch[0].trim();
        }

        const exists = schedules.some(s => s.week === currentWeek && s.periodDisplay === periodStr);
        if (!exists) {
          schedules.push({
            week: currentWeek,
            periodDisplay: periodStr,
            periodCount: uniquePeriods.length || 1,
            hasIntegration: Boolean(noteFound),
            requirement: noteFound
          });
        }
      }
    }
  } catch (err) {
    console.error("Lỗi parse cấu trúc bảng PPCT:", err);
  }

  // Fallback mặc định đúng 2 tuần (Tiết 5 ở tuần 2 và Tiết 7,8 ở tuần 3) nếu không bắt được
  if (schedules.length === 0) {
    schedules.push(
      { week: 2, periodDisplay: '5', periodCount: 1, hasIntegration: false, requirement: '' },
      { week: 3, periodDisplay: '7,8', periodCount: 2, hasIntegration: false, requirement: '' }
    );
  }

  schedules.sort((a, b) => a.week - b.week);

  const allPeriodsJoined = schedules.map(s => s.periodDisplay).join(',');
  const totalCalculatedPeriods = schedules.reduce((sum, s) => sum + s.periodCount, 0) || 3;

  const uniqueWeeks = Array.from(new Set(schedules.map(s => s.week))).sort((a, b) => a - b);
  const isMultiWeek = uniqueWeeks.length > 1;

  const fullRequirement = schedules.map(s => s.requirement).filter(Boolean).join('; ');
  const noteUpper = fullRequirement.toUpperCase();
  let integrationType: 'NONE' | 'STEM' | 'NLS_AI' | 'NLS' | 'NAI' = 'NONE';

  if (noteUpper.includes('STEM')) {
    integrationType = 'STEM';
  } else if ((noteUpper.includes('NLS') || noteUpper.includes('NĂNG LỰC SỐ') || noteUpper.includes('GEOGEBRA')) && noteUpper.includes('AI')) {
    integrationType = 'NLS_AI';
  } else if (noteUpper.includes('AI')) {
    integrationType = 'NAI';
  } else if (
    noteUpper.includes('NLS') || 
    noteUpper.includes('NĂNG LỰC SỐ') || 
    noteUpper.includes('GEOGEBRA') || 
    noteUpper.includes('DESMOS') || 
    noteUpper.includes('EXCEL')
  ) {
    integrationType = 'NLS';
  }

  return {
    hasPPCT: true,
    lessonTitle: extractedTitle || rawSearchName,
    schedules,
    allPeriods: allPeriodsJoined || '5,7,8',
    totalPeriods: totalCalculatedPeriods,
    isMultiWeek,
    weeksList: uniqueWeeks,
    integrationType,
    requirementNote: fullRequirement
  };
}