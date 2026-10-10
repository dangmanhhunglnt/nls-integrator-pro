import { Sparkles, Zap, LayoutTemplate, ShieldCheck } from 'lucide-react';

interface HeroSectionProps {
  appVersion: string;
}

export default function HeroSection({ appVersion }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl px-6 py-4 mb-6 text-white shadow-lg border border-indigo-500/20 animate-fade-in-up">
      {/* Hiệu ứng Glow nền */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center lg:text-left max-w-2xl">
          {/* Badge phiên bản & đối tượng giáo viên */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-400/30 rounded-full text-[11px] font-semibold text-indigo-300 backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>GDPT 2018 | Tiểu học • THCS • THPT | Phiên bản {appVersion}</span>
          </div>

          {/* Tiêu đề chính */}
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white leading-snug">
            Trợ lý AI Soạn Giáo án{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Chuyển đổi số
            </span>
          </h2>

          <p className="text-slate-300 text-xs leading-relaxed">
            Tự động tích hợp Năng lực số (TT 02/2025), Giáo dục AI &amp; Giáo dục STEM (CV 3089 / 909) vào bài dạy. Tự động nhận diện chuẩn CV 2345 (Tiểu học) &amp; CV 5512 (Trung học). Bảo lưu 100% định dạng, bảng biểu và công thức MathType.
          </p>
        </div>

        {/* 3 Thẻ tính năng tương tác */}
        <div className="grid grid-cols-3 gap-2.5 w-full lg:w-auto shrink-0">
          
          {/* Thẻ 1: Tốc độ */}
          <div className="group relative bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-2.5 text-center hover:bg-white/10 hover:border-amber-400/40 transition-all hover:-translate-y-0.5 shadow-xs cursor-pointer">
            <div className="w-6 h-6 bg-amber-500/20 rounded-lg flex items-center justify-center mx-auto mb-1 text-amber-400 group-hover:scale-110 transition-transform">
              <Zap className="w-3 h-3" />
            </div>
            <div className="text-[11px] font-bold text-white">Tốc độ</div>
            <div className="text-[9px] text-slate-300 font-medium">Tự động 100%</div>

            {/* Tooltip giải thích khi Hover */}
            <div className="absolute left-1/2 -bottom-10 -translate-x-1/2 w-36 p-1.5 bg-slate-900/95 text-white text-[9px] rounded-md border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              Xử lý và chèn NLS/AI tự động chỉ trong vài giây.
            </div>
          </div>

          {/* Thẻ 2: Chuẩn Form */}
          <div className="group relative bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-2.5 text-center hover:bg-white/10 hover:border-indigo-400/40 transition-all hover:-translate-y-0.5 shadow-xs cursor-pointer">
            <div className="w-6 h-6 bg-indigo-500/20 rounded-lg flex items-center justify-center mx-auto mb-1 text-indigo-400 group-hover:scale-110 transition-transform">
              <LayoutTemplate className="w-3 h-3" />
            </div>
            <div className="text-[11px] font-bold text-white">Chuẩn Form</div>
            <div className="text-[9px] text-slate-300 font-medium">CV 2345 & 5512</div>

            {/* Tooltip giải thích khi Hover */}
            <div className="absolute left-1/2 -bottom-12 -translate-x-1/2 w-44 p-1.5 bg-slate-900/95 text-white text-[9px] rounded-md border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              Chuẩn CV 2345 (Tiểu học) & CV 5512 (THCS, THPT). Giữ nguyên MathType.
            </div>
          </div>

          {/* Thẻ 3: Bảo mật */}
          <div className="group relative bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-2.5 text-center hover:bg-white/10 hover:border-emerald-400/40 transition-all hover:-translate-y-0.5 shadow-xs cursor-pointer">
            <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-1 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <div className="text-[11px] font-bold text-white">Bảo mật</div>
            <div className="text-[9px] text-slate-300 font-medium">An toàn dữ liệu</div>

            {/* Tooltip giải thích khi Hover */}
            <div className="absolute left-1/2 -bottom-10 -translate-x-1/2 w-36 p-1.5 bg-slate-900/95 text-white text-[9px] rounded-md border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              Xử lý file trực tiếp, không lưu trữ dữ liệu giáo án.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}