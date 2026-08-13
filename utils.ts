import PizZip from 'pizzip';
import { IntegrationMode } from './types';

// 1. CHIẾN LƯỢC NLS THEO MÔN HỌC (CHUẨN BỘ GD&ĐT GDPT 2018)
const SUBJECT_STRATEGIES: Record<string, string> = {
  "Toán": "Tư duy tính toán & Mô hình hóa. Ưu tiên: GeoGebra, Desmos, Excel, Azota, Máy tính cầm tay giả lập.",
  "Ngữ Văn": "Sáng tạo & Văn hóa đọc số. Ưu tiên: Padlet, Canva, PowerPoint, E-book, Chatbot AI đóng vai nhân vật.",
  "Tiếng Anh": "Giao tiếp & Tự học. Ưu tiên: Quizizz, Google Forms, YouTube, Ozdic, Luyện hội thoại với AI.",
  "Vật Lí": "Thí nghiệm ảo & Mô phỏng. Ưu tiên: PhET Simulations, Excel, Video thí nghiệm vật lý 3D.",
  "Hóa Học": "Trực quan hóa chất. Ưu tiên: Bảng tuần hoàn Ptable, PhET, Video mô phỏng phản ứng an toàn.",
  "Sinh Học": "Thế giới sống & Mô hình sinh học. Ưu tiên: Google Earth, Video 3D tế bào/cơ thể, Học liệu số.",
  "Lịch Sử": "Tư duy thời gian & Di sản số. Ưu tiên: Google Maps, Bảo tàng ảo 3D, Sơ đồ tiến trình Timeline.",
  "Địa Lí": "Bản đồ số & Địa lý không gian. Ưu tiên: Google Maps, Google Earth Pro, Worldometer, GIS.",
  "Tin Học": "Tư duy máy tính & Công nghệ thông tin. Ưu tiên: Python, Scratch, Code.org, Sơ đồ tư duy số.",
  "Công nghệ": "Thiết kế kỹ thuật & Đổi mới sáng tạo. Ưu tiên: Mô phỏng 3D, CAD/CAM, Tinkercad, Chatbot AI tra cứu.",
  "Âm Nhạc": "Sáng tạo âm thanh số. Ưu tiên: Phần mềm làm nhạc, Video hòa tấu số, Canva.",
  "Mỹ Thuật": "Sáng tạo mỹ thuật số. Ưu tiên: Canva, Paint 3D, Phần mềm xử lý ảnh.",
  "Giáo dục thể chất": "Sức khỏe số & Phân tích động tác. Ưu tiên: Video phân tích kỹ thuật, App đếm nhịp tim/vận động."
};

// 2. MÔ HÌNH SƯ PHẠM (ĐẦY ĐỦ 3 CHÍNH SÁCH ĐỂ SỔ RA TRÊN GIAO DIỆN)
export const PEDAGOGY_MODELS: Record<string, { name: string; desc: string }> = {
  "exact": { 
    name: "Trích dẫn Chính xác (Exact Matching)", 
    desc: "AI phải trích dẫn y hệt tên tiêu đề trong giáo án gốc (bao gồm cả số thứ tự A, B, C...) để chèn đúng vị trí." 
  },
  "fuzzy": { 
    name: "Trích dẫn Ngữ cảnh (Fuzzy Matching)", 
    desc: "AI quét dựa trên ý nghĩa ngữ cảnh và đoạn tương đương, tối ưu cho giáo án viết tắt hoặc trình bày tùy biến." 
  },
  "structure": { 
    name: "Tích hợp theo Cấu trúc Tiết dạy", 
    desc: "Định vị theo các pha sư phạm (Khởi động -> Khám phá -> Luyện tập -> Vận dụng) cho bài dạy dạng tiến trình." 
  }
};

// 3. HÀM ĐỌC FILE WORD (.DOCX)
export const extractTextFromDocx = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const zip = new PizZip(e.target?.result as ArrayBuffer);
        const text = zip.file("word/document.xml")?.asText().replace(/<[^>]+>/g, ' ').replace(/"/g, "'") || "";
        resolve(text);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

// 4. HÀM TẠO PROMPT CHUYÊN SÂU TÍCH HỢP ĐỦ 3 CHẾ ĐỘ
export const createIntegrationTextPrompt = (text: string, subject: string, grade: string, mode: IntegrationMode) => {
  const strategy = SUBJECT_STRATEGIES[subject] || "Tích hợp công nghệ giáo dục phổ thông hiệu quả.";

  let modeRule = "";
  if (mode === 'NLS') {
    modeRule = "CHỈ NĂNG LỰC SỐ (Thông tư 02/2025/TT-BGDĐT): Chỉ dùng mã NLS (1.1.TC2a, 1.2.NC1a, 5.2.NC1a...), KHÔNG đưa các mã AI.";
  } else if (mode === 'NAI') {
    modeRule = "CHỈ GIÁO DỤC AI (Khung AI 2026): Chỉ dùng mã AI (NLa.A3, NLb.B2, NLc.C1...), KHÔNG đưa các mã NLS thuần túy.";
  } else {
    modeRule = "TÍCH HỢP TOÀN DIỆN NLS & AI: Kết hợp song song cả mã NLS (TT 02/2025) và mã AI (Khung AI 2026) bám sát kiến thức bài dạy.";
  }

  return `
  BỐI CẢNH: Soạn giáo án điện tử theo định hướng GDPT 2018 cho HS ${grade} môn ${subject}.
  CHIẾN LƯỢC MÔN HỌC: "${strategy}"
  CHẾ ĐỘ TÍCH HỢP: ${modeRule}

  *** CRITICAL INSTRUCTION (BẮT BUỘC): ***
  - ONLY return valid JSON. DO NOT write any introduction.
  - DO NOT use markdown code blocks (\`\`\`json). Just the raw JSON string.
  - Escape all double quotes within the content.

  === NHIỆM VỤ 1: TÍCH HỢP VÀO MỤC MỤC TIÊU ===
  - Trích xuất các mã YCĐ và diễn giải biểu hiện cụ thể của HS bám sát trực tiếp vào kiến thức trọng tâm của bài dạy này.

  === NHIỆM VỤ 2: QUÉT HOẠT ĐỘNG (CHI TIẾT & CHÍNH XÁC) ===
  - Quan trọng: Khi chọn hoạt động nào, hãy COPY Y HỆT tên tiêu đề của nó trong giáo án gốc (Ví dụ: "HOẠT ĐỘNG 1: MỞ ĐẦU").
  - Viết hướng dẫn thao tác cụ thể cho HS sử dụng công cụ số/AI trong bài dạy này.

  === CẤU TRÚC JSON ĐẦU RA ===
  {
    "objectives_addition": "* [Tiêu đề đúng chế độ ${mode}]:\\n- [Chi tiết các mã YCĐ kèm biểu hiện cụ thể trong bài]",
    "materials_addition": "* Thiết bị dạy học và Học liệu số môn ${subject}:\\n- [Thiết bị, phần mềm mô phỏng 3D, công cụ AI cụ thể]",
    "activities_enhancement": [
      { 
        "activity_name": "[COPY Y HỆT TÊN TIÊU ĐỀ TRONG GIÁO ÁN GỐC, VÍ DỤ: HOẠT ĐỘNG 1: MỞ ĐẦU]", 
        "enhanced_content": "- Công cụ: [Tên công cụ]\\n- GV: [Hướng dẫn]\\n- HS: [Thực hiện thao tác cụ thể]" 
      }
    ]
  }

  NỘI DUNG GIÁO ÁN GỐC:
  """
  ${text.substring(0, 20000)}
  """
  `;
};