import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Cấu hình Headers CORS & OPTIONS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Hỗ trợ cả 2 cách đặt tên biến 'code' hoặc 'licenseCode', và 'userEmail' nếu có
  const { code, licenseCode, deviceId, userEmail } = req.body;
  const inputCode = code || licenseCode;

  if (!inputCode || !deviceId) {
    return res.status(400).json({ error: 'Thiếu mã kích hoạt hoặc định danh thiết bị.' });
  }

  try {
    const cleanCode = String(inputCode).trim().toUpperCase();

    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (error || !license) {
      return res.status(404).json({ error: 'Mã kích hoạt không tồn tại trên hệ thống.' });
    }

    if (!license.is_active) {
      return res.status(403).json({ error: 'Mã kích hoạt này đã bị khóa hoặc hết hạn.' });
    }

    // 1. Chưa gắn máy nào -> Khóa cứng vào máy hiện tại
    if (!license.bound_device_id) {
      await supabase
        .from('licenses')
        .update({ 
          bound_device_id: deviceId,
          activated_at: new Date().toISOString()
        })
        .eq('code', license.code);

      // Đồng bộ profile tài khoản nếu có email đăng nhập
      if (userEmail) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', userEmail)
            .single();

          if (license.plan_type !== 'COUNT_50') {
            await supabase
              .from('profiles')
              .update({ role: 'pro', max_usage: 9999 })
              .eq('email', userEmail);
          } else {
            const currentMax = userProfile?.max_usage || 3;
            await supabase
              .from('profiles')
              .update({ max_usage: currentMax + (license.quota_remaining || 50) })
              .eq('email', userEmail);
          }
        } catch (profileErr) {
          console.warn('Lỗi đồng bộ profiles:', profileErr);
        }
      }

      return res.status(200).json({
        success: true,
        valid: true,
        message: 'Kích hoạt bản quyền thành công trên thiết bị này!',
        planType: license.plan_type,
        quota: license.quota_remaining,
        license: {
          code: license.code,
          plan_type: license.plan_type,
          quota_remaining: license.quota_remaining,
        }
      });
    }

    // 2. Đã gắn máy -> Kiểm tra trùng khớp
    if (license.bound_device_id === deviceId) {
      // Đồng bộ profile tài khoản nếu có email đăng nhập
      if (userEmail) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', userEmail)
            .single();

          if (license.plan_type !== 'COUNT_50') {
            await supabase
              .from('profiles')
              .update({ role: 'pro', max_usage: 9999 })
              .eq('email', userEmail);
          } else {
            const currentMax = userProfile?.max_usage || 3;
            await supabase
              .from('profiles')
              .update({ max_usage: currentMax + (license.quota_remaining || 50) })
              .eq('email', userEmail);
          }
        } catch (profileErr) {
          console.warn('Lỗi đồng bộ profiles:', profileErr);
        }
      }

      return res.status(200).json({
        success: true,
        valid: true,
        message: 'Xác thực bản quyền hợp lệ!',
        planType: license.plan_type,
        quota: license.quota_remaining,
        license: {
          code: license.code,
          plan_type: license.plan_type,
          quota_remaining: license.quota_remaining,
        }
      });
    } else {
      return res.status(403).json({
        valid: false,
        error: 'Mã này đã được kích hoạt trên một máy tính khác. Vui lòng liên hệ Admin để cấp quyền đổi máy.'
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi hệ thống: ' + err.message });
  }
}