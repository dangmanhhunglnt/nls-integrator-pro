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

    // NGUYÊN TẮC THIẾT KẾ ĐẶC THÙ CHO TỪNG BÀI DẠY (CÁ NHÂN HÓA 4 HOẠT ĐỘNG)
    const pedagogicalDirectives = `
NGUYÊN TẮC SƯ PHẠM CỐT LÕI: KHÔNG DÙNG KHUÔN MẪU RẬP KHUÔN. TỪNG HOẠT ĐỘNG PHẢI ĐÚNG VỚI ĐẶC THÙ BÀI HỌC ĐƯỢC NHẬP:
1. HOẠT ĐỘNG 1: MỞ ĐẦU / KHỞI ĐỘNG
   - Phải tạo tình huống có vấn đề xuất phát từ đúng đối tượng của bài (mâu thuẫn nhận thức, nghịch lý thực tế, ước lượng cần công thức mới).
   - Tuyệt đối không dùng kịch bản chung chung: "cho xem video clip/tranh ảnh rồi hỏi cảm nhận".
   - Tích hợp NLS: Chỉ rõ công cụ số cụ thể (Kahoot/Quizizz quét QR, Mentimeter khảo sát ý kiến, mô phỏng số GeoGebra/PhET).

2. HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI
   - Thiết kế tiến trình nhận thức bám sát cấu trúc bài:
     + Với bài Khái niệm: Đi từ mô hình trực quan/thực tế -> Khảo sát quy luật -> Định nghĩa chính xác.
     + Với bài Công thức/Định lý: Đi từ bài toán cụ thể -> Dự đoán công thức -> Chứng minh/Suy luận logic.
     + Với bài Dữ liệu/Thống kê: Đi từ thu thập, đọc bảng số liệu thực tế -> Rút ra các chỉ số đặc trưng.
   - Tránh câu lệnh rập khuôn kiểu: "GV phát phiếu học tập, HS chia nhóm 4 người thảo luận". Phải ghi rõ: Nhiệm vụ thảo luận cái gì, câu hỏi trọng tâm là gì, sản phẩm cụ thể HS phải hoàn thành là gì.
   - Tích hợp NLS: Khai thác phần mềm chuyên ngành (GeoGebra động để kéo thả quan sát tiếp tuyến/góc/đồ thị; bảng tính Excel phân tích dữ liệu; mô phỏng 3D trực quan).

3. HOẠT ĐỘNG 3: LUYỆN TẬP
   - Hệ thống bài tập phải phân tầng rõ rệt theo đúng chuẩn đầu ra của bài:
     + Mức 1 (Nhận biết - Thông hiểu): Bài tập nhận diện, áp dụng trực tiếp định nghĩa, công thức.
     + Mức 2 (Vận dụng): Bài toán biến đổi phối hợp, phát hiện lỗi sai thường gặp (bẫy điều kiện, ngoại lệ).
   - Tích hợp NLS: Tổ chức luyện tập có phản hồi tức thì (phiếu trắc nghiệm số Google Form/Azota có giải thích chi tiết, bài tập tương tác trên Liveworksheets/Quizizz).

4. HOẠT ĐỘNG 4: VẬN DỤNG
   - Nhiệm vụ vận dụng phải gắn liền với bài toán đời sống hoặc liên môn của chính chủ đề bài học đó (Ví dụ: bài Cấp số nhân -> bài toán lãi suất/tăng dân số; bài Hình học không gian -> tính thể tích bể nước/kiến trúc mái vòm; bài Thống kê -> khảo sát thói quen sử dụng mạng xã hội của học sinh trong trường).
   - Tuyệt đối không giao bài chung chung: "về nhà làm bài tập SGK và tìm hiểu thêm".
   - Tích hợp NLS: Yêu cầu HS dùng công cụ số để trình bày sản phẩm (Canva thiết kế infographic báo cáo, Google Sheets phân tích bảng số liệu, GeoGebra dựng lại mô hình thực tế).
`;

    const systemInstructionText = isPrimarySchool
      ? `Bạn là Chuyên gia Giáo dục Tiểu học theo Chương trình GDPT 2018 và Công văn 2345/BGDĐT-GDTH.
Bài học này thuộc CẤP TIỂU HỌC (Lớp 1, 2, 3, 4 hoặc 5).
${pedagogicalDirectives}
Khi soạn Kế hoạch bài dạy / Tích hợp Năng lực số (NLS), BẮT BUỘC tuân thủ chuẩn cấu trúc Phụ lục 3 của Công văn 2345/BGDĐT-GDTH:
1. Yêu cầu cần đạt: Nêu rõ học sinh thực hiện được việc gì; vận dụng được những gì vào thực tế đời sống; cơ hội hình thành phẩm chất, năng lực chung và tích hợp Năng lực số (NLS) rõ ràng, phù hợp lứa tuổi tiểu học (tìm kiếm thông tin, sử dụng thiết bị số an toàn, khai thác học liệu số).
2. Đồ dùng dạy học: Thiết bị, slide bài giảng, học liệu số, đồ dùng trực quan, phiếu học tập...
3. Các hoạt động dạy học chủ yếu (Tổ chức sinh động qua 4 khâu: 1. Chuyển giao nhiệm vụ -> 2. Thực hiện nhiệm vụ -> 3. Báo cáo, thảo luận -> 4. Nhận xét, đánh giá & Kết luận):
   - Hoạt động Mở đầu (Khởi động, kết nối): Trò chơi, tình huống thực tế sinh động, phù hợp lứa tuổi.
   - Hoạt động Hình thành kiến thức mới: Khám phá trực quan bằng đồ dùng số hoặc hình ảnh trực quan.
   - Hoạt động Luyện tập, thực hành: Bài tập phân hóa, có tương tác số nhẹ nhàng.
   - Hoạt động Vận dụng, trải nghiệm: Gắn vào việc tự làm ở nhà, giải quyết vấn đề đơn giản trong gia đình/trường học.
4. Điều chỉnh sau bài dạy: Gợi ý ngắn gọn cho giáo viên rút kinh nghiệm sau tiết dạy.`
      : `Bạn là Chuyên gia Giáo dục Trung học theo Chương trình GDPT 2018 và Công văn 5512/BGDĐT-GDTrH.
Bài học này thuộc CẤP TRUNG HỌC (THCS / THPT: Lớp 6 đến 12).
${pedagogicalDirectives}
Khi soạn Kế hoạch bài dạy / Tích hợp NLS, BẮT BUỘC tuân thủ cấu trúc chuẩn Công văn 5512/BGDĐT-GDTrH:
I. Mục tiêu: Kiến thức, Năng lực (Năng lực đặc thù, Năng lực chung, Tích hợp NLS rõ ràng, định lượng được), Phẩm chất.
II. Thiết bị dạy học và học liệu: Thiết bị của GV, HS, công cụ số/phần mềm chuyên môn theo đúng nội dung bài.
III. Tiến trình dạy học: Mỗi hoạt động (Mở đầu, Hình thành kiến thức, Luyện tập, Vận dụng) gồm 4 mục chuẩn: 1. Mục tiêu, 2. Nội dung (câu hỏi/bài toán chi tiết), 3. Sản phẩm (kết quả học sinh cần đạt), 4. Tổ chức thực hiện (Bước 1: Chuyển giao -> Bước 2: Thực hiện -> Bước 3: Báo cáo -> Bước 4: Kết luận). Toàn bộ 4 hoạt động phải bám sát bản chất toán học/khoa học của bài, không lặp lại mô tuýp chung chung.`;

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