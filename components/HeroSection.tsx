import { Sparkles, Zap, LayoutTemplate, ShieldCheck } from 'lucide-react';

interface HeroSectionProps {
  appVersion: string;
}

export default function HeroSection({ appVersion }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-white via-indigo-50/60 to-purple-50/40 rounded-2xl px-5 py-3 mb-5 text-slate-800 shadow-xs border border-indigo-100/90 animate-fade-in-up flex flex-col md:flex-row items-center justify-between gap-4">
      
      {/* Hiệu ứng ánh sáng nền tươi tắn, sang trọng */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-pink-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* BÊN TRÁI: TIÊU ĐỀ & MÔ TẢ GỌN GÀNG */}
      <div className="space-y-1 text-center md:text-left z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 border border-indigo-200/80 rounded-full text-[10px] font-bold text-indigo-700 shadow-2xs">
          <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
          <span>GDPT 2018 | Tiểu học • THCS • THPT | Phiên bản {appVersion}</span>
        </div>

        <h2 className="text-lg md:text-xl font-black tracking-tight text-slate-900 leading-snug">
          Trợ lý AI Soạn Giáo án{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Chuyển đổi số
          </span>
        </h2>

        <p className="text-slate-500 text-[11px] leading-relaxed max-w-xl">
          Tự động tích hợp Năng lực số (TT 02/2025), Giáo dục AI & STEM (CV 3089). Nhận diện chuẩn CV 2345 & 5512, bảo lưu 100% MathType.
        </p>
      </div>

      {/* BÊN PHẢI: 3 THẺ TÍNH NĂNG MINI TINH TẾ */}
      <div className="flex items-center gap-2 shrink-0 z-10">
        
        <div className="group relative bg-white/90 border border-slate-200/80 rounded-xl px-3 py-2 text-center shadow-2xs hover:border-amber-400/60 transition-all">
          <div className="w-5 h-5 bg-amber-50 rounded-lg flex items-center justify-center mx-auto mb-0.5 text-amber-600">
            <Zap className="w-3 h-3" />
          </div>
          <div className="text-[10px] font-bold text-slate-800">Tốc độ</div>
          <div className="text-[8px] text-slate-400 font-medium">Tự động 100%</div>
        </div>

        <div className="group relative bg-white/90 border border-slate-200/80 rounded-xl px-3 py-2 text-center shadow-2xs hover:border-indigo-400/60 transition-all">
          <div className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-0.5 text-indigo-600">
            <LayoutTemplate className="w-3 h-3" />
          </div>
          <div className="text-[10px] font-bold text-slate-800">Chuẩn Form</div>
          <div className="text-[8px] text-slate-400 font-medium">CV 2345 & 5512</div>
        </div>

        <div className="group relative bg-white/90 border border-slate-200/80 rounded-xl px-3 py-2 text-center shadow-2xs hover:border-emerald-400/60 transition-all">
          <div className="w-5 h-5 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-0.5 text-emerald-600">
            <ShieldCheck className="w-3 h-3" />
          </div>
          <div className="text-[10px] font-bold text-slate-800">Bảo mật</div>
          <div className="text-[8px] text-slate-400 font-medium">An toàn dữ liệu</div>
        </div>

      </div>

    </div>
  );
}