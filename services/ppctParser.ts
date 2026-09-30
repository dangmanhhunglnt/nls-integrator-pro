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
 * 1. HÀM BÓC TÁCH DỮ LIỆU TỪ BẢNG PPCT (.DOCX) - CHUẨN XÁC TUYỆT ĐỐI
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
  let currentBaiHoc = "";

  for (let i = 1; i < trMatches.length; i++) {
    const tr = trMatches[i];
    if (!tr) continue;
    
    const tcMatches = tr.match(/<w:tc\b[\s\S]*?<\/w:tc>/gi);
    if (!tcMatches || tcMatches.length < 3) continue;

    const tuanRaw = extractCellText(tcMatches[0]);
    if (tuanRaw && /\d+/.test(tuanRaw)) {
      currentTuan = tuanRaw.replace(/[^0-9]/g, '');
    }

    const tiet = extractCellText(tcMatches[1]);
    const baiHocRaw = extractCellText(tcMatches[2]);
    
    // Nếu dòng dưới bị gộp ô (tên bài trống), giữ lại tên bài của dòng trên
    if (baiHocRaw && baiHocRaw.length > 2 && !baiHocRaw.toLowerCase().includes('bài học') && !baiHocRaw.toLowerCase().includes('nội dung')) {
      currentBaiHoc = baiHocRaw;
    }

    const noiDung = tcMatches.length > 3 ? extractCellText(tcMatches[3]) : '';
    const ghiChu = tcMatches.length > 4 ? extractCellText(tcMatches[4]) : '';

    if (tiet && currentBaiHoc) {
      rows.push({
        tuan: currentTuan,
        tiet: tiet,
        baiHoc: currentBaiHoc,
        noiDung: noiDung,
        ghiChu: ghiChu
      });
    }
  }

  return rows;
}

export async function parsePPCTDirectFromZip(file: File, _textContext?: any, _fileName?: string) {
  const rows = await parsePPCTDocument(file);
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
 * 2. HÀM XỬ LÝ HÀNG LOẠT THEO TỪNG BÀI ĐỘC LẬP (MỖI BÀI 1 FILE CHUẨN XÁC)
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
    throw new Error("Không tìm thấy dữ liệu hàng nào trong bảng PPCT.");
  }

  const results: { name: string; blob: Blob }[] = [];

  // GOM NHÓM CHÍNH XÁC THEO TÊN BÀI HỌC (LOẠI BỎ HOÀN TOÀN TÌNH TRẠNG 1 BÀI TẠO RA NHIỀU FILE DƯ THỪA)
  const lessonMap = new Map<string, PPCTRow[]>();
  for (const row of ppctRows) {
    const cleanKey = row.baiHoc.trim().toLowerCase();
    if (!lessonMap.has(cleanKey)) {
      lessonMap.set(cleanKey, []);
    }
    lessonMap.get(cleanKey)!.push(row);
  }

  // Duyệt qua từng bài học duy nhất
  for (const [cleanKey, rowsGroup] of lessonMap.entries()) {
    const realBaiHocName = rowsGroup[0]?.baiHoc || cleanKey;
    
    // Tính tổng số tiết thực tế của bài học từ các cột tiết (ví dụ: "1-2" và "4" -> tổng 3 tiết)
    let totalTietCount = 0;
    const allTietStrs: string[] = [];
    for (const r of rowsGroup) {
      if (r.tiet) {
        allTietStrs.push(r.tiet);
        const parts = r.tiet.replace(/[^0-9-]/g, '').split('-');
        if (parts.length >= 2 && parts[0] && parts[1]) {
          totalTietCount += Math.abs(parseInt(parts[1]) - parseInt(parts[0])) + 1;
        } else if (parts.length === 1 && parts[0]) {
          totalTietCount += 1;
        }
      }
    }
    if (totalTietCount === 0) totalTietCount = 1;

    // Tổng hợp ghi chú toàn bài để quét tích hợp NLS, AI hoặc STEM
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

    if (hasIntegration) {
      try {
        content = await generateAIContentCallback(realBaiHocName, mode);
      } catch (err) {
        console.warn("Lỗi gọi AI sinh nội dung:", err);
      }
    }

    // Chuẩn bị thông tin thời gian thực hiện cho bài học
    const tietDisplayStr = allTietStrs.join(', ');
    const firstWeek = rowsGroup[0]?.tuan || '1';
    const headerInfoText = `Thời gian thực hiện: ${totalTietCount < 10 ? '0' + totalTietCount : totalTietCount} tiết (PPCT Tiết: ${tietDisplayStr})`;

    const processedBlob = await injectContentIntoDocx(
      templateDocxFile,
      content,
      hasIntegration ? mode : 'NLS',
      () => {},
      colorHex,
      headerInfoText
    );

    const cleanTenFile = realBaiHocName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');

    const subStr = subject ? subject.toLowerCase().replace(/[^a-z0-9]/g, '') : 'mon';
    const grdStr = grade ? grade.replace(/[^0-9]/g, '') : '10';
    const fileName = `${subStr}${grdStr}_tuan${firstWeek}_${cleanTenFile}.docx`;

    results.push({ name: fileName, blob: processedBlob });
  }

  return results;
}

/**
 * 3. HÀM XỬ LÝ THEO TỪNG BÀI ĐỘC LẬP (DÀNH CHO GIAO DIỆN CHỌN BÀI)
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
  // Chuẩn hóa tên file giáo án để so sánh linh hoạt (bỏ dấu, bỏ ký tự đặc biệt, viết thường)
  const cleanTarget = targetLessonName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');

  const matchingRows = ppctRows.filter(r => {
    const cleanBai = r.baiHoc
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');
    
    // Kiểm tra chéo: Tên file chứa tên PPCT hoặc tên PPCT chứa tên file
    return cleanTarget.includes(cleanBai) || cleanBai.includes(cleanTarget);
  });

  if (matchingRows.length === 0) {
    throw new Error(`Không tìm thấy bài học tương ứng với "${targetLessonName}" trong dữ liệu PPCT.`);
  }

  let totalTietCount = 0;
  const allTietStrs: string[] = [];
  for (const r of matchingRows) {
    if (r.tiet) {
      allTietStrs.push(r.tiet);
      const parts = r.tiet.replace(/[^0-9-]/g, '').split('-');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        totalTietCount += Math.abs(parseInt(parts[1]) - parseInt(parts[0])) + 1;
      } else if (parts.length === 1 && parts[0]) {
        totalTietCount += 1;
      }
    }
  }
  if (totalTietCount === 0) totalTietCount = 1;

  const combinedGhiChu = matchingRows.map(r => r.ghiChu || '').join(' ').toUpperCase();
  
  let mode: IntegrationMode = 'NLS';
  let hasIntegration = false;

  if (combinedGhiChu.includes('STEM')) {
    mode = 'STEM';
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

  const realLessonName = matchingRows[0]?.baiHoc || targetLessonName;

  if (hasIntegration) {
    try {
      content = await generateAIContentCallback(realLessonName, mode);
    } catch (err) {
      console.warn("Lỗi gọi AI sinh nội dung:", err);
    }
  }

  const tietDisplayStr = allTietStrs.join(', ');
  const firstWeek = matchingRows[0]?.tuan || '1';
  const headerInfoText = `Thời gian thực hiện: ${totalTietCount < 10 ? '0' + totalTietCount : totalTietCount} tiết (PPCT Tiết: ${tietDisplayStr})`;

  const processedBlob = await injectContentIntoDocx(
    templateDocxFile,
    content,
    hasIntegration ? mode : 'NLS',
    () => {},
    colorHex,
    headerInfoText
  );

  const cleanTenFile = realLessonName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');

  const subStr = subject ? subject.toLowerCase().replace(/[^a-z0-9]/g, '') : 'mon';
  const grdStr = grade ? grade.replace(/[^0-9]/g, '') : '11';
  const fileName = `${subStr}${grdStr}_tuan${firstWeek}_${cleanTenFile}.docx`;

  return [{ name: fileName, blob: processedBlob }];
}