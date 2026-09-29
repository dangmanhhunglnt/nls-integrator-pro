import PizZip from 'pizzip';
import mammoth from 'mammoth';
import { GeneratedNLSContent, IntegrationMode, HighlightColor } from '../types';

export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  } catch (error) {
    console.error("Lỗi khi đọc file Word:", error);
    return "";
  }
}

export function cleanExistingNLSContent(xmlContent: string): string {
  let cleaned = xmlContent;
  cleaned = cleaned.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\[(?:NLS\Vert{}AI\Vert{}STEM)\][\s\S]*?<\/w:p>/gis, '');
  cleaned = cleaned.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>).)*?Gemini[\s\S]*?<\/w:p>/gis, '');
  cleaned = cleaned.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>).)*?(?:👉\s*Tích hợp|👉\s*Giáo dục|🚀\s*TÍCH HỢP|Tích hợp NLS|Tích hợp AI|GD STEM).*?<\/w:p>/gis, '');
  cleaned = cleaned.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>).)*?(?:-\s*Năng lực số|Năng lực số\s*\([^)]*\):).*?<\/w:p>/gis, '');
  cleaned = cleaned.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>).)*?BẢNG TỔNG HỢP NĂNG LỰC SỐ.*?<\/w:p>\s*(?:<w:tbl\b[^>]*>(?:(?!<\/w:tbl>).)*?<\/w:tbl>)?/gis, '');
  return cleaned;
}

export function removeOldPeriodHeaders(xmlContent: string): string {
  let cleaned = xmlContent;
  cleaned = cleaned.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\bTIẾT\s+\d+[\s\S]*?<\/w:p>/gis, '');
  cleaned = cleaned.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>).)*?Tiết\s+theo\s+PPCT[\s\S]*?<\/w:p>/gis, '');
  return cleaned;
}

export function updatePPCTHeaderInfo(xmlContent: string, ppctInfoText: string): string {
  if (!ppctInfoText) return xmlContent;

  let result = xmlContent;
  const safeText = escapeXml(ppctInfoText);

  result = result.replace(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/gi, '');

  const pRegex = /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?(?:Thời gian thực hiện|Số tiết dạy|Số tiết)[\s\S]*?<\/w:p>/gi;
  let firstMatch = true;
  result = result.replace(pRegex, (matchP) => {
    if (firstMatch) {
      firstMatch = false;
      let pXml = matchP;
      if (pXml.includes('<w:pPr>')) {
        if (pXml.includes('<w:jc')) {
          pXml = pXml.replace(/<w:jc[^>]*\/>/i, '<w:jc w:val="center"/>');
        } else {
          pXml = pXml.replace('<w:pPr>', '<w:pPr><w:jc w:val="center"/>');
        }
      } else {
        pXml = pXml.replace(/(<w:p\b[^>]*>)/i, '$1<w:pPr><w:jc w:val="center"/></w:pPr>');
      }

      pXml = pXml.replace(/<w:shd\b[^>]*\/>/gi, '');

      let isFirstText = true;
      pXml = pXml.replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi, () => {
        if (isFirstText) {
          isFirstText = false;
          return `<w:t xml:space="preserve">Thời gian thực hiện: ${safeText}</w:t>`;
        }
        return `<w:t></w:t>`;
      });
      return pXml;
    }
    return '';
  });

  const cellRegex = /<w:tc\b[^>]*>[\s\S]*?(?:Số tiết|Tiết theo PPCT|Tiết PPCT)[\s\S]*?<\/w:tc>/gi;
  result = result.replace(cellRegex, (cellXml) => {
    let isFirstCellText = true;
    return cellXml.replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi, () => {
      if (isFirstCellText) {
        isFirstCellText = false;
        return `<w:t xml:space="preserve">Thời gian thực hiện: ${safeText}</w:t>`;
      }
      return `<w:t></w:t>`;
    });
  });

  return result;
}

export function injectStandardPeriodMarkers(xmlContent: string, periodsList: (number | string)[]): string {
  if (!periodsList || periodsList.length === 0) return xmlContent;

  let result = removeOldPeriodHeaders(xmlContent);

  periodsList.forEach((pNum, idx) => {
    const oldNum = idx + 1;
    const regex1 = new RegExp(`TIẾT\\s+${oldNum}\\b`, 'gi');
    const regex2 = new RegExp(`Tiết\\s+${oldNum}\\b`, 'gi');
    const regex3 = new RegExp(`T\\s*${oldNum}\\b`, 'gi');

    result = result.replace(regex1, `TIẾT ${pNum} (THEO PPCT)`);
    result = result.replace(regex2, `Tiết ${pNum} (theo PPCT)`);
    result = result.replace(regex3, `Tiết ${pNum}`);
  });

  return result;
}

export const injectContentIntoDocx = async (
  file: File,
  content: GeneratedNLSContent,
  mode: IntegrationMode,
  _log: (msg: string) => void,
  colorHex: HighlightColor = 'FF0000',
  customHeaderPPCT?: string,
  allPeriodsList?: (number | string)[]
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
      const originalText = await extractTextFromDocx(file);

      const zip = new PizZip();

      let label = "KẾ HOẠCH TÍCH HỢP NĂNG LỰC SỐ VÀ GIÁO DỤC AI";
      if (mode === 'STEM') label = "GIÁO DỤC STEM";
      else if (mode === 'NLS') label = "KẾ HOẠCH TÍCH HỢP NĂNG LỰC SỐ (TT 02/2025/TT-BGDĐT)";
      else if (mode === 'NAI') label = "KẾ HOẠCH TÍCH HỢP GIÁO DỤC AI (QĐ 2422/QĐ-BGDĐT)";

      const periodTitleStr = allPeriodsList && allPeriodsList.length > 0 
        ? `TIẾT THEO PPCT: TIẾT ${allPeriodsList.join(', ')}` 
        : '';
      const timeHeaderStr = customHeaderPPCT ? `Thời gian thực hiện: ${customHeaderPPCT}` : '';

      let tableRowsXml = "";
      if (content.summary_table && Array.isArray(content.summary_table)) {
        content.summary_table.forEach(item => {
          tableRowsXml += `
            <w:tr>
              <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(String(item.stt || ''))}</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(String(item.code || ''))}</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${escapeXml(String(item.component || ''))}</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="3500" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${escapeXml(String(item.expression || ''))}</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(String(item.activity || ''))}</w:t></w:r></w:p></w:tc>
            </w:tr>`;
        });
      }

      let actXml = "";
      if (content.activities_enhancement && Array.isArray(content.activities_enhancement)) {
        content.activities_enhancement.forEach(act => {
          const actName = (act as any).activity_name || (act as any).activity_title || "Hoạt động";
          const actCont = (act as any).enhanced_content || (act as any).content || "";
          actXml += `
            <w:p><w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="1D4ED8"/></w:rPr><w:t>▶ ${escapeXml(actName)}:</w:t></w:r></w:p>
            <w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(actCont)}</w:t></w:r></w:p>`;
        });
      }

      const originalParagraphsXml = originalText
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => `<w:p><w:r><w:t>${escapeXml(p)}</w:t></w:r></w:p>`)
        .join('');

      const fullDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1E293B"/></w:rPr><w:t>${escapeXml(label)}</w:t></w:r></w:p>
            ${timeHeaderStr ? `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="2563EB"/></w:rPr><w:t>${escapeXml(timeHeaderStr)}</w:t></w:r></w:p>` : ''}
            ${periodTitleStr ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="300"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>${escapeXml(periodTitleStr)}</w:t></w:r></w:p>` : ''}

            <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>I. MỤC TIÊU BỔ SUNG (${escapeXml(label)})</w:t></w:r></w:p>
            <w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:color w:val="${colorHex}"/></w:rPr><w:t>${escapeXml(content.objectives_addition || '')}</w:t></w:r></w:p>

            <w:p><w:pPr><w:spacing w:before="240"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU SỐ</w:t></w:r></w:p>
            <w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:color w:val="${colorHex}"/></w:rPr><w:t>${escapeXml(content.materials_addition || '')}</w:t></w:r></w:p>

            <w:p><w:pPr><w:spacing w:before="240"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>III. HOẠT ĐỘNG TÍCH HỢP SỐ &amp; AI</w:t></w:r></w:p>
            ${actXml}

            ${tableRowsXml ? `
              <w:p><w:pPr><w:spacing w:before="300" w:after="150"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>IV. BẢNG TỔNG HỢP NĂNG LỰC SỐ VÀ AI TRONG BÀI HỌC</w:t></w:r></w:p>
              <w:tbl>
                <w:tblPr>
                  <w:tblW w:w="0" w:type="auto"/>
                  <w:tblBorders>
                    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                  </w:tblBorders>
                </w:tblPr>
                <w:tr>
                  <w:trPr><w:tblHeader/></w:trPr>
                  <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
                  <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Mã NLS/AI</w:t></w:r></w:p></w:tc>
                  <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Thành phần năng lực</w:t></w:r></w:p></w:tc>
                  <w:tc><w:tcPr><w:tcW w:w="3500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Biểu hiện trong bài học</w:t></w:r></w:p></w:tc>
                  <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>Hoạt động</w:t></w:r></w:p></w:tc>
                </w:tr>
                ${tableRowsXml}
              </w:tbl>` : ''}

            <w:p><w:pPr><w:spacing w:before="300" w:after="150"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>V. NỘI DUNG GIÁO ÁN GỐC</w:t></w:r></w:p>
            ${originalParagraphsXml}
          </w:body>
        </w:document>`;

      // Đầy đủ các tệp tiêu chuẩn OpenXML bắt buộc để Microsoft Word nhận diện và mở trực tiếp
      zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="xml" ContentType="application/xml"/>
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`);

      zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>`);

      zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/relationships/2006/relationships"/>`);

      zip.file("word/document.xml", fullDocXml);

      const out = zip.generate({ type: "uint8array", compression: "DEFLATE" });
      const finalBlob = new Blob([out as any], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      resolve(finalBlob);

    } catch (err) {
      reject(err);
    }
  });
};

export const createAppendixDocx = async (
  content: GeneratedNLSContent,
  subject: string,
  grade: string,
  mode: IntegrationMode
): Promise<Blob> => {
  const zip = new PizZip();

  let label = "KẾ HOẠCH TÍCH HỢP NĂNG LỰC SỐ VÀ GIÁO DỤC AI";
  if (mode === 'NLS') label = "KẾ HOẠCH TÍCH HỢP NĂNG LỰC SỐ (TT 02/2025/TT-BGDĐT)";
  if (mode === 'NAI') label = "KẾ HOẠCH TÍCH HỢP GIÁO DỤC AI (QĐ 2422/QĐ-BGDĐT)";

  let tableRowsXml = `
    <w:tr>
      <w:trPr><w:tblHeader/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Mã NLS/AI</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Thành phần năng lực</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="3600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Biểu hiện cụ thể của HS</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>Hoạt động</w:t></w:r></w:p></w:tc>
    </w:tr>`;

  (content.summary_table || []).forEach(item => {
    tableRowsXml += `
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(String(item.stt || ''))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(String(item.code || ''))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${escapeXml(String(item.component || ''))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3600" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${escapeXml(String(item.expression || ''))}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(String(item.activity || ''))}</w:t></w:r></w:p></w:tc>
      </w:tr>`;
  });

  let actXml = "";
  (content.activities_enhancement || []).forEach(act => {
    actXml += `
      <w:p><w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="1D4ED8"/></w:rPr><w:t>▶ ${escapeXml(act.activity_name)}:</w:t></w:r></w:p>
      <w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(act.enhanced_content)}</w:t></w:r></w:p>`;
  });

  const fullDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="1E293B"/></w:rPr><w:t>${escapeXml(label)}</w:t></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="300"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="22"/><w:color w:val="64748B"/></w:rPr><w:t>(Phụ lục kèm Kế hoạch bài dạy môn ${escapeXml(subject)} - Khối ${escapeXml(grade)})</w:t></w:r></w:p>

        <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>I. MỤC TIÊU NĂNG LỰC TÍCH HỢP</w:t></w:r></w:p>
        <w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:t>${escapeXml(content.objectives_addition)}</w:t></w:r></w:p>

        <w:p><w:pPr><w:spacing w:before="240"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU SỐ</w:t></w:r></w:p>
        <w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:t>${escapeXml(content.materials_addition || '')}</w:t></w:r></w:p>

        <w:p><w:pPr><w:spacing w:before="240"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>III. KẾ HOẠCH TỔ CHỨC CÁC HOẠT ĐỘNG SỐ &amp; AI</w:t></w:r></w:p>
        ${actXml}

        <w:p><w:pPr><w:spacing w:before="300" w:after="150"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>IV. BẢNG MA TRẬN TỔNG HỢP NĂNG LỰC SỐ VÀ AI</w:t></w:r></w:p>
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="0" w:type="auto"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
              <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tblBorders>
          </w:tblPr>
          ${tableRowsXml}
        </w:tbl>
      </w:body>
    </w:document>`;

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", fullDocXml);

  return zip.generate({ 
    type: "blob", 
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
    compression: "DEFLATE" 
  }) as unknown as Blob;
};

export const createZipFromBlobs = async (
  files: { name: string; blob: Blob }[]
): Promise<Blob> => {
  const zip = new PizZip();
  for (const item of files) {
    const arrayBuffer = await item.blob.arrayBuffer();
    zip.file(item.name, new Uint8Array(arrayBuffer), { binary: true });
  }
  const out = zip.generate({
    type: "uint8array",
    compression: "DEFLATE",
  });
  return new Blob([out as any], { type: "application/zip" });
};

const escapeXml = (unsafe: string): string => {
  if (!unsafe) return "";
  const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
  return unsafe.replace(/[<>&'"]/g, (c) => map[c] || c);
};