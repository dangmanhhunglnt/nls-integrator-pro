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

  // Lấy các từ khóa chính từ tên file hoặc tên bài để tìm kiếm linh hoạt trong PPCT
  const rawSearchName = extractedTitle || fileName.replace(/\.docx$/i, '');
  const normalizedTarget = normalizeSearchText(rawSearchName);
  const keywordTokens = normalizedTarget.split(' ').filter(w => w.length > 2); // Lấy các từ dài hơn 2 ký tự

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

      // Bỏ qua dòng tiêu đề bảng PPCT
      if (rowFullText.includes('tuan') && (rowFullText.includes('tiet') || rowFullText.includes('bai hoc') || rowFullText.includes('ten bai'))) {
        continue;
      }

      // Nhận diện cột Tuần (thường nằm ở cột đầu tiên)
      const firstCellClean = (cellTexts[0] || '').replace(/\D/g, '');
      const potentialWeek = parseInt(firstCellClean, 10);
      if (!isNaN(potentialWeek) && potentialWeek >= 1 && potentialWeek <= 35) {
        currentWeek = potentialWeek;
      }

      let isMatched = false;
      let matchedPeriodRaw = '';
      let matchedNoteRaw = '';

      // Kiểm tra xem dòng này có chứa từ khóa của bài học không
      for (let i = 0; i < cellTexts.length; i++) {
        const txt = cellTexts[i];
        const normalizedCell = normalizeSearchText(txt);

        if (!normalizedCell || normalizedCell.length < 3) continue;

        // Đếm số lượng từ khóa trùng khớp giữa tên bài dạy và dòng trong PPCT
        let matchCount = 0;
        for (const token of keywordTokens) {
          if (normalizedCell.includes(token)) {
            matchCount++;
          }
        }

        // Nếu khớp từ 50% số từ khóa trở lên hoặc chứa trọn vẹn cụm từ chính
        if ((keywordTokens.length > 0 && matchCount >= Math.min(2, keywordTokens.length)) || normalizedCell.includes(normalizedTarget)) {
          isMatched = true;
          // Dò tìm cột chứa số tiết (thường là cột đứng trước hoặc cột số 1, 2)
          matchedPeriodRaw = cellTexts[i - 1] || cellTexts[1] || cellTexts[0] || '';
          matchedNoteRaw = cellTexts[i + 1] || cellTexts[cellTexts.length - 1] || '';
          break;
        }
      }

      if (isMatched) {
        // Quét toàn bộ các con số xuất hiện trong dòng hoặc ô tiết để trích xuất chính xác các tiết học
        const searchPool = [matchedPeriodRaw, cellTexts[1], cellTexts[0]].join(' ');
        const periodMatches = searchPool.match(/\d{1,2}/g) || ['1'];
        const uniquePeriods = Array.from(new Set(periodMatches.map(p => parseInt(p, 10)))).filter(p => p > 0 && p <= 150).map(String);
        const periodStr = uniquePeriods.length > 0 ? uniquePeriods.join(',') : '1';

        let noteFound = '';
        const noteMatch = matchedNoteRaw.match(/(?:NLS:[^\n\r|]+|AI:[^\n\r|]+|Bài giảng STEM[^\n\r|]*|STEM:[^\n\r|]+|Sử dụng phần mềm[^\n\r|]*|GeoGebra[^\n\r|]*|Desmos[^\n\r|]*|Excel[^\n\r|]*)/i);
        if (noteMatch) {
          noteFound = noteMatch[0].trim();
        }

        // Phân tách ghi nhận theo tuần thực tế trong PPCT
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

  // Nếu vẫn không khớp được dòng nào từ bảng PPCT, cố gắng tách dựa trên tên file hoặc cấu trúc mặc định phân bổ 2 tuần nếu bài có nhiều tiết
  if (schedules.length === 0) {
    schedules.push(
      { week: 1, periodDisplay: '1, 2', periodCount: 2, hasIntegration: false, requirement: '' },
      { week: 2, periodDisplay: '3', periodCount: 1, hasIntegration: false, requirement: '' }
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
    allPeriods: allPeriodsJoined || '1,2,3',
    totalPeriods: totalCalculatedPeriods,
    isMultiWeek,
    weeksList: uniqueWeeks,
    integrationType,
    requirementNote: fullRequirement
  };
}