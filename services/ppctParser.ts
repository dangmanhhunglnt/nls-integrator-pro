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

  const lessonMap = new Map<string, PPCTRow[]>();
  for (const row of ppctRows) {
    const cleanKey = row.baiHoc.trim().toLowerCase();
    if (!lessonMap.has(cleanKey)) {
      lessonMap.set(cleanKey, []);
    }
    lessonMap.get(cleanKey)!.push(row);
  }

  for (const [cleanKey, rowsGroup] of lessonMap.entries()) {
    const realBaiHocName = rowsGroup[0]?.baiHoc || cleanKey;
    
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

    const tietDisplayStr = allTietStrs.join(', ');
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
    const grdNum = grade ? grade.replace(/[^0-9]/g, '') : '11';
    const currentWeek = rowsGroup[0]?.tuan || '1';
    const fileName = `${subStr}${grdNum}_tuan${currentWeek}_tiet_${tietDisplayStr.replace(/[^0-9]/g, '_')}_${cleanTenFile}.docx`;

    results.push({ name: fileName, blob: processedBlob });
  }

  return results;
}

/**
 * 3. HÀM XỬ LÝ THEO TỪNG BÀI ĐỘC LẬP (DÀNH CHO GIAO DIỆN CHỌN BÀI - HỖ TRỢ TÁCH NHÓM TUẦN/TIẾT)
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
  const normalizedTarget = targetLessonName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(c\d+\s*-\s*b\d+\s*-|bai\s*\d+\s*[:.-]?|chuong\s*\d+\s*[:.-]?)/i, '')
    .replace(/[^a-z0-9]/g, '');

  const matchingRows = ppctRows.filter(r => {
    const normalizedBai = r.baiHoc
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^(bai\s*\d+\s*[:.-]?|chuong\s*\d+\s*[:.-]?)/i, '')
      .replace(/[^a-z0-9]/g, '');
    
    return normalizedTarget.includes(normalizedBai) || normalizedBai.includes(normalizedTarget) || normalizedTarget === normalizedBai;
  });

  if (matchingRows.length === 0) {
    throw new Error(`Không tìm thấy bài học tương ứng với "${targetLessonName}" trong dữ liệu PPCT.`);
  }

  // TÁCH NHÓM CÁC HÀNG THEO TUẦN ĐỂ XUẤT RA CÁC FILE RIÊNG BIỆT (VÍ DỤ: TUẦN 4 VÀ TUẦN 5)
  const weekMap = new Map<string, PPCTRow[]>();
  for (const row of matchingRows) {
    const w = row.tuan || '1';
    if (!weekMap.has(w)) {
      weekMap.set(w, []);
    }
    weekMap.get(w)!.push(row);
  }

  const results: { name: string; blob: Blob }[] = [];
  const realLessonName = matchingRows[0]?.baiHoc || targetLessonName;

  // Duyệt qua từng tuần xuất ra 1 file riêng biệt theo đúng chuẩn thầy yêu cầu
  for (const [weekNum, weekRows] of weekMap.entries()) {
    let totalTietCount = 0;
    const allTietStrs: string[] = [];
    for (const r of weekRows) {
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

    // QUÉT CỘT GHI CHÚ CỦA TUẦN ĐÓ: NẾU CÓ NLS/AI/STEM THÌ CHÈN, NẾU TRỐNG THÌ XÓA SẠCH ĐƯA VỀ CHUẨN 5512
    const combinedGhiChu = weekRows.map(r => r.ghiChu || '').join(' ').toUpperCase();
    
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

    if (hasIntegration) {
      try {
        content = await generateAIContentCallback(realLessonName, mode);
      } catch (err) {
        console.warn("Lỗi gọi AI sinh nội dung:", err);
      }
    }

    const tietDisplayStr = allTietStrs.join(', ');
    
    // Lấy tổng hợp tất cả các tiết trong toàn bài từ matchingRows để đưa vào phần ngoặc (PPCT: 10-11, 13)
    const allGlobalTietNumbers: string[] = [];
    matchingRows.forEach(r => {
      if (r.tiet) {
        const cleaned = r.tiet.replace(/\s+/g, '');
        if (cleaned.includes('-')) {
          const parts = cleaned.split('-');
          const start = parseInt(parts[0]);
          const end = parseInt(parts[1]);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              allGlobalTietNumbers.push(i.toString());
            }
          }
        } else {
          allGlobalTietNumbers.push(cleaned);
        }
      }
    });
    const globalUniqueTietStr = Array.from(new Set(allGlobalTietNumbers)).join(', ');

    // Định dạng chuỗi thời gian thực hiện chuẩn xác theo đúng yêu cầu mẫu của thầy
    const headerInfoText = `Thời gian thực hiện: ${totalTietCount < 10 ? '0' + totalTietCount : totalTietCount} tiết (Tuần ${weekNum} dạy Tiết ${tietDisplayStr} theo PPCT: ${globalUniqueTietStr})`;

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
    const grdNum = grade ? grade.replace(/[^0-9]/g, '') : '11';
    
    const fileName = `${subStr}${grdNum}_tuan${weekNum}_tiet_${tietDisplayStr.replace(/[^0-9]/g, '_')}_${cleanTenFile}.docx`;

    results.push({ name: fileName, blob: processedBlob });
  }

  return results;
}

// Lấy danh sách các bài học duy nhất từ PPCT để đưa vào ô chọn thủ công
export async function getUniqueLessonsFromPPCT(ppctFile: File): Promise<string[]> {
  const rows = await parsePPCTDocument(ppctFile);
  const uniqueLessons: string[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    if (r.baiHoc && r.baiHoc.trim().length > 2) {
      const cleanName = r.baiHoc.trim();
      const key = cleanName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLessons.push(cleanName);
      }
    }
  }
  return uniqueLessons;
}