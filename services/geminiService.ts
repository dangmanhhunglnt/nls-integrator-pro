import { GeneratedNLSContent, SubjectType, GradeType, IntegrationMode, IntegrationLevel } from '../types';
import { getDeviceId } from '../utils';

/**
 * Hàm phân loại cấp học từ chuỗi khối lớp
 */
function getEducationLevel(grade: string): 'PRIMARY' | 'SECONDARY' | 'HIGH' {
  if (['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'].includes(grade)) return 'PRIMARY';
  if (['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'].includes(grade)) return 'SECONDARY';
  return 'HIGH';
}

/**
 * Xây dựng System Prompt chuẩn hóa bám sát:
 * 1. Công văn 2345/BGDĐT-GDTH (Cấp Tiểu học) & Công văn 5512/BGDĐT-GDTrH (Cấp Trung học).
 * 2. Thông tư 02/2025/TT-BGDĐT (Khung năng lực số cho người học).
 * 3. Quyết định 2422/QĐ-BGDĐT & Khung Giáo dục AI hoàn thiện năm 2026.
 * 4. Hướng dẫn triển khai thực hiện GD AI từ năm học 2026-2027 của Bộ GD&ĐT.
 */
export const buildSystemPrompt = (
  subject: string, 
  grade: string, 
  mode: IntegrationMode,
  level: IntegrationLevel = 'STANDARD'
): string => {
  const eduLevel = getEducationLevel(grade);

  let pedagogyConstraint = "";
  if (eduLevel === 'PRIMARY') {
    pedagogyConstraint = `
QUY TẮC ĐẶC BIỆT DÀNH CHO TIỂU HỌC (${grade}) - THEO CÔNG VĂN 2345/BGDĐT-GDTH:
- Tuân thủ cấu trúc Phụ lục 3 của Công văn 2345: Yêu cầu cần đạt -> Đồ dùng dạy học -> Các hoạt động dạy học chủ yếu (Mở đầu, Hình thành kiến thức/Khám phá, Luyện tập, Vận dụng) -> Điều chỉnh sau bài dạy.
- TUYỆT ĐỐI KHÔNG yêu cầu HS dùng smartphone cá nhân, KHÔNG yêu cầu HS tự gõ prompt AI phức tạp hay tạo tài khoản cá nhân.
- Thiết bị và học liệu: Máy tính của GV, Màn hình chiếu/Tivi tương tác của lớp, thẻ từ tương tác, phần mềm nhận diện tranh vẽ/âm thanh trực quan (Quick Draw, AutoDraw, ScratchJr, Quizizz/Kahoot).
- Hoạt động của HS: Quan sát trực quan, tham gia trò chơi học tập tập thể, nhận biết ứng dụng công nghệ thông minh trong đời sống, rèn luyện tư thế ngồi và an toàn thiết bị số.`;
  } else if (eduLevel === 'SECONDARY') {
    pedagogyConstraint = `
QUY TẮC DÀNH CHO TRUNG HỌC CƠ SỞ (${grade}) - THEO CÔNG VĂN 5512/BGDĐT-GDTrH:
- Tuân thủ chuẩn Công văn 5512 (Mục tiêu, Thiết bị, Tiến trình 4 bước).
- Thiết bị và học liệu: Máy tính phòng tin học / thiết bị dùng chung có kết nối mạng, nền tảng phân loại trực quan Teachable Machine, Chatbot học tập hỗ trợ (Copilot / Gemini Edu), mô phỏng PhET, Canva.
- Hoạt động của HS: Đặt câu lệnh (prompting cơ bản) theo mẫu để tìm ý tưởng, đối chiếu câu trả lời với SGK, khai báo nguồn và giữ gìn trung thực học thuật.`;
  } else {
    pedagogyConstraint = `
QUY TẮC DÀNH CHO TRUNG HỌC PHỔ THÔNG (${grade}) - THEO CÔNG VĂN 5512/BGDĐT-GDTrH:
- Tuân thủ chuẩn Công văn 5512 (Mục tiêu, Thiết bị, Tiến trình 4 bước).
- Thiết bị và học liệu: Thiết bị cá nhân/nhóm kết nối mạng, Trợ lý AI tạo sinh nâng cao (Gemini, ChatGPT, Claude, NotebookLM), phần mềm toán/khoa học chuyên sâu (GeoGebra 3D, Desmos, Python Colab).
- Hoạt động của HS: Thiết kế câu lệnh có cấu trúc (Prompt Engineering), phản biện dữ liệu đầu ra để phát hiện ảo giác (hallucination) và thiên vị (bias), minh bạch đạo đức nghiên cứu.`;
  }

  let modeInstruction = "";
  if (mode === 'NLS') {
    modeInstruction = `
CHẾ ĐỘ TÍCH HỢP: CHỈ NĂNG LỰC SỐ (Theo Thông tư 02/2025/TT-BGDĐT).
- CHỈ TRÍCH XUẤT các mã Yêu cầu cần đạt Năng lực số (Ví dụ: 1.1.TC1a, 1.1.NC1a, 2.2.NC1a, 3.1.TC2a, 5.2.TC2a...).
- KHÔNG đưa bất kỳ mã năng lực AI (NLa, NLb, NLc, NLd) nào vào đầu ra.`;
  } else if (mode === 'NAI') {
    modeInstruction = `
CHẾ ĐỘ TÍCH HỢP: CHỈ GIÁO DỤC TRÍ TUỆ NHÂN TẠO (Theo Khung Giáo dục AI 2026 của Bộ GD&ĐT & QĐ 2422/QĐ-BGDĐT).
- CHỈ TRÍCH XUẤT các mã Năng lực AI theo 4 mạch đặc thù chuẩn phù hợp với ${grade}:
  + NLa (A): Tư duy lấy con người làm trung tâm (NLa.A1, NLa.A2, NLa.A3...)
  + NLb (B): Đạo đức AI, bảo vệ dữ liệu cá nhân & khai báo minh bạch (NLb.B1, NLb.B2...)
  + NLc (C): Kỹ thuật, thuật toán & ứng dụng AI (NLc.C1, NLc.C2, NLc.C3...)
  + NLd (D): Thiết kế & cải tiến hệ thống AI (NLd.D1, NLd.D2...)
- KHÔNG chèn các mã NLS thuần túy từ Thông tư 02/2025.`;
  } else {
    modeInstruction = `
CHẾ ĐỘ TÍCH HỢP: KẾT HỢP TOÀN DIỆN NĂNG LỰC SỐ (TT 02/2025/TT-BGDĐT) & GIÁO DỤC AI (QĐ 2422 & KHUNG BỘ GD&ĐT 2026).
- Kết hợp song song các mã NLS (1.1.TC1a/1.1.NC1a, 2.2.NC1a, 3.1.TC2a, 5.2.TC2a...) và các mã Năng lực AI bám sát 4 mạch (NLa, NLb, NLc, NLd) phù hợp với lứa tuổi ${grade} môn ${subject}.`;
  }

  let levelInstruction = "";
  if (level === 'INTENSIVE') {
    levelInstruction = `
MỨC ĐỘ TÍCH HỢP: CHUYÊN SÂU / NÂNG CAO (DÀNH CHO THAO GIẢNG / HỘI GIẢNG / KIỂM TRA CHUYÊN ĐỀ).
- MỤC TIÊU: Thiết kế chi tiết từ 4 đến 6 chỉ số Yêu cầu cần đạt NLS/AI bám sát trọng tâm chuyên môn của bài.
- TIẾN TRÌNH DẠY HỌC: BẮT BUỘC TÍCH HỢP VÀO TẤT CẢ CÁC HOẠT ĐỘNG TRONG GIÁO ÁN:
  + 1. Hoạt động Khởi động: Trò chơi số / video trực quan mở đầu tạo hứng thú.
  + 2. Hoạt động Khám phá / Hình thành kiến thức: Sử dụng phần mềm mô phỏng, học liệu số tương tác hoặc công cụ AI trực quan để hình thành kiến thức.
  + 3. Hoạt động Luyện tập: Tích hợp vào các bài tập cụ thể trong giáo án (Ví dụ: bài tập kéo thả, bảng tương tác, vòng quay câu hỏi hoặc chấm trắc nghiệm trực quan).
  + 4. Hoạt động Vận dụng: Tình huống ứng dụng công nghệ thực tế đời sống, giải quyết vấn đề sau bài học.
- BẢNG MA TRẬN TỔNG HỢP: Lập đầy đủ từ 4 đến 6 dòng chi tiết cho tất cả các hoạt động đã tích hợp.`;
  } else {
    levelInstruction = `
MỨC ĐỘ TÍCH HỢP: TIÊU CHUẨN / CƠ BẢN (DÀNH CHO DẠY HỌC LÊN LỚP HẰNG NGÀY).
- MỤC TIÊU: Tinh gọn từ 2 đến 3 chỉ số Yêu cầu cần đạt cốt lõi, tập trung vào việc tiếp nhận thông tin và an toàn thiết bị.
- TIẾN TRÌNH DẠY HỌC: CHỈ TÍCH HỢP GỌN GÀNG VÀO 2 HOẠT ĐỘNG CHÍNH:
  + 1. Hoạt động Khởi động (trò chơi số ngắn / câu đố trực quan).
  + 2. Hoạt động Khám phá (quan sát hình ảnh, video hoặc mô hình số trực quan).
  (Phần Luyện tập và Vận dụng giữ nguyên tiến trình tự nhiên của giáo viên để đảm bảo đúng thời lượng tiết học).
- BẢNG MA TRẬN TỔNG HỢP: Tinh gọn từ 2 đến 3 chỉ số tương ứng.`;
  }

  return `
Bạn là Trợ lý AI Chuyên gia Giáo dục Phổ thông theo định hướng chỉ đạo năm học 2026-2027 của Bộ GD&ĐT Việt Nam (Bám sát TT 02/2025/TT-BGDĐT, QĐ 2422/QĐ-BGDĐT, Hướng dẫn GD AI 2026-2027 và Khung GD AI 2026).
Nhiệm vụ: Đọc kĩ toàn bộ văn bản Kế hoạch bài dạy (Giáo án) môn ${subject} - ${grade} được cung cấp và thiết kế nội dung tích hợp BÁM SÁT 100% VÀO TÊN BÀI DẠY, ĐẶC THÙ LỨA TUỔI HỌC SINH ${grade.toUpperCase()} VÀ TIẾN TRÌNH THỰC TẾ TRONG BÀI.

${pedagogyConstraint}
${modeInstruction}
${levelInstruction}

QUY TẮC PHÂN TÍCH VÀ ĐẦU RA BẮT BUỘC:
1. MỤC TIÊU VÀ HỌC LIỆU (MỤC I & II):
   - Nêu rõ các mã NLS/AI kèm diễn giải biểu hiện cụ thể của HS bám sát bài dạy môn ${subject} - ${grade}.
   - Liệt kê thiết bị và học liệu số phù hợp cấp học (Tiểu học: Tivi/màn chiếu, phần mềm mô phỏng trực quan; THCS/THPT: máy tính, chatbot AI, mô phỏng chuyên sâu). Tuyệt đối nhấn mạnh: "Không yêu cầu HS tạo tài khoản cá nhân hoặc thu thập dữ liệu cá nhân nhạy cảm".

2. ĐAN CÀI CỤ THỂ VÀO BẢNG TỔ CHỨC THỰC HỆN (MỤC III - TIẾN TRÌNH DẠY HỌC):
   - Đọc kỹ và TRÍCH XUẤT NGUYÊN VĂN TÊN TIÊU ĐỀ HOẠT ĐỘNG từ file gốc vào trường "activity_name" (Ví dụ: "1. Khởi động", "2. Khám phá", "3. Luyện tập", "4. Vận dụng" hoặc "Hoạt động 1: ...").
   - MÔ TẢ THAO TÁC CỤ THỂ theo đúng tâm lý và lứa tuổi ${grade}.

3. BẢNG TỔNG HỢP NĂNG LỰC SỐ VÀ AI TRONG BÀI HỌC (Mảng summary_table):
   - Sinh đầy đủ mảng "summary_table" bao gồm đúng 5 trường (stt, code, component, expression, activity) tương ứng các hoạt động đã được tích hợp để tự động tạo bảng ở cuối file Word.

ĐỊNH DẠNG ĐẦU RA (Yêu cầu trả về JSON thuần túy, tuyệt đối không bọc thẻ markdown \`\`\`json):
{
  "objectives_addition": "* [Tích hợp chế độ ${mode} - Mức độ ${level === 'INTENSIVE' ? 'Chuyên sâu' : 'Tiêu chuẩn'} Môn ${subject} - ${grade} (Theo TT 02/2025 & QĐ 2422/QĐ-BGDĐT)]:\\n[Chi tiết từng mã YCĐ kèm biểu hiện cụ thể của HS ${grade} môn ${subject}]",
  "materials_addition": "* Thiết bị dạy học và Học liệu số môn ${subject} (${grade}):\\n- [Thiết bị, phần mềm trực quan, công cụ số/AI phù hợp lứa tuổi ${grade}]\\n- Lưu ý an toàn: Không yêu cầu HS tạo tài khoản cá nhân, bảo vệ an toàn mắt và dữ liệu số.",
  "activities_enhancement": [
    {
      "activity_name": "[Trích xuất chính xác tên Hoạt động 1 trong file gốc]",
      "location": "Hoạt động 1 > Tổ chức thực hiện > HS thực hiện nhiệm vụ",
      "enhanced_content": "- Công cụ: [Tên công cụ phù hợp ${grade}]\\n- GV (Chuyển giao): [Hướng dẫn giao nhiệm vụ]\\n- HS (Thực hiện): [Thao tác cụ thể phù hợp ${grade}]"
    },
    {
      "activity_name": "[Trích xuất chính xác tên Hoạt động 2 trong file gốc]",
      "location": "Hoạt động 2 > Tổ chức thực hiện > HS thực hiện nhiệm vụ",
      "enhanced_content": "- Công cụ: [Tên công cụ phù hợp ${grade}]\\n- GV (Chuyển giao): [Hướng dẫn giao nhiệm vụ]\\n- HS (Thực hiện): [Thao tác cụ thể phù hợp ${grade}]"
    }
  ],
  "summary_table": [
    {"stt": "1", "code": "[Mã YCĐ]", "component": "[Thành phần]", "expression": "[Biểu hiện cụ thể của HS ${grade}]", "activity": "Hoạt động 1"},
    {"stt": "2", "code": "[Mã YCĐ]", "component": "[Thành phần]", "expression": "[Biểu hiện cụ thể của HS ${grade}]", "activity": "Hoạt động 2"}
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
  const licenseCode = typeof window !== 'undefined' ? localStorage.getItem('USER_LICENSE_CODE') || '' : '';
  const deviceId = typeof window !== 'undefined' ? await getDeviceId() : '';
  const eduLevel = getEducationLevel(grade);
  const standard = eduLevel === 'PRIMARY' ? 'CV2345' : 'CV5512';

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
        licenseCode: licenseCode,
        deviceId: deviceId,
        standard: standard,
        level: level,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.text) {
        const cleanJson = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson) as GeneratedNLSContent;
      }
    } else {
      const errRes = await response.json().catch(() => ({}));
      console.warn('Lỗi gọi Serverless Function:', errRes.error || response.statusText);
      if (errRes.error && typeof window !== 'undefined') {
        alert(errRes.error);
      }
    }
  } catch (error: any) {
    console.warn('Không thể kết nối Serverless Function API, sử dụng dữ liệu dự phòng... Lỗi:', error?.message || error);
  }

  // ==========================================
  // DỮ LIỆU DỰ PHÒNG (FALLBACK OFFLINE PHÂN TẦNG CHUẨN XÁC THEO CẤP HỌC VÀ MỨC ĐỘ)
  // ==========================================

  // --- CẤP 1: TIỂU HỌC (LỚP 1 - 5) ---
  if (eduLevel === 'PRIMARY') {
    if (mode === 'NLS') {
      if (level === 'INTENSIVE') {
        return {
          objectives_addition: `* Phát triển Năng lực số CHUYÊN SÂU TIỂU HỌC (Theo TT 02/2025/TT-BGDĐT - Môn ${subject} - ${grade}):
- 1.1.TC1a: HS quan sát, tiếp nhận thông tin, hình ảnh và video bài học môn ${subject} qua màn hình tương tác/máy chiếu của lớp.
- 2.1.TC1a: HS bước đầu biết tương tác trực quan, chọn đáp án đúng trong các trò chơi học tập số dưới sự điều hành của GV.
- 3.1.TC1a: HS sử dụng các công cụ kéo thả, ghép nối bài tập số để rèn luyện kỹ năng thực hành môn ${subject}.
- 4.1.TC1a: HS hình thành thói quen ngồi đúng tư thế, giữ khoảng cách mắt an toàn khi học tập với thiết bị số.
- 5.2.TC1a: HS vận dụng kiến thức bài học giải quyết tình huống thực tế qua bài tập mô phỏng số.`,
          materials_addition: `* Thiết bị dạy học và Học liệu số Chuyên sâu (Môn ${subject} - ${grade}):
- Máy tính giáo viên, Tivi/Màn hình chiếu tương tác của lớp học, bảng tương tác thông minh.
- Phần mềm trò chơi học tập trực quan (Quizizz/Kahoot), video bài giảng và học liệu số tương tác mô phỏng môn ${subject}.`,
          activities_enhancement: [
            {
              activity_name: "1. Khởi động",
              location: "Khởi động > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Màn hình chiếu/Tivi lớp học, trò chơi số tương tác.\n- GV (Chuyển giao): GV trình chiếu hình ảnh/câu đố khởi động môn ${subject} trên màn hình.\n- HS (Thực hiện): 1.1.TC1a: HS quan sát câu hỏi trực quan, giơ thẻ màu hoặc chọn đáp án tương tác dưới sự điều hành của GV.`
            } as any,
            {
              activity_name: "2. Khám phá",
              location: "Khám phá > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Video/Mô hình học liệu số 3D môn ${subject}.\n- GV (Chuyển giao): GV mở mô phỏng bài học trực quan cho cả lớp quan sát.\n- HS (Thực hiện): 2.1.TC1a: HS theo dõi mô hình số, nhận biết các đặc điểm kiến thức trọng tâm và trả lời câu hỏi tìm hiểu.`
            } as any,
            {
              activity_name: "3. Luyện tập",
              location: "Luyện tập > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Bảng tương tác/Bài tập số tương tác trực quan.\n- GV (Chuyển giao): GV trình chiếu bài tập tương tác trên màn hình.\n- HS (Thực hiện): 3.1.TC1a: Đại diện HS lên bảng chạm kéo thả/nối kết quả, cả lớp quan sát và nhận xét.`
            } as any,
            {
              activity_name: "4. Vận dụng",
              location: "Vận dụng > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Tình huống mô phỏng thực tế trên màn hình chiếu.\n- GV (Chuyển giao): GV đưa ra bài toán thực tiễn liên hệ đời sống qua hình ảnh số.\n- HS (Thực hiện): 5.2.TC1a: HS quan sát tình huống, liên hệ thực tế và nêu phương án giải quyết.`
            } as any
          ],
          summary_table: [
            { stt: "1", code: "1.1.TC1a", component: "Tiếp nhận thông tin số", expression: `HS quan sát hình ảnh, video trực quan môn ${subject} trên màn hình chiếu.`, activity: "Khởi động" },
            { stt: "2", code: "2.1.TC1a", component: "Tương tác trong môi trường số", expression: `HS tham gia trả lời câu hỏi trắc nghiệm trực quan qua trò chơi số.`, activity: "Khám phá" },
            { stt: "3", code: "3.1.TC1a", component: "Thực hành trên nền tảng số", expression: `HS tương tác làm bài tập trực quan trên màn hình lớp.`, activity: "Luyện tập" },
            { stt: "4", code: "5.2.TC1a", component: "Ứng dụng giải quyết vấn đề", expression: `HS vận dụng kiến thức giải quyết tình huống số thực tế.`, activity: "Vận dụng" },
            { stt: "5", code: "4.1.TC1a", component: "Bảo vệ sức khỏe khi dùng thiết bị số", expression: `HS thực hiện đúng tư thế ngồi học và giữ an toàn mắt khi xem màn hình.`, activity: "Toàn bài" }
          ] as any
        };
      }
      return {
        objectives_addition: `* Phát triển Năng lực số TIỂU HỌC (Theo TT 02/2025/TT-BGDĐT - Môn ${subject} - ${grade}):
- 1.1.TC1a: HS quan sát, tiếp nhận thông tin, hình ảnh và video bài học môn ${subject} qua màn hình tương tác/máy chiếu của lớp.
- 2.1.TC1a: HS bước đầu biết tương tác trực quan, chọn đáp án đúng trong các trò chơi học tập số dưới sự điều hành của GV.
- 4.1.TC1a: HS hình thành thói quen ngồi đúng tư thế, giữ khoảng cách mắt an toàn khi học tập với thiết bị số.`,
        materials_addition: `* Thiết bị dạy học và Học liệu số (Môn ${subject} - ${grade}):
- Máy tính giáo viên, Tivi/Màn hình chiếu tương tác của lớp học.
- Phần mềm trò chơi học tập trực quan (Quizizz/Kahoot), video bài giảng và học liệu số tương tác môn ${subject}.`,
        activities_enhancement: [
          {
            activity_name: "1. Khởi động",
            location: "Khởi động > Hoạt động của học sinh",
            enhanced_content: `- Công cụ: Màn hình chiếu/Tivi lớp học, trò chơi số tương tác.\n- GV (Chuyển giao): GV trình chiếu hình ảnh/câu đố khởi động môn ${subject} trên màn hình.\n- HS (Thực hiện): 1.1.TC1a: HS quan sát câu hỏi trực quan, giơ thẻ màu hoặc chọn đáp án tương tác dưới sự điều hành của GV.`
          } as any,
          {
            activity_name: "2. Khám phá",
            location: "Khám phá > Hoạt động của học sinh",
            enhanced_content: `- Công cụ: Video/Mô hình học liệu số 3D môn ${subject}.\n- GV (Chuyển giao): GV mở mô phỏng bài học trực quan cho cả lớp quan sát.\n- HS (Thực hiện): 2.1.TC1a: HS theo dõi mô hình số, nhận biết các đặc điểm kiến thức trọng tâm và trả lời câu hỏi tìm hiểu.`
          } as any
        ],
        summary_table: [
          { stt: "1", code: "1.1.TC1a", component: "Tiếp nhận thông tin số", expression: `HS quan sát hình ảnh, video trực quan môn ${subject} trên màn hình chiếu.`, activity: "Khởi động" },
          { stt: "2", code: "2.1.TC1a", component: "Tương tác trong môi trường số", expression: `HS tham gia trả lời câu hỏi trắc nghiệm trực quan qua trò chơi số.`, activity: "Khám phá" },
          { stt: "3", code: "4.1.TC1a", component: "Bảo vệ sức khỏe khi dùng thiết bị số", expression: `HS thực hiện đúng tư thế ngồi học và giữ an toàn mắt khi xem màn hình.`, activity: "Khởi động, Khám phá" }
        ] as any
      };
    } else if (mode === 'NAI') {
      if (level === 'INTENSIVE') {
        return {
          objectives_addition: `* Tích hợp Giáo dục AI CHUYÊN SÂU TIỂU HỌC (Theo QĐ 2422/QĐ-BGDĐT - Môn ${subject} - ${grade}):
- NLa.A1: HS nhận biết được các tính năng thông minh/AI quen thuộc trong đời sống và học tập môn ${subject}.
- NLc.C1: HS trải nghiệm tính năng nhận diện trực quan (hình ảnh/âm thanh/nét vẽ) của công cụ thông minh dưới sự hướng dẫn của GV.
- NLc.C2: HS quan sát ứng dụng AI phân loại và xử lý dữ liệu đơn giản phục vụ bài học.
- NLb.B1: HS có ý thức sử dụng thiết bị số an toàn, bảo vệ mắt và tuân thủ thời gian học tập.`,
          materials_addition: `* Thiết bị dạy học và Ứng dụng AI Chuyên sâu (Môn ${subject} - ${grade}):
- Máy tính giáo viên, màn hình tivi lớn của lớp.
- Ứng dụng AI nhận diện nét vẽ/hình ảnh (Quick Draw, AutoDraw, Teachable Machine trực quan).`,
          activities_enhancement: [
            {
              activity_name: "1. Khởi động",
              location: "Khởi động > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Ứng dụng thông minh/Màn hình tương tác.\n- GV (Chuyển giao): GV trình chiếu tình huống mở đầu bằng hình ảnh/âm thanh do trợ lý số hỗ trợ.\n- HS (Thực hiện): NLa.A1: HS quan sát, nhận biết cách ứng dụng thông minh nhận diện và gợi mở vấn đề bài học.`
            } as any,
            {
              activity_name: "2. Khám phá",
              location: "Khám phá > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Phần mềm nhận diện hình ảnh/mô phỏng thông minh.\n- GV (Chuyển giao): GV hướng dẫn HS vẽ hoặc chọn biểu tượng để phần mềm nhận diện.\n- HS (Thực hiện): NLc.C1: HS đại diện nhóm trải nghiệm tính năng nhận diện trực quan của công nghệ thông minh để hình thành kiến thức mới.`
            } as any,
            {
              activity_name: "3. Luyện tập",
              location: "Luyện tập > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Trò chơi phân loại dữ liệu số thông minh.\n- GV (Chuyển giao): GV tổ chức cho HS phân loại các trường hợp đúng/sai qua công cụ số.\n- HS (Thực hiện): NLc.C2: HS tham gia tương tác, so sánh kết quả phân loại của phần mềm với đáp án của bài học.`
            } as any,
            {
              activity_name: "4. Vận dụng",
              location: "Vận dụng > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Video/Hình ảnh ứng dụng công nghệ thông minh trong thực tế.\n- GV (Chuyển giao): GV giới thiệu thiết bị thông minh liên quan bài học trong đời sống.\n- HS (Thực hiện): NLa.A1: HS liên hệ các ứng dụng quen thuộc tại gia đình và trường học.`
            } as any
          ],
          summary_table: [
            { stt: "1", code: "NLa.A1", component: "Nhận thức về công nghệ thông minh", expression: `HS nhận biết sự hỗ trợ của ứng dụng thông minh trong bài học.`, activity: "Khởi động, Vận dụng" },
            { stt: "2", code: "NLc.C1", component: "Trải nghiệm tính năng AI trực quan", expression: `HS trải nghiệm phần mềm nhận diện nét vẽ/hình ảnh hỗ trợ bài học.`, activity: "Khám phá" },
            { stt: "3", code: "NLc.C2", component: "Tương tác và phân loại dữ liệu", expression: `HS tương tác với phần mềm phân loại dữ liệu bài học.`, activity: "Luyện tập" },
            { stt: "4", code: "NLb.B1", component: "Ý thức sử dụng công nghệ an toàn", expression: `HS thực hiện đúng quy định an toàn khi tiếp xúc thiết bị số.`, activity: "Toàn bài" }
          ] as any
        };
      }
      return {
        objectives_addition: `* Tích hợp Giáo dục AI TIỂU HỌC (Theo QĐ 2422/QĐ-BGDĐT - Môn ${subject} - ${grade}):
- NLa.A1: HS nhận biết được một số ứng dụng thông minh/AI quen thuộc trong đời sống và học tập môn ${subject}.
- NLc.C1: HS trải nghiệm tính năng nhận diện trực quan (hình ảnh/âm thanh/chữ viết) của phần mềm học tập thông minh dưới sự hướng dẫn của GV.
- NLb.B1: HS có ý thức sử dụng thiết bị số có chừng mực, chấp hành quy định an toàn lớp học.`,
        materials_addition: `* Thiết bị dạy học và Ứng dụng AI trực quan (Môn ${subject} - ${grade}):
- Máy tính giáo viên, màn hình tivi lớn của lớp.
- Ứng dụng AI nhận diện nét vẽ/hình ảnh (Quick Draw, AutoDraw, Teachable Machine trực quan).`,
        activities_enhancement: [
          {
            activity_name: "1. Khởi động",
            location: "Khởi động > Hoạt động của học sinh",
            enhanced_content: `- Công cụ: Ứng dụng thông minh/Màn hình tương tác.\n- GV (Chuyển giao): GV trình chiếu tình huống mở đầu bằng hình ảnh/âm thanh do trợ lý số hỗ trợ.\n- HS (Thực hiện): NLa.A1: HS quan sát, nhận biết cách ứng dụng thông minh nhận diện và gợi mở vấn đề bài học.`
          } as any,
          {
            activity_name: "2. Khám phá",
            location: "Khám phá > Hoạt động của học sinh",
            enhanced_content: `- Công cụ: Phần mềm nhận diện hình ảnh/mô phỏng thông minh.\n- GV (Chuyển giao): GV hướng dẫn HS vẽ hoặc chọn biểu tượng để phần mềm nhận diện.\n- HS (Thực hiện): NLc.C1: HS đại diện nhóm trải nghiệm tính năng nhận diện trực quan của công nghệ thông minh để hình thành kiến thức mới.`
          } as any
        ],
        summary_table: [
          { stt: "1", code: "NLa.A1", component: "Nhận thức về công nghệ thông minh", expression: `HS nhận biết sự hỗ trợ của ứng dụng thông minh trong đời sống và môn ${subject}.`, activity: "Khởi động" },
          { stt: "2", code: "NLc.C1", component: "Trải nghiệm tính năng AI trực quan", expression: `HS trải nghiệm phần mềm nhận diện hình ảnh/nét vẽ hỗ trợ bài học.`, activity: "Khám phá" },
          { stt: "3", code: "NLb.B1", component: "Ý thức sử dụng công nghệ an toàn", expression: `HS thực hiện đúng quy định thời gian và an toàn khi tiếp xúc thiết bị số.`, activity: "Toàn bài" }
        ] as any
      };
    } else {
      // Toàn diện NLS_AI cho Tiểu học
      if (level === 'INTENSIVE') {
        return {
          objectives_addition: `* Tích hợp Năng lực số & Giáo dục AI CHUYÊN SÂU TIỂU HỌC (Theo TT 02/2025 & QĐ 2422/QĐ-BGDĐT - Môn ${subject} - ${grade}):
- 1.1.TC1a: HS quan sát, tiếp nhận kiến thức bài học môn ${subject} qua học liệu số trực quan trên màn hình lớp học.
- 2.1.TC1a: HS tương tác trực quan, trả lời câu hỏi thông qua trò chơi số dưới sự điều hành của giáo viên.
- 3.1.TC1a: HS thực hành thao tác kéo thả/ghép nối bài tập số trên màn hình tương tác.
- NLa.A1: HS nhận biết được một số ứng dụng đơn giản của công nghệ thông minh trong đời sống xung quanh.
- NLc.C1: HS trải nghiệm tính năng nhận diện trực quan của công nghệ thông minh hỗ trợ bài học.
- NLb.B1: HS hình thành ý thức sử dụng thiết bị số an toàn, bảo vệ mắt và tuân thủ nội quy lớp học.`,
          materials_addition: `* Thiết bị dạy học và Học liệu số tích hợp AI Chuyên sâu (Môn ${subject} - ${grade}):
- Máy tính giáo viên, Màn hình chiếu/Tivi tương tác của lớp học.
- Phần mềm trò chơi học tập (Quizizz/Kahoot), video mô phỏng bài học trực quan, ứng dụng nhận diện hình ảnh minh họa bài học.`,
          activities_enhancement: [
            {
              activity_name: "1. Khởi động",
              location: "Khởi động > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Màn hình chiếu tương tác của lớp học.\n- GV (Chuyển giao): GV tổ chức trò chơi khởi động trực quan môn ${subject} trên màn hình lớn.\n- HS (Thực hiện): 1.1.TC1a & NLa.A1: HS quan sát hình ảnh sinh động, nhận biết các yếu tố thông minh và tham gia chọn đáp án hào hứng.`
            } as any,
            {
              activity_name: "2. Khám phá",
              location: "Khám phá > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Mô hình số/Tranh ảnh tương tác môn ${subject}.\n- GV (Chuyển giao): GV hướng dẫn HS quan sát mô phỏng chuyển động/nhận diện bài học.\n- HS (Thực hiện): 2.1.TC1a & NLc.C1: HS theo dõi mô hình số, trải nghiệm tính năng trực quan để nhận biết các đặc điểm kiến thức trọng tâm.`
            } as any,
            {
              activity_name: "3. Luyện tập",
              location: "Luyện tập > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Bảng tương tác/Bài tập số trực quan.\n- GV (Chuyển giao): GV trình chiếu bài tập thực hành trên màn hình tivi.\n- HS (Thực hiện): 3.1.TC1a: HS thao tác chọn đáp án hoặc kéo thả trực quan trên màn hình để hoàn thành bài tập.`
            } as any,
            {
              activity_name: "4. Vận dụng",
              location: "Vận dụng > Hoạt động của học sinh",
              enhanced_content: `- Công cụ: Hình ảnh/Tình huống số đời sống.\n- GV (Chuyển giao): GV nêu tình huống ứng dụng bài học trong đời sống qua màn hình.\n- HS (Thực hiện): NLa.A1: HS liên hệ thực tế, chia sẻ các ví dụ quen thuộc về ứng dụng công nghệ thông minh.`
            } as any
          ],
          summary_table: [
            { stt: "1", code: "1.1.TC1a", component: "Tiếp nhận học liệu số", expression: `HS quan sát hình ảnh và mô phỏng bài học môn ${subject} trên màn hình lớp.`, activity: "Khởi động" },
            { stt: "2", code: "2.1.TC1a", component: "Tương tác môi trường số", expression: `HS tham gia trả lời câu hỏi và tương tác học tập qua trò chơi số.`, activity: "Khám phá" },
            { stt: "3", code: "3.1.TC1a", component: "Thực hành bài tập số", expression: `HS thao tác làm bài tập trực quan trên màn hình tương tác.`, activity: "Luyện tập" },
            { stt: "4", code: "NLa.A1", component: "Nhận diện công nghệ thông minh", expression: `HS nhận biết được sự hỗ trợ của công nghệ số và AI trong bài học.`, activity: "Khởi động, Vận dụng" },
            { stt: "5", code: "NLb.B1", component: "An toàn thiết bị & Sức khỏe", expression: `HS ngồi học đúng tư thế, giữ khoảng cách mắt an toàn khi xem màn hình.`, activity: "Toàn bài" }
          ] as any
        };
      }
      return {
        objectives_addition: `* Tích hợp Năng lực số & Giáo dục AI TIỂU HỌC (Theo TT 02/2025 & QĐ 2422/QĐ-BGDĐT - Môn ${subject} - ${grade}):
- 1.1.TC1a: HS quan sát, tiếp nhận kiến thức bài học môn ${subject} qua học liệu số trực quan trên màn hình lớp học.
- 2.1.TC1a: HS hào hứng tương tác, trả lời câu hỏi thông qua trò chơi số dưới sự điều hành của giáo viên.
- NLa.A1: HS nhận biết được một số ứng dụng đơn giản của công nghệ thông minh trong đời sống xung quanh.
- NLb.B1: HS hình thành ý thức sử dụng thiết bị số an toàn, bảo vệ mắt và tuân thủ nội quy lớp học.`,
        materials_addition: `* Thiết bị dạy học và Học liệu số tích hợp AI (Môn ${subject} - ${grade}):
- Máy tính giáo viên, Màn hình chiếu/Tivi tương tác của lớp học.
- Phần mềm trò chơi học tập (Quizizz/Kahoot), video mô phỏng bài học trực quan, ứng dụng nhận diện hình ảnh minh họa bài học.`,
        activities_enhancement: [
          {
            activity_name: "1. Khởi động",
            location: "Khởi động > Hoạt động của học sinh",
            enhanced_content: `- Công cụ: Màn hình chiếu tương tác của lớp học.\n- GV (Chuyển giao): GV tổ chức trò chơi khởi động trực quan môn ${subject} trên màn hình lớn.\n- HS (Thực hiện): 1.1.TC1a & NLa.A1: HS quan sát hình ảnh sinh động, nhận biết các yếu tố thông minh và tham gia chọn đáp án hào hứng.`
          } as any,
          {
            activity_name: "2. Khám phá",
            location: "Khám phá > Hoạt động của học sinh",
            enhanced_content: `- Công cụ: Mô hình số/Tranh ảnh tương tác môn ${subject}.\n- GV (Chuyển giao): GV hướng dẫn HS quan sát mô phỏng chuyển động/nhận diện bài học.\n- HS (Thực hiện): 2.1.TC1a: HS theo dõi mô hình số, nhận biết các đặc điểm kiến thức trọng tâm và thảo luận cùng bạn.`
          } as any
        ],
        summary_table: [
          { stt: "1", code: "1.1.TC1a", component: "Tiếp nhận học liệu số", expression: `HS quan sát hình ảnh và mô phỏng bài học môn ${subject} trên màn hình lớp.`, activity: "Khởi động" },
          { stt: "2", code: "2.1.TC1a", component: "Tương tác môi trường số", expression: `HS tham gia trả lời câu hỏi và tương tác học tập qua trò chơi số.`, activity: "Khám phá" },
          { stt: "3", code: "NLa.A1", component: "Nhận diện công nghệ thông minh", expression: `HS nhận biết được sự hỗ trợ của công nghệ số và AI trong bài học.`, activity: "Khởi động" },
          { stt: "4", code: "NLb.B1", component: "An toàn thiết bị & Sức khỏe", expression: `HS ngồi học đúng tư thế, giữ khoảng cách mắt an toàn khi xem màn hình.`, activity: "Toàn bài" }
        ] as any
      };
    }
  }

  // --- CẤP 2 & 3: TRUNG HỌC CƠ SỞ VÀ TRUNG HỌC PHỔ THÔNG ---
  if (mode === 'NLS') {
    if (level === 'INTENSIVE') {
      return {
        objectives_addition: `* Phát triển Năng lực số CHUYÊN SÂU (Theo TT 02/2025/TT-BGDĐT - Môn ${subject} - ${grade}):
1.1.NC1a: HS sử dụng công cụ tìm kiếm tra cứu tài liệu môn ${subject} từ nguồn chính thống.
2.2.NC1a: HS chia sẻ sản phẩm học tập qua không gian số (Padlet/Google Drive).
3.1.TC2a: HS sử dụng phần mềm chuyên ngành tạo lập sơ đồ tư duy/bảng biểu tóm tắt bài học.
5.2.TC2a: HS sử dụng thiết bị số quét mã QR truy cập nền tảng tương tác môn ${subject}.
4.2.NC1a: HS tuân thủ quy định bản quyền số và bảo vệ an toàn thông tin cá nhân trên môi trường mạng.`,
        materials_addition: `* Thiết bị dạy học và Học liệu số Chuyên sâu (Môn ${subject} - ${grade}):
- Máy tính/Thiết bị số kết nối Internet, mã QR truy cập tài liệu tương tác (Padlet/Mentimeter), phần mềm mô phỏng chuyên môn.`,
        activities_enhancement: [
          {
            activity_name: "Hoạt động 1: KHỞI ĐỘNG",
            location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `5.2.TC2a: HS sử dụng thiết bị số quét mã QR do GV cung cấp để truy cập vào nền tảng tương tác trực tuyến (Mentimeter/Padlet) gửi câu trả lời.`
          } as any,
          {
            activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
            location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `1.1.NC1a: HS sử dụng công cụ tìm kiếm tra cứu kiến thức môn ${subject}, chọn lọc thông tin từ SGK và tài liệu học tập uy tín.`
          } as any,
          {
            activity_name: "Hoạt động 3: LUYỆN TẬP",
            location: "HOẠT ĐỘNG 3: LUYỆN TẬP > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `3.1.TC2a: HS thực hiện bài tập thực hành trên nền tảng số, hoàn thành bảng số liệu/sơ đồ bài học theo nhóm.`
          } as any,
          {
            activity_name: "Hoạt động 4: VẬN DỤNG",
            location: "HOẠT ĐỘNG 4: VẬN DỤNG > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `2.2.NC1a: HS đăng tải sản phẩm học tập hoặc bài tập dự án lên không gian số của lớp (Padlet/Drive).`
          } as any
        ],
        summary_table: [
          { stt: "1", code: "5.2.TC2a", component: "Giải pháp công nghệ", expression: `HS quét mã QR truy cập Mentimeter tham gia tương tác đầu giờ.`, activity: "Hoạt động 1" },
          { stt: "2", code: "1.1.NC1a", component: "Tra cứu dữ liệu", expression: `HS tra cứu thông tin môn ${subject} trên Internet từ nguồn uy tín.`, activity: "Hoạt động 2" },
          { stt: "3", code: "3.1.TC2a", component: "Sáng tạo sản phẩm số", expression: `HS thiết kế bảng biểu/sơ đồ tóm tắt kiến thức bài học.`, activity: "Hoạt động 3" },
          { stt: "4", code: "2.2.NC1a", component: "Chia sẻ dữ liệu số", expression: `HS chia sẻ kết quả học tập qua không gian trực tuyến.`, activity: "Hoạt động 4" },
          { stt: "5", code: "4.2.NC1a", component: "An toàn & Bản quyền số", expression: `HS tuân thủ bản quyền và bảo mật tài khoản học tập.`, activity: "Toàn bài" }
        ] as any
      };
    }
    return {
      objectives_addition: `* Phát triển Năng lực số (Theo TT 02/2025/TT-BGDĐT - Môn ${subject} - ${grade}):
1.1.NC1a: HS sử dụng công cụ tìm kiếm tra cứu tài liệu môn ${subject} từ nguồn chính thống.
2.2.NC1a: HS chia sẻ sản phẩm học tập qua không gian số (Padlet/Google Drive).
5.2.TC2a: HS sử dụng thiết bị số quét mã QR truy cập nền tảng tương tác môn ${subject}.`,
      materials_addition: `* Thiết bị dạy học và Học liệu số (Môn ${subject} - ${grade}):
- Máy tính/Thiết bị số kết nối Internet, mã QR truy cập tài liệu tương tác (Padlet/Mentimeter).`,
      activities_enhancement: [
        {
          activity_name: "Hoạt động 1: KHỞI ĐỘNG",
          location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `5.2.TC2a: HS sử dụng thiết bị số quét mã QR do GV cung cấp để truy cập vào nền tảng tương tác trực tuyến (Mentimeter/Padlet) gửi câu trả lời.`
        } as any,
        {
          activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
          location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `1.1.NC1a: HS sử dụng công cụ tìm kiếm tra cứu kiến thức môn ${subject}, chọn lọc thông tin từ SGK và tài liệu học tập uy tín.`
        } as any
      ],
      summary_table: [
        { stt: "1", code: "5.2.TC2a", component: "Giải pháp công nghệ", expression: `HS quét mã QR truy cập Mentimeter tham gia tương tác đầu giờ.`, activity: "Hoạt động 1" },
        { stt: "2", code: "1.1.NC1a", component: "Tra cứu dữ liệu", expression: `HS tra cứu thông tin môn ${subject} trên Internet từ nguồn uy tín.`, activity: "Hoạt động 2" },
        { stt: "3", code: "2.2.NC1a", component: "Chia sẻ dữ liệu số", expression: `HS chia sẻ kết quả học tập qua nhóm trực tuyến.`, activity: "Hoạt động 2" }
      ] as any
    };
  }

  if (mode === 'NAI') {
    if (level === 'INTENSIVE') {
      return {
        objectives_addition: `* Tích hợp Năng lực Trí tuệ Nhân tạo CHUYÊN SÂU (Theo QĐ 2422/QĐ-BGDĐT - Môn ${subject} - ${grade}):
NLa.A3: HS nhận thức vai trò trợ lý học tập của AI trong môn ${subject} và rèn tư duy phản biện.
NLc.C2: HS sử dụng Chatbot AI với câu lệnh (prompt) phù hợp hỗ trợ giải đáp và gợi mở ý tưởng bài học.
NLc.C3: HS ứng dụng công cụ AI phân tích, tổng hợp số liệu hoặc tạo sản phẩm học tập trực quan.
NLb.B2: HS khai báo minh bạch nguồn gốc khi sử dụng AI và tôn trọng bản quyền học thuật.
NLd.D1: HS đánh giá ưu điểm, hạn chế và phát hiện hiện tượng ảo giác thông tin của mô hình AI.`,
        materials_addition: `* Thiết bị dạy học và Công cụ AI Chuyên sâu (Môn ${subject} - ${grade}):
- Máy tính/Thiết bị số kết nối Internet, ứng dụng Trợ lý AI học tập (Gemini/ChatGPT/Copilot), công cụ mô phỏng AI.`,
        activities_enhancement: [
          {
            activity_name: "Hoạt động 1: KHỞI ĐỘNG",
            location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `NLa.A3: HS làm quen với tình huống mở đầu do Trợ lý AI tạo lập, nêu nhận định ban đầu.`
          } as any,
          {
            activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
            location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `NLc.C2: HS gõ prompt: "Tóm tắt trọng tâm bài học môn ${subject}", sau đó đối chiếu kết quả với SGK.\nNLb.B2: HS khai báo rõ việc sử dụng AI khi trả lời câu hỏi.`
          } as any,
          {
            activity_name: "Hoạt động 3: LUYỆN TẬP",
            location: "HOẠT ĐỘNG 3: LUYỆN TẬP > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `NLc.C3: HS sử dụng AI gợi ý các dạng bài tập tương tự, cùng bạn phản biện và kiểm tra tính chính xác của lời giải.`
          } as any,
          {
            activity_name: "Hoạt động 4: VẬN DỤNG",
            location: "HOẠT ĐỘNG 4: VẬN DỤNG > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
            enhanced_content: `NLd.D1: HS thảo luận về các trường hợp AI đưa ra câu trả lời chưa chuẩn xác và đề xuất cách điều chỉnh câu lệnh hiệu quả hơn.`
          } as any
        ],
        summary_table: [
          { stt: "1", code: "NLa.A3", component: "Nhận thức về AI", expression: `HS nhận thức vai trò trợ lý học tập của AI trong môn ${subject}.`, activity: "Hoạt động 1" },
          { stt: "2", code: "NLc.C2", component: "Ứng dụng AI", expression: `HS gõ câu lệnh hỏi AI và đối chiếu kết quả với SGK.`, activity: "Hoạt động 2" },
          { stt: "3", code: "NLc.C3", component: "Phân tích & Luyện tập AI", expression: `HS sử dụng AI hỗ trợ luyện tập và phản biện kết quả.`, activity: "Hoạt động 3" },
          { stt: "4", code: "NLd.D1", component: "Đánh giá mô hình AI", expression: `HS nhận diện giới hạn của AI và tối ưu hóa câu lệnh.`, activity: "Hoạt động 4" },
          { stt: "5", code: "NLb.B2", component: "Minh bạch AI", expression: `HS khai báo khi sử dụng AI trong bài làm.`, activity: "Toàn bài" }
        ] as any
      };
    }
    return {
      objectives_addition: `* Tích hợp Năng lực Trí tuệ Nhân tạo (Theo QĐ 2422/QĐ-BGDĐT - Môn ${subject} - ${grade}):
NLc.C2: HS sử dụng Chatbot AI với câu lệnh phù hợp hỗ trợ giải đáp bài học môn ${subject}.
NLa.A3: HS đối chiếu, kiểm chứng câu trả lời của AI với SGK để tránh ảo giác dữ liệu.
NLb.B2: HS khai báo minh bạch khi sử dụng AI trong bài báo cáo.`,
      materials_addition: `* Thiết bị dạy học và Công cụ AI (Môn ${subject} - ${grade}):
- Máy tính/Thiết bị số kết nối Internet, ứng dụng Trợ lý AI học tập (Gemini/ChatGPT/Copilot).`,
      activities_enhancement: [
        {
          activity_name: "Hoạt động 1: KHỞI ĐỘNG",
          location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `NLa.A3: HS bước đầu làm quen với sự hỗ trợ của Trợ lý AI trong học tập môn ${subject}.`
        } as any,
        {
          activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
          location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `NLc.C2: HS gõ prompt: "Tóm tắt trọng tâm bài học môn ${subject}", sau đó đối chiếu kết quả với SGK.\nNLb.B2: HS khai báo rõ việc sử dụng AI khi trả lời câu hỏi.`
        } as any
      ],
      summary_table: [
        { stt: "1", code: "NLa.A3", component: "Nhận thức về AI", expression: `HS nhận thức vai trò trợ lý học tập của AI trong môn ${subject}.`, activity: "Hoạt động 1" },
        { stt: "2", code: "NLc.C2", component: "Ứng dụng AI", expression: `HS gõ câu lệnh hỏi AI và đối chiếu kết quả với SGK.`, activity: "Hoạt động 2" },
        { stt: "3", code: "NLb.B2", component: "Minh bạch AI", expression: `HS khai báo khi sử dụng AI trong bài làm.`, activity: "Hoạt động 2" }
      ] as any
    };
  }

  // Mặc định Toàn diện NLS_AI cho THCS / THPT
  if (level === 'INTENSIVE') {
    return {
      objectives_addition: `* Phát triển năng lực số và năng lực AI CHUYÊN SÂU (Theo TT 02/2025 & QĐ 2422/QĐ-BGDĐT - Môn ${subject} - ${grade}):
1.1.NC1a: HS sử dụng công cụ tìm kiếm tra cứu tài liệu môn ${subject} từ nguồn chính thống.
2.2.NC1a: HS chia sẻ sản phẩm học tập và hợp tác qua không gian số (Padlet/Drive).
5.2.TC2a: HS sử dụng thiết bị số quét mã QR truy cập nền tảng tương tác trực tuyến (Mentimeter/Padlet).
NLc.C2: HS sử dụng Chatbot AI với câu lệnh phù hợp hỗ trợ giải đáp bài học môn ${subject}.
NLa.A3: HS biết cách đối chiếu, kiểm chứng thông tin do AI cung cấp với SGK.
NLb.B2: HS khai báo minh bạch công cụ AI hỗ trợ khi trình bày bài học.`,
      materials_addition: `* Thiết bị dạy học và Học liệu số Chuyên sâu (Môn ${subject} - ${grade}):
- Máy tính/Thiết bị số kết nối Internet, mã QR truy cập nền tảng tương tác, Trợ lý AI học tập, phần mềm mô phỏng chuyên sâu.`,
      activities_enhancement: [
        {
          activity_name: "Hoạt động 1: KHỞI ĐỘNG",
          location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `5.2.TC2a: HS sử dụng thiết bị số quét mã QR truy cập Mentimeter gửi câu trả lời khởi động môn ${subject}.`
        } as any,
        {
          activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
          location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `1.1.NC1a: HS tra cứu tài liệu môn ${subject} trên Internet.\nNLc.C2: HS gõ prompt mẫu: "Giải thích ngắn gọn trọng tâm bài học môn ${subject} và cho 1 ví dụ cụ thể", sau đó đối chiếu kết quả với SGK.\nNLb.B2: HS khai báo công cụ AI đã dùng khi phát biểu.`
        } as any,
        {
          activity_name: "Hoạt động 3: LUYỆN TẬP",
          location: "HOẠT ĐỘNG 3: LUYỆN TẬP > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `NLa.A3 & 2.2.NC1a: HS thực hiện bài tập theo nhóm, đối chiếu kết quả giữa các thành viên và đưa sản phẩm lên bảng tương tác chung.`
        } as any,
        {
          activity_name: "Hoạt động 4: VẬN DỤNG",
          location: "HOẠT ĐỘNG 4: VẬN DỤNG > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
          enhanced_content: `2.2.NC1a: HS vận dụng kiến thức hoàn thành bài tập thực tế và nộp sản phẩm qua đường dẫn số do GV cung cấp.`
        } as any
      ],
      summary_table: [
        { stt: "1", code: "5.2.TC2a", component: "Giải pháp công nghệ", expression: `HS quét mã QR truy cập Mentimeter gửi câu trả lời khởi động.`, activity: "Hoạt động 1" },
        { stt: "2", code: "1.1.NC1a", component: "Tra cứu dữ liệu", expression: `HS tra cứu thông tin môn ${subject} từ nguồn chính thống.`, activity: "Hoạt động 2" },
        { stt: "3", code: "NLc.C2", component: "Ứng dụng AI", expression: `HS gõ câu lệnh hỏi AI và đối chiếu SGK.`, activity: "Hoạt động 2" },
        { stt: "4", code: "NLa.A3", component: "Tư duy phản biện AI", expression: `HS kiểm chứng và so sánh kết quả học tập trong nhóm.`, activity: "Hoạt động 3" },
        { stt: "5", code: "2.2.NC1a", component: "Chia sẻ & Hợp tác số", expression: `HS nộp bài và trao đổi qua nền tảng trực tuyến.`, activity: "Hoạt động 4" },
        { stt: "6", code: "NLb.B2", component: "Minh bạch AI", expression: `HS khai báo khi sử dụng AI trong bài làm.`, activity: "Toàn bài" }
      ] as any
    };
  }

  return {
    objectives_addition: `* Phát triển năng lực số và năng lực AI (Theo TT 02/2025 & QĐ 2422/QĐ-BGDĐT - Môn ${subject} - ${grade}):
1.1.NC1a: HS sử dụng công cụ tìm kiếm tra cứu tài liệu môn ${subject}.
5.2.TC2a: HS sử dụng thiết bị số quét mã QR truy cập nền tảng tương tác (Mentimeter/Padlet).
NLc.C2: HS sử dụng Chatbot AI với câu lệnh phù hợp hỗ trợ giải đáp bài học môn ${subject}.
NLa.A3: HS biết cách đối chiếu, kiểm chứng thông tin do AI cung cấp với SGK.
NLb.B2: HS khai báo minh bạch công cụ AI hỗ trợ khi trình bày bài học.`,
    materials_addition: `* Thiết bị dạy học và Học liệu số (Môn ${subject} - ${grade}):
- Máy tính/Thiết bị số kết nối Internet, mã QR truy cập nền tảng tương tác, Trợ lý AI học tập.`,
    activities_enhancement: [
      {
        activity_name: "Hoạt động 1: KHỞI ĐỘNG",
        location: "HOẠT ĐỘNG 1: MỞ ĐẦU > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
        enhanced_content: `5.2.TC2a: HS sử dụng thiết bị số quét mã QR truy cập Mentimeter gửi câu trả lời khởi động môn ${subject}.`
      } as any,
      {
        activity_name: "Hoạt động 2: HÌNH THÀNH KIẾN THỨC MỚI",
        location: "HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI > 4. Tổ chức thực hiện > Cột HS thực hiện nhiệm vụ",
        enhanced_content: `1.1.NC1a: HS tra cứu tài liệu môn ${subject} trên Internet.\nNLc.C2: HS gõ prompt mẫu: "Giải thích ngắn gọn trọng tâm bài học môn ${subject} và cho 1 ví dụ cụ thể", sau đó đối chiếu kết quả với SGK.\nNLb.B2: HS khai báo công cụ AI đã dùng khi phát biểu.`
      } as any
    ],
    summary_table: [
      { stt: "1", code: "5.2.TC2a", component: "Giải pháp công nghệ", expression: `HS quét mã QR truy cập Mentimeter gửi câu trả lời khởi động.`, activity: "Hoạt động 1" },
      { stt: "2", code: "1.1.NC1a", component: "Tra cứu dữ liệu", expression: `HS tra cứu thông tin môn ${subject} từ nguồn chính thống.`, activity: "Hoạt động 2" },
      { stt: "3", code: "NLc.C2", component: "Ứng dụng AI", expression: `HS gõ câu lệnh hỏi AI và đối chiếu SGK.`, activity: "Hoạt động 2" },
      { stt: "4", code: "NLb.B2", component: "Minh bạch AI", expression: `HS khai báo khi sử dụng AI trong bài làm.`, activity: "Toàn bài" }
    ] as any
  };
}