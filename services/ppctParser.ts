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

    for (const rowXml of rowMatches) {
      const cellMatches = rowXml.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gis) || [];
      if (cellMatches.length < 2) continue;

      const cellTexts = cellMatches.map(cXml => {
        const textNodes = cXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gis) || [];
        return textNodes.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
      });

      const rowFullText = normalizeSearchText(cellTexts.join(' '));

      if (rowFullText.includes('tuan') && (rowFullText.includes('tiet') || rowFullText.includes('bai hoc') || rowFullText.includes('ten bai'))) {
        continue;
      }

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
        const txtLower = txt.toLowerCase();

        if (!txtLower || txtLower.length < 2) continue;

        if (targetBaiNum) {
          const rowBaiMatch = txtLower.match(/(?:bài|b)\s*(\d+)/i);
          if (rowBaiMatch && rowBaiMatch[1] === targetBaiNum) {
            isMatched = true;
            matchedPeriodRaw = cellTexts[i - 1] || cellTexts[1] || '';
            matchedNoteRaw = cellTexts[i + 1] || cellTexts[cellTexts.length - 1] || '';
            break;
          }
        }

        const coreTarget = formatCleanFilenamePart(extractedTitle || fileName);
        const coreRow = formatCleanFilenamePart(txt);
        if (coreTarget.length >= 4 && coreRow.length >= 4 && (coreRow === coreTarget || coreRow.includes(coreTarget) || coreTarget.includes(coreRow))) {
          isMatched = true;
          matchedPeriodRaw = cellTexts[i - 1] || cellTexts[1] || '';
          matchedNoteRaw = cellTexts[i + 1] || cellTexts[cellTexts.length - 1] || '';
          break;
        }
      }

      if (isMatched) {
        const searchPool = [matchedPeriodRaw, cellTexts[1], cellTexts[0]].join(' ');
        const periodMatches = searchPool.match(/\d{1,2}/g) || ['1'];
        const uniquePeriods = Array.from(new Set(periodMatches));
        const periodStr = uniquePeriods.join(',');

        let noteFound = '';
        const noteMatch = matchedNoteRaw.match(/(?:NLS:[^\n\r|]+|AI:[^\n\r|]+|Bài giảng STEM[^\n\r|]*|STEM:[^\n\r|]+|Sử dụng phần mềm[^\n\r|]+|GeoGebra[^\n\r|]*|Desmos[^\n\r|]*|Excel[^\n\r|]*)/i);
        if (noteMatch) {
          noteFound = noteMatch[0].trim();
        }

        const exists = schedules.some(s => s.week === currentWeek && s.periodDisplay === periodStr);
        if (!exists) {
          schedules.push({
            week: currentWeek,
            periodDisplay: periodStr,
            periodCount: uniquePeriods.length,
            hasIntegration: Boolean(noteFound),
            requirement: noteFound
          });
        }
      }
    }
  } catch (err) {
    console.error("Lỗi parse cấu trúc bảng PPCT:", err);
  }

  if (schedules.length === 0) {
    schedules.push({
      week: 1,
      periodDisplay: '1,2,3',
      periodCount: 3,
      hasIntegration: false,
      requirement: ''
    });
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
    lessonTitle: extractedTitle || fileName.replace(/\.docx$/i, ''),
    schedules,
    allPeriods: allPeriodsJoined || '1,2,3',
    totalPeriods: totalCalculatedPeriods,
    isMultiWeek,
    weeksList: uniqueWeeks,
    integrationType,
    requirementNote: fullRequirement
  };
}