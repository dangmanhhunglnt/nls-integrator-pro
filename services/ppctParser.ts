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
 * 1. HÀM BÓC TÁCH DỮ LIỆU TỪ BẢNG PPCT (.DOCX) - TỐI ƯU CHỐNG NHẢY TRANG / NGẮT TRANG
 */
export async function parsePPCTDocument(ppctFile: File): Promise<PPCTRow[]> {
  const arrayBuffer = await ppctFile.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("File PPCT không hợp lệ (thiếu document.xml)");

  const docXml = docFile.asText();
  const rows: PPCTRow[] = [];

  // Quét tất cả các dòng (w:tr) trong toàn bộ file Word, bất kể nằm ở trang nào hay bị ngắt trang
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
    
    // Kể cả khi sang trang mới mà tên bài bị để trống (w:tc bị ngắt trang gộp ô), 
    // hệ thống vẫn giữ lại currentBaiHoc của trang trước đó để không bị mất mát dữ liệu
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

// Hàm bổ trợ lấy tên môn học an toàn để tên file luôn hiển thị dạng Toan11 chuẩn xác
function getSafeSubjectStr(_subject: string): string {
  return 'Toan';
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

    // BỔ SUNG LOGIC NHẬN DIỆN LINH HOẠT CẢ AI, NLS VÀ STEM TỪ CỘT GHI CHÚ PPCT
    if (combinedGhiChu.includes('STEM')) {
      mode = 'STEM';
      hasIntegration = true;
    } else if (combinedGhiChu.includes('AI') || combinedGhiChu.includes('TRÍ TUỆ NHÂN TẠO')) {
      mode = 'NAI';
      hasIntegration = true;
    } else if (combinedGhiChu.includes('NLS') || combinedGhiChu.includes('NĂNG LỰC SỐ')) {
      mode = 'NLS';
      hasIntegration = true;
    }

    const tietDisplayStr = allTietStrs.join(', ');

    // Xây dựng bảng tóm tắt chi tiết từng tiết từ các hàng PPCT của bài học này
    const summary_table = rowsGroup.map((r: any) => ({
      tiet: String(r.tiet || '').trim(),
      content: String(r.noiDung || '').trim()
    })).filter(item => item.tiet && item.content);

    let content: GeneratedNLSContent & { raw_content?: string } = {
      objectives_addition: '',
      materials_addition: '',
      activities_enhancement: [],
      summary_table: summary_table as any,
      raw_content: rowsGroup.map((r: any) => `Tiết ${r.tiet}: ${r.noiDung}`).join('\n')
    };

    if (hasIntegration) {
      try {
        const lessonContextName = `${realBaiHocName} (Thời lượng: ${totalTietCount} tiết, Tiết theo PPCT: ${tietDisplayStr})`;
        content = await generateAIContentCallback(lessonContextName, mode);
      } catch (err) {
        console.warn("Lỗi gọi AI sinh nội dung:", err);
      }
    }

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

    const subStr = getSafeSubjectStr(subject);
    const grdNum = grade ? grade.replace(/[^0-9]/g, '') : '11';
    const currentWeek = rowsGroup[0]?.tuan || '1';
    const fileName = `${subStr}${grdNum}_tuan${currentWeek}_tiet_${tietDisplayStr.replace(/[^0-9]/g, '_')}_${cleanTenFile}.docx`;

    results.push({ name: fileName, blob: processedBlob });
  }

  return results;
}

/**
 * 3. HÀM XỬ LÝ THEO TỪNG BÀI ĐỘC LẬP (DÀNH CHO GIAO DIỆN CHỌN BÀI - ĐÃ KHẮC PHỤC LỖI NHẬN DẠNG NHẦM BÀI)
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
  // Chuẩn hóa tên bài học mục tiêu thật sạch sẽ
  const cleanTarget = targetLessonName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(bài|chương)\s*\d+[\.,\s*]*/gi, '')
    .trim();

  // LỌC CHÍNH XÁC TUYỆT ĐỐI TÊN BÀI HỌC (TRÁNH BỊ GỌM NHẦM CÁC BÀI CÓ CHỪA TỪ KHÓA CON NHƯ "DÃY SỐ" TRONG "GIỚI HẠN DÃY SỐ")
  const matchingRows = ppctRows.filter(r => {
    const cleanRowName = (r.baiHoc || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^(bài|chương)\s*\d+[\.,\s*]*/gi, '')
      .trim();
    
    if (!cleanRowName) return false;

    // So sánh khớp chính xác tên bài, hoặc tên bài trong PPCT bắt đầu bằng đúng tên mục tiêu nhưng không bị dính chùm bài khác
    return cleanRowName === cleanTarget || cleanRowName === `bài ${cleanTarget}` || (cleanRowName.startsWith(cleanTarget) && cleanRowName.length - cleanTarget.length < 5);
  });

  if (matchingRows.length === 0) {
    throw new Error(`Không tìm thấy bài học tương ứng với "${targetLessonName}" trong dữ liệu PPCT.`);
  }

  // TÍNH TOÁN TỔNG SỐ TIẾT TOÀN BỘ BÀI HỌC TỪ matchingRows MỘT LẦN DUY NHẤT
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

  // Xây dựng bảng tóm tắt chi tiết toàn bộ các tiết của bài học (dùng chung cho mọi tuần)
  const globalSummaryTable = matchingRows.map((r: any) => ({
    tiet: String(r.tiet || '').trim(),
    content: String(r.noiDung || '').trim(),
    requirementNote: String(r.ghiChu || '').trim()
  })).filter(item => item.tiet && item.content);

  // TÁCH NHÓM CÁC HÀNG THEO TUẦN ĐỂ XUẤT RA CÁC FILE RIÊNG BIỆT
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

  for (const [weekNum, weekRows] of weekMap.entries()) {
    const tietDisplayStr = weekRows.map(r => r.tiet).join(', ');

    // QUÉT CỘT GHI CHÚ
    const combinedGhiChu = weekRows.map(r => r.ghiChu || '').join(' ').toUpperCase();
    
    let mode: IntegrationMode = 'NLS';
    let hasIntegration = false;

    if (combinedGhiChu.includes('STEM')) {
      mode = 'STEM';
      hasIntegration = true;
    } else if (combinedGhiChu.includes('AI') || combinedGhiChu.includes('TRÍ TUỆ NHÂN TẠO')) {
      mode = 'NAI';
      hasIntegration = true;
    } else if (combinedGhiChu.includes('NLS') || combinedGhiChu.includes('NĂNG LỰC SỐ')) {
      mode = 'NLS';
      hasIntegration = true;
    }

    let content: GeneratedNLSContent & { raw_content?: string } = {
      objectives_addition: '',
      materials_addition: '',
      activities_enhancement: [],
      summary_table: globalSummaryTable as any,
      raw_content: matchingRows.map((r: any) => `Tiết ${r.tiet}: ${r.noiDung}`).join('\n')
    };

    if (hasIntegration) {
      try {
        const lessonContextName = `${realLessonName} (Thời lượng: ${totalTietCount} tiết, Tiết theo PPCT: ${tietDisplayStr}). Yêu cầu tích hợp chuyên môn thực tiễn: ${combinedGhiChu || 'Chuẩn 5512'}`;
        content = await generateAIContentCallback(lessonContextName, mode);
        if (!content.summary_table || (content.summary_table as any).length === 0) {
          content.summary_table = globalSummaryTable as any;
        }
      } catch (err) {
        console.warn("Lỗi gọi AI sinh nội dung:", err);
      }
    }

    // Định dạng chuỗi thời gian thực hiện chuẩn xác với tổng số tiết toàn bài
    const headerInfoText = `Thời gian thực hiện: ${totalTietCount < 10 ? '0' + totalTietCount : totalTietCount} tiết (Tuần ${weekNum} dạy Tiết ${tietDisplayStr} theo PPCT: ${allTietStrs.join(', ')})`;

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

    const subStr = getSafeSubjectStr(subject);
    const grdNum = grade ? grade.replace(/[^0-9]/g, '') : '11';
    
    const fileName = `${subStr}${grdNum}_tuan${weekNum}_tiet_${tietDisplayStr.replace(/[^0-9]/g, '_')}_${cleanTenFile}.docx`;

    results.push({ name: fileName, blob: processedBlob });
  }

  return results;
}

// Lấy danh sách các bài học duy nhất từ PPCT (Loại bỏ hoàn toàn các bài bị lặp tên)
export async function getUniqueLessonsFromPPCT(ppctFile: File): Promise<string[]> {
  const rows = await parsePPCTDocument(ppctFile);
  const uniqueLessons: string[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    if (r.baiHoc && r.baiHoc.trim().length > 2) {
      const cleanName = r.baiHoc.trim();
      const lowerKey = cleanName.toLowerCase();
      
      // Bỏ qua các dòng rác, tiêu đề bảng nhưng GIỮ LẠI các bài Ôn tập / Bài tập cuối chương
      if (
        lowerKey.includes('nội dung') ||
        lowerKey.includes('tên bài') ||
        lowerKey.includes('ghi chú') ||
        lowerKey.includes('tiết số') ||
        lowerKey.startsWith('câu ') ||
        (lowerKey.startsWith('chương') && !lowerKey.includes('ôn tập') && !lowerKey.includes('cuối chương'))
      ) {
        continue;
      }

      // Chuẩn hóa key để loại bỏ các bài trùng tên hệt nhau
      const normalizationKey = lowerKey
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');

      if (!seen.has(normalizationKey)) {
        seen.add(normalizationKey);
        uniqueLessons.push(cleanName);
      }
    }
  }
  return uniqueLessons;
}