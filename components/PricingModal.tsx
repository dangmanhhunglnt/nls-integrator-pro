import React, { useState } from 'react';
import { X, CheckCircle, Zap, Crown, MessageCircle, Key, Loader2 } from 'lucide-react';
import { supabase } from '../config/supabaseClient';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onSuccessUpgrade?: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, userEmail, onSuccessUpgrade }) => {
  const [giftcode, setGiftcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Cấu hình tài khoản ngân hàng MSB của thầy
  const BANK_ID = "MSB";
  const ACCOUNT_NO = "19001010628998";
  const ACCOUNT_NAME = "DANG MANH HUNG";
  const ZALO_PHONE = "0978386357";

  // Cú pháp chuyển khoản tự động
  const transferContent = `NLS ${userEmail ? userEmail.split('@')[0] : 'PRO'}`;
  const qrUrl50k = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=50000&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  const handleRedeemGiftcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftcode.trim()) return;
    if (!userEmail) {
      setMsg({ type: 'error', text: 'Vui lòng đăng nhập tài khoản trước khi nhập mã kích hoạt.' });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      // 1. Kiểm tra tính hợp lệ của mã
      const { data: codeData, error: codeErr } = await supabase
        .from('giftcodes')
        .select('*')
        .eq('code', giftcode.trim().toUpperCase())
        .single();

      if (codeErr || !codeData) {
        setMsg({ type: 'error', text: 'Mã kích hoạt không tồn tại hoặc không chính xác!' });
        setLoading(false);
        return;
      }

      if (codeData.is_used) {
        setMsg({ type: 'error', text: 'Mã kích hoạt này đã được sử dụng trước đó.' });
        setLoading(false);
        return;
      }

      // 2. Cập nhật trạng thái người dùng (Cộng lượt hoặc Mở PRO) vào bảng profiles
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (codeData.plan_type === 'PRO') {
        await supabase
          .from('profiles')
          .update({ 
            role: 'pro',
            max_usage: 9999
          })
          .eq('email', userEmail);
      } else {
        const currentMax = userProfile?.max_usage || 3;
        await supabase
          .from('profiles')
          .update({ max_usage: currentMax + (codeData.add_turns || 50) })
          .eq('email', userEmail);
      }

      // 3. Đánh dấu mã đã dùng
      await supabase
        .from('giftcodes')
        .update({
          is_used: true,
          used_by: userEmail,
          used_at: new Date().toISOString()
        })
        .eq('id', codeData.id);

      setMsg({ type: 'success', text: `Kích hoạt thành công gói ${codeData.plan_type === 'PRO' ? 'PRO 1 Năm' : 'Thêm 50 Lượt'}!` });
      setTimeout(() => {
        if (onSuccessUpgrade) onSuccessUpgrade();
        onClose();
      }, 1500);

    } catch (err: any) {
      setMsg({ type: 'error', text: 'Có lỗi xảy ra: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        
        {/* Nút đóng */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Tiêu đề */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-xs uppercase tracking-wider">
            <Crown className="w-4 h-4 text-amber-500" /> Bảng giá & Nâng cấp bản quyền
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mở khóa Năng lực Soạn giáo án Số & AI
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kích hoạt nhanh chóng trong vòng 1-3 phút sau khi chuyển khoản
          </p>
        </div>

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

        {/* Danh sách 2 gói cước */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Gói lượt */}
          <div className="border-2 border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl p-5 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-indigo-900 dark:text-indigo-300">Gói 50 Lượt</span>
                <span className="text-xs bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full font-medium">Tiết kiệm</span>
              </div>
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-3">
                50.000đ
              </div>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> 50 lượt tích hợp NLS & AI</li>
                <li className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Không giới hạn thời gian sử dụng</li>
                <li className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Giữ nguyên MathType & bảng biểu</li>
              </ul>
            </div>
          </div>

          {/* Gói PRO Năm */}
          <div className="border-2 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-5 relative flex flex-col justify-between">
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
              KHUYÊN DÙNG
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-amber-900 dark:text-amber-300">PRO Cả Năm</span>
                <Crown className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mb-3">
                299.000đ <span className="text-xs font-normal text-slate-400">/năm</span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Không giới hạn lượt sử dụng</li>
                <li className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Tự động cập nhật Khung AI 2026</li>
                <li className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Hỗ trợ kỹ thuật 1-1 qua Zalo</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mã QR VietQR Chuyển khoản */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 border border-slate-200 dark:border-slate-700">
          <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 flex-shrink-0">
            <img 
              src={qrUrl50k} 
              alt="Mã VietQR Thanh toán" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <div className="text-left text-xs space-y-1.5 w-full">
            <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" /> Quét mã QR chuyển khoản tự động
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
            <MessageCircle className="w-4 h-4" /> Nhắn tin qua Zalo ({ZALO_PHONE}) để duyệt lượt tức thì
          </a>
        </div>

      </div>
    </div>
  );
};