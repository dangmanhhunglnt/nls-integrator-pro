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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const binaryString = e.target?.result;
        if (!binaryString) throw new Error("Lỗi đọc file");

        const zip = new PizZip(binaryString as ArrayBuffer);
        const docFile = zip.file("word/document.xml");
        if (!docFile) throw new Error("File Word không hợp lệ (thiếu document.xml)");

        let docXml = docFile.asText();

        // 1. Làm sạch nội dung tích hợp cũ
        docXml = cleanExistingNLSContent(docXml);

        // 2. Cập nhật thông tin PPCT
        if (customHeaderPPCT) {
          docXml = updatePPCTHeaderInfo(docXml, customHeaderPPCT);
        }

        // 3. Cập nhật nhãn tiết PPCT
        if (allPeriodsList && allPeriodsList.length > 0) {
          docXml = injectStandardPeriodMarkers(docXml, allPeriodsList);
        }

        const hasNewContent = Boolean(content && (content.objectives_addition || content.materials_addition || (content.activities_enhancement && content.activities_enhancement.length > 0) || (content.summary_table && content.summary_table.length > 0)));
        
        if (!hasNewContent) {
          zip.file("word/document.xml", docXml);
          const out = zip.generate({ type: "uint8array", compression: "DEFLATE" });
          resolve(new Blob([out as any], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
          return;
        }

        let label = "Tích hợp NLS & AI";
        if ((mode as string) === 'STEM') label = "Giáo dục STEM";
        else if (mode === 'NLS') label = "Tích hợp NLS";
        else if (mode === 'NAI') label = "Tích hợp AI";

        const detectStyle = (xml: string, index: number) => {
          const chunk = xml.substring(Math.max(0, index - 10000), index);
          let fontSize = null;
          const szMatch = chunk.match(/<w:sz\s+w:val=["'](\d+)["'][^>]*\/>/g);
          if (szMatch && szMatch.length > 0) {
            const last = szMatch[szMatch.length - 1];
            const m = last.match(/val=["'](\d+)["']/);
            if (m) fontSize = m[1];
          }

          let fontTag = "";
          const fontMatch = chunk.match(/<w:rFonts\s+[^>]*\/>/g);
          if (fontMatch && fontMatch.length > 0) {
            fontTag = fontMatch[fontMatch.length - 1];
          }

          return { fontSize, fontTag };
        };

        const createXmlBlock = (text: string, style: { fontSize: string | null, fontTag: string }, customPrefix?: string) => {
          if (!text) return "";
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length === 0) return "";

          let rPrHeader = `<w:b/><w:color w:val="${colorHex}"/>`;
          let rPrBody = `<w:color w:val="${colorHex}"/>`;

          if (style.fontSize) {
            const szTag = `<w:sz w:val="${style.fontSize}"/><w:szCs w:val="${style.fontSize}"/>`;
            rPrHeader += szTag;
            rPrBody += szTag;
          }

          if (style.fontTag) {
            rPrHeader += style.fontTag;
            rPrBody += style.fontTag;
          }

          const headerTitle = customPrefix || `👉 ${label}:`;

          let xmlBlock = `<w:p>
                            <w:pPr><w:ind w:left="360"/></w:pPr>
                            <w:r>
                              <w:rPr>${rPrHeader}</w:rPr>
                              <w:t>${escapeXml(headerTitle)}</w:t>
                            </w:r>
                          </w:p>`;

          lines.forEach(line => {
            let cleanLine = line
              .replace(/\*\*/g, "")
              .replace(/__/, "")
              .replace(/^\s*[-•+]\s*/, "")
              .replace(/^(👉|NLS:|Tiết \d+:|Tích hợp NLS:)\s*/gi, "")
              .trim();

            if (cleanLine) {
              xmlBlock += `<w:p>
                           <w:pPr><w:ind w:left="720"/></w:pPr>
                           <w:r>
                             <w:rPr>${rPrBody}</w:rPr>
                             <w:t xml:space="preserve">- ${escapeXml(cleanLine)}</w:t>
                           </w:r>
                         </w:p>`;
            }
          });

          return xmlBlock;
        };

        const findFuzzyIndex = (xml: string, keyword: string, startIndex = 0) => {
          if (!keyword) return -1;
          let directIdx = xml.indexOf(keyword, startIndex);
          if (directIdx !== -1) return directIdx;

          const chars = keyword.split('').map(c => {
            if (/\s/.test(c)) return '[\\s\\u00A0]+';
            return escapeRegex(c);
          });
          const patternStr = chars.join('(?:<[^>]+>)*');
          const regex = new RegExp(patternStr, 'gi');
          regex.lastIndex = startIndex;

          const match = regex.exec(xml);
          return match ? match.index : -1;
        };

        const createSummaryTableXml = (tableData: Array<any>) => {
          if (!Array.isArray(tableData) || tableData.length === 0) return "";

          let rowsXml = "";
          rowsXml += `
            <w:tr>
              <w:trPr><w:tblHeader/></w:trPr>
              <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Mã NLS/AI</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Thành phần năng lực</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="3500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Biểu hiện trong bài học</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>Hoạt động</w:t></w:r></w:p></w:tc>
            </w:tr>`;

          tableData.forEach((item) => {
            rowsXml += `
              <w:tr>
                <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(String(item.stt || ''))}</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(String(item.code || ''))}</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${escapeXml(String(item.component || ''))}</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="3500" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${escapeXml(String(item.expression || ''))}</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(String(item.activity || ''))}</w:t></w:r></w:p></w:tc>
              </w:tr>`;
          });

          return `
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:spacing w:before="300" w:after="150"/></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>BẢNG TỔNG HỢP NĂNG LỰC SỐ VÀ AI TRONG BÀI HỌC</w:t></w:r>
            </w:p>
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
              ${rowsXml}
            </w:tbl>
            <w:p/>`;
        };

        // 4. Chèn mục tiêu bổ sung vào file gốc
        const endKeywords = ["3. Phẩm chất", "3. Về phẩm chất", "III. Phẩm chất", "2. Về năng lực", "2. Năng lực"];
        let insertAnchorPos = -1;
        for (const kw of endKeywords) {
          const idx = findFuzzyIndex(docXml, kw, 0);
          if (idx !== -1) {
            insertAnchorPos = idx;
            break;
          }
        }

        if (insertAnchorPos !== -1 && content.objectives_addition) {
          const currentStyle = detectStyle(docXml, insertAnchorPos);
          const xmlBlock = createXmlBlock(content.objectives_addition, currentStyle);
          const pEnd = docXml.indexOf("</w:p>", insertAnchorPos);
          if (pEnd !== -1) {
            const splitPos = pEnd + "</w:p>".length;
            docXml = docXml.substring(0, splitPos) + xmlBlock + docXml.substring(splitPos);
          }
        }

        // 5. Chèn bảng tổng hợp vào cuối file gốc
        if (content.summary_table && Array.isArray(content.summary_table) && content.summary_table.length > 0) {
          const tableXml = createSummaryTableXml(content.summary_table);
          if (tableXml) {
            const bodyEndTag = "</w:body>";
            const bodyEndIndex = docXml.lastIndexOf(bodyEndTag);
            if (bodyEndIndex !== -1) {
              docXml = docXml.substring(0, bodyEndIndex) + tableXml + docXml.substring(bodyEndIndex);
            }
          }
        }

        zip.file("word/document.xml", docXml);
        const out = zip.generate({ type: "uint8array", compression: "DEFLATE" });
        resolve(new Blob([out as any], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));

      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
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

  const out = zip.generate({ type: "uint8array", compression: "DEFLATE" });
  return new Blob([out as any], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
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

const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const escapeXml = (unsafe: string): string => {
  if (!unsafe) return "";
  const map: Record<string, string> = { 
    '<': '&lt;', 
    '>': '&gt;', 
    '&': '&amp;', 
    "'": '&apos;', 
    '"': '&quot;' 
  };
  return unsafe.replace(/[<>&'"]/g, (c) => map[c] || c);
};