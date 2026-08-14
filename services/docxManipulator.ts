import PizZip from 'pizzip';
import mammoth from 'mammoth';
import { GeneratedNLSContent, IntegrationMode } from '../types';

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
 * 2. HÀM TÍCH HỢP NỘI DUNG VÀO DOCUMENT.XML CỦA FILE WORD
 */
export const injectContentIntoDocx = async (
  file: File,
  content: GeneratedNLSContent,
  mode: IntegrationMode,
  _log: (msg: string) => void
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

        // --- HÀM 2: TẠO KHỐI XML (MÀU ĐỎ + THỪA KẾ STYLE GỐC) ---
        const createXmlBlock = (text: string, style: { fontSize: string | null, fontTag: string }) => {
          if (!text) return "";
          
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length === 0) return "";

          // Mặc định màu chữ đỏ tươi cho phần chèn nội dung NLS/AI
          let rPrHeader = `<w:b/><w:color w:val="FF0000"/>`; 
          let rPrBody = `<w:color w:val="FF0000"/>`;

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

        // --- HÀM 3: TÌM KIẾM XUYÊN THẤU (FUZZY XML SEARCH) ---
        const findFuzzyIndex = (xml: string, keyword: string) => {
            let idx = xml.indexOf(keyword);
            if (idx !== -1) return idx;

            const words = keyword.split(/[\s\u00A0]+/).map(w => escapeRegex(w));
            if (words.length === 0) return -1;

            const patternStr = words.join('(?:<[^>]+>|[\\s\\u00A0])+');
            const regex = new RegExp(patternStr, 'gi'); 
            
            const match = regex.exec(xml);
            return match ? match.index : -1;
        };

        // --- HÀM MỚI BỔ SUNG: VẼ BẢNG TỔNG HỢP NLS/AI BẰNG XML CHO WORD ---
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

        // --- 4. CHÈN NĂNG LỰC VÀO MỤC MỤC TIÊU ---
        const keywords = ["Phẩm chất năng lực", "2. Phát triển năng lực", "2. Năng lực", "2. năng lực", "II. MỤC TIÊU", "II. Mục tiêu", "Năng lực cần đạt", "3. Năng lực"];
        
        let targetIndices: number[] = [];
        for (const key of keywords) {
            const words = key.split(/\s+/).map(w => escapeRegex(w));
            const patternStr = words.join('(?:<[^>]+>|[\\s\\u00A0])+');
            const regex = new RegExp(patternStr, 'gi');
            let match;
            while ((match = regex.exec(docXml)) !== null) targetIndices.push(match.index);
            if (targetIndices.length > 0) break; 
        }
        targetIndices.sort((a, b) => a - b);

        let newXml = docXml;
        const reverseIndices = [...targetIndices].reverse(); 
        
        if (targetIndices.length > 0) {
             reverseIndices.forEach((index) => {
                 let contentToInsert = content.objectives_addition;
                 if (contentToInsert) {
                     const currentStyle = detectStyle(newXml, index);
                     const xmlBlock = createXmlBlock(contentToInsert, currentStyle);
                     
                     if (xmlBlock) {
                         const closingTag = "</w:p>";
                         const insertPos = newXml.indexOf(closingTag, index);
                         if (insertPos !== -1) {
                             const splitPos = insertPos + closingTag.length;
                             newXml = newXml.substring(0, splitPos) + xmlBlock + newXml.substring(splitPos);
                         }
                     }
                 }
             });
        } else {
            const xmlBlock = createXmlBlock(content.objectives_addition, { fontSize: null, fontTag: "" });
            if (xmlBlock) {
                const bodyTag = "<w:body>";
                const bodyIndex = newXml.indexOf(bodyTag);
                if (bodyIndex !== -1) newXml = newXml.substring(0, bodyIndex + bodyTag.length) + xmlBlock + newXml.substring(bodyIndex + bodyTag.length);
            }
        }
        docXml = newXml;

        // --- 5. CHÈN NỘI DUNG VÀO CÁC HOẠT ĐỘNG (ƯU TIÊN VÀO Ô TRONG BẢNG) ---
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
<<<<<<< HEAD
                         // Tìm ô trong Bảng (Table Cell <w:tc>) chứa từ khóa hành động của Học sinh trong bảng CV 5512
                         const cellKeywords = ["HS thực hiện", "thực hiện nhiệm vụ", "Học sinh thực hiện", "Báo cáo kết quả", "Sản phẩm", "Phương án đánh giá"];
                         let targetCellPos = -1;
=======
                         // LƯỢT 1: Chèn khối màu đỏ ngay dưới Tiêu đề Hoạt động
                         const headerInsertPos = docXml.indexOf("</w:p>", actIndex);
                         let addedOffset = 0;
>>>>>>> version-2

                         if (headerInsertPos !== -1) {
                             const splitPos = headerInsertPos + "</w:p>".length;
                             docXml = docXml.substring(0, splitPos) + xmlBlock + docXml.substring(splitPos);
                             addedOffset = xmlBlock.length;
                         }

                         // LƯỢT 2: BỔ SUNG THÊM vào ô Bảng công việc HS ("- HS tiến hành", "- Quan sát, trả lời"...)
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
                             "HS thực hiện"
                         ];

                         let targetCellPos = -1;
                         for (const cKey of cellKeywords) {
<<<<<<< HEAD
                             const foundPos = docXml.indexOf(cKey, actIndex);
                             // Chỉ chấp nhận ô nằm trong phạm vi 8000 ký tự sau tên Hoạt động
                             if (foundPos !== -1 && foundPos - actIndex < 8000) {
=======
                             const foundPos = docXml.indexOf(cKey, actIndex + addedOffset);
                             if (foundPos !== -1 && foundPos - actIndex < 18000) {
>>>>>>> version-2
                                 targetCellPos = foundPos;
                                 break;
                             }
                         }

                         if (targetCellPos !== -1) {
                             const cellInsertPos = docXml.indexOf("</w:p>", targetCellPos);
                             if (cellInsertPos !== -1) {
                                 const splitPos = cellInsertPos + "</w:p>".length;
                                 docXml = docXml.substring(0, splitPos) + xmlBlock + docXml.substring(splitPos);
                             }
                         }
                     }
                }
            });
        }

        // --- 6. HÀM MỚI BỔ SUNG: TỰ ĐỘNG CHÈN BẢNG TỔNG HỢP NLS/AI VÀO CUỐI BÀI ---
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

const escapeRegex = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const escapeXml = (unsafe: string): string => {
  if (!unsafe) return "";
  const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
  return unsafe.replace(/[<>&'"]/g, (c) => map[c] || c);
};