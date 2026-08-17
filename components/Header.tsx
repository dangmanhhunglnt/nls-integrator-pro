import { Sparkles, LogIn, LogOut, User, ShieldCheck, Zap, Crown } from 'lucide-react';
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
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* LOGO & BRAND NAME */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="font-bold text-slate-800 text-lg tracking-tight">
            NLS Integrator <span className="text-indigo-600">Pro</span>
          </h1>
        </div>

        {/* KHU VỰC PHẢI: NÂNG CẤP PRO + TÀI KHOẢN */}
        <div className="flex items-center gap-3">
          
          {/* NÚT NÂNG CẤP BẢN QUYỀN / MUA QUOTA */}
          <button
            type="button"
            onClick={onOpenPricing}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Crown className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Nâng cấp PRO</span>
          </button>

          <div className="w-[1px] h-6 bg-slate-200 mx-1 hidden sm:block" />

          {/* TÀI KHOẢN NGƯỜI DÙNG / ĐĂNG NHẬP GOOGLE */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 p-1 pl-2.5 rounded-xl border border-slate-200">
              {/* Badge Gói Cước */}
              <button 
                type="button"
                onClick={onOpenPricing}
                className={`px-2 py-0.5 rounded-lg font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                  user.plan === 'PRO' || user.plan === 'SCHOOL'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs hover:opacity-90'
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                {user.plan === 'PRO' ? <Zap className="w-2.5 h-2.5 fill-current" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                {user.plan === 'PRO' ? 'Gói Pro' : `Dùng thử (${user.usageCount || 0}/${user.maxUsage || 3})`}
              </button>

              {/* User Avatar */}
              <div className="flex items-center gap-1.5 ml-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Avatar'} className="w-6 h-6 rounded-full ring-2 ring-indigo-500/20 object-cover" />
                ) : (
                  <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                    {user.displayName?.charAt(0) || <User className="w-3 h-3" />}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-700 hidden md:inline max-w-[100px] truncate">{user.displayName}</span>
              </div>

              {/* Nút Đăng xuất */}
              <button 
                type="button"
                onClick={onLogout}
                title="Đăng xuất"
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={onLogin}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}