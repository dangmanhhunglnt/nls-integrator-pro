interface HeroSectionProps {
  appVersion: string;
}

export default function HeroSection({ appVersion: _appVersion }: HeroSectionProps) {
  return (
    <div className="flex items-center justify-between pb-2 mb-4 border-b border-slate-200/60 animate-fade-in-up">
      <div>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Trợ lý AI Soạn Giáo án Chuyển đổi số</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">GDPT 2018</span>
        </h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Tự động tích hợp Năng lực số (TT 02/2025), Giáo dục AI & STEM. Nhận diện chuẩn CV 2345 & 5512, bảo lưu 100% MathType.
        </p>
      </div>
    </div>
  );
}