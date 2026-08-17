import { GeneratedNLSContent, SubjectType, GradeType, IntegrationMode, IntegrationLevel } from '../types';

/**
 * Xây dựng System Prompt chuẩn hóa bám sát:
 * 1. Thông tư 02/2025/TT-BGDĐT (Khung năng lực số cho người học).
 * 2. Quyết định 3439/QĐ-BGDĐT & Khung Giáo dục AI hoàn thiện năm 2026 (Cốt lõi 12 tiết/năm).
 * 3. Hướng dẫn triển khai thực hiện GD AI từ năm học 2026-2027 của Bộ GD&ĐT.
 */
export const buildSystemPrompt = (
  subject: string, 
  grade: string, 
  mode: IntegrationMode,
  level: IntegrationLevel = 'STANDARD'
): string => {
  let modeInstruction = "";

  if (mode === 'NLS') {
    modeInstruction = `
CHẾ ĐỘ TÍCH HỢP: CHỈ NĂNG LỰC SỐ (Theo Thông tư 02/2025/TT-BGDĐT).
- CHỈ TRÍCH XUẤT các mã Yêu cầu cần đạt Năng lực số (Ví dụ: 1.1.TC1a, 1.1.NC1a, 2.2.NC1a, 3.1.TC2a, 5.2.TC2a...).
- KHÔNG đưa bất kỳ mã năng lực AI (NLa, NLb, NLc, NLd) nào vào đầu ra.`;
  } else if (mode === 'NAI') {
    modeInstruction = `
CHẾ ĐỘ TÍCH HỢP: CHỈ GIÁO DỤC TRÍ TUỆ NHÂN TẠO (Theo Khung Giáo dục AI 2026 của Bộ GD&ĐT & QĐ 3439/QĐ-BGDĐT).
- CHỈ TRÍCH XUẤT các mã Năng lực AI theo 4 mạch đặc thù chuẩn:
  + NLa (A): Tư duy lấy con người làm trung tâm (NLa.A1, NLa.A2, NLa.A3...)
  + NLb (B): Đạo đức AI, bảo vệ dữ liệu cá nhân & khai báo minh bạch (NLb.B1, NLb.B2...)
  + NLc (C): Kỹ thuật, thuật toán & ứng dụng AI (NLc.C1, NLc.C2, NLc.C3...)
  + NLd (D): Thiết kế & cải tiến hệ thống AI (NLd.D1, NLd.D2...)
- KHÔNG chèn các mã NLS thuần túy từ Thông tư 02/2025.`;
  } else {
    modeInstruction = `
CHẾ ĐỘ TÍCH HỢP: KẾT HỢP TOÀN DIỆN NĂNG LỰC SỐ (TT 02/2025/TT-BGDĐT) & GIÁO DỤC AI (QĐ 3439 & KHUNG BỘ GD&ĐT 2026).
- Kết hợp song song các mã NLS (1.1.NC1a, 2.2.NC1a, 3.1.TC2a, 5.2.TC2a...) và các mã Năng lực AI bám sát 4 mạch (NLa.A3, NLb.B2, NLc.C2, NLd.D1...) tương ứng kiến thức môn ${subject} - ${grade}.`;
  }

  let levelInstruction = "";
  if (level === 'INTENSIVE') {
    levelInstruction = `
MỨC ĐỘ TÍCH HỢP: CHUYÊN SÂU (DÀNH CHO THAO GIẢNG / HỘI GIẢNG / KIỂM TRA CHUYÊN ĐỀ).
- Tích hợp toàn diện vào 100% tất cả các hoạt động có trong giáo án (Khởi động, toàn bộ các hoạt động con trong Hình thành kiến thức, Luyện tập, Vận dụng).
- Thiết kế hoạt động học sinh chi tiết, cung cấp câu lệnh Prompt mẫu cho AI cụ thể từng phần, kết hợp nhiều công cụ số hiện đại (GeoGebra, Canva, Padlet, Mentimeter).
- Bảng ma trận tổng hợp chi tiết từ 6-8 chỉ số Yêu cầu cần đạt.`;
  } else {
    levelInstruction = `
MỨC ĐỘ TÍCH HỢP: TIÊU CHUẨN (DÀNH CHO LÊN LỚP HẰNG NGÀY).
- Tích hợp vừa phải, tinh gọn vào Hoạt động Khởi động và 1-2 Hoạt động trọng tâm để giáo viên dễ dàng triển khai trong tiết học 45 phút.
- Bảng ma trận tổng hợp gọn gàng từ 3-4 chỉ số cốt lõi.`;
  }

  return `
Bạn là Trợ lý AI Chuyên gia Giáo dục Phổ thông theo định hướng chỉ đạo năm học 2026-2027 của Bộ GD&ĐT Việt Nam (Bám sát TT 02/2025/TT-BGDĐT, QĐ 3439/QĐ-BGDĐT, Hướng dẫn GD AI 2026-2027 và Khung GD AI 2026).
Nhiệm vụ: Đọc kĩ toàn bộ văn bản Kế hoạch bài dạy (Giáo án) môn ${subject} - ${grade} được cung cấp và thiết kế nội dung tích hợp BÁM SÁT 100% VÀO TÊN BÀI DẠY, CÁC KHÁI NIỆM TRỌNG TÂM VÀ TIẾN TRÌNH THỰC TẾ TRONG BÀI.

${modeInstruction}
${levelInstruction}

QUY TẮC PHÂN TÍCH VÀ ĐẦU RA BẮT BUỘC ĐỂ ĐẠT CHUẨN SỞ/PHÒNG GIÁO DỤC:
1. MỤC TIÊU VÀ HỌC LIỆU (MỤC I & II):
   - Nêu rõ các mã NLS/AI kèm diễn giải biểu hiện cụ thể của HS trong bài học môn ${subject} - ${grade}.
   - Liệt kê học liệu số, phần mềm (Padlet, Mentimeter, Canva, GeoGebra, PhET, Chatbot AI) và BẮT BUỘC nhấn mạnh: "Sử dụng công cụ miễn phí/dùng chung, KHÔNG yêu cầu HS tạo tài khoản cá nhân hoặc thu thập dữ liệu cá nhân nhạy cảm".

2. ĐAN CÀI CỤ THỂ VÀO BẢNG TỔ CHỨC THỰC HỆN (MỤC III - TIẾN TRÌNH DẠY HỌC):
   - Đọc kỹ và TRÍCH XUẤT NGUYÊN VĂN TÊN TIÊU ĐỀ HOẠT ĐỘNG từ file gốc vào trường "activity_name" (Ví dụ: "Hoạt động 1: KHỞI ĐỘNG", "Hoạt động 2.1. Hình thành khái niệm...", "Hoạt động 3: LUYỆN TẬP"). Tuyệt đối KHÔNG tự bịa tên hoạt động trừu tượng để bộ xử lý Word tìm đúng vị trí ô bảng.
   - MÔ TẢ THAO TÁC CỤ THỂ: Quét QR trên Mentimeter/Padlet, tra cứu tư liệu số chính thống, thao tác mô phỏng trên phần mềm chuyên môn, thiết kế sơ đồ tư duy Canva...
   - CUNG CẤP PROMPT MẪU CHO AI: Khi hướng dẫn dùng AI (ChatGPT, Gemini, Copilot), BẮT BUỘC viết câu lệnh mẫu cụ thể trong ngoặc kép liên quan trực tiếp đến kiến thức môn ${subject} (Ví dụ: NLc.C2: HS gõ prompt: "Hãy giải thích ngắn gọn ý nghĩa thực tiễn của...").
   - ĐẠO ĐỨC, KHAI BÁO & KIỂM CHỨNG: Tích hợp mã NLb.B2 (HS khai báo minh bạch công cụ AI hỗ trợ khi báo cáo) và NLa.A3 (đối chiếu SGK để xác thực, kiểm chứng tránh ảo giác AI).

3. BẢNG TỔNG HỢP NĂNG LỰC SỐ VÀ AI TRONG BÀI HỌC (Mảng summary_table):
   - Sinh đầy đủ mảng "summary_table" bao gồm đúng 5 trường (stt, code, component, expression, activity) tương ứng các hoạt động đã được tích hợp để tự động tạo bảng ở cuối file Word.

ĐỊNH DẠNG ĐẦU RA (Yêu cầu trả về JSON thuần túy, tuyệt đối không bọc thẻ markdown \`\`\`json):
{
  "objectives_addition": "* [Tích hợp chế độ ${mode} Môn ${subject} - ${grade} (Theo TT 02/2025 & QĐ 3439/QĐ-BGDĐT)]:\\n[Chi tiết từng mã YCĐ kèm biểu hiện cụ thể của HS bám sát bài học môn ${subject}]",
  "materials_addition": "* Thiết bị dạy học và Học liệu số tích hợp AI môn ${subject}:\\n- Máy tính, máy chiếu, thiết bị thông minh kết nối Internet (dùng chung dưới sự hướng dẫn của GV).\\n- Nền tảng tương tác trực tuyến (Padlet/Mentimeter), phần mềm đồ họa (Canva), Chatbot AI (Gemini/ChatGPT).\\n- Lưu ý an toàn: Không yêu cầu HS tạo tài khoản cá nhân, không thu thập dữ liệu cá nhân nhạy cảm.",
  "activities_enhancement": [
    {
      "activity_name": "[Trích xuất chính xác tên Hoạt động 1 trong file gốc]",
      "location": "Hoạt động 1 > Tổ chức thực hiện > HS thực hiện nhiệm vụ",
      "enhanced_content": "5.2.TC2a: HS sử dụng thiết bị số quét mã QR do GV cung cấp để truy cập nền tảng tương tác (Mentimeter/Padlet), quan sát hình ảnh/video chất lượng cao môn ${subject} và gửi câu trả lời nhanh chóng.\\nNLa.A3: HS bước đầu nhận thức về ứng dụng hệ thống thông minh (AI) trong thực tiễn."
    },
    {
      "activity_name": "[Trích xuất chính xác tên Hoạt động 2 trong file gốc]",
      "location": "Hoạt động 2 > Tổ chức thực hiện > HS thực hiện nhiệm vụ",
      "enhanced_content": "1.1.NC1a: HS sử dụng công cụ tìm kiếm Google tra cứu thông tin chuyên môn môn ${subject}, chủ động chọn lọc tài liệu từ các nguồn uy tín.\\nNLc.C2: GV hướng dẫn HS sử dụng chatbot AI (ChatGPT/Copilot) hỗ trợ giải đáp nhanh các câu hỏi → HS gõ prompt cụ thể: \\\"[Ghi câu lệnh mẫu liên quan trực tiếp đến bài học môn ${subject}]\\\", sau đó phân tích, đối chiếu câu trả lời của AI với SGK.\\nNLb.B2: HS khai báo minh bạch công cụ AI hỗ trợ khi báo cáo sản phẩm."
    },
    {
      "activity_name": "[Trích xuất chính xác tên Hoạt động 3/4 trong file gốc]",
      "location": "Hoạt động Luyện tập / Vận dụng > Tổ chức thực hiện > HS thực hiện nhiệm vụ",
      "enhanced_content": "3.1.TC2a: HS sử dụng phần mềm sơ đồ tư duy trực tuyến (Canva/Mindmeister) để thiết kế sơ đồ tổng hợp kiến thức môn ${subject} thành sản phẩm số hóa.\\n2.2.NC1a: HS chia sẻ sản phẩm lên nền tảng số (Padlet/Google Drive) để các nhóm truy cập và đánh giá chéo trực tuyến."
    }
  ],
  "summary_table": [
    {"stt": "1", "code": "5.2.TC2a", "component": "Xác định nhu cầu & giải pháp công nghệ", "expression": "HS sử dụng thiết bị số quét mã QR truy cập Mentimeter/Padlet quan sát hình ảnh và gửi câu trả lời tương tác.", "activity": "Hoạt động 1"},
    {"stt": "2", "code": "1.1.NC1a", "component": "Duyệt, tìm kiếm & lọc dữ liệu", "expression": "HS tra cứu thông tin bài học môn ${subject} trên Internet, chọn lọc nguồn tin chính thống.", "activity": "Hoạt động 2"},
    {"stt": "3", "code": "NLc.C2", "component": "Ứng dụng AI trong học tập", "expression": "HS gõ prompt mẫu hỏi Chatbot AI về nội dung bài học môn ${subject} và đối chiếu SGK.", "activity": "Hoạt động 2"},
    {"stt": "4", "code": "NLb.B2", "component": "Đạo đức AI & Minh bạch", "expression": "HS khai báo phạm vi sử dụng công cụ AI hỗ trợ khi trình bày báo cáo sản phẩm.", "activity": "Hoạt động 2"},
    {"stt": "5", "code": "3.1.TC2a", "component": "Phát triển nội dung số", "expression": "HS dùng phần mềm Canva/Mindmeister thiết kế sơ đồ tư duy số hóa kết quả thảo luận nhóm.", "activity": "Hoạt động 3"},
    {"stt": "6", "code": "2.2.NC1a", "component": "Chia sẻ thông tin", "expression": "HS chia sẻ sản phẩm nhóm lên Padlet/Google Drive để đánh giá chéo trực tuyến.", "activity": "Hoạt động 3"}
  ]
}
  `;
};

export async function generateCompetencyIntegration(
  fileContent: string,
  subject: SubjectType | string = 'Tổng hợp',
  grade: GradeType | string = 'Toàn cấp',
  mode: IntegrationMode = 'NLS_AI',
  apiKey: string = '',
  level: IntegrationLevel = 'STANDARD'
): Promise<GeneratedNLSContent> {
  const customApiKey = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('CUSTOM_GEMINI_KEY') || '' : '');
  const userToken = typeof window !== 'undefined' ? localStorage.getItem('USER_TOKEN') || 'user_logged_in' : '';

  try {
    const systemPrompt = buildSystemPrompt(subject, grade, mode, level);
    const fullPrompt = `${systemPrompt}\n\nFILE GIÁO ÁN GỐC MÔN ${subject.toUpperCase()} - KHỐI ${grade.toUpperCase()}:\n${fileContent}`;

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        customApiKey: customApiKey,
        userToken: userToken,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.text) {
        const cleanJson = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson) as GeneratedNLSContent;
      }
    } else {
      console.warn('Lỗi gọi Serverless Function:', await response.text());
    }
  } catch (error: any) {
    console.warn('Không thể kết nối Serverless Function API, sử dụng dữ liệu dự phòng... Lỗi:', error?.message || error);
  }

  // ==========================================
  // DỮ LIỆU DỰ PHÒNG (FALLBACK OFFLINE PHÂN HÓA RÕ NÉT THEO LEVEL)
  // ==========================================

  // --- 1. CHẾ ĐỘ CHỈ NĂNG LỰC SỐ (NLS) ---
  if (mode === 'NLS') {
    if (level === 'INTENSIVE') {
      return {
        objectives_addition: `* Phát triển Năng lực số CHUYÊN SÂU (Theo TT 02/2025/TT-BGDĐT - Môn ${subject} - ${grade}):
1.1.NC1a: HS sử dụng các công cụ tìm kiếm nâng cao, tra cứu dữ liệu số chuyên ngành, chọn lọc và thẩm định độ chính xác của tài liệu môn ${subject}.
2.2.NC1a: HS làm việc nhóm đồng bộ thời gian thực trên không gian số, chia sẻ và phản biện sản phẩm học tập qua nền tảng trực tuyến.
3.1.TC2a: HS sử dụng phần mềm đồ họa số (Canva/Mindmeister) và phần mềm chuyên môn (GeoGebra/PhET) thiết kế sơ đồ tư duy số hóa toàn diện bài học.
5.2.TC2a: HS làm chủ thiết bị số cá nhân/nhóm quét mã QR truy cập hệ thống tương tác đa chiều (Mentimeter/Padlet) quan sát mô phỏng.`,
        materials_addition: `* Thiết bị dạy học và Học liệu số nâng cao (Môn ${subject}):
- Máy tính, máy chiếu tương tác, Smartphone kết nối Internet tốc độ cao.
- Nền tảng tương tác Padlet/Mentimeter, phần mềm mô phỏng chuyên ngành (GeoGebra/PhET), phần mềm thiết kế sơ đồ tư duy Canva.`,
        activities_enhancement: [
          {
            activity_name: "Hoạt động 1: KHỞI ĐỘNG",
            location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `5.2.TC2a: HS sử dụng thiết bị số quét mã QR do GV cung cấp để truy cập vào nền tảng tương tác trực tuyến (Mentimeter/Padlet), quan sát hình ảnh/video mô phỏng chất lượng cao môn ${subject} và gửi câu trả lời nhanh chóng.`
          } as any,
          {
            activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
            location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `1.1.NC1a: HS sử dụng công cụ tìm kiếm nâng cao tra cứu các ví dụ thực tiễn liên quan đến bài học môn ${subject}, đối chiếu độ tin cậy từ nguồn chính thống.\n3.1.TC2a: HS thao tác phần mềm chuyên ngành (GeoGebra/PhET) để mô phỏng động các giả thuyết và rút ra quy luật kiến thức.`
          } as any,
          {
            activity_name: "Hoạt động 3: LUYỆN TẬP, VẬN DỤNG",
            location: "HOẠT ĐỘNG 3: LUYỆN TẬP, VẬN DỤNG > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ / Báo cáo kết quả",
            enhanced_content: `3.1.TC2a: HS sử dụng phần mềm Canva/Mindmeister thiết kế sơ đồ tư duy số hóa toàn bộ hệ thống bài tập môn ${subject}.\n2.2.NC1a: HS tải sản phẩm lên Padlet/Google Drive để các nhóm tiến hành chấm chéo và đánh giá trực tuyến.`
          } as any
        ],
        summary_table: [
          { stt: "1", code: "5.2.TC2a", component: "Xác định nhu cầu & giải pháp công nghệ", expression: `HS quét mã QR truy cập Mentimeter/Padlet quan sát mô phỏng và gửi phản hồi.`, activity: "Hoạt động 1" },
          { stt: "2", code: "1.1.NC1a", component: "Duyệt, tìm kiếm & lọc dữ liệu", expression: `HS tra cứu tài liệu nâng cao môn ${subject} trên Internet, chọn lọc nguồn tin cậy.`, activity: "Hoạt động 2" },
          { stt: "3", code: "3.1.TC2a", component: "Phát triển nội dung số", expression: `HS dùng phần mềm chuyên ngành mô phỏng bài học và thiết kế sơ đồ tư duy Canva.`, activity: "Hoạt động 2, 3" },
          { stt: "4", code: "2.2.NC1a", component: "Chia sẻ thông tin", expression: `HS chia sẻ bài làm nhóm lên Padlet/Google Drive để đánh giá chéo trực tuyến.`, activity: "Hoạt động 3" }
        ] as any
      };
    } else {
      return {
        objectives_addition: `* Phát triển Năng lực số TIÊU CHUẨN (Theo TT 02/2025/TT-BGDĐT - Môn ${subject} - ${grade}):
1.1.NC1a: HS sử dụng công cụ tìm kiếm tra cứu tài liệu môn ${subject}.
2.2.NC1a: HS chia sẻ sản phẩm học tập qua nền tảng số.
5.2.TC2a: HS quét mã QR truy cập nền tảng tương tác (Mentimeter/Padlet).`,
        materials_addition: `* Thiết bị dạy học và Học liệu số (Môn ${subject}):
- Máy tính/Smartphone kết nối Internet, mã QR bài tập tương tác (Không yêu cầu tạo tài khoản cá nhân).`,
        activities_enhancement: [
          {
            activity_name: "Hoạt động 1: KHỞI ĐỘNG",
            location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `5.2.TC2a: HS sử dụng thiết bị số quét mã QR do GV cung cấp để truy cập vào nền tảng tương tác trực tuyến (Mentimeter/Padlet) gửi câu trả lời.`
          } as any,
          {
            activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
            location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `1.1.NC1a: HS sử dụng công cụ tìm kiếm Google tra cứu kiến thức môn ${subject}, chọn lọc thông tin từ SGK và tài liệu học tập.`
          } as any
        ],
        summary_table: [
          { stt: "1", code: "5.2.TC2a", component: "Giải pháp công nghệ", expression: `HS quét mã QR truy cập Mentimeter tham gia tương tác đầu giờ.`, activity: "Hoạt động 1" },
          { stt: "2", code: "1.1.NC1a", component: "Tra cứu dữ liệu", expression: `HS tra cứu thông tin môn ${subject} trên Internet.`, activity: "Hoạt động 2" },
          { stt: "3", code: "2.2.NC1a", component: "Chia sẻ số liệu", expression: `HS chia sẻ kết quả học tập qua nhóm trực tuyến.`, activity: "Hoạt động 2" }
        ] as any
      };
    }
  }

  // --- 2. CHẾ ĐỘ CHỈ GIÁO DỤC AI (NAI) ---
  if (mode === 'NAI') {
    if (level === 'INTENSIVE') {
      return {
        objectives_addition: `* Tích hợp Năng lực Trí tuệ Nhân tạo CHUYÊN SÂU (Theo QĐ 3439/QĐ-BGDĐT - Môn ${subject} - ${grade}):
NLc.C2: HS thiết kế chuỗi câu lệnh (prompt engineering) chi tiết tương tác với Chatbot AI giải đáp các bài toán/khái niệm phức tạp môn ${subject}.
NLa.A3: HS nhận thức sâu sắc về giới hạn của AI, thực hiện quy trình đối chiếu và kiểm chứng nghiêm ngặt với SGK nhằm phát hiện lỗi ảo giác AI.
NLb.B2: HS thực hiện đạo đức học thuật, khai báo minh bạch công cụ AI và mức độ đóng góp của AI trong sản phẩm báo cáo.
NLd.D1: HS đặt câu hỏi phản biện cho AI để tìm kiếm các giải pháp ứng dụng thực tiễn sáng tạo của bài học môn ${subject}.`,
        materials_addition: `* Thiết bị dạy học và Công cụ AI nâng cao (Môn ${subject}):
- Máy tính/Smartphone kết nối Internet, Trợ lý AI thế hệ mới (Gemini/ChatGPT/Copilot).
- Hướng dẫn kỹ thuật viết prompt chuẩn và bảng kiểm đánh giá đạo đức AI.`,
        activities_enhancement: [
          {
            activity_name: "Hoạt động 1: KHỞI ĐỘNG",
            location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `NLa.A3: HS quan sát tình huống mở đầu và nhận diện ứng dụng thực tế của công nghệ AI trong việc giải quyết vấn đề môn ${subject}.`
          } as any,
          {
            activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
            location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `NLc.C2: GV hướng dẫn HS sử dụng chatbot AI hỗ trợ đào sâu bài học → HS gõ prompt cụ thể: "Hãy phân tích chi tiết cơ chế và các trường hợp đặc biệt của bài học môn ${subject}", sau đó phân tích và đối chiếu câu trả lời của AI với SGK.\nNLb.B2: HS ghi chú rõ nội dung gợi ý từ AI trong phiếu học tập.`
          } as any,
          {
            activity_name: "Hoạt động 3: LUYỆN TẬP, VẬN DỤNG",
            location: "HOẠT ĐỘNG 3: LUYỆN TẬP, VẬN DỤNG > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `NLd.D1: HS đặt câu hỏi cho AI về các tình huống mở rộng thực tiễn của môn ${subject}, tổng hợp ý tưởng và đề xuất giải pháp sáng tạo của nhóm.`
          } as any
        ],
        summary_table: [
          { stt: "1", code: "NLa.A3", component: "Tư duy lấy con người làm trung tâm", expression: `HS nhận diện vai trò và giới hạn của AI trong môn ${subject}.`, activity: "Hoạt động 1" },
          { stt: "2", code: "NLc.C2", component: "Ứng dụng AI chuyên sâu", expression: `HS gõ chuỗi prompt phân tích nội dung bài học môn ${subject} và đối chiếu SGK.`, activity: "Hoạt động 2" },
          { stt: "3", code: "NLb.B2", component: "Đạo đức AI & Minh bạch", expression: `HS khai báo minh bạch việc sử dụng công cụ AI trong biên bản làm việc nhóm.`, activity: "Hoạt động 2" },
          { stt: "4", code: "NLd.D1", component: "Thiết kế & Giải pháp AI", expression: `HS tương tác AI tìm kiếm giải pháp thực tiễn sáng tạo cho bài học.`, activity: "Hoạt động 3" }
        ] as any
      };
    } else {
      return {
        objectives_addition: `* Tích hợp Năng lực Trí tuệ Nhân tạo TIÊU CHUẨN (Theo QĐ 3439/QĐ-BGDĐT - Môn ${subject} - ${grade}):
NLc.C2: HS sử dụng Chatbot AI với câu lệnh phù hợp hỗ trợ giải đáp bài học môn ${subject}.
NLa.A3: HS đối chiếu, kiểm chứng câu trả lời của AI với SGK.
NLb.B2: HS khai báo minh bạch khi sử dụng AI.`,
        materials_addition: `* Thiết bị dạy học và Công cụ AI (Môn ${subject}):
- Máy tính/Smartphone kết nối Internet, ứng dụng Trợ lý AI (Gemini/ChatGPT).`,
        activities_enhancement: [
          {
            activity_name: "Hoạt động 1: KHỞI ĐỘNG",
            location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `NLa.A3: HS bước đầu làm quen với sự hỗ trợ của Trợ lý AI trong học tập môn ${subject}.`
          } as any,
          {
            activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
            location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `NLc.C2: HS gõ prompt: "Tóm tắt trọng tâm bài học môn ${subject}", sau đó đối chiếu kết quả với SGK.\nNLb.B2: Khai báo rõ việc sử dụng AI khi trả lời câu hỏi.`
          } as any
        ],
        summary_table: [
          { stt: "1", code: "NLa.A3", component: "Nhận thức về AI", expression: `HS nhận thức vai trò trợ lý học tập của AI.`, activity: "Hoạt động 1" },
          { stt: "2", code: "NLc.C2", component: "Ứng dụng AI", expression: `HS gõ câu lệnh hỏi AI và đối chiếu SGK.`, activity: "Hoạt động 2" },
          { stt: "3", code: "NLb.B2", component: "Minh bạch AI", expression: `HS khai báo khi sử dụng AI trong câu trả lời.`, activity: "Hoạt động 2" }
        ] as any
      };
    }
  }

  // --- 3. CHẾ ĐỘ TOÀN DIỆN NLS & AI (NLS_AI) ---
  if (level === 'INTENSIVE') {
    return {
      objectives_addition: `* Phát triển năng lực số và năng lực AI CHUYÊN SÂU (Theo TT 02/2025 & QĐ 3439/QĐ-BGDĐT - Môn ${subject} - ${grade}):
1.1.NC1a: HS sử dụng công cụ tìm kiếm nâng cao tra cứu, chọn lọc và đánh giá độ tin cậy của tài liệu môn ${subject}.
2.2.NC1a: HS làm việc nhóm đồng bộ thời gian thực, chia sẻ và phản biện sản phẩm học tập trực tuyến qua nền tảng số.
3.1.TC2a: HS sử dụng phần mềm đồ họa số (Canva/Mindmeister) và phần mềm mô phỏng (GeoGebra/PhET) để số hóa toàn diện kết quả học tập.
5.2.TC2a: HS làm chủ thiết bị số cá nhân/nhóm quét mã QR truy cập nền tảng tương tác đa chiều (Mentimeter/Padlet) quan sát mô phỏng.
NLc.C2: HS thiết kế chuỗi câu lệnh (prompt engineering) chuyên sâu tương tác với Chatbot AI hỗ trợ giải quyết vấn đề môn ${subject}.
NLa.A3: HS nhận thức sâu sắc về giới hạn và nguy cơ ảo giác của AI, đối chiếu và kiểm chứng nghiêm ngặt thông tin do AI cung cấp với SGK.
NLb.B2: HS thực hiện chuẩn mực đạo đức AI, khai báo minh bạch công cụ AI và mức độ đóng góp trong quá trình học tập.`,
      materials_addition: `* Thiết bị dạy học và Học liệu số tích hợp AI nâng cao (Môn ${subject}):
- Máy tính, máy chiếu tương tác, Smartphone kết nối Internet tốc độ cao.
- Nền tảng tương tác Padlet/Mentimeter, phần mềm mô phỏng trực quan (GeoGebra/PhET), phần mềm đồ họa (Canva), Chatbot AI (ChatGPT/Gemini/Copilot).
- Lưu ý an toàn: Sử dụng công cụ miễn phí/dùng chung, KHÔNG yêu cầu HS tạo tài khoản cá nhân.`,
      activities_enhancement: [
        {
          activity_name: "Hoạt động 1: KHỞI ĐỘNG",
          location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `5.2.TC2a: HS sử dụng điện thoại thông minh quét mã QR do GV cung cấp để truy cập vào nền tảng tương tác trực tuyến (Mentimeter/Padlet), quan sát hình ảnh/video chất lượng cao môn ${subject} và gửi câu trả lời nhanh chóng.\nNLa.A3: HS bước đầu nhận thức về ứng dụng hệ thống thông minh (AI) và chuyển đổi số trong thực tiễn bài học.`
        } as any,
        {
          activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
          location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `1.1.NC1a: HS sử dụng công cụ tìm kiếm Google tra cứu thông tin chuyên môn môn ${subject}, chủ động chọn lọc tài liệu từ các nguồn uy tín.\nNLc.C2: GV hướng dẫn HS sử dụng chatbot AI (ChatGPT/Copilot) hỗ trợ giải đáp nhanh các câu hỏi → HS gõ prompt cụ thể: "Hãy giải thích chi tiết bản chất và các trường hợp vận dụng của bài học môn ${subject}", sau đó phân tích, đối chiếu câu trả lời của AI với SGK.\nNLb.B2: HS khai báo minh bạch phạm vi sử dụng AI khi báo cáo kết quả.`
        } as any,
        {
          activity_name: "Hoạt động 3: LUYỆN TẬP, VẬN DỤNG",
          location: "HOẠT ĐỘNG 3: LUYỆN TẬP, VẬN DỤNG > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ / Báo cáo kết quả",
          enhanced_content: `3.1.TC2a: HS sử dụng phần mềm sơ đồ tư duy trực tuyến (Canva/Mindmeister) để thiết kế sơ đồ tổng hợp kiến thức môn ${subject} thành sản phẩm số hóa.\n2.2.NC1a: HS chia sẻ sản phẩm lên Padlet/Google Drive để các nhóm truy cập và tiến hành đánh giá chéo trực tuyến.`
        } as any
      ],
      summary_table: [
        { stt: "1", code: "5.2.TC2a", component: "Xác định nhu cầu & giải pháp công nghệ", expression: `HS quét mã QR truy cập Mentimeter/Padlet gửi câu trả lời tương tác môn ${subject}.`, activity: "Hoạt động 1" },
        { stt: "2", code: "1.1.NC1a", component: "Duyệt, tìm kiếm & lọc dữ liệu", expression: `HS tra cứu thông tin môn ${subject} trên Internet, chọn lọc nguồn tài liệu uy tín.`, activity: "Hoạt động 2" },
        { stt: "3", code: "NLc.C2", component: "Ứng dụng AI trong học tập", expression: `HS gõ prompt chuyên sâu hỏi Chatbot AI về bài học môn ${subject} và đối chiếu SGK.`, activity: "Hoạt động 2" },
        { stt: "4", code: "NLa.A3", component: "Kiểm chứng tri thức AI", expression: `HS đối chiếu câu trả lời của AI với kiến thức chuẩn trong SGK nhằm tránh ảo giác AI.`, activity: "Hoạt động 2" },
        { stt: "5", code: "NLb.B2", component: "Đạo đức AI & Minh bạch", expression: `HS khai báo minh bạch công cụ AI hỗ trợ khi trình bày báo cáo sản phẩm.`, activity: "Hoạt động 2" },
        { stt: "6", code: "3.1.TC2a", component: "Phát triển nội dung số", expression: `HS dùng Canva/Mindmeister thiết kế sơ đồ tư duy số hóa kết quả thảo luận nhóm.`, activity: "Hoạt động 3" },
        { stt: "7", code: "2.2.NC1a", component: "Chia sẻ thông tin", expression: `HS chia sẻ bài làm lên Padlet/Google Drive để đánh giá chéo trực tuyến.`, activity: "Hoạt động 3" }
      ] as any
    };
  }

  // Tiêu chuẩn mặc định (STANDARD)
  return {
    objectives_addition: `* Phát triển năng lực số và năng lực AI TIÊU CHUẨN (Theo TT 02/2025 & QĐ 3439/QĐ-BGDĐT - Môn ${subject} - ${grade}):
1.1.NC1a: HS sử dụng công cụ tìm kiếm tra cứu tài liệu môn ${subject}.
5.2.TC2a: HS sử dụng thiết bị số quét mã QR truy cập nền tảng tương tác (Mentimeter/Padlet).
NLc.C2: HS sử dụng Chatbot AI với câu lệnh phù hợp hỗ trợ giải đáp bài học môn ${subject}.
NLa.A3: HS biết cách đối chiếu, kiểm chứng thông tin do AI cung cấp với SGK.
NLb.B2: HS khai báo minh bạch công cụ AI hỗ trợ khi trình bày bài học.`,
    materials_addition: `* Thiết bị dạy học và Học liệu số (Môn ${subject}):
- Máy tính, máy chiếu, Smartphone kết nối Internet.
- Mã QR truy cập nền tảng tương tác (Mentimeter), Chatbot AI (ChatGPT/Gemini).`,
    activities_enhancement: [
      {
        activity_name: "Hoạt động 1: KHỞI ĐỘNG",
        location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
        enhanced_content: `5.2.TC2a: HS sử dụng điện thoại thông minh quét mã QR truy cập Mentimeter gửi câu trả lời khởi động môn ${subject}.`
      } as any,
      {
        activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
        location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
        enhanced_content: `1.1.NC1a: HS tra cứu tài liệu môn ${subject} trên Internet.\nNLc.C2: HS gõ prompt mẫu hỏi Chatbot AI về khái niệm cốt lõi, sau đó đối chiếu kết quả với SGK.\nNLb.B2: HS khai báo công cụ AI đã dùng khi phát biểu.`
      } as any
    ],
    summary_table: [
      { stt: "1", code: "5.2.TC2a", component: "Giải pháp công nghệ", expression: `HS quét mã QR truy cập Mentimeter gửi câu trả lời khởi động.`, activity: "Hoạt động 1" },
      { stt: "2", code: "1.1.NC1a", component: "Tra cứu dữ liệu", expression: `HS tra cứu thông tin môn ${subject} từ nguồn chính thống.`, activity: "Hoạt động 2" },
      { stt: "3", code: "NLc.C2", component: "Ứng dụng AI", expression: `HS gõ câu lệnh hỏi AI và đối chiếu SGK.`, activity: "Hoạt động 2" },
      { stt: "4", code: "NLb.B2", component: "Minh bạch AI", expression: `HS khai báo khi sử dụng AI trong bài làm.`, activity: "Hoạt động 2" }
    ] as any
  };
}