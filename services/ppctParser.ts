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

function formatCleanFilenamePart(str: string): string {
  return (str || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
}

export async function parsePPCTDirectFromZip(ppctFile: File, lessonDocText: string, fileName: string = ''): Promise<ParsedPPCTResult> {
  let extractedTitle = '';
  const titleMatch = lessonDocText.match(/(?:TÊN BÀI DẠY:\s*|BÀI\s+\d+[\.:]?\s*)([^\n\r]+)/i);
  if (titleMatch && titleMatch[1]) {
    extractedTitle = titleMatch[1].trim();
  }

  const combinedSource = (extractedTitle + ' ' + lessonDocText + ' ' + fileName).toLowerCase();
  const baiMatch = combinedSource.match(/(?:bài|b)\s*(\d+)/i);
  const targetBaiNum = baiMatch ? baiMatch[1] : '';

  const schedules: PPCTLessonSchedule[] = [];

  try {
    const arrayBuffer = await ppctFile.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const docXml = zip.file("word/document.xml")?.asText() || "";

    const rowMatches = docXml.match(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gis) || [];
    let currentWeek = 1;

    let colWeekIdx = 0;
    let colPeriodIdx = 1; 
    let colLessonIdx = 2; 
    let colNoteIdx = 4;   

    for (const rowXml of rowMatches) {
      const cellMatches = rowXml.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gis) || [];
      if (cellMatches.length < 2) continue;

      const cellTexts = cellMatches.map(cXml => {
        const textNodes = cXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gis) || [];
        return textNodes.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
      });

      const rowFullText = normalizeSearchText(cellTexts.join(' '));

      if (rowFullText.includes('tuan') && (rowFullText.includes('tiet') || rowFullText.includes('bai hoc') || rowFullText.includes('ten bai'))) {
        cellTexts.forEach((txt, idx) => {
          const tNorm = normalizeSearchText(txt);
          if (tNorm.includes('tuan')) colWeekIdx = idx;
          else if (tNorm.includes('tiet')) colPeriodIdx = idx;
          else if (tNorm.includes('bai hoc') || tNorm.includes('ten bai') || tNorm.includes('noi dung bai')) colLessonIdx = idx;
          else if (tNorm.includes('ghi chu') || tNorm.includes('tich hop')) colNoteIdx = idx;
        });
        continue;
      }

      const firstCellClean = (cellTexts[colWeekIdx] || cellTexts[0] || '').replace(/\D/g, '');
      const potentialWeek = parseInt(firstCellClean, 10);
      if (!isNaN(potentialWeek) && potentialWeek >= 1 && potentialWeek <= 35) {
        currentWeek = potentialWeek;
      }

      const rawPeriod = cellTexts[colPeriodIdx] || '';
      const rawLessonName = cellTexts[colLessonIdx] || '';
      const noteContent = cellTexts[colNoteIdx] || cellTexts[cellTexts.length - 1] || '';

      const lessonNameLower = rawLessonName.toLowerCase().trim();
      if (!lessonNameLower || lessonNameLower.length < 2) continue;

      let isMatched = false;
      if (targetBaiNum) {
        const rowBaiMatch = lessonNameLower.match(/(?:bài|b)\s*(\d+)/i);
        if (rowBaiMatch && rowBaiMatch[1] === targetBaiNum) {
          isMatched = true;
        }
      }

      if (!isMatched) {
        const coreTarget = formatCleanFilenamePart(extractedTitle || fileName);
        const coreRow = formatCleanFilenamePart(rawLessonName);
        if (coreTarget.length >= 4 && coreRow.length >= 4 && (coreRow === coreTarget || coreRow.includes(coreTarget) || coreTarget.includes(coreRow))) {
          isMatched = true;
        }
      }

      if (isMatched) {
        const periodCleanText = (rawPeriod || "").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        let periodMatches: string[] = [];
        const rangeMatch = periodCleanText.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          for (let p = start; p <= end; p++) {
            periodMatches.push(String(p));
          }
        } else {
          const nums = periodCleanText.match(/\d{1,2}/g);
          if (nums) {
            periodMatches = nums;
          }
        }
        
        if (periodMatches && periodMatches.length > 0) {
          const periodStr = periodMatches.join(',');

          let noteFound = '';
          const noteMatch = noteContent.match(/(?:NLS:[^\n\r|]+|AI:[^\n\r|]+|Bài giảng STEM[^\n\r|]*|STEM:[^\n\r|]+|Sử dụng phần mềm[^\n\r|]+|GeoGebra[^\n\r|]*|Desmos[^\n\r|]*|Excel[^\n\r|]*)/i);
          if (noteMatch) {
            noteFound = noteMatch[0].trim();
          }

          const exists = schedules.some(s => s.week === currentWeek && s.periodDisplay === periodStr);
          if (!exists) {
            schedules.push({
              week: currentWeek,
              periodDisplay: periodStr,
              periodCount: periodMatches.length,
              hasIntegration: Boolean(noteFound),
              requirement: noteFound
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Lỗi parse cấu trúc bảng PPCT:", err);
  }

  schedules.sort((a, b) => a.week - b.week);

  const allPeriodsJoined = schedules.map(s => s.periodDisplay).join(',');
  const totalCalculatedPeriods = schedules.reduce((sum, s) => sum + s.periodCount, 0) || 1;

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
    lessonTitle: extractedTitle || fileName.replace(/\.docx$/i, ''),
    schedules,
    allPeriods: allPeriodsJoined || '1',
    totalPeriods: totalCalculatedPeriods,
    isMultiWeek,
    weeksList: uniqueWeeks,
    integrationType,
    requirementNote: fullRequirement
  };
}