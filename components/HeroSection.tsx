import { Sparkles, Zap, LayoutTemplate, ShieldCheck } from 'lucide-react';
interface HeroSectionProps {
  appVersion: string;
}

export default function HeroSection({ appVersion }: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 mb-8 text-white shadow-2xl border border-indigo-500/20 animate-fade-in-up">
      {/* Hiệu ứng Glow nền */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          {/* Badge phiên bản */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-400/30 rounded-full text-xs font-semibold text-indigo-300 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>GDPT 2018 | Phiên bản {appVersion}</span>
          </div>

          {/* Tiêu đề chính */}
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Trợ lý AI Soạn Giáo án{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Chuyển đổi số
            </span>
          </h2>

<<<<<<< HEAD
          <p className="text-gray-300 text-sm md:text-base max-w-3xl mx-auto mt-2 leading-relaxed">
            Tự động tích hợp <span className="font-semibold text-blue-300">Năng lực số (TT 02/2025)</span> & <span className="font-semibold text-purple-300">Giáo dục AI (QĐ 3439, Khung AI 2026 & HD 2026-2027)</span> vào bài dạy. Bảo lưu 100% định dạng, bảng biểu và công thức MathType.
=======
          <p className="text-gray-300 text-sm md:text-base max-w-3xl mt-2 leading-relaxed">
            Tự động tích hợp Năng lực số (TT 02/2025) & Giáo dục AI (QĐ 3439, Khung AI 2026 & HD 2026-2027) vào bài dạy. Bảo lưu 100% định dạng, bảng biểu và công thức MathType.
>>>>>>> version-2
          </p>
        </div>

        {/* 3 Thẻ tính năng tương tác */}
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
          
          {/* Thẻ 1: Tốc độ */}
          <div className="group relative bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-3.5 text-center hover:bg-white/10 hover:border-amber-400/40 transition-all hover:-translate-y-1 shadow-sm hover:shadow-amber-500/10 cursor-pointer">
            <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 text-amber-400 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Tốc độ</div>
            <div className="text-[10px] text-slate-300 mt-0.5 font-medium">Tự động 100%</div>

            {/* Tooltip giải thích khi Hover */}
            <div className="absolute left-1/2 -bottom-12 -translate-x-1/2 w-40 p-2 bg-slate-900/95 text-white text-[10px] rounded-lg border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              Xử lý và chèn NLS/AI tự động chỉ trong vài giây.
            </div>
          </div>

          {/* Thẻ 2: Chuẩn Form */}
          <div className="group relative bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-3.5 text-center hover:bg-white/10 hover:border-indigo-400/40 transition-all hover:-translate-y-1 shadow-sm hover:shadow-indigo-500/10 cursor-pointer">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 text-indigo-400 group-hover:scale-110 transition-transform">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Chuẩn Form</div>
            <div className="text-[10px] text-slate-300 mt-0.5 font-medium">CV 5512</div>

            {/* Tooltip giải thích khi Hover */}
            <div className="absolute left-1/2 -bottom-12 -translate-x-1/2 w-40 p-2 bg-slate-900/95 text-white text-[10px] rounded-lg border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              Giữ nguyên bảng biểu, MathType & khung Công văn 5512.
            </div>
          </div>

          {/* Thẻ 3: Bảo mật */}
          <div className="group relative bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-3.5 text-center hover:bg-white/10 hover:border-emerald-400/40 transition-all hover:-translate-y-1 shadow-sm hover:shadow-emerald-500/10 cursor-pointer">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-white">Bảo mật</div>
            <div className="text-[10px] text-slate-300 mt-0.5 font-medium">An toàn dữ liệu</div>

            {/* Tooltip giải thích khi Hover */}
            <div className="absolute left-1/2 -bottom-12 -translate-x-1/2 w-40 p-2 bg-slate-900/95 text-white text-[10px] rounded-lg border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              Xử lý file trực tiếp, không lưu trữ dữ liệu giáo án.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}