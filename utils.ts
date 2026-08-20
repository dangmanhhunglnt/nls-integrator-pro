import PizZip from 'pizzip';
import { IntegrationMode } from './types';

// ==========================================
// MA TRẬN CHUẨN ĐẦU RA GIÁO DỤC AI (QĐ 2422/QĐ-BGDĐT) & NLS (TT 02/2025)
// ==========================================

export interface GradeLevelConfig {
  levelName: string;
  focusArea: string;
  actionVerbs: string[];
  sampleObjectives: string[];
  pedagogyRules: string;
  toolSuggestions: string[];
}

export const AI_EDUCATION_MATRIX: Record<'PRIMARY' | 'SECONDARY' | 'HIGH', GradeLevelConfig> = {
  // CẤP 1: TIỂU HỌC (Lớp 1 - 5)
  PRIMARY: {
    levelName: "Cấp Tiểu học (Lớp 1 - 5)",
    focusArea: "Làm quen, nhận diện công nghệ thông minh trực quan, an toàn thông tin & bảo vệ sức khỏe khi dùng thiết bị số",
    actionVerbs: [
      "Nhận biết được", "Kể tên được", "Làm quen với", "Trải nghiệm tính năng", "Phân biệt được", "Thực hiện thói quen an toàn"
    ],
    sampleObjectives: [
      "Nhận biết được một số ứng dụng của công nghệ thông minh và AI trong đời sống hàng ngày (trợ lý giọng nói, camera nhận diện, phần mềm dịch hình ảnh).",
      "Bước đầu biết cách tương tác trực quan với các phần mềm học tập số dưới sự hướng dẫn của giáo viên.",
      "Hình thành ý thức bảo vệ thông tin cá nhân và quy định về tư thế ngồi, thời gian sử dụng thiết bị số an toàn, lành mạnh."
    ],
    pedagogyRules: "Tuyệt đối KHÔNG yêu cầu HS viết code/thuật toán phức tạp hoặc phân tích kỹ thuật sâu. Tập trung vào trải nghiệm trực quan, trò chơi học tập (gamification), quan sát hình ảnh/âm thanh sinh động.",
    toolSuggestions: ["Scratch / ScratchJr", "Quick, Draw! (Google)", "AutoDraw", "Teachable Machine (Giao diện trực quan)", "Trò chơi tương tác Quizizz/Kahoot"]
  },

  // CẤP 2: THCS (Lớp 6 - 9)
  SECONDARY: {
    levelName: "Cấp Trung học Cơ sở (Lớp 6 - 9)",
    focusArea: "Hiểu nguyên lý cơ bản, thực hành tương tác (Prompting cơ bản), phân loại dữ liệu & đạo đức học thuật số",
    actionVerbs: [
      "Mô tả được nguyên lý", "Giải thích được", "Sử dụng câu lệnh (prompt)", "Thu thập và phân loại dữ liệu", "Đối chiếu kết quả", "Tuân thủ quy tắc bản quyền"
    ],
    sampleObjectives: [
      "Mô tả được nguyên lý cơ bản của AI: Dữ liệu đầu vào -> Huấn luyện/Xử lý mô hình -> Dữ liệu đầu ra.",
      "Biết cách đặt câu lệnh (prompting cơ bản) để hỗ trợ tìm kiếm ý tưởng và giải quyết nhiệm vụ học tập môn học.",
      "Biết đối chiếu, kiểm chứng thông tin do AI sinh ra với SGK; tuân thủ trung thực học thuật và không lạm dụng công nghệ."
    ],
    pedagogyRules: "Hướng dẫn HS cấu trúc câu lệnh đơn giản, so sánh kết quả tự làm với kết quả do AI gợi ý nhằm rèn luyện tư duy phản biện.",
    toolSuggestions: ["Chatbot học tập (Copilot / Gemini Edu)", "Teachable Machine (Phân loại ảnh/âm thanh)", "Canva Magic Studio", "GeoGebra / PhET Simulations"]
  },

  // CẤP 3: THPT (Lớp 10 - 12)
  HIGH: {
    levelName: "Cấp Trung học Phổ thông (Lớp 10 - 12)",
    focusArea: "Ứng dụng mô hình AI tạo sinh (GenAI), tối ưu hóa câu lệnh (Prompt Engineering), phân tích thiên vị dữ liệu (AI Bias) & giải quyết bài toán thực tế",
    actionVerbs: [
      "Tối ưu hóa câu lệnh (Prompt Engineering)", "Phân tích và đánh giá", "Kiểm chứng độ tin cậy và thiên vị (AI Bias)", "Xây dựng quy trình", "Ứng dụng chuyên ngành"
    ],
    sampleObjectives: [
      "Vận dụng kỹ thuật câu lệnh có cấu trúc (Prompt Engineering) để phân tích dữ liệu, tóm tắt và mô hình hóa kiến thức bài học.",
      "Đánh giá có phản biện kết quả đầu ra từ AI, nhận diện rủi ro về ảo giác dữ liệu (hallucination) và thiên vị thuật toán (bias).",
      "Ứng dụng các công cụ AI chuyên sâu vào giải quyết các dự án học tập, thực hiện đúng các chuẩn mực đạo đức, pháp lý và bảo vệ dữ liệu số."
    ],
    pedagogyRules: "Yêu cầu HS sử dụng kỹ thuật đặt câu lệnh nâng cao (vai trò, ngữ cảnh, định dạng đầu ra), phân tích độ tin cậy nguồn tin và tối ưu hóa giải pháp bài toán.",
    toolSuggestions: ["Gemini / ChatGPT / Claude", "NotebookLM (Phân tích tài liệu)", "GeoGebra 3D / Desmos", "Python / Google Colab", "Gamma / Canva Pro"]
  }
};

// ==========================================
// KHÍA CẠNH 3: KHO CÔNG CỤ & HỌC LIỆU SỐ PHÂN TẦNG (TOOLKIT MATRIX)
// ==========================================

export interface ToolAsset {
  name: string;
  category: 'VISUAL_AI' | 'SIMULATION' | 'INTERACTIVE' | 'GEN_AI' | 'DATA_CODING';
  suitableGrades: ('PRIMARY' | 'SECONDARY' | 'HIGH')[];
  usageDescription: string;
}

export const DIGITAL_TOOL_REPOSITORY: Record<string, ToolAsset[]> = {
  GENERAL_PRIMARY: [
    { name: "Quick, Draw! (Google AI)", category: 'VISUAL_AI', suitableGrades: ['PRIMARY'], usageDescription: "Trải nghiệm AI nhận diện nét vẽ phác thảo của học sinh qua mô hình thị giác máy tính." },
    { name: "AutoDraw", category: 'VISUAL_AI', suitableGrades: ['PRIMARY'], usageDescription: "Hỗ trợ vẽ hình minh họa bài học với gợi ý tự động từ AI." },
    { name: "ScratchJr / Scratch kéo thả", category: 'INTERACTIVE', suitableGrades: ['PRIMARY'], usageDescription: "Tạo hoạt cảnh, câu chuyện hoạt hình và mô phỏng nhân vật trực quan." },
    { name: "Quizizz / Kahoot", category: 'INTERACTIVE', suitableGrades: ['PRIMARY', 'SECONDARY'], usageDescription: "Trò chơi trắc nghiệm tương tác kiểm tra kiến thức mở đầu và củng cố." }
  ],
  GENERAL_SECONDARY: [
    { name: "Teachable Machine", category: 'VISUAL_AI', suitableGrades: ['SECONDARY'], usageDescription: "Thu thập mẫu dữ liệu hình ảnh/âm thanh để huấn luyện mô hình phân loại đơn giản." },
    { name: "Canva Magic Studio", category: 'GEN_AI', suitableGrades: ['SECONDARY', 'HIGH'], usageDescription: "Thiết kế poster, sơ đồ tư duy số và đồ họa thông tin bài học." },
    { name: "Chatbot Edu (Gemini / Bing Copilot)", category: 'GEN_AI', suitableGrades: ['SECONDARY'], usageDescription: "Đặt câu lệnh tìm kiếm dữ liệu, gợi ý dàn ý bài thuyết trình có đối chiếu SGK." },
    { name: "PhET Interactive Simulations", category: 'SIMULATION', suitableGrades: ['SECONDARY', 'HIGH'], usageDescription: "Thực hành thí nghiệm mô phỏng tương tác các quy luật tự nhiên." }
  ],
  GENERAL_HIGH: [
    { name: "NotebookLM / LLMs chuyên sâu", category: 'GEN_AI', suitableGrades: ['HIGH'], usageDescription: "Phân tích, tóm tắt tài liệu học thuật và kiểm chứng phản biện nguồn tin." },
    { name: "GeoGebra 3D / Desmos Studio", category: 'SIMULATION', suitableGrades: ['HIGH'], usageDescription: "Mô hình hóa hàm số, hình học không gian và các bài toán tối ưu thực tế." },
    { name: "Google Colab / Python", category: 'DATA_CODING', suitableGrades: ['HIGH'], usageDescription: "Xử lý, trực quan hóa tập dữ liệu số và chạy các thuật toán phân loại." },
    { name: "Gamma App", category: 'GEN_AI', suitableGrades: ['HIGH'], usageDescription: "Tạo slide báo cáo dự án học tập tự động từ dàn ý nội dung." }
  ]
};

// ==========================================
// KHÍA CẠNH 4: BỘ TIÊU CHÍ ĐÁNH GIÁ NĂNG LỰC SỐ & AI (RUBRICS PHÂN TẦNG)
// ==========================================

export const AI_ASSESSMENT_RUBRICS: Record<'PRIMARY' | 'SECONDARY' | 'HIGH', string> = {
  PRIMARY: `* TIÊU CHÍ ĐÁNH GIÁ NLS & AI (TIỂU HỌC):
- Mức 1 (Đạt): Biết sử dụng phần mềm học tập dưới sự hướng dẫn; nhận ra được sự trợ giúp của thiết bị thông minh.
- Mức 2 (Tốt): Hứng thú tương tác, hoàn thành nhiệm vụ trò chơi số đúng hạn; có ý thức giữ an toàn mắt và bảo vệ thiết bị.`,

  SECONDARY: `* TIÊU CHÍ ĐÁNH GIÁ NLS & AI (THCS):
- Mức 1 (Đạt): Đặt được câu lệnh (prompt) tra cứu đơn giản; phân biệt được kết quả của AI và nội dung SGK.
- Mức 2 (Tốt): Tinh chỉnh được câu lệnh để tìm ý tưởng chất lượng; biết trích dẫn nguồn và tuân thủ trung thực học thuật.`,

  HIGH: `* TIÊU CHÍ ĐÁNH GIÁ NLS & AI (THPT):
- Mức 1 (Đạt): Áp dụng đúng công cụ AI/mô phỏng để xử lý dữ liệu hoặc mô hình hóa bài toán.
- Mức 2 (Tốt): Đánh giá phản biện sâu về tính chính xác của dữ liệu AI, nhận diện rủi ro sai lệch và phát triển giải pháp sáng tạo.`
};

/**
 * Hàm phân loại cấp học từ Grade string
 */
export function getEducationLevel(grade: string): 'PRIMARY' | 'SECONDARY' | 'HIGH' {
  if (['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'].includes(grade)) return 'PRIMARY';
  if (['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'].includes(grade)) return 'SECONDARY';
  return 'HIGH';
}

/**
 * Hàm lấy danh sách công cụ gợi ý chuẩn hóa theo Cấp học
 */
export function getRecommendedToolsForGrade(grade: string): string {
  const level = getEducationLevel(grade);
  let tools: ToolAsset[] = [];
  
  if (level === 'PRIMARY') {
    tools = DIGITAL_TOOL_REPOSITORY.GENERAL_PRIMARY;
  } else if (level === 'SECONDARY') {
    tools = DIGITAL_TOOL_REPOSITORY.GENERAL_SECONDARY;
  } else {
    tools = DIGITAL_TOOL_REPOSITORY.GENERAL_HIGH;
  }

  return tools.map(t => `- ${t.name}: ${t.usageDescription}`).join('\n');
}

// 1. CHIẾN LƯỢC NLS THEO MÔN HỌC (CHUẨN BỘ GD&ĐT GDPT 2018)
const SUBJECT_STRATEGIES: Record<string, string> = {
  // Cấp THCS & THPT
  "Toán": "Tư duy tính toán & Mô hình hóa. Ưu tiên: GeoGebra, Desmos, Excel, Azota, Máy tính cầm tay giả lập, AI giải toán bước từng bước.",
  "Ngữ Văn": "Sáng tạo & Văn hóa đọc số. Ưu tiên: Padlet, Canva, PowerPoint, E-book, Chatbot AI đóng vai nhân vật văn học, AI tóm tắt văn bản.",
  "Tiếng Anh": "Giao tiếp & Tự học. Ưu tiên: Quizizz, Google Forms, YouTube, Ozdic, Luyện hội thoại với AI, Phân tích ngữ pháp thông minh.",
  "Vật Lí": "Thí nghiệm ảo & Mô phỏng. Ưu tiên: PhET Simulations, Excel, Video thí nghiệm vật lý 3D, AI giải thích hiện tượng tự nhiên.",
  "Hóa Học": "Trực quan hóa chất. Ưu tiên: Bảng tuần hoàn Ptable, PhET, Video mô phỏng phản ứng an toàn, AI cân bằng phương trình.",
  "Sinh Học": "Thế giới sống & Mô hình sinh học. Ưu tiên: Google Earth, Video 3D tế bào/cơ thể, Học liệu số, AI nhận diện sinh vật qua ảnh.",
  "Lịch Sử": "Tư duy thời gian & Di sản số. Ưu tiên: Google Maps, Bảo tàng ảo 3D, Sơ đồ tiến trình Timeline, AI phục chế tư liệu lịch sử.",
  "Địa Lí": "Bản đồ số & Địa lý không gian. Ưu tiên: Google Maps, Google Earth Pro, Worldometer, GIS, AI phân tích dữ liệu khí hậu.",
  "Lịch sử và Địa lí": "Khám phá không gian - thời gian số. Ưu tiên: Bản đồ tương tác, Video tư liệu 3D, AI tra cứu sự kiện và địa danh.",
  "Khoa học tự nhiên": "Khám phá thế giới tự nhiên qua mô phỏng. Ưu tiên: Thí nghiệm ảo PhET, Video khoa học 3D, Quiz tương tác.",
  "Tin Học": "Tư duy máy tính & Công nghệ thông tin. Ưu tiên: Python, Scratch, Code.org, Sơ đồ tư duy số, AI phân tích mã nguồn.",
  "Công nghệ": "Thiết kế kỹ thuật & Đổi mới sáng tạo. Ưu tiên: Mô phỏng 3D, CAD/CAM, Tinkercad, Chatbot AI tra cứu quy trình kỹ thuật.",
  "Công nghệ (Công nghiệp)": "Bản vẽ kỹ thuật và tự động hóa. Ưu tiên: AutoCAD, Tinkercad, Phần mềm mô phỏng mạch điện.",
  "Công nghệ (Nông nghiệp)": "Nông nghiệp công nghệ cao và cảm biến số. Ưu tiên: Video quy trình IoT nông nghiệp, AI nhận diện sâu bệnh.",
  "Giáo dục công dân": "Ý thức công dân số và chuẩn mực đạo đức trực tuyến. Ưu tiên: Tình huống số, Tranh biện về an toàn mạng và bản quyền.",
  "Giáo dục kinh tế và pháp luật": "Pháp lý số và kỹ năng tài chính. Ưu tiên: Dữ liệu thị trường trực tuyến, AI tra cứu văn bản quy phạm pháp luật.",
  "Âm Nhạc": "Sáng tạo âm thanh số. Ưu tiên: Phần mềm làm nhạc trực tuyến, Video hòa tấu số, Canva.",
  "Mỹ Thuật": "Sáng tạo mỹ thuật số. Ưu tiên: Canva, Paint 3D, Phần mềm tạo ảnh nghệ thuật số, Phòng tranh ảo.",
  "Giáo dục thể chất": "Sức khỏe số & Phân tích động tác. Ưu tiên: Video phân tích kỹ thuật chuyển động, App đếm nhịp tim/vận động thể thao.",
  "Giáo dục quốc phòng và an ninh": "Bảo vệ chủ quyền không gian mạng. Ưu tiên: Tư liệu số, Bản đồ quân sự tương tác, An ninh thông tin.",
  "Hoạt động trải nghiệm, hướng nghiệp": "Định hướng nghề nghiệp kỷ nguyên số. Ưu tiên: Bài test tính cách/nghề nghiệp trực tuyến, AI tư vấn hướng nghiệp.",

  // Cấp Tiểu học
  "Tiếng Việt": "Luyện đọc, mở rộng vốn từ và trực quan hóa ngữ liệu. Ưu tiên: Thẻ từ số, Video hoạt hình câu chuyện, AI nhận diện giọng đọc.",
  "Tự nhiên và Xã hội": "Khám phá môi trường xung quanh qua hình ảnh thực tế. Ưu tiên: Tranh ảnh 3D, Video khám phá thiên nhiên, Trò chơi nhận biết số.",
  "Khoa học": "Tìm hiểu hiện tượng khoa học vui. Ưu tiên: Video thí nghiệm thực tế an toàn, Mô phỏng đơn giản, Trò chơi phân loại.",
  "Tin học và Công nghệ": "Hình thành kỹ năng thao tác thiết bị và tư duy logic cơ bản. Ưu tiên: ScratchJr, Code.org kéo thả, Nhận biết chi tiết máy.",
  "Đạo đức": "Hình thành thói quen ứng xử văn minh và an toàn. Ưu tiên: Video tình huống đạo đức số, Tranh tương tác hành vi đúng/sai."
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

// 4. HÀM TẠO PROMPT CHUYÊN SÂU TÍCH HỢP ĐỦ 3 CHẾ ĐỘ & CHUẨN HÓA THEO CẤP HỌC
export const createIntegrationTextPrompt = (text: string, subject: string, grade: string, mode: IntegrationMode) => {
  const strategy = SUBJECT_STRATEGIES[subject] || "Tích hợp công nghệ giáo dục phổ thông hiệu quả.";
  const eduLevel = getEducationLevel(grade);
  const matrixConfig = AI_EDUCATION_MATRIX[eduLevel];
  const recommendedTools = getRecommendedToolsForGrade(grade);
  const assessmentRubric = AI_ASSESSMENT_RUBRICS[eduLevel];

  let modeRule = "";
  if (mode === 'NLS') {
    modeRule = "CHỈ NĂNG LỰC SỐ (Thông tư 02/2025/TT-BGDĐT): Chỉ dùng mã NLS chuẩn (1.1.TC2a, 1.2.NC1a, 5.2.NC1a...), KHÔNG đưa các mã AI.";
  } else if (mode === 'NAI') {
    modeRule = "CHỈ GIÁO DỤC AI (QĐ 2422/QĐ-BGDĐT ngày 18/8/2026): Chỉ dùng mã AI theo Khung nội dung GD AI 2026 (NLa.A3, NLb.B2, NLc.C1...), KHÔNG đưa các mã NLS thuần túy.";
  } else {
    modeRule = "TÍCH HỢP TOÀN DIỆN NLS & AI: Kết hợp song song cả mã NLS (Thông tư 02/2025/TT-BGDĐT) và mã AI (Quyết định 2422/QĐ-BGDĐT ngày 18/8/2026) bám sát kiến thức bài dạy.";
  }

  return `
  BỐI CẢNH GIÁO DỤC:
  - Cấp học: ${matrixConfig.levelName}
  - Khối lớp: ${grade} | Môn học: ${subject}
  - Trọng tâm phát triển theo cấp: ${matrixConfig.focusArea}
  - Quy tắc sư phạm bắt buộc: ${matrixConfig.pedagogyRules}
  - Nhóm động từ hành vi ưu tiên: ${matrixConfig.actionVerbs.join(', ')}
  - Gợi ý công cụ học liệu số phân tầng cho cấp này:
  ${recommendedTools}
  - Tiêu chí đánh giá định hướng:
  ${assessmentRubric}
  - Chiến lược môn học: "${strategy}"
  - Chế độ tích hợp: ${modeRule}

  *** CRITICAL INSTRUCTION (BẮT BUỘC): ***
  - ONLY return valid JSON. DO NOT write any introduction.
  - DO NOT use markdown code blocks (\`\`\`json). Just the raw JSON string.
  - Escape all double quotes within the content.

  === NHIỆM VỤ 1: TÍCH HỢP VÀO MỤC MỤC TIÊU ===
  - Trích xuất các mã Yêu cầu cần đạt và diễn giải biểu hiện cụ thể của HS phù hợp với lứa tuổi ${grade}, bám sát trực tiếp vào kiến thức trọng tâm của bài dạy này.
  - Căn cứ pháp lý: TT 02/2025/TT-BGDĐT (NLS) và QĐ 2422/QĐ-BGDĐT (Giáo dục AI).

  === NHIỆM VỤ 2: TÍCH HỢP HỌC LIỆU SỐ (MỤC II - PHÙ HỢP CẤP HỌC ${grade}) ===
  - Đưa ra 1 dòng ngắn gọn danh mục thiết bị, phần mềm mô phỏng và ứng dụng AI dành riêng cho học sinh ${grade} môn ${subject}.

  === NHIỆM VỤ 3: QUÉT HOẠT ĐỘNG & TỔ CHỨC THỰC HIỆN ===
  - Quan trọng: Khi chọn hoạt động nào, hãy COPY Y HỆT tên tiêu đề của nó trong giáo án gốc (Ví dụ: "HOẠT ĐỘNG 1: MỞ ĐẦU", "1. Hoạt động 1: Khởi động").
  - Viết nội dung bổ sung rõ ràng:
    + Công cụ: Tên ứng dụng/công cụ số phù hợp ${grade}
    + GV (Chuyển giao): Hướng dẫn nhiệm vụ số/câu lệnh prompt cụ thể
    + HS (Thực hiện): Thao tác trên thiết bị, đối chiếu kết quả với SGK và minh bạch nguồn AI

  === CẤU TRÚC JSON ĐẦU RA ===
  {
    "objectives_addition": "* [Tiêu đề đúng chế độ ${mode} - Căn cứ TT 02/2025 & QĐ 2422/QĐ-BGDĐT]:\\n- [Chi tiết các mã YCĐ kèm biểu hiện cụ thể của học sinh ${grade} trong bài]",
    "materials_addition": "- Học liệu số & Thiết bị thông minh (${grade}): [Thiết bị, phần mềm mô phỏng, công cụ số/AI cụ thể cho môn ${subject}]",
    "activities_enhancement": [
      { 
        "activity_name": "[COPY Y HỆT TÊN TIÊU ĐỀ TRONG GIÁO ÁN GỐC]", 
        "enhanced_content": "- Công cụ: [Tên công cụ phù hợp ${grade}]\\n- GV (Chuyển giao): [Hướng dẫn giao nhiệm vụ số/AI rõ ràng]\\n- HS (Thực hiện): [Thực hiện thao tác số, đối chiếu kết quả với SGK và minh bạch nguồn]" 
      }
    ]
  }

  NỘI DUNG GIÁO ÁN GỐC:
  """
  ${text.substring(0, 20000)}
  """
  `;
};