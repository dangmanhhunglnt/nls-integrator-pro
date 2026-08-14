import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, customApiKey, userToken } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt không được để trống.' });
    }

    let apiKeyToUse: string | undefined;

    // 1. Ưu tiên xài customApiKey từ nút "Đổi Key" nếu người dùng nhập
    if (customApiKey && customApiKey.trim() !== '') {
      apiKeyToUse = customApiKey.trim();
    } 
    // 2. Nếu không có customApiKey nhưng người dùng đã đăng nhập (có userToken) -> Dùng Key của hệ thống
    else if (userToken) {
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
    
    // Nâng cấp model gemini-1.5-flash / gemini-2.0-flash / gemini-2.5-flash
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      } as any // Ép kiểu as any để qua mặt lỗi TypeScript phiên bản SDK cũ
    });

    // Gọi Gemini API tạo nội dung
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({ text });

  } catch (error: any) {
    console.error('Lỗi API:', error);
    return res.status(500).json({ 
      error: 'Lỗi trong quá trình xử lý AI.', 
      details: error.message 
    });
  }
}