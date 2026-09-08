import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase Client an toàn phía Serverless
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Cấu hình Headers CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, customApiKey, userToken, licenseCode, deviceId, standard } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt không được để trống.' });
    }

    // ==========================================
    // KIỂM TRA BẢN QUYỀN & TRỪ LƯỢT HỆ THỐNG (KHÓA CHẶT 1 MÃ / 1 THIẾT BỊ)
    // ==========================================
    let activeLicense: any = null;

    if (supabase && licenseCode) {
      const codeClean = String(licenseCode).trim().toUpperCase();
      const { data: license, error: licenseError } = await supabase
        .from('licenses')
        .select('*')
        .eq('code', codeClean)
        .single();

      if (licenseError || !license) {
        return res.status(403).json({ error: 'Mã kích hoạt bản quyền không tồn tại hoặc không hợp lệ.' });
      }

      if (!license.is_active) {
        return res.status(403).json({ error: 'Mã bản quyền này đã bị khóa hoặc ngừng hoạt động.' });
      }

      // 1. Kiểm tra khóa thiết bị: Nếu mã đã gắn với máy khác -> Chặn ngay
      if (license.bound_device_id && deviceId && license.bound_device_id !== deviceId) {
        return res.status(403).json({ 
          error: 'Mã bản quyền này đã được kích hoạt trên thiết bị khác. Mỗi mã chỉ dùng cho 1 máy duy nhất.' 
        });
      }

      // 2. Bổ sung: Nếu mã chưa gắn thiết bị nào (lần đầu dùng) -> Tự động khóa chặt vào máy này
      if (!license.bound_device_id && deviceId) {
        await supabase
          .from('licenses')
          .update({ 
            bound_device_id: deviceId,
            activated_at: new Date().toISOString()
          })
          .eq('code', codeClean);
      }

      // 3. Kiểm tra hạn mức lượt (nếu là gói lượt)
      if (license.plan_type === 'COUNT_50' && license.quota_remaining <= 0) {
        return res.status(403).json({ 
          error: 'Bạn đã sử dụng hết 50 lượt trong gói. Vui lòng gia hạn thêm để tiếp tục.' 
        });
      }

      activeLicense = license;
    }

    let apiKeyToUse: string | undefined;

    // 1. Ưu tiên xài customApiKey từ nút "Đổi Key" nếu người dùng nhập
    if (customApiKey && typeof customApiKey === 'string' && customApiKey.trim() !== '') {
      apiKeyToUse = customApiKey.trim();
    } 
    // 2. Nếu không có customApiKey nhưng người dùng đã đăng nhập hoặc gọi hệ thống -> Dùng Key của hệ thống
    else if (userToken || activeLicense || process.env.GEMINI_API_KEY) {
      apiKeyToUse = process.env.GEMINI_API_KEY;
    }

    // Nếu cả 2 đều không thỏa mãn
    if (!apiKeyToUse) {
      return res.status(401).json({ 
        error: 'Chưa cung cấp API Key hợp lệ hoặc chưa đăng nhập tài khoản.' 
      });
    }

    // =========================================================================
    // TỰ ĐỘNG NHẬN DIỆN CẤP HỌC & KHỐI LỚP (CV 2345 TIỂU HỌC VS CV 5512 TRUNG HỌC)
    // =========================================================================
    const lowerPrompt = String(prompt).toLowerCase();

    // Regex nhận diện cấp Tiểu học (Lớp 1, 2, 3, 4, 5)
    const isPrimarySchool = 
      standard === 'CV2345' ||
      /\b(lớp|khối)\s*[1-5]\b/i.test(prompt) ||
      /\b(lớp|khối)\s*(một|hai|ba|bốn|năm)\b/i.test(prompt) ||
      lowerPrompt.includes('tiểu học') ||
      lowerPrompt.includes('2345') ||
      lowerPrompt.includes('phụ lục 3');

    // NGUYÊN TẮC THẨM ĐỊNH NĂNG LỰC SỐ THỰC CHẤT THEO CHUẨN BỘ GD&ĐT
    const pedagogicalDirectives = `
NGUYÊN TẮC SƯ PHẠM CỦA BỘ GD&ĐT: THỰC CHẤT - KHÔNG HÌNH THỨC - KHÔNG GƯỢNG ÉP NĂNG LỰC SỐ (NLS):
1. BƯỚC THẨM ĐỊNH BẢN CHẤT BÀI HỌC (TỰ ĐỘNG PHÂN HÓA MỨC ĐỘ NLS):
   - Mức độ 1 (Bài rèn kỹ năng truyền thống/thực hành trực tiếp):
     + Dấu hiệu: Bài rèn chữ, tập đọc, chính tả, cảm thụ thơ văn; bài luyện tập tính toán cơ bản, biến đổi đại số; thể dục vận động; thí nghiệm vật lý/hóa học thao tác tay.
     + Quy định thực hiện: TUYỆT ĐỐI KHÔNG ép học sinh dùng máy tính/điện thoại/AI. Tiến trình diễn ra bằng bảng phấn, giấy vở, đồ dùng thực tế. Mục tiêu NLS ghi rõ: "Ưu tiên rèn luyện kỹ năng thực hành và tư duy chiều sâu, ứng dụng công nghệ ở mức tối thiểu hỗ trợ trình chiếu nếu cần".
   - Mức độ 2 (Bài học mang tính trực quan/thông tin):
     + Dấu hiệu: Bài học lịch sử, địa lý, sinh học, bài học cần tranh ảnh tư liệu, video mô tả hiện tượng.
     + Quy định thực hiện: Khai thác học liệu số, bản đồ số, hình ảnh chất lượng cao để minh họa.
   - Mức độ 3 (Bài học cần tích hợp NLS sâu):
     + Dấu hiệu: Hình học không gian 3D, khảo sát đồ thị hàm số, xử lý bảng dữ liệu thống kê, mô phỏng quá trình nguy hiểm hoặc trừu tượng.
     + Quy định thực hiện: Đưa đúng công cụ số chuyên ngành vào tiến trình (GeoGebra 3D, Excel/Google Sheets, mô phỏng PhET).

2. CÁ NHÂN HÓA 4 HOẠT ĐỘNG DẠY HỌC THEO ĐẶC THÙ BÀI:
   - Hoạt động 1 (Khởi động): Tạo tình huống có vấn đề xuất phát đúng từ nội dung bài (nghịch lý nhận thức, câu đố dân gian, bài toán thực tế). Tuyệt đối không dùng mô tuýp rập khuôn "cho xem clip rồi hỏi cảm nghĩ".
   - Hoạt động 2 (Hình thành kiến thức): Bám sát logic bộ môn. Nêu rõ câu hỏi cụ thể, nhiệm vụ học sinh cần làm và sản phẩm đạt được; không viết chung chung "chia nhóm 4 người thảo luận".
   - Hoạt động 3 (Luyện tập): Bài tập phân tầng (từ nhận biết công thức đến vận dụng biến đổi, phát hiện lỗi sai).
   - Hoạt động 4 (Vận dụng): Bài toán gắn liền thực tế của chính chủ đề đó; không giao bài hình thức như "về nhà làm poster/video" nếu không thực sự phù hợp.
`;

    const systemInstructionText = isPrimarySchool
      ? `Bạn là Chuyên gia Giáo dục Tiểu học theo Chương trình GDPT 2018 và Công văn 2345/BGDĐT-GDTH.
Bài học này thuộc CẤP TIỂU HỌC (Lớp 1 đến Lớp 5).
${pedagogicalDirectives}
Khi soạn Kế hoạch bài dạy / Tích hợp Năng lực số (NLS), BẮT BUỘC tuân thủ chuẩn cấu trúc Phụ lục 3 của Công văn 2345/BGDĐT-GDTH:
1. Yêu cầu cần đạt: Nêu rõ học sinh thực hiện được việc gì; vận dụng được những gì vào thực tế đời sống; cơ hội hình thành phẩm chất, năng lực chung và tích hợp Năng lực số (NLS) phù hợp lứa tuổi tiểu học (không gượng ép công nghệ với bài rèn kỹ năng viết/đọc/tính toán cơ bản).
2. Đồ dùng dạy học: Thiết bị, slide bài giảng, học liệu số, đồ dùng trực quan, phiếu học tập...
3. Các hoạt động dạy học chủ yếu (Tổ chức qua 4 khâu: 1. Chuyển giao nhiệm vụ -> 2. Thực hiện nhiệm vụ -> 3. Báo cáo, thảo luận -> 4. Nhận xét, đánh giá & Kết luận):
   - Hoạt động Mở đầu (Khởi động, kết nối): Sinh động, gần gũi với học sinh nhỏ tuổi.
   - Hoạt động Hình thành kiến thức mới.
   - Hoạt động Luyện tập, thực hành.
   - Hoạt động Vận dụng, trải nghiệm.
4. Điều chỉnh sau bài dạy: Gợi ý ngắn gọn cho giáo viên rút kinh nghiệm sau tiết dạy.`
      : `Bạn là Chuyên gia Giáo dục Trung học theo Chương trình GDPT 2018 và Công văn 5512/BGDĐT-GDTrH.
Bài học này thuộc CẤP TRUNG HỌC (THCS / THPT: Lớp 6 đến Lớp 12).
${pedagogicalDirectives}
Khi soạn Kế hoạch bài dạy / Tích hợp NLS, BẮT BUỘC tuân thủ cấu trúc chuẩn Công văn 5512/BGDĐT-GDTrH:
I. Mục tiêu: Kiến thức, Năng lực (Năng lực đặc thù, Năng lực chung, Năng lực số đánh giá đúng mức độ cần thiết), Phẩm chất.
II. Thiết bị dạy học và học liệu: Thiết bị của GV, HS, học liệu/phần mềm phù hợp nội dung bài.
III. Tiến trình dạy học: Mỗi hoạt động (Mở đầu, Hình thành kiến thức, Luyện tập, Vận dụng) gồm 4 mục chuẩn: 1. Mục tiêu, 2. Nội dung, 3. Sản phẩm, 4. Tổ chức thực hiện (Bước 1: Chuyển giao -> Bước 2: Thực hiện -> Bước 3: Báo cáo -> Bước 4: Kết luận). Toàn bộ 4 hoạt động phải bám sát bản chất khoa học của môn học, không rập khuôn máy móc.`;

    const fullPrompt = `${systemInstructionText}\n\n[YÊU CẦU: Trả về kết quả định dạng JSON thuần túy]\n\n${prompt}`;

    // Danh sách model ưu tiên theo phiên bản mới nhất
    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest'];
    let text = '';
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKeyToUse}`;
        const apiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: fullPrompt }]
              }
            ]
          })
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) break;
        } else {
          const errBody = await apiResponse.json().catch(() => ({}));
          lastError = new Error(errBody.error?.message || `Lỗi ${apiResponse.status}: ${apiResponse.statusText}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!text && lastError) {
      throw lastError;
    }

    // Làm sạch markdown JSON nếu có
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    // ==========================================
    // TRỪ LƯỢT SAU KHI SINH THÀNH CÔNG
    // ==========================================
    if (supabase && activeLicense && activeLicense.plan_type === 'COUNT_50') {
      await supabase
        .from('licenses')
        .update({ quota_remaining: activeLicense.quota_remaining - 1 })
        .eq('code', activeLicense.code);
    }

    return res.status(200).json({ text });

  } catch (error: any) {
    console.error('Lỗi API:', error);
    return res.status(500).json({ 
      error: error.message || 'Lỗi trong quá trình xử lý AI.', 
      details: String(error)
    });
  }
}