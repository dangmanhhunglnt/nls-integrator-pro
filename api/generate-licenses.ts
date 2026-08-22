import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
  }

  try {
    const { adminKey, planType, groupName, quantity = 1 } = req.body || {};

    const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'hungmath_admin_2026';
    if (adminKey !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Mã quản trị (adminKey) không chính xác.' });
    }

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Chưa cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trên Vercel.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const prefixMap: Record<string, string> = {
      COUNT_50: 'NLS-50L',
      SINGLE_YEAR: 'NLS-VIP',
      TEAM: 'NLS-TEAM',
      SCHOOL: 'NLS-SCH'
    };

    const prefix = prefixMap[planType] || 'NLS-KEY';
    const numQty = Math.max(1, Math.min(200, Number(quantity) || 1));
    const records = [];

    for (let i = 1; i <= numQty; i++) {
      records.push({
        code: makeRandomCode(prefix),
        plan_type: planType || 'SINGLE_YEAR',
        group_name: numQty > 1 ? `${groupName} (GV ${i})` : groupName,
        quota_remaining: planType === 'COUNT_50' ? 50 : 9999,
        is_active: true
      });
    }

    const { data, error } = await supabase
      .from('licenses')
      .insert(records)
      .select('code, plan_type, group_name, quota_remaining');

    if (error) {
      return res.status(500).json({ error: `Supabase Error: ${error.message}` });
    }

    return res.status(200).json({
      success: true,
      total_created: data?.length || records.length,
      licenses: data || records
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Server Crash: ${err.message || String(err)}` });
  }
}