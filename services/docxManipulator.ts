import PizZip from 'pizzip';
import mammoth from 'mammoth';
import { GeneratedNLSContent, IntegrationMode, HighlightColor } from '../types';

/**
 * 1. HÀM ĐỌC VÀ TRÍCH XUẤT VĂN BẢN TỪ FILE WORD (.DOCX)
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  } catch (error) {
    console.error("Lỗi khi đọc nội dung file Word:", error);
    return "";
  }
}

/**
 * 2. HÀM TÍCH HỢP NỘI DUNG VÀO DOCUMENT.XML CỦA FILE WORD (CHÈN TRỰC TIẾP)
 */
export const injectContentIntoDocx = async (
  file: File,
  content: GeneratedNLSContent,
  mode: IntegrationMode,
  _log: (msg: string) => void,
  colorHex: HighlightColor = 'FF0000'
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
        
        // Nhãn tiêu đề động theo 3 chế độ
        let label = "Tích hợp NLS & AI";
        if (mode === 'NLS') {
          label = "Tích hợp NLS";
        } else if (mode === 'NAI') {
          label = "Tích hợp AI";
        }

        // --- HÀM 1: PHÁT HIỆN STYLE (TỰ ĐỘNG THỪA KẾ FONT/SIZE) ---
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

        // --- HÀM 2: TẠO KHỐI XML (MÀU TÙY CHỈNH + THỪA KẾ STYLE GỐC) ---
        const createXmlBlock = (text: string, style: { fontSize: string | null, fontTag: string }) => {
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

          // 1. Tạo dòng Tiêu đề
          let xmlBlock = `<w:p>
                            <w:pPr><w:ind w:left="360"/></w:pPr>
                            <w:r>
                              <w:rPr>${rPrHeader}</w:rPr>
                              <w:t>👉 ${escapeXml(label)}:</w:t>
                            </w:r>
                          </w:p>`;

          // 2. Tạo các dòng Liệt kê nội dung
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

        // --- HÀM 3: TÌM KIẾM XUYÊN THẤU TỪNG KÝ TỰ (CHARACTER-LEVEL FUZZY SEARCH) ---
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

        // --- HÀM 4: VẼ BẢNG TỔNG HỢP NLS/AI BẰNG XML CHO WORD ---
        const createSummaryTableXml = (tableData: Array<any>) => {
          if (!Array.isArray(tableData) || tableData.length === 0) return "";

          let rowsXml = "";
          // Row Header (Tiêu đề bảng)
          rowsXml += `
            <w:tr>
              <w:trPr><w:tblHeader/></w:trPr>
              <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Mã NLS/AI</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Thành phần năng lực</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="3500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Biểu hiện trong bài học</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Hoạt động</w:t></w:r></w:p></w:tc>
            </w:tr>`;

          // Data Rows (Các dòng nội dung)
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

        // --- 5. CHÈN NĂNG LỰC VÀO MỤC MỤC TIÊU (HỖ TRỢ MỌI MẪU GIÁO ÁN) ---
        const competencyKeywords = [
          // Mẫu chuẩn CV 5512
          "I.2. Về năng lực",
          "1.2. Về năng lực",
          "I.2. Năng lực",
          "1.2. Năng lực",
          "2. Năng lực",
          "2. Về năng lực",
          "Về năng lực",
          "về năng lực",
          "Năng lực đặc thù",
          "Năng lực chung",
          "Phát triển năng lực",
          "Năng lực cần đạt",
          "Yêu cầu cần đạt về năng lực",
          // Mẫu phi chuẩn không đánh số
          "MỤC TIÊU VỀ NĂNG LỰC",
          "NĂNG LỰC:",
          "Năng lực:",
          // Nhóm mục tiêu tổng
          "I. MỤC TIÊU DẠY HỌC",
          "I. MỤC TIÊU",
          "MỤC TIÊU DẠY HỌC",
          "MỤC TIÊU BÀI HỌC",
          "YÊU CẦU CẦN ĐẠT"
        ];

        let insertAnchorPos = -1;
        for (const kw of competencyKeywords) {
          const idx = findFuzzyIndex(docXml, kw);
          if (idx !== -1) {
            insertAnchorPos = idx;
            break;
          }
        }

        // Nếu giáo án hoàn toàn không có mục Năng lực, neo trước phần Thiết bị/Tiến trình
        let insertBefore = false;
        if (insertAnchorPos === -1) {
          const fallbackKeywords = [
            "II. THIẾT BỊ DẠY HỌC", 
            "II. THIẾT BỊ", 
            "THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", 
            "THIẾT BỊ DẠY HỌC", 
            "CHUẨN BỊ CỦA GV VÀ HS",
            "III. TIẾN TRÌNH DẠY HỌC",
            "III. TIẾN TRÌNH",
            "TIẾN TRÌNH DẠY HỌC",
            "TIẾN TRÌNH HOẠT ĐỘNG"
          ];
          for (const kw of fallbackKeywords) {
            const idx = findFuzzyIndex(docXml, kw);
            if (idx !== -1) {
              insertAnchorPos = idx;
              insertBefore = true;
              break;
            }
          }
        }

        let newXml = docXml;
        if (insertAnchorPos !== -1) {
          const currentStyle = detectStyle(newXml, insertAnchorPos);
          const xmlBlock = createXmlBlock(content.objectives_addition, currentStyle);

          if (xmlBlock) {
            if (insertBefore) {
              const pStart = newXml.lastIndexOf("<w:p", insertAnchorPos);
              if (pStart !== -1) {
                newXml = newXml.substring(0, pStart) + xmlBlock + newXml.substring(pStart);
              }
            } else {
              const pEnd = newXml.indexOf("</w:p>", insertAnchorPos);
              if (pEnd !== -1) {
                const splitPos = pEnd + "</w:p>".length;
                newXml = newXml.substring(0, splitPos) + xmlBlock + newXml.substring(splitPos);
              }
            }
          }
        }
        docXml = newXml;

        // --- 6. CHÈN NỘI DUNG VÀO CÁC HOẠT ĐỘNG (ƯU TIÊN BỔ SUNG TRỰC TIẾP VÀO Ô BẢNG CV 5512) ---
        if (Array.isArray(content.activities_enhancement)) {
          content.activities_enhancement.forEach((item, index) => {
            const actName = (item as any).activity_name || (item as any).activity_title || "";
            const actContent = (item as any).enhanced_content || (item as any).content || "";

            if (!actName && !actContent) return;

            let safeName = escapeXml(actName);
            let actIndex = findFuzzyIndex(docXml, safeName);

            if (actIndex === -1 && safeName) {
              const coreKeywords = ["Khởi động", "Hình thành kiến thức", "Luyện tập", "Vận dụng", "Mở đầu", "Kết nối"];
              for (const key of coreKeywords) {
                if (safeName.includes(key)) {
                  const variants = [
                    `HOẠT ĐỘNG ${key.toUpperCase()}`, 
                    `HOẠT ĐỘNG ${key}`,             
                    `${key.toUpperCase()}`
                  ];
                  for (const v of variants) {
                    actIndex = findFuzzyIndex(docXml, v);
                    if (actIndex !== -1) break;
                  }
                  if (actIndex === -1) actIndex = findFuzzyIndex(docXml, key);
                  if (actIndex !== -1) break;
                }
              }
            }

            if (actIndex === -1) {
              const matchNum = safeName ? safeName.match(/\d+/) : null;
              const num = matchNum ? matchNum[0] : String(index + 1);
              const variants = [`HOẠT ĐỘNG ${num}`, `Hoạt động ${num}`, `HĐ ${num}`, `HĐ${num}`, `Nhiệm vụ ${num}`];
              for (const v of variants) {
                actIndex = findFuzzyIndex(docXml, v);
                if (actIndex !== -1) break;
              }
            }

            if (actIndex !== -1) {
              const currentStyle = detectStyle(docXml, actIndex);
              const xmlBlock = createXmlBlock(actContent, currentStyle);

              if (xmlBlock) {
                const tblPos = docXml.indexOf("<w:tbl>", actIndex);
                let targetCellPos = -1;

                if (tblPos !== -1 && tblPos - actIndex < 20000) {
                  const hsHeaderPos = findFuzzyIndex(docXml.substring(tblPos, tblPos + 5000), "HS thực hiện nhiệm vụ");
                  
                  if (hsHeaderPos !== -1) {
                    const contentRowPos = docXml.indexOf("<w:tr>", tblPos + hsHeaderPos);
                    if (contentRowPos !== -1 && contentRowPos - tblPos < 10000) {
                      const firstCell = docXml.indexOf("<w:tc>", contentRowPos);
                      if (firstCell !== -1) {
                        const secondCell = docXml.indexOf("<w:tc>", firstCell + 6);
                        if (secondCell !== -1) {
                          targetCellPos = secondCell;
                        }
                      }
                    }
                  }
                }

                if (targetCellPos === -1) {
                  const cellKeywords = [
                    "- HS tiến hành",
                    "- HS sử dụng",
                    "- Quan sát, trả lời",
                    "- Nhóm trưởng điều phối",
                    "- Mỗi nhóm được sử dụng",
                    "HS tiến hành",
                    "HS sử dụng",
                    "điện thoại cá nhân",
                    "HS thực hiện nhiệm vụ",
                    "HS thực hiện",
                    "Học sinh thực hiện",
                    "Báo cáo kết quả",
                    "Sản phẩm"
                  ];
                  for (const cKey of cellKeywords) {
                    const foundPos = findFuzzyIndex(docXml, cKey, actIndex);
                    if (foundPos !== -1 && foundPos - actIndex < 18000) {
                      targetCellPos = foundPos;
                      break;
                    }
                  }
                }

                if (targetCellPos !== -1) {
                  const cellInsertPos = docXml.indexOf("</w:p>", targetCellPos);
                  if (cellInsertPos !== -1) {
                    const splitPos = cellInsertPos + "</w:p>".length;
                    docXml = docXml.substring(0, splitPos) + xmlBlock + docXml.substring(splitPos);
                  }
                } else {
                  const headerInsertPos = docXml.indexOf("</w:p>", actIndex);
                  if (headerInsertPos !== -1) {
                    const splitPos = headerInsertPos + "</w:p>".length;
                    docXml = docXml.substring(0, splitPos) + xmlBlock + docXml.substring(splitPos);
                  }
                }
              }
            }
          });
        }

        // --- 7. TỰ ĐỘNG CHÈN BẢNG TỔNG HỢP NLS/AI VÀO CUỐI BÀI ---
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
        resolve(zip.generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" }));

      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 3. HÀM TẠO FILE WORD PHỤ LỤC TÍCH HỢP NLS & AI RIÊNG BIỆT (KHÔNG CHÈN VÀO FILE GỐC)
 */
export const createAppendixDocx = async (
  content: GeneratedNLSContent,
  subject: string,
  grade: string,
  mode: IntegrationMode
): Promise<Blob> => {
  const zip = new PizZip();

  let label = "KẾ HOẠCH TÍCH HỢP NĂNG LỰC SỐ VÀ GIÁO DỤC AI";
  if (mode === 'NLS') label = "KẾ HOẠCH TÍCH HỢP NĂNG LỰC SỐ (TT 02/2025/TT-BGDĐT)";
  if (mode === 'NAI') label = "KẾ HOẠCH TÍCH HỢP GIÁO DỤC AI (QĐ 3439/QĐ-BGDĐT)";

  // 1. Tạo các dòng bảng ma trận
  let tableRowsXml = `
    <w:tr>
      <w:trPr><w:tblHeader/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Mã NLS/AI</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Thành phần năng lực</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="3600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Biểu hiện cụ thể của HS</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Hoạt động</w:t></w:r></w:p></w:tc>
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

  // 2. Tạo nội dung chi tiết từng hoạt động
  let actXml = "";
  (content.activities_enhancement || []).forEach(act => {
    actXml += `
      <w:p><w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="1D4ED8"/></w:rPr><w:t>▶ ${escapeXml(act.activity_name)}:</w:t></w:r></w:p>
      <w:p><w:pPr><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(act.enhanced_content)}</w:t></w:r></w:p>`;
  });

  // 3. Toàn bộ cấu trúc tài liệu Phụ lục
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

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", fullDocXml);

  return zip.generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
};

/**
 * 4. HÀM ĐÓNG GÓI NHIỀU FILE WORD THÀNH 1 TỆP ZIP DUY NHẤT (XỬ LÝ HÀNG LOẠT)
 */
export const createZipFromBlobs = async (
  files: { name: string; blob: Blob }[]
): Promise<Blob> => {
  const zip = new PizZip();
  for (const item of files) {
    const arrayBuffer = await item.blob.arrayBuffer();
    zip.file(item.name, arrayBuffer);
  }
  return zip.generate({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
  });
};

const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const escapeXml = (unsafe: string): string => {
  if (!unsafe) return "";
  const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
  return unsafe.replace(/[<>&'"]/g, (c) => map[c] || c);
};