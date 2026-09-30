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
 * 1. HÀM BÓC TÁCH DỮ LIỆU TỪ BẢNG PPCT (.DOCX) - THÔNG MINH & CHỐNG LỖI TUYỆT ĐỐI
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

  const extractCellText = (tcXml: string) => {
    if (!tcXml) return "";
    const tMatches = tcXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi);
    if (!tMatches) return "";
    return tMatches.map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
  };

  let currentTuan = "1";

  for (let i = 1; i < trMatches.length; i++) {
    const tr = trMatches[i];
    if (!tr) continue;
    
    const tcMatches = tr.match(/<w:tc\b[\s\S]*?<\/w:tc>/gi);
    if (!tcMatches || tcMatches.length < 3) continue;

    // Cột 0: Tuần (nếu dòng dưới bị gộp ô trống thì giữ lại tuần của dòng trên)
    const tuanRaw = extractCellText(tcMatches[0]);
    if (tuanRaw && /\d+/.test(tuanRaw)) {
      currentTuan = tuanRaw.replace(/[^0-9]/g, '');
    }

    // Cột 1: Tiết (ví dụ: 1, 2, 1-2, 7-8...)
    const tiet = extractCellText(tcMatches[1]);
    
    // Cột 2: Tên bài học
    const baiHoc = extractCellText(tcMatches[2]);
    
    // Cột 3: Nội dung chi tiết
    const noiDung = tcMatches.length > 3 ? extractCellText(tcMatches[3]) : '';
    
    // Cột 4: Ghi chú (chứa từ khóa STEM, NLS, AI...)
    const ghiChu = tcMatches.length > 4 ? extractCellText(tcMatches[4]) : '';

    // Chỉ lấy các dòng có thông tin Tiết và Tên bài học hợp lệ
    if (tiet && baiHoc && !baiHoc.toLowerCase().includes('bài học') && !baiHoc.toLowerCase().includes('nội dung')) {
      rows.push({
        tuan: currentTuan,
        tiet: tiet,
        baiHoc: baiHoc,
        noiDung: noiDung,
        ghiChu: ghiChu
      });
    }
  }

  return rows;
}

export async function parsePPCTDirectFromZip(file: File, textContext?: any, fileName?: string) {
  const rows = await parsePPCTDocument(file);
  // Chuyển đổi dữ liệu sang định dạng mà giao diện cũ trong App.tsx đang cần để đọc .length an toàn
  const schedules = rows.map(r => ({
    week: r.tuan,
    periodDisplay: r.tiet,
    title: r.baiHoc,
    content: r.noiDung,
    requirementNote: r.ghiChu
  }));
  return {
    totalPeriods: schedules.length,
    schedules: schedules
  };
}

/**
 * 2. HÀM XỬ LÝ HÀNG LOẠT VÀ XUẤT FILE GIÁO ÁN TỰ ĐỘNG (VẠN NĂNG - GIỮ NGUYÊN BẢN CŨ)
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
  if (!ppctRows || ppctRows.length === 0) {
    throw new Error("Không tìm thấy dữ liệu hàng nào trong bảng PPCT. Thầy kiểm tra lại file .docx nhé.");
  }

  const results: { name: string; blob: Blob }[] = [];

  // Nhóm các dòng theo Tên bài học để xử lý trường hợp 1 bài học rải rác qua nhiều tuần/nhiều dòng PPCT
  const lessonMap = new Map<string, PPCTRow[]>();
  for (const row of ppctRows) {
    const key = row.baiHoc.trim();
    if (!lessonMap.has(key)) {
      lessonMap.set(key, []);
    }
    lessonMap.get(key)!.push(row);
  }

  // Duyệt qua từng bài học độc lập
  for (const [baiHocName, rowsGroup] of lessonMap.entries()) {
    // Tổng hợp ghi chú của cả bài học xem có tích hợp gì không
    const combinedGhiChu = rowsGroup.map(r => r.ghiChu || '').join(' ').toUpperCase();
    
    let mode: IntegrationMode = 'NLS';
    let hasIntegration = false;

    if (combinedGhiChu.includes('STEM')) {
      mode = 'STEM';
      hasIntegration = true;
    } else if (combinedGhiChu.includes('NLS & AI') || (combinedGhiChu.includes('NLS') && combinedGhiChu.includes('AI'))) {
      mode = 'NLS';
      hasIntegration = true;
    } else if (combinedGhiChu.includes('NLS')) {
      mode = 'NLS';
      hasIntegration = true;
    } else if (combinedGhiChu.includes('AI')) {
      mode = 'NAI';
      hasIntegration = true;
    }

    let content: GeneratedNLSContent = {
      objectives_addition: '',
      materials_addition: '',
      activities_enhancement: [],
      summary_table: []
    };

    // Nếu có tích hợp, gọi AI sinh nội dung chuẩn hóa một lần cho bài học đó
    if (hasIntegration) {
      try {
        content = await generateAIContentCallback(baiHocName, mode);
      } catch (err) {
        console.warn("Lỗi gọi AI sinh nội dung, dùng chuẩn 5512 mặc định:", err);
      }
    } else {
      content = {
        objectives_addition: '',
        materials_addition: '',
        activities_enhancement: [],
        summary_table: []
      };
    }

    // Xử lý từng dòng phân phối tương ứng với từng tuần
    for (const row of rowsGroup) {
      const tietClean = (row.tiet || '1').replace(/[^0-9-]/g, '');
      let soTietCount = 1;
      if (tietClean.includes('-')) {
        const parts = tietClean.split('-');
        if (parts && parts.length >= 2 && parts[0] && parts[1]) {
          soTietCount = Math.abs(parseInt(parts[1]) - parseInt(parts[0])) + 1;
        }
      }

      const headerInfoText = `Thời gian thực hiện: ${soTietCount < 10 ? '0' + soTietCount : soTietCount} tiết (Tuần ${row.tuan || '1'} dạy Tiết ${row.tiet || '1'})`;

      const processedBlob = await injectContentIntoDocx(
        templateDocxFile,
        content,
        hasIntegration ? mode : 'NLS',
        () => {},
        colorHex,
        headerInfoText
      );

      const cleanTenBai = (baiHocName || 'baihoc')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');

      const subStr = subject ? subject.toLowerCase().replace(/[^a-z0-9]/g, '') : 'mon';
      const grdStr = grade ? grade.replace(/[^0-9]/g, '') : '10';
      const tuanStr = `tuan${(row.tuan || '1').replace(/[^0-9]/g, '') || '1'}`;
      const tietStr = `tiet${tietClean || '1'}`;
      
      const fileName = `${subStr}${grdStr}_${tuanStr}_${tietStr}_${cleanTenBai}.docx`;

      results.push({ name: fileName, blob: processedBlob });
    }
  }

  return results;
}

/**
 * 3. HÀM BỔ SUNG: XỬ LÝ THEO TỪNG BÀI ĐỘC LẬP (ĐẢM BẢO KHÔNG ẢNH HƯỞNG HÀM CŨ)
 * Giúp giáo viên chọn/xử lý đúng 1 bài học từ file PPCT, tự động phân rã đúng tuần/tiết
 * mà vẫn giữ nguyên vẹn cấu trúc cốt lõi chuẩn 5512 của bài học đó.
 */
export async function processSingleLessonFromPPCT(
  ppctRows: PPCTRow[],
  targetLessonName: string,
  templateDocxFile: File,
  subject: string,
  grade: string,
  colorHex: HighlightColor,
  generateAIContentCallback: (baihoc: string, mode: IntegrationMode) => Promise<GeneratedNLSContent>
): Promise<{ name: string; blob: Blob }[]> {
  const matchingRows = ppctRows.filter(r => 
    r.baiHoc.toLowerCase().includes(targetLessonName.toLowerCase().trim())
  );

  if (matchingRows.length === 0) {
    throw new Error(`Không tìm thấy bài học "${targetLessonName}" trong dữ liệu PPCT.`);
  }

  // Quét ghi chú toàn bài để nhận diện tích hợp NLS, AI hoặc STEM
  const combinedGhiChu = matchingRows.map(r => r.ghiChu || '').join(' ').toUpperCase();
  
  let mode: IntegrationMode = 'NLS';
  let hasIntegration = false;

  if (combinedGhiChu.includes('STEM')) {
    mode = 'STEM';
    hasIntegration = true;
  } else if (combinedGhiChu.includes('NLS & AI') || (combinedGhiChu.includes('NLS') && combinedGhiChu.includes('AI'))) {
    mode = 'NLS';
    hasIntegration = true;
  } else if (combinedGhiChu.includes('NLS')) {
    mode = 'NLS';
    hasIntegration = true;
  } else if (combinedGhiChu.includes('AI')) {
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
      content = await generateAIContentCallback(targetLessonName, mode);
    } catch (err) {
      console.warn("Lỗi gọi AI sinh nội dung, dùng chuẩn 5512 mặc định:", err);
    }
  }

  const results: { name: string; blob: Blob }[] = [];

  for (const row of matchingRows) {
    const tietClean = (row.tiet || '1').replace(/[^0-9-]/g, '');
    let soTietCount = 1;
    if (tietClean.includes('-')) {
      const parts = tietClean.split('-');
      if (parts && parts.length >= 2 && parts[0] && parts[1]) {
        soTietCount = Math.abs(parseInt(parts[1]) - parseInt(parts[0])) + 1;
      }
    }

    // Tiêu đề thời gian thực hiện đồng bộ theo đúng chuẩn tuần/tiết thực tế
    const headerInfoText = `Thời gian thực hiện: ${soTietCount < 10 ? '0' + soTietCount : soTietCount} tiết (Tuần ${row.tuan || '1'} dạy Tiết ${row.tiet || '1'})`;

    const processedBlob = await injectContentIntoDocx(
      templateDocxFile,
      content,
      hasIntegration ? mode : 'NLS',
      () => {},
      colorHex,
      headerInfoText
    );

    const cleanTenBai = (targetLessonName || 'baihoc')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');

    const subStr = subject ? subject.toLowerCase().replace(/[^a-z0-9]/g, '') : 'mon';
    const grdStr = grade ? grade.replace(/[^0-9]/g, '') : '11';
    const tuanStr = `tuan${(row.tuan || '1').replace(/[^0-9]/g, '') || '1'}`;
    const tietStr = `tiet${tietClean || '1'}`;
    
    const fileName = `${subStr}${grdStr}_${tuanStr}_${tietStr}_${cleanTenBai}.docx`;

    results.push({ name: fileName, blob: processedBlob });
  }

  return results;
}