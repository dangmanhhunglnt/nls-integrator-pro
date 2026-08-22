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
    const { prompt, customApiKey, userToken, licenseCode, deviceId } = req.body;

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

    // Khởi tạo Gemini với API Key phù hợp
    const genAI = new GoogleGenerativeAI(apiKeyToUse);
    
    // Nâng cấp lên model Gemini Flash thế hệ mới
    const model = genAI.getGenerativeModel(
      { 
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
        } as any,
      },
      { apiVersion: 'v1beta' } as any
    );

    // Gọi Gemini API tạo nội dung
    const result = await model.generateContent(prompt);
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