import PizZip from 'pizzip';
import { GeneratedNLSContent, IntegrationMode, HighlightColor } from '../types';
import { injectContentIntoDocx } from './docxManipulator';

export interface PPCTRow {
  tuan: string;
  tiet: string;
  baiHoc: string;
  noiDung: string;
  ghiChu: string;
}

/**
 * 1. HÀM BÓC TÁCH DỮ LIỆU TỪ BẢNG PPCT (.DOCX)
 */
export async function parsePPCTDocument(ppctFile: File): Promise<PPCTRow[]> {
  const arrayBuffer = await ppctFile.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("File PPCT không hợp lệ (thiếu document.xml)");

  const docXml = docFile.asText();
  const rows: PPCTRow[] = [];

  const trMatches = docXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/gi);
  if (!trMatches || trMatches.length <= 1) return rows;

  for (let i = 1; i < trMatches.length; i++) {
    const tr = trMatches[i];
    const tcMatches = tr.match(/<w:tc\b[\s\S]*?<\/w:tc>/gi);
    if (!tcMatches || tcMatches.length < 5) continue;

    const extractCellText = (tcXml: string) => {
      const tMatches = tcXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi);
      if (!tMatches) return "";
      return tMatches.map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
    };

    const tuan = extractCellText(tcMatches[0]);
    const tiet = extractCellText(tcMatches[1]);
    const baiHoc = extractCellText(tcMatches[2]);
    const noiDung = extractCellText(tcMatches[3]);
    const ghiChu = extractCellText(tcMatches[4]);

    if (tiet && baiHoc) {
      rows.push({ tuan, tiet, baiHoc, noiDung, ghiChu });
    }
  }

  return rows;
}

export async function parsePPCTDirectFromZip(file: File, textContext?: any, fileName?: string) {
  return await parsePPCTDocument(file);
}

/**
 * 2. HÀM XỬ LÝ HÀNG LOẠT VÀ XUẤT FILE GIÁO ÁN TỰ ĐỘNG (VẠN NĂNG)
 */
export async function processBatchPPCT(
  ppctFile: File,
  templateDocxFile: File,
  subject: string,
  grade: string,
  colorHex: HighlightColor,
  generateAIContentCallback: (baihoc: string, mode: IntegrationMode) => Promise<GeneratedNLSContent>
): Promise<{ name: string; blob: Blob }[]> {
  const ppctRows = await parsePPCTDocument(ppctFile);
  const results: { name: string; blob: Blob }[] = [];

  for (const row of ppctRows) {
    let mode: IntegrationMode = 'NLS';
    let hasIntegration = false;
    const gcUpper = row.ghiChu.toUpperCase();

    if (gcUpper.includes('STEM')) {
      mode = 'STEM';
      hasIntegration = true;
    } else if (gcUpper.includes('NLS & AI') || (gcUpper.includes('NLS') && gcUpper.includes('AI'))) {
      mode = 'NLS';
      hasIntegration = true;
    } else if (gcUpper.includes('NLS')) {
      mode = 'NLS';
      hasIntegration = true;
    } else if (gcUpper.includes('AI')) {
      mode = 'NAI';
      hasIntegration = true;
    }

    let content: GeneratedNLSContent = {
      objectives_addition: '',
      materials_addition: '',
      activities_enhancement: [],
      summary_table: []
    };

    if (hasIntegration) {
      try {
        content = await generateAIContentCallback(row.baiHoc, mode);
      } catch (err) {
        console.warn("Lỗi gọi AI sinh nội dung, dùng chuẩn 5512 mặc định:", err);
      }
    }

    const tietClean = row.tiet.replace(/[^0-9-]/g, '');
    let soTietCount = 1;
    if (tietClean.includes('-')) {
      const parts = tietClean.split('-');
      soTietCount = Math.abs(parseInt(parts[1]) - parseInt(parts[0])) + 1;
    }

    const headerInfoText = `Thời gian thực hiện: ${soTietCount < 10 ? '0' + soTietCount : soTietCount} tiết (Tuần ${row.tuan} dạy Tiết ${row.tiet})`;

    // Gọi hàm chèn chuẩn với 5 tham số tương thích hệ thống
    const processedBlob = await injectContentIntoDocx(
      templateDocxFile,
      content,
      mode,
      () => {},
      colorHex,
      headerInfoText
    );

    const cleanTenBai = row.baiHoc
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');

    const subStr = subject ? subject.toLowerCase().replace(/[^a-z0-9]/g, '') : 'mon';
    const grdStr = grade ? grade.replace(/[^0-9]/g, '') : '10';
    const tuanStr = `tuan${row.tuan.replace(/[^0-9]/g, '') || '1'}`;
    const tietStr = `tiet${tietClean || '1'}`;
    
    const fileName = `${subStr}${grdStr}_${tuanStr}_${tietStr}_${cleanTenBai}.docx`;

    results.push({ name: fileName, blob: processedBlob });
  }

  return results;
}