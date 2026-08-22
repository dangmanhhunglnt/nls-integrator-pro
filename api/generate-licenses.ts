import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Mật khẩu bí mật dành riêng cho bạn (đổi lại chuỗi này theo ý bạn)
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'hungadm012';

function makeRandomCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) result += '-';
  }
  return `${prefix}-${result}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
  }

  const { adminKey, planType, groupName, quantity = 1 } = req.body;

  // 1. Kiểm tra quyền quản trị viên
  if (adminKey !== ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này.' });
  }

  if (!planType || !groupName) {
    return res.status(400).json({ error: 'Vui lòng cung cấp loại gói và tên đơn vị.' });
  }

  const prefixMap: Record<string, string> = {
    COUNT_50: 'NLS-50L',
    SINGLE_YEAR: 'NLS-VIP',
    TEAM: 'NLS-TEAM',
    SCHOOL: 'NLS-SCH'
  };

  const prefix = prefixMap[planType] || 'NLS-KEY';
  const records = [];

  for (let i = 1; i <= Number(quantity); i++) {
    records.push({
      code: makeRandomCode(prefix),
      plan_type: planType,
      group_name: quantity > 1 ? `${groupName} (GV ${i})` : groupName,
      quota_remaining: planType === 'COUNT_50' ? 50 : 9999,
      is_active: true
    });
  }

  try {
    // 2. Lưu hàng loạt danh sách mã vào bảng licenses trên Supabase
    const { data, error } = await supabase
      .from('licenses')
      .insert(records)
      .select('code, plan_type, group_name, quota_remaining');

    if (error) throw error;

    return res.status(200).json({
      success: true,
      total_created: data.length,
      licenses: data
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi tạo mã: ' + err.message });
  }
}