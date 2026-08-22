import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, deviceId } = req.body;

  if (!code || !deviceId) {
    return res.status(400).json({ error: 'Thiếu mã kích hoạt hoặc định danh thiết bị.' });
  }

  try {
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('code', code.trim().toUpperCase())
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
        .update({ bound_device_id: deviceId })
        .eq('code', license.code);

      return res.status(200).json({
        success: true,
        message: 'Kích hoạt bản quyền thành công trên thiết bị này!',
        planType: license.plan_type,
        quota: license.quota_remaining
      });
    }

    // 2. Đã gắn máy -> Kiểm tra trùng khớp
    if (license.bound_device_id === deviceId) {
      return res.status(200).json({
        success: true,
        message: 'Xác thực bản quyền hợp lệ!',
        planType: license.plan_type,
        quota: license.quota_remaining
      });
    } else {
      return res.status(403).json({
        error: 'Mã này đã được kích hoạt trên một máy tính khác. Vui lòng liên hệ Admin để cấp quyền đổi máy.'
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi hệ thống: ' + err.message });
  }
}