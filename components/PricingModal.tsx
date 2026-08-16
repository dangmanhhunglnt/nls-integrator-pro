import React from 'react';
import { X, CheckCircle, Zap, Crown, MessageCircle } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, userEmail }) => {
  if (!isOpen) return null;

  const BANK_ID = "MB";
  const ACCOUNT_NO = "0978386357";
  const ACCOUNT_NAME = "DANG MANH HUNG";
  const ZALO_PHONE = "0978386357";

  const transferContent = `NLS ${userEmail ? userEmail.split('@')[0] : 'PRO'}`;
  const qrUrl50k = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=50000&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-6 h-6" />
        </button>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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