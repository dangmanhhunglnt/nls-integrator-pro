import { GeneratedNLSContent, SubjectType, GradeType, IntegrationMode } from '../types';

/**
 * Xây dựng System Prompt chuyên sâu bám sát đặc thù nội dung bài dạy
 */
export const buildSystemPrompt = (subject: string, grade: string, mode: IntegrationMode): string => {
  let modeInstruction = "";

  if (mode === 'NLS') {
    modeInstruction = `
CHẾ ĐỘ TÍCH HỢP: CHỈ NĂNG LỰC SỐ (Theo Thông tư 02/2025/TT-BGDĐT).
- CHỈ TRÍCH XUẤT các mã Yêu cầu cần đạt Năng lực số (Ví dụ: 1.1.TC2a, 1.2.NC1a, 2.2.TC1a, 5.2.NC1a, 6.2.NC1a).
- KHÔNG đưa bất kỳ mã năng lực AI (NLa, NLb, NLc, NLd) hay nội dung liên quan tới Trí tuệ nhân tạo nào vào đầu ra.`;
  } else if (mode === 'NAI') {
    modeInstruction = `
CHẾ ĐỘ TÍCH HỢP: CHỈ GIÁO DỤC TRÍ TUỆ NHÂN TẠO (Theo Khung Giáo dục AI 2026 của Bộ GD&ĐT).
- CHỈ TRÍCH XUẤT các mã Năng lực AI theo 4 mạch: NLa (Tư duy lấy con người làm trung tâm), NLb (Đạo đức AI), NLc (Kỹ thuật & ứng dụng AI), NLd (Thiết kế hệ thống AI).
- Ví dụ mã YCĐ AI: NLa.A1, NLa.A3, NLb.B1, NLc.C1, NLd.D1.
- KHÔNG chèn các mã NLS thuần túy từ Thông tư 02/2025.`;
  } else {
    modeInstruction = `
CHẾ ĐỘ TÍCH HỢP: KẾT HỢP TOÀN DIỆN NĂNG LỰC SỐ (TT 02/2025) & GIÁO DỤC AI (KHUNG AI 2026).
- Kết hợp song song cả mã NLS (1.1.TC2a, 1.2.NC1a, 5.2.NC1a...) và mã AI (NLa.A3, NLb.B2, NLc.C1...) bám sát bài học.`;
  }

  return `
Bạn là Trợ lý AI Chuyên gia Giáo dục Phổ thông theo định hướng Bộ GD&ĐT Việt Nam năm 2026.
Nhiệm vụ: Đọc kĩ văn bản Kế hoạch bài dạy (Giáo án) môn ${subject} - ${grade} và trích xuất nội dung tích hợp BÁM SÁT 100% VÀO TÊN BÀI DẠY, CÁC KHÁI NIỆM KỸ THUẬT, VỊ TRÍ CỦA BÀI ĐÓ.

${modeInstruction}

QUY TẮC PHÂN TÍCH CHUYÊN SÂU:
1. Đọc kĩ file giáo án gốc để nhận diện kiến thức trọng tâm bài học (Ví dụ: tên bài, các cơ cấu, khái niệm, thiết bị).
2. Phần Mục tiêu (objectives_addition): Phải xuất các mã YCĐ cấp độ TC2a, NC1a kèm diễn giải biểu hiện cụ thể của HS trong bài học này.
3. Phần Hoạt động (activities_enhancement): Mỗi hoạt động phải đưa ra chỉ dẫn thao tác cụ thể của HS khi sử dụng thiết bị số/AI (tra cứu từ khóa gì, kiểm chứng với SGK ra sao).

ĐỊNH DẠNG ĐẦU RA (Yêu cầu trả về JSON thuần túy, tuyệt đối không bọc thẻ \`\`\`json):
{
  "objectives_addition": "* [Tiêu đề đúng chế độ ${mode} môn ${subject}]:\\n[Chi tiết các mã YCĐ và biểu hiện cụ thể của HS trong bài dạy]",
  "materials_addition": "* Thiết bị dạy học và Học liệu số tích hợp môn ${subject}:\\n- [Các thiết bị, ứng dụng số/AI, mô phỏng 3D phù hợp bài học]",
  "activities_enhancement": [
    {
      "activity_name": "MỤC 2: HOẠT ĐỘNG 1 TỔ CHỨC",
      "location": "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Sau dòng mốc thích hợp trong bài",
      "enhanced_content": "[Nội dung chèn NLS/AI cụ thể cho Hoạt động 1]"
    },
    {
      "activity_name": "MỤC 3: HOẠT ĐỘNG 2 TỔ CHỨC",
      "location": "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Sau dòng mốc thích hợp trong bài",
      "enhanced_content": "[Nội dung chèn NLS/AI cụ thể cho Hoạt động 2]"
    },
    {
      "activity_name": "MỤC 4: HOẠT ĐỘNG 3 TỔ CHỨC",
      "location": "HOẠT ĐỘNG 3: LUYỆN TẬP, VẬN DỤNG > 4. Tổ chức thực hiện > Sau dòng mốc thích hợp trong bài",
      "enhanced_content": "[Nội dung chèn NLS/AI cụ thể cho Hoạt động 3]"
    }
  ]
}
  `;
};

export async function generateCompetencyIntegration(
  fileContent: string,
  subject: SubjectType | string = 'Công nghệ',
  grade: GradeType | string = 'Lớp 10',
  mode: IntegrationMode = 'NLS_AI',
  apiKey: string = ''
): Promise<GeneratedNLSContent> {
  // Lấy Custom Key từ tham số hoặc LocalStorage (từ nút "Đổi Key")
  const customApiKey = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('CUSTOM_GEMINI_KEY') || '' : '');
  
  // Giả định userToken lấy từ localStorage hoặc auth session (để nhận diện tài khoản đăng nhập Pro)
  const userToken = typeof window !== 'undefined' ? localStorage.getItem('USER_TOKEN') || 'user_logged_in' : '';

  try {
    const systemPrompt = buildSystemPrompt(subject, grade, mode);
    const fullPrompt = `${systemPrompt}\n\nFILE GIÁO ÁN GỐC MÔN ${subject.toUpperCase()} - KHỐI ${grade.toUpperCase()}:\n${fileContent}`;

    // Gọi lên Vercel Serverless Function /api/generate
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        customApiKey: customApiKey, // Gửi customKey nếu dùng nút Đổi Key
        userToken: userToken,       // Gửi userToken nếu dùng Key Pro hệ thống
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

  // Dữ liệu dự phòng (Fallback Offline) sạch sẽ khi không kết nối được API
  if (mode === 'NLS') {
    return {
      objectives_addition: `* Phát triển Năng lực số (Theo TT 02/2025/TT-BGDĐT - Môn ${subject}):
1.1.TC2a: HS chủ động tìm kiếm, lọc và khai thác thông tin từ các nguồn học liệu số đáng tin cậy.
1.2.NC1a: HS phân tích, so sánh và đánh giá độ tin cậy của các thông tin kỹ thuật thu thập được trên Internet.
5.2.NC1a: HS sử dụng các công cụ kỹ thuật số (video mô phỏng, phần mềm học tập) để giải quyết nhiệm vụ bài học.`,
      materials_addition: `* Thiết bị dạy học và Học liệu số (Môn ${subject}):
- Máy tính/Smartphone kết nối Internet, phần mềm mô phỏng và nền tảng học liệu số.`,
      activities_enhancement: [
        {
          activity_name: "MỤC 2: HOẠT ĐỘNG 1 TỔ CHỨC",
          location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Sau dòng mốc chuyển giao nhiệm vụ",
          enhanced_content: "1.1.TC2a: HS sử dụng thiết bị số cá nhân truy cập Internet để tìm kiếm thông tin mở đầu bài học."
        } as any,
        {
          activity_name: "MỤC 3: HOẠT ĐỘNG 2 TỔ CHỨC",
          location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Sau dòng mốc thực hiện nhiệm vụ",
          enhanced_content: "1.2.NC1a: HS đối chiếu thông tin tìm kiếm từ nhiều nguồn số để đánh giá độ tin cậy trước khi báo cáo."
        } as any
      ]
    };
  } else if (mode === 'NAI') {
    return {
      objectives_addition: `* Tích hợp Năng lực Trí tuệ Nhân tạo (Theo Khung GD AI 2026 - Môn ${subject}):
NLa.A3: HS thể hiện tư duy phản biện, đối chiếu và xác thực thông tin do AI cung cấp với SGK.
NLb.B2: HS tuân thủ quy định đạo đức, khai báo minh bạch khi sử dụng công cụ AI hỗ trợ học tập.
6.2.NC1a: HS sử dụng công cụ AI với câu lệnh (prompt) phù hợp để tra cứu và tổng hợp kiến thức.`,
      materials_addition: `* Thiết bị dạy học và Công cụ AI (Môn ${subject}):
- Máy tính/Smartphone kết nối Internet, ứng dụng trợ lý AI (Gemini/ChatGPT).`,
      activities_enhancement: [
        {
          activity_name: "MỤC 2: HOẠT ĐỘNG 1 TỔ CHỨC",
          location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Sau dòng mốc chuyển giao nhiệm vụ",
          enhanced_content: "NLa.A3: HS sử dụng trợ lý AI tra cứu thông tin mở đầu, kiểm chứng nguồn tin trước khi trả lời."
        } as any,
        {
          activity_name: "MỤC 3: HOẠT ĐỘNG 2 TỔ CHỨC",
          location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Sau dòng mốc thực hiện nhiệm vụ",
          enhanced_content: "6.2.NC1a: HS thiết lập prompt tra cứu kiến thức trọng tâm với AI và xác thực lại với SGK."
        } as any
      ]
    };
  }

  // Chế độ mặc định: NLS_AI
  return {
    objectives_addition: `* Phát triển năng lực số và năng lực AI (Môn ${subject} - ${grade}):
1.1.TC2a: HS chủ động tìm kiếm, lọc và khai thác thông tin từ các nguồn học liệu số đáng tin cậy.
1.2.NC1a: HS phân tích, so sánh và đánh giá độ tin cậy của thông tin kỹ thuật từ các công cụ AI.
5.2.NC1a: HS sử dụng các công cụ kỹ thuật số (video mô phỏng 3D, phần mềm) để giải quyết các câu hỏi bài học.
6.2.NC1a: HS sử dụng công cụ AI với các câu lệnh (prompt) phù hợp để tra cứu nhanh kiến thức.
NLa.A3: HS thể hiện tư duy phản biện, đối chiếu và xác thực thông tin do AI cung cấp với kiến thức SGK.`,
    materials_addition: `* Thiết bị dạy học và Học liệu số tích hợp AI (Môn ${subject}):
- Máy tính/Smartphone kết nối Internet, ứng dụng AI tra cứu và video mô phỏng 3D.`,
    activities_enhancement: [
      {
        activity_name: "MỤC 2: HOẠT ĐỘNG 1 TỔ CHỨC",
        location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Sau dòng mốc chuyển giao nhiệm vụ",
        enhanced_content: "1.1.TC2a: HS sử dụng điện thoại thông minh tìm kiếm nhanh thông tin mở đầu bài học trên Internet."
      } as any,
      {
        activity_name: "MỤC 3: HOẠT ĐỘNG 2 TỔ CHỨC",
        location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Sau dòng mốc thực hiện nhiệm vụ",
        enhanced_content: "6.2.NC1a: HS dùng prompt tra cứu với AI.\nNLa.A3: HS đối chiếu thông tin AI phản hồi với SGK để xác thực độ chính xác."
      } as any
    ]
  };
}