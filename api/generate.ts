import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    // BỔ SUNG: KIỂM TRA BẢN QUYỀN & TRỪ LƯỢT HỆ THỐNG
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

      // Kiểm tra khóa thiết bị
      if (license.bound_device_id && deviceId && license.bound_device_id !== deviceId) {
        return res.status(403).json({ 
          error: 'Mã bản quyền này đã được gắn với thiết bị khác. Vui lòng liên hệ Admin để đổi thiết bị.' 
        });
      }

      // Kiểm tra hạn mức lượt (nếu là gói lượt)
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

    const systemInstructionText = isPrimarySchool
      ? `Bạn là Chuyên gia Giáo dục Tiểu học theo Chương trình GDPT 2018 và Công văn 2345/BGDĐT-GDTH.
Bài học này thuộc CẤP TIỂU HỌC (Lớp 1, 2, 3, 4 hoặc 5).
Khi soạn Kế hoạch bài dạy / Tích hợp Năng lực số (NLS), BẮT BUỘC tuân thủ chuẩn cấu trúc Phụ lục 3 của Công văn 2345/BGDĐT-GDTH:
1. Yêu cầu cần đạt: Nêu rõ học sinh thực hiện được việc gì; vận dụng được những gì vào thực tế đời sống; cơ hội hình thành phẩm chất, năng lực chung và tích hợp Năng lực số (NLS) rõ ràng, phù hợp lứa tuổi tiểu học (tìm kiếm thông tin, sử dụng thiết bị số an toàn, khai thác học liệu số)[cite: 1].
2. Đồ dùng dạy học: Thiết bị, slide bài giảng, học liệu số, đồ dùng trực quan, phiếu học tập...[cite: 1]
3. Các hoạt động dạy học chủ yếu (Tổ chức sinh động qua 4 khâu: 1. Chuyển giao nhiệm vụ -> 2. Thực hiện nhiệm vụ -> 3. Báo cáo, thảo luận -> 4. Nhận xét, đánh giá & Kết luận)[cite: 1]:
   - Hoạt động Mở đầu (Khởi động, kết nối)[cite: 1].
   - Hoạt động Hình thành kiến thức mới (Trải nghiệm, khám phá, phân tích)[cite: 1].
   - Hoạt động Luyện tập, thực hành[cite: 1].
   - Hoạt động Vận dụng, trải nghiệm[cite: 1].
4. Điều chỉnh sau bài dạy: Gợi ý ngắn gọn cho giáo viên rút kinh nghiệm sau tiết dạy[cite: 1].`
      : `Bạn là Chuyên gia Giáo dục Trung học theo Chương trình GDPT 2018 và Công văn 5512/BGDĐT-GDTrH.
Bài học này thuộc CẤP TRUNG HỌC (THCS / THPT: Lớp 6 đến 12).
Khi soạn Kế hoạch bài dạy / Tích hợp Năng lực số (NLS), BẮT BUỘC tuân thủ cấu trúc chuẩn Công văn 5512/BGDĐT-GDTrH:
I. Mục tiêu: Kiến thức, Năng lực (Năng lực đặc thù, Năng lực chung, Tích hợp NLS), Phẩm chất.
II. Thiết bị dạy học và học liệu: Thiết bị của GV, HS, công cụ số/phần mềm.
III. Tiến trình dạy học: Mỗi hoạt động (Mở đầu, Hình thành kiến thức, Luyện tập, Vận dụng) gồm 4 phần: 1. Mục tiêu, 2. Nội dung, 3. Sản phẩm, 4. Tổ chức thực hiện (Bước 1: Chuyển giao -> Bước 2: Thực hiện -> Bước 3: Báo cáo -> Bước 4: Kết luận).`;

    // Khởi tạo Gemini với API Key phù hợp
    const genAI = new GoogleGenerativeAI(apiKeyToUse);
    
    // Khởi tạo model với ép kiểu as any để tránh lỗi TypeScript definition
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      } as any
    } as any);

    // Ghép hướng dẫn nghiệp vụ vào prompt để đảm bảo mô hình phản hồi chính xác
    const fullPrompt = `[CHỈ DẪN HỆ THỐNG / QUY CHUẨN CÔNG VĂN]:\n${systemInstructionText}\n\n[NỘI DUNG YÊU CẦU]:\n${prompt}`;

    // Gọi Gemini API tạo nội dung
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    // ==========================================
    // BỔ SUNG: TRỪ LƯỢT SAU KHI SINH THÀNH CÔNG
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
      error: 'Lỗi trong quá trình xử lý AI.', 
      details: error.message || String(error)
    });
  }
}