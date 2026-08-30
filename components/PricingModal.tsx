import React, { useState } from 'react';
import { X, CheckCircle, Zap, Crown, MessageCircle, Key, Loader2, Users, Building2, Download, ShieldCheck, Lock } from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { getDeviceId } from '../utils';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onSuccessUpgrade?: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, userEmail, onSuccessUpgrade }) => {
  const [giftcode, setGiftcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'COUNT_50' | 'PRO_YEAR' | 'TEAM' | 'SCHOOL'>('PRO_YEAR');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State dành cho Admin bí mật
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminClicks, setAdminClicks] = useState(0);
  const [adminForm, setAdminForm] = useState({
    adminKey: '',
    planType: 'SINGLE_YEAR',
    groupName: '',
    quantity: 1
  });

  if (!isOpen) return null;

  // Cấu hình tài khoản ngân hàng MSB
  const BANK_ID = "MSB";
  const ACCOUNT_NO = "19001010628998";
  const ACCOUNT_NAME = "DANG MANH HUNG";
  const ZALO_PHONE = "0978386357";

  // Cấu hình giá & nội dung chuyển khoản theo gói đang chọn
  const planDetails = {
    COUNT_50: { amount: 50000, codePrefix: '50L' },
    PRO_YEAR: { amount: 299000, codePrefix: 'PRO' },
    TEAM: { amount: 699000, codePrefix: 'TO' },
    SCHOOL: { amount: 1999000, codePrefix: 'TRUONG' },
  };

  const currentAmount = planDetails[selectedPlan].amount;
  const userTag = userEmail ? userEmail.split('@')[0] : 'GV';
  const transferContent = `NLS ${planDetails[selectedPlan].codePrefix} ${userTag}`;
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${currentAmount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  // Click 3 lần vào vương miện để mở Admin bí mật
  const handleSecretAdminTrigger = () => {
    if (adminClicks + 1 >= 3) {
      setShowAdmin(true);
      setAdminClicks(0);
    } else {
      setAdminClicks(prev => prev + 1);
    }
  };

  // Hàm sinh mã ngẫu nhiên bảo mật
  const makeRandomCode = (prefix: string) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i === 3) result += '-';
    }
    return `${prefix}-${result}`;
  };

  // Admin sinh mã TRỰC TIẾP và xuất file Excel / CSV (Không qua Serverless API)
  const handleAdminExportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Kiểm tra mật khẩu Admin
    if (adminForm.adminKey.trim() !== 'Hung@0123') {
      alert('Mật khẩu quản trị không chính xác! Vui lòng nhập đúng: ');
      return;
    }

    if (!adminForm.groupName.trim()) {
      alert('Vui lòng nhập tên Người mua / Đơn vị.');
      return;
    }

    setLoading(true);

    try {
      const prefixMap: Record<string, string> = {
        COUNT_50: 'NLS-50L',
        SINGLE_YEAR: 'NLS-VIP',
        TEAM: 'NLS-TEAM',
        SCHOOL: 'NLS-SCH'
      };

      const prefix = prefixMap[adminForm.planType] || 'NLS-KEY';
      const numQty = Math.max(1, Math.min(200, Number(adminForm.quantity) || 1));
      const records = [];

      for (let i = 1; i <= numQty; i++) {
        records.push({
          code: makeRandomCode(prefix),
          plan_type: adminForm.planType,
          group_name: numQty > 1 ? `${adminForm.groupName} (GV ${i})` : adminForm.groupName,
          quota_remaining: adminForm.planType === 'COUNT_50' ? 50 : 9999,
          is_active: true
        });
      }

      // Lưu trực tiếp vào bảng licenses trên Supabase
      const { data, error } = await supabase
        .from('licenses')
        .insert(records)
        .select('code, plan_type, group_name, quota_remaining');

      if (error) {
        throw new Error('Supabase Error: ' + error.message);
      }

      const planNameMap: Record<string, string> = {
        COUNT_50: 'Gói 50 Lượt (50.000đ)',
        SINGLE_YEAR: 'PRO Cá Nhân 1 Năm (299.000đ)',
        TEAM: 'PRO Tổ Chuyên Môn (699.000đ)',
        SCHOOL: 'PRO Toàn Trường (1.999.000đ)'
      };

      const outputList = data && data.length > 0 ? data : records;

      let csv = '\uFEFFSTT,Mã kích hoạt,Loại gói,Tên người dùng / Đơn vị,Hạn mức / Lượt,Hướng dẫn sử dụng\n';
      outputList.forEach((item: any, i: number) => {
        const quotaText = item.plan_type === 'COUNT_50' ? `${item.quota_remaining} lượt` : '1 Năm (Không giới hạn)';
        csv += `${i + 1},"${item.code}","${planNameMap[item.plan_type] || item.plan_type}","${item.group_name}","${quotaText}","Mở web -> Bấm Đã có mã kích hoạt -> Dán mã vào (Khóa 1 máy)"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanFileName = adminForm.groupName.replace(/\s+/g, '_') || 'Ban_Quyen_NLS';
      a.download = `Danh_Sach_Ma_${cleanFileName}.csv`;
      a.click();

      alert(`Đã tạo thành công ${outputList.length} mã và xuất file Excel!`);
      setShowAdmin(false);
      setAdminForm(prev => ({ ...prev, adminKey: '' }));
    } catch (err: any) {
      alert('Lỗi tạo mã: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Kích hoạt Giftcode từ phía người dùng (Gọi qua API an toàn)
  const handleRedeemGiftcode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = giftcode.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    setMsg(null);

    try {
      const deviceId = await getDeviceId();

      // Gọi API Serverless xác thực thay vì cập nhật trực tiếp DB
      const res = await fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseCode: cleanCode,
          deviceId: deviceId,
          userEmail: userEmail || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setMsg({ 
          type: 'error', 
          text: data.error || 'Mã kích hoạt không hợp lệ hoặc đã gắn với thiết bị khác.' 
        });
        return;
      }

      // Lưu trữ cấu hình bản quyền vào LocalStorage
      localStorage.setItem('USER_LICENSE_CODE', cleanCode);
      localStorage.setItem('USER_PLAN_TYPE', data.license?.plan_type || 'PRO');

      setMsg({ 
        type: 'success', 
        text: 'Kích hoạt bản quyền thành công trên thiết bị này!' 
      });

      setTimeout(() => {
        if (onSuccessUpgrade) onSuccessUpgrade();
        onClose();
      }, 1200);

    } catch (err: any) {
      setMsg({ type: 'error', text: 'Có lỗi xảy ra: ' + (err.message || err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        
        {/* Nút đóng */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Tiêu đề (Click 3 lần vào vương miện để mở Admin) */}
        <div className="text-center space-y-2 mb-6">
          <div 
            onClick={handleSecretAdminTrigger}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-xs uppercase tracking-wider cursor-pointer select-none transition hover:scale-105"
            title="Quản trị viên: Click 3 lần để mở xuất file mã Excel"
          >
            <Crown className="w-4 h-4 text-amber-500" /> Bảng giá & Nâng cấp bản quyền
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mở khóa Năng lực Soạn giáo án Số & AI
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kích hoạt nhanh chóng trong 1-3 phút sau khi chuyển khoản
          </p>
        </div>

        {/* BẢNG QUẢN TRỊ BÍ MẬT DÀNH CHO ADMIN */}
        {showAdmin && (
          <div className="mb-6 p-4 rounded-xl bg-slate-900 text-white border-2 border-amber-500 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5 uppercase">
                <ShieldCheck className="w-4 h-4" /> Bảng Quản Trị: Tạo Mã Hàng Loạt & Xuất Excel
              </span>
              <button 
                type="button" 
                onClick={() => setShowAdmin(false)} 
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 bg-slate-800 rounded"
              >
                ✕ Đóng
              </button>
            </div>

            <form onSubmit={handleAdminExportExcel} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" /> Mật khẩu Admin:
                </label>
                <input 
                  type="password" 
                  placeholder="Nhập mật khẩu Admin" 
                  value={adminForm.adminKey} 
                  onChange={e => setAdminForm({ ...adminForm, adminKey: e.target.value })}
                  required
                  className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Loại gói phát hành:</label>
                <select 
                  value={adminForm.planType} 
                  onChange={e => {
                    const newPlan = e.target.value;
                    let defaultQty = 1;
                    if (newPlan === 'TEAM') defaultQty = 10;
                    if (newPlan === 'SCHOOL') defaultQty = 50;
                    setAdminForm({ ...adminForm, planType: newPlan, quantity: defaultQty });
                  }}
                  className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="COUNT_50">1. Gói 50 Lượt (50k)</option>
                  <option value="SINGLE_YEAR">2. Gói Cá Nhân 1 Năm (299k)</option>
                  <option value="TEAM">3. Gói Tổ Chuyên Môn (699k)</option>
                  <option value="SCHOOL">4. Gói Toàn Trường (1.999k - 2.990k)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Tên Người mua / Tổ / Trường:</label>
                <input 
                  type="text" 
                  placeholder={adminForm.planType === 'SINGLE_YEAR' ? "VD: Thầy Nguyễn Văn A" : (adminForm.planType === 'COUNT_50' ? "VD: Cô Trần Thị B (50 lượt)" : "VD: Tổ Toán - THPT Lý Nhân Tông")} 
                  value={adminForm.groupName} 
                  onChange={e => setAdminForm({ ...adminForm, groupName: e.target.value })}
                  required
                  className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Số lượng & Xuất:</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min="1" 
                    max="200" 
                    value={adminForm.quantity} 
                    onChange={e => setAdminForm({ ...adminForm, quantity: Number(e.target.value) })}
                    className="w-16 p-2 bg-slate-800 rounded border border-slate-700 text-white text-center font-bold"
                  />
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded flex items-center justify-center gap-1 shadow transition"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Tải Excel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Khu vực kích hoạt Giftcode */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800/60">
          <form onSubmit={handleRedeemGiftcode} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <Key className="w-4 h-4 text-indigo-500" /> Đã có Mã kích hoạt (Giftcode)?
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập mã kích hoạt của bạn (VD: NLS-XXXXXX)..."
                value={giftcode}
                onChange={(e) => setGiftcode(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={loading || !giftcode.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kích hoạt'}
              </button>
            </div>
            {msg && (
              <p className={`text-xs font-medium ${msg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {msg.text}
              </p>
            )}
          </form>
        </div>

        {/* Danh sách 4 gói cước */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Gói 1: Gói lượt */}
          <div 
            onClick={() => setSelectedPlan('COUNT_50')}
            className={`border-2 rounded-xl p-3.5 cursor-pointer transition relative flex flex-col justify-between ${
              selectedPlan === 'COUNT_50' 
                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm' 
                : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-indigo-900 dark:text-indigo-300">Gói 50 Lượt</span>
                <span className="text-[10px] bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.2 rounded font-medium">Lượt</span>
              </div>
              <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mb-2">
                50.000đ
              </div>
              <ul className="text-[10.5px] space-y-1.5 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> 50 lượt NLS & AI</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Không hạn thời gian</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Giữ chuẩn MathType</li>
              </ul>
            </div>
          </div>

          {/* Gói 2: PRO Cá Nhân */}
          <div 
            onClick={() => setSelectedPlan('PRO_YEAR')}
            className={`border-2 rounded-xl p-3.5 cursor-pointer transition relative flex flex-col justify-between ${
              selectedPlan === 'PRO_YEAR' 
                ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 shadow-md ring-1 ring-amber-400' 
                : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'
            }`}
          >
            <div className="absolute -top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">
              KHUYÊN DÙNG
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-amber-900 dark:text-amber-300">PRO Cá Nhân</span>
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mb-2">
                299.000đ <span className="text-[10px] font-normal text-slate-400">/năm</span>
              </div>
              <ul className="text-[10.5px] space-y-1.5 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Không giới hạn lượt</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Khóa 1 máy cá nhân</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Cập nhật Khung AI</li>
              </ul>
            </div>
          </div>

          {/* Gói 3: Gói Tổ */}
          <div 
            onClick={() => setSelectedPlan('TEAM')}
            className={`border-2 rounded-xl p-3.5 cursor-pointer transition relative flex flex-col justify-between ${
              selectedPlan === 'TEAM' 
                ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 shadow-sm' 
                : 'border-slate-200 dark:border-slate-800 hover:border-purple-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-purple-900 dark:text-purple-300">Tổ Chuyên Môn</span>
                <Users className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 mb-2">
                699.000đ <span className="text-[10px] font-normal text-slate-400">/năm</span>
              </div>
              <ul className="text-[10.5px] space-y-1.5 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Gói 5 - 10 Giáo viên</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Mã riêng từng máy</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Tiết kiệm hơn 70%</li>
              </ul>
            </div>
          </div>

          {/* Gói 4: Gói Toàn Trường (Cập nhật 2 mức giá trực quan) */}
          <div 
            onClick={() => setSelectedPlan('SCHOOL')}
            className={`border-2 rounded-xl p-3.5 cursor-pointer transition relative flex flex-col justify-between ${
              selectedPlan === 'SCHOOL' 
                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm' 
                : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-blue-900 dark:text-blue-300">Toàn Trường</span>
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
              </div>
              
              <div className="mb-2">
                <div className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                  1.999.000đ <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">(≤ 50 GV/năm)</span>
                </div>
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  2.990.000đ <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">(&gt; 50 - 100 GV)</span>
                </div>
              </div>

              <ul className="text-[10.5px] space-y-1.5 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Cấp danh sách mã riêng từng GV</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Xuất hợp đồng / hóa đơn</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Hỗ trợ kỹ thuật 24/7</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mã QR VietQR Chuyển khoản */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 border border-slate-200 dark:border-slate-700">
          <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 flex-shrink-0">
            <img 
              src={qrUrl} 
              alt="Mã VietQR Thanh toán" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <div className="text-left text-xs space-y-1.5 w-full">
            <div className="font-bold text-slate-800 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Chuyển khoản gói: <strong className="text-indigo-600 dark:text-indigo-400">{currentAmount.toLocaleString('vi-VN')}đ</strong>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Quét mã bằng app ngân hàng</span>
            </div>
            <div className="text-slate-600 dark:text-slate-300">
              Ngân hàng: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{BANK_ID}</span> - STK: <span className="font-mono font-bold text-slate-900 dark:text-white">{ACCOUNT_NO}</span>
            </div>
            <div className="text-slate-600 dark:text-slate-300">
              Chủ TK: <span className="font-semibold text-slate-800 dark:text-slate-200">{ACCOUNT_NAME}</span>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded border border-indigo-200 dark:border-indigo-800">
              Nội dung CK: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300 select-all">{transferContent}</span>
            </div>
          </div>
        </div>

        {/* Hỗ trợ Zalo */}
        <div className="mt-5 text-center">
          <a
            href={`https://zalo.me/${ZALO_PHONE}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <MessageCircle className="w-4 h-4" /> Nhắn tin qua Zalo ({ZALO_PHONE}) để nhận mã kích hoạt tức thì (hỗ trợ xuất hóa đơn/hợp đồng trường)
          </a>
        </div>

      </div>
    </div>
  );
};