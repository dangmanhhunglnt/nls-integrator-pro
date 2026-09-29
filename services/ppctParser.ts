import PizZip from 'pizzip';

export interface PPCTLessonSchedule {
  week: number;
  periodDisplay: string;
  periodCount: number;
  hasIntegration: boolean;
  requirement: string;
  integrationMode?: 'NONE' | 'STEM' | 'NLS_AI' | 'NLS' | 'NAI';
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

export async function parsePPCTDirectFromZip(ppctFile: File, lessonDocText: string, fileName: string = ''): Promise<ParsedPPCTResult> {
  let extractedTitle = '';
  const titleMatch = lessonDocText.match(/(?:TÊN BÀI DẠY:\s*|BÀI\s+\d+[\.:]?\s*)([^\n\r]+)/i);
  if (titleMatch && titleMatch[1]) {
    extractedTitle = titleMatch[1].trim();
  }

  // Lấy tên bài sạch từ giáo án hoặc tên file (giữ nguyên dấu tiếng Việt để so sánh chính xác tuyệt đối)
  const rawLessonName = (extractedTitle || fileName.replace(/\.docx$/i, '')).toLowerCase().trim();
  const cleanLessonName = rawLessonName.replace(/bài\s*\d+[\.:]?\s*/i, '').trim();

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

      const rowFullText = cellTexts.join(' ').toLowerCase();

      if (rowFullText.includes('tuần') && (rowFullText.includes('tiết') || rowFullText.includes('tên bài'))) {
        continue;
      }

      // Nhận diện số tuần từ cột đầu tiên
      const firstCellClean = (cellTexts[0] || '').replace(/\D/g, '');
      const potentialWeek = parseInt(firstCellClean, 10);
      if (!isNaN(potentialWeek) && potentialWeek >= 1 && potentialWeek <= 35) {
        currentWeek = potentialWeek;
      }

      let isMatched = false;
      let matchedPeriodRaw = '';
      let matchedNoteRaw = '';

      for (let i = 0; i < cellTexts.length; i++) {
        const cellStr = cellTexts[i].toLowerCase();
        if (cellStr.length < 3) continue;

        // So khớp chính xác tên bài học trong bảng PPCT
        if (cellStr.includes(cleanLessonName) || cleanLessonName.includes(cellStr)) {
          isMatched = true;
          matchedPeriodRaw = cellTexts[1] || cellTexts[0] || '';
          matchedNoteRaw = cellTexts.slice(3).join(' ') || cellTexts[2] || '';
          break;
        }
      }

      if (isMatched) {
        const periodMatches = matchedPeriodRaw.match(/\d{1,2}/g) || [];
        const uniquePeriods = Array.from(new Set(periodMatches.map(p => parseInt(p, 10)))).filter(p => p > 0 && p <= 150).map(String);
        
        if (uniquePeriods.length === 0) continue;
        const periodStr = uniquePeriods.join(',');

        let noteFound = matchedNoteRaw.trim();
        const noteUpper = noteFound.toUpperCase();
        
        let rowIntegrationType: 'NONE' | 'STEM' | 'NLS_AI' | 'NLS' | 'NAI' = 'NONE';
        if (noteUpper.includes('STEM')) {
          rowIntegrationType = 'STEM';
        } else if ((noteUpper.includes('NLS') || noteUpper.includes('NĂNG LỰC SỐ')) && noteUpper.includes('AI')) {
          rowIntegrationType = 'NLS_AI';
        } else if (noteUpper.includes('AI')) {
          rowIntegrationType = 'NAI';
        } else if (noteUpper.includes('NLS') || noteUpper.includes('NĂNG LỰC SỐ') || noteUpper.includes('GEOGEBRA') || noteUpper.includes('DESMOS')) {
          rowIntegrationType = 'NLS';
        }

        const exists = schedules.some(s => s.week === currentWeek && s.periodDisplay === periodStr);
        if (!exists) {
          schedules.push({
            week: currentWeek,
            periodDisplay: periodStr,
            periodCount: uniquePeriods.length,
            hasIntegration: rowIntegrationType !== 'NONE',
            requirement: noteFound,
            integrationMode: rowIntegrationType
          });
        }
      }
    }
  } catch (err) {
    console.error("Lỗi parse PPCT:", err);
  }

  // Nếu không tìm thấy trong bảng PPCT, tự động đọc số tiết thực tế từ file giáo án
  if (schedules.length === 0) {
    const totalMatch = lessonDocText.match(/(?:Số tiết dạy|Số tiết):\s*(\d+)/i);
    const totalNum = totalMatch ? parseInt(totalMatch[1], 10) : 3;
    
    if (totalNum <= 2) {
      schedules.push(
        { week: 1, periodDisplay: '1', periodCount: 1, hasIntegration: false, requirement: '', integrationMode: 'NONE' },
        { week: 2, periodDisplay: '2', periodCount: 1, hasIntegration: false, requirement: '', integrationMode: 'NONE' }
      );
    } else {
      const half = Math.ceil(totalNum / 2);
      schedules.push(
        { week: 1, periodDisplay: Array.from({length: half}, (_, i) => i + 1).join(','), periodCount: half, hasIntegration: false, requirement: '', integrationMode: 'NONE' },
        { week: 2, periodDisplay: Array.from({length: totalNum - half}, (_, i) => half + i + 1).join(','), periodCount: totalNum - half, hasIntegration: false, requirement: '', integrationMode: 'NONE' }
      );
    }
  }

  schedules.sort((a, b) => a.week - b.week);

  const allPeriodsJoined = schedules.map(s => s.periodDisplay).join(',');
  const totalCalculatedPeriods = schedules.reduce((sum, s) => sum + s.periodCount, 0) || 3;
  const uniqueWeeks = Array.from(new Set(schedules.map(s => s.week))).sort((a, b) => a - b);
  const isMultiWeek = uniqueWeeks.length > 1;

  const fullRequirement = schedules.map(s => s.requirement).filter(Boolean).join('; ');
  const hasAnyIntegration = schedules.some(s => s.hasIntegration);
  
  let overallIntegrationType: 'NONE' | 'STEM' | 'NLS_AI' | 'NLS' | 'NAI' = 'NONE';
  if (hasAnyIntegration) {
    const firstActive = schedules.find(s => s.integrationMode && s.integrationMode !== 'NONE');
    overallIntegrationType = firstActive?.integrationMode || 'NLS';
  }

  return {
    hasPPCT: true,
    lessonTitle: extractedTitle || rawLessonName,
    schedules,
    allPeriods: allPeriodsJoined || '5,7,8',
    totalPeriods: totalCalculatedPeriods,
    isMultiWeek,
    weeksList: uniqueWeeks,
    integrationType: overallIntegrationType,
    requirementNote: fullRequirement
  };
}