import { Sparkles, LogIn, LogOut, User, ShieldCheck, Zap, Crown, MessageCircle, Phone, Award } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  userApiKey: string;
  setUserApiKey: (key: string) => void;
  isKeySaved: boolean;
  saveKeyToLocal: () => void;
  handleEditKey: () => void;
  user?: UserProfile | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onOpenPricing?: () => void;
}

export default function Header({ 
  userApiKey: _userApiKey, 
  setUserApiKey: _setUserApiKey, 
  isKeySaved: _isKeySaved, 
  saveKeyToLocal: _saveKeyToLocal, 
  handleEditKey: _handleEditKey,
  user, 
  onLogin, 
  onLogout, 
  onOpenPricing 
}: HeaderProps) {
  const hasLocalPro = 
  typeof window !== 'undefined' && (
    localStorage.getItem('USER_PLAN_TYPE') === 'PRO' ||
    localStorage.getItem('nls_plan_type') === 'PRO' ||
    Boolean(localStorage.getItem('USER_LICENSE_CODE')) ||
    Boolean(localStorage.getItem('nls_license_key'))
  );

  const isPro = 
    hasLocalPro || 
    user?.plan === 'PRO' || 
    (user as any)?.role === 'pro' || 
    (user?.maxUsage || 0) >= 9000;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* BÊN TRÁI: LOGO, TÊN APP & TÁC GIẢ / HUY HIỆU CHUYÊN MÔN */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
          <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="font-extrabold text-slate-800 text-sm sm:text-base tracking-tight flex items-center gap-1.5">
            <span>EduSpark AI</span>
            <span className="text-indigo-600">Pro</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm">v4.0 PRO</span>
          </h1>
        </div>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500">
            <div className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tác giả: <strong className="text-slate-900">Đặng Mạnh Hùng</strong> (Trường THPT Lý Nhân Tông)</span>
            </div>
          </div>
        </div>

        {/* BÊN PHẢI: NÚT LIÊN HỆ NHANH, NÂNG CẤP PRO & TÀI KHOẢN */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Nút Liên hệ Zalo / Hotline (Hiển thị tinh tế trên màn hình vừa và lớn) */}
          <div className="hidden md:flex items-center gap-1.5">
            <a
              href="https://zalo.me/0978386357"
              target="_blank"
              rel="noreferrer"
              className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 transition"
              title="Liên hệ Zalo"
            >
              <MessageCircle className="w-3 h-3" /> Zalo
            </a>
            <a
              href="tel:0978386357"
              className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition"
              title="Gọi Hotline"
            >
              <Phone className="w-3 h-3 text-indigo-600" /> 0978386357
            </a>
          </div>

          {!isPro && <div className="w-[1px] h-5 bg-slate-200 mx-0.5 hidden md:block" />}

          {/* NÚT NÂNG CẤP PRO */}
          {!isPro && (
            <button
              type="button"
              onClick={onOpenPricing}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Nâng cấp PRO</span>
              <span className="sm:hidden">PRO</span>
            </button>
          )}

          {/* TÀI KHOẢN NGƯỜI DÙNG / ĐĂNG NHẬP GOOGLE */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 p-1 pl-2 sm:pl-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <button 
                type="button"
                onClick={onOpenPricing}
                className={`px-2 py-0.5 rounded-lg font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                  isPro
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs hover:opacity-90'
                  : (user.maxUsage > 3 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200')
                }`}
              >
                {isPro ? (
                  <>
                    <Zap className="w-2.5 h-2.5 fill-current" />
                    <span>PRO</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>{user.maxUsage > 3 ? `${user.usageCount || 0}/${user.maxUsage}` : `${user.usageCount || 0}/${user.maxUsage || 3}`}</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-1.5 ml-0.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Avatar'} className="w-6 h-6 rounded-full ring-2 ring-indigo-500/20 object-cover" />
                ) : (
                  <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                    {user.displayName?.charAt(0) || <User className="w-3 h-3" />}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-700 hidden xl:inline max-w-[100px] truncate">{user.displayName}</span>
              </div>

              <button 
                type="button"
                onClick={onLogout}
                title="Đăng xuất"
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={onLogin}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" /> <span>Đăng nhập</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}