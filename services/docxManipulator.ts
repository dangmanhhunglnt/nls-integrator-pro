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
 * Hỗ trợ tham số targetLessons để định vị chính xác phân đoạn tiết trong file tuần/nhiều tiết
 */
export const injectContentIntoDocx = async (
  file: File,
  content: GeneratedNLSContent,
  mode: IntegrationMode,
  _log: (msg: string) => void,
  colorHex: HighlightColor = 'FF0000',
  targetLessons: string = ''
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
        
        // Nhãn tiêu đề động theo chế độ (STEM, NLS, AI hoặc kết hợp)
        let label = "Tích hợp NLS & AI";
        if ((mode as string) === 'STEM') {
          label = "Giáo dục STEM";
        } else if (mode === 'NLS') {
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

          // 1. Tạo dòng Tiêu đề
          let xmlBlock = `<w:p>
                            <w:pPr><w:ind w:left="360"/></w:pPr>
                            <w:r>
                              <w:rPr>${rPrHeader}</w:rPr>
                              <w:t>${escapeXml(headerTitle)}</w:t>
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
          rowsXml += `
            <w:tr>
              <w:trPr><w:tblHeader/></w:trPr>
              <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>STT</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Mã NLS/AI</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Thành phần năng lực</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="3500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Biểu hiện trong bài học</w:t></w:r></w:p></w:tc>
              <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Hoạt động</w:t></w:r></w:p></w:tc>
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

        // =========================================================================
        // XÁC ĐỊNH PHẠM VI (SCOPE) CHUẨN XÁC KHI CHỌN 1 HOẶC NHIỀU TIẾT
        // =========================================================================
        let scopeStart = 0;
        let scopeEnd = docXml.length;

        if (targetLessons && targetLessons.trim()) {
          const targetKeys = targetLessons
            .split(',')
            .map(k => k.split('(')[0].trim())
            .filter(Boolean);

          if (targetKeys.length > 0) {
            const firstKey = targetKeys[0];
            const firstIdx = findFuzzyIndex(docXml, firstKey, 0);
            if (firstIdx !== -1) {
              scopeStart = firstIdx;
            }

            const lastKey = targetKeys[targetKeys.length - 1];
            const lastIdx = findFuzzyIndex(docXml, lastKey, scopeStart);
            const searchAfter = lastIdx !== -1 ? lastIdx + lastKey.length + 50 : scopeStart + 100;

            const nextMarkers = ['GT', 'H', 'CĐ', 'ĐS', 'HH', 'T', 'Tiết'];
            let earliestNext = -1;

            for (const mark of nextMarkers) {
              const markRegex = new RegExp(`(?:<[^>]+>)*\\b${mark}\\.?\\s*\\d+\\b`, 'gi');
              markRegex.lastIndex = searchAfter;
              let mNext;
              while ((mNext = markRegex.exec(docXml)) !== null) {
                const cleanFound = mNext[0].replace(/<[^>]+>/g, '').replace(/[\s\.]/g, '').toUpperCase();
                const isStillSelected = targetKeys.some(tk => cleanFound.startsWith(tk.toUpperCase()));
                if (!isStillSelected && mNext.index > searchAfter) {
                  if (earliestNext === -1 || mNext.index < earliestNext) {
                    earliestNext = mNext.index;
                  }
                  break;
                }
              }
            }

            if (earliestNext !== -1) {
              scopeEnd = earliestNext;
            }
          }
        }

        // --- 5. CHÈN NĂNG LỰC VÀO CUỐI PHẦN NĂNG LỰC TRONG PHẠM VI TIẾT ---
        const endKeywords = [
          "3. Phẩm chất", "3. Về phẩm chất", "III. Phẩm chất",
          "1.3. Phẩm chất", "1.3. Về phẩm chất", "Phẩm chất:", "PHẨM CHẤT:", "Về phẩm chất", "- Phẩm chất:",
          "II. ĐỒ DÙNG DẠY HỌC", "II. ĐỒ DÙNG DẠY - HỌC", "II. THIẾT BỊ DẠY HỌC",
          "II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", "II. ĐỒ DÙNG DẠY VÀ HỌC"
        ];

        let insertAnchorPos = -1;
        let isBeforeKeyword = false;

        for (const kw of endKeywords) {
          const idx = findFuzzyIndex(docXml, kw, scopeStart);
          if (idx !== -1 && idx < scopeEnd) {
            insertAnchorPos = idx;
            isBeforeKeyword = true;
            break;
          }
        }

        if (insertAnchorPos === -1) {
          const fallbackKeywords = [
            "2. Năng lực", "2. Về năng lực", "I.2. Năng lực", "I.2. Về năng lực",
            "1.2. Năng lực", "1.2. Về năng lực", "Về năng lực", "NĂNG LỰC:", "Năng lực:"
          ];
          for (const kw of fallbackKeywords) {
            const idx = findFuzzyIndex(docXml, kw, scopeStart);
            if (idx !== -1 && idx < scopeEnd) {
              insertAnchorPos = idx;
              isBeforeKeyword = false;
              break;
            }
          }
        }

        let newXml = docXml;
        if (insertAnchorPos !== -1 && content.objectives_addition) {
          const currentStyle = detectStyle(newXml, insertAnchorPos);
          const xmlBlock = createXmlBlock(content.objectives_addition, currentStyle);

          if (xmlBlock) {
            if (isBeforeKeyword) {
              let pStart = -1;
              let searchIndex = insertAnchorPos;
              while (searchIndex >= scopeStart) {
                const found = newXml.lastIndexOf("<w:p", searchIndex);
                if (found === -1 || found < scopeStart) break;
                const charAfter = newXml.charAt(found + 4);
                if (charAfter === " " || charAfter === ">") {
                  pStart = found;
                  break;
                }
                searchIndex = found - 1;
              }

              if (pStart !== -1) {
                const shift = xmlBlock.length;
                newXml = newXml.substring(0, pStart) + xmlBlock + newXml.substring(pStart);
                scopeEnd += shift;
              }
            } else {
              const pEnd = newXml.indexOf("</w:p>", insertAnchorPos);
              if (pEnd !== -1) {
                const splitPos = pEnd + "</w:p>".length;
                const shift = xmlBlock.length;
                newXml = newXml.substring(0, splitPos) + xmlBlock + newXml.substring(splitPos);
                scopeEnd += shift;
              }
            }
          }
        }
        docXml = newXml;

        // --- 5.1. TỰ ĐỘNG CHÈN MỤC II (THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU SỐ) ---
        if (content.materials_addition) {
          const matKeywords = [
            "II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", "II. THIẾT BỊ DẠY HỌC",
            "2. Thiết bị dạy học và học liệu", "II. ĐỒ DÙNG DẠY HỌC",
            "THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", "Thiết bị dạy học và học liệu"
          ];

          let matIndex = -1;
          for (const mkw of matKeywords) {
            const idx = findFuzzyIndex(docXml, mkw, scopeStart);
            if (idx !== -1 && idx < scopeEnd) {
              matIndex = idx;
              break;
            }
          }

          if (matIndex !== -1) {
            const currentStyle = detectStyle(docXml, matIndex);
            let rPrBody = `<w:color w:val="${colorHex}"/>`;
            if (currentStyle.fontSize) rPrBody += `<w:sz w:val="${currentStyle.fontSize}"/><w:szCs w:val="${currentStyle.fontSize}"/>`;
            if (currentStyle.fontTag) rPrBody += currentStyle.fontTag;

            let cleanMat = content.materials_addition.replace(/\*\*/g, "").replace(/^[-•+]\s*/, "").trim();
            const matBlockXml = `<w:p>
                                   <w:pPr><w:ind w:left="360"/></w:pPr>
                                   <w:r>
                                     <w:rPr>${rPrBody}</w:rPr>
                                     <w:t xml:space="preserve">- ${escapeXml(cleanMat)}</w:t>
                                   </w:r>
                                 </w:p>`;

            const pEnd = docXml.indexOf("</w:p>", matIndex);
            if (pEnd !== -1) {
              const splitPos = pEnd + "</w:p>".length;
              docXml = docXml.substring(0, splitPos) + matBlockXml + docXml.substring(splitPos);
              scopeEnd += matBlockXml.length;
            }
          }
        }

        // --- 6. CHÈN NỘI DUNG VÀO CÁC HOẠT ĐỘNG ---
        if (Array.isArray(content.activities_enhancement)) {
          content.activities_enhancement.forEach((item, index) => {
            const actName = (item as any).activity_name || (item as any).activity_title || "";
            const actContent = (item as any).enhanced_content || (item as any).content || "";

            if (!actName && !actContent) return;

            let safeName = escapeXml(actName);
            let actIndex = findFuzzyIndex(docXml, safeName, scopeStart);
            if (actIndex >= scopeEnd) actIndex = -1;

            if (actIndex === -1 && safeName) {
              const coreKeywords = [
                "KHỞI ĐỘNG", "MỞ ĐẦU", "XÁC ĐỊNH VẤN ĐỀ",
                "HÌNH THÀNH KIẾN THỨC", "KHÁM PHÁ", "TÌM HIỂU KIẾN THỨC", "ĐỌC HIỂU",
                "LUYỆN TẬP", "THỰC HÀNH", "VẬN DỤNG", "MỞ RỘNG", "GIAO VIỆC VỀ NHÀ"
              ];
              for (const key of coreKeywords) {
                if (safeName.toUpperCase().includes(key)) {
                  const variants = [
                    `HOẠT ĐỘNG ${key.toUpperCase()}`, 
                    `HOẠT ĐỘNG ${key}`,             
                    `${key.toUpperCase()}`
                  ];
                  for (const v of variants) {
                    const found = findFuzzyIndex(docXml, v, scopeStart);
                    if (found !== -1 && found < scopeEnd) {
                      actIndex = found;
                      break;
                    }
                  }
                  if (actIndex === -1) {
                    const found = findFuzzyIndex(docXml, key, scopeStart);
                    if (found !== -1 && found < scopeEnd) {
                      actIndex = found;
                    }
                  }
                  if (actIndex !== -1) break;
                }
              }
            }

            if (actIndex === -1) {
              const matchNum = safeName ? safeName.match(/\d+/) : null;
              const num = matchNum ? matchNum[0] : String(index + 1);
              const variants = [`HOẠT ĐỘNG ${num}`, `Hoạt động ${num}`, `HĐ ${num}`, `HĐ${num}`, `Nhiệm vụ ${num}`];
              for (const v of variants) {
                const found = findFuzzyIndex(docXml, v, scopeStart);
                if (found !== -1 && found < scopeEnd) {
                  actIndex = found;
                  break;
                }
              }
            }

            if (actIndex !== -1) {
              const currentStyle = detectStyle(docXml, actIndex);
              const xmlBlock = createXmlBlock(actContent, currentStyle);

              if (xmlBlock) {
                const tblPos = docXml.indexOf("<w:tbl>", actIndex);
                let targetCellPos = -1;

                if (tblPos !== -1 && tblPos - actIndex < 20000 && tblPos < scopeEnd) {
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
                    "- HS tiến hành", "- HS sử dụng", "- Quan sát, trả lời",
                    "- Nhóm trưởng điều phối", "- Mỗi nhóm được sử dụng",
                    "HS tiến hành", "HS sử dụng", "điện thoại cá nhân",
                    "HS thực hiện nhiệm vụ", "HS thực hiện", "Học sinh thực hiện",
                    "Báo cáo kết quả", "c) Sản phẩm", "Sản phẩm:", "Sản phẩm"
                  ];
                  for (const cKey of cellKeywords) {
                    const foundPos = findFuzzyIndex(docXml, cKey, actIndex);
                    if (foundPos !== -1 && foundPos - actIndex < 18000 && foundPos < scopeEnd) {
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
                    scopeEnd += xmlBlock.length;
                  }
                } else {
                  const headerInsertPos = docXml.indexOf("</w:p>", actIndex);
                  if (headerInsertPos !== -1) {
                    const splitPos = headerInsertPos + "</w:p>".length;
                    docXml = docXml.substring(0, splitPos) + xmlBlock + docXml.substring(splitPos);
                    scopeEnd += xmlBlock.length;
                  }
                }
              }
            }
          });
        }

        // --- 7. TỰ ĐỘNG CHÈN BẢNG TỔNG HỢP NLS/AI VÀO CUỐI PHÂN ĐOẠN HOẶC CUỐI FILE ---
        if (content.summary_table && Array.isArray(content.summary_table) && content.summary_table.length > 0) {
          const tableXml = createSummaryTableXml(content.summary_table);
          if (tableXml) {
            if (scopeEnd < docXml.length - 100) {
              const lastP = docXml.lastIndexOf("</w:p>", scopeEnd);
              const splitPos = lastP !== -1 ? lastP + "</w:p>".length : scopeEnd;
              docXml = docXml.substring(0, splitPos) + tableXml + docXml.substring(splitPos);
            } else {
              const bodyEndTag = "</w:body>";
              const bodyEndIndex = docXml.lastIndexOf(bodyEndTag);
              if (bodyEndIndex !== -1) {
                docXml = docXml.substring(0, bodyEndIndex) + tableXml + docXml.substring(bodyEndIndex);
              }
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
  if (mode === 'NAI') label = "KẾ HOẠCH TÍCH HỢP GIÁO DỤC AI (QĐ 2422/QĐ-BGDĐT)";

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