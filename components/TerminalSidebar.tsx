import { useEffect, useRef } from 'react';
import { Cpu, ShieldCheck, Sparkles } from 'lucide-react';
interface TerminalSidebarProps {
  logs: string[];
  isProcessing: boolean;
}

export default function TerminalSidebar({ logs, isProcessing }: TerminalSidebarProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full space-y-4">
      {/* 1. KHỐI TRÊN CÙNG: QUY TRÌNH CHUẨN HÓA & TIÊU CHUẨN PHÁP LÝ (TĂNG TÍNH THẨM MỸ) */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Quy trình tích hợp 3 bước</h3>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-slate-700">Chọn cấu hình</p>
              <p className="text-[11px] text-slate-500">Môn học, Khối lớp &amp; Chế độ NLS/AI</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-slate-700">Tải lên Giáo án (.docx)</p>
              <p className="text-[11px] text-slate-500">Tự động nhận diện cấu trúc CV 2345 (Tiểu học) & CV 5512 (Trung học)</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-semibold text-slate-700">Xuất bản tức thì</p>
              <p className="text-[11px] text-slate-500">Bảo lưu 100% MathType &amp; Bảng biểu</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Chuẩn hóa <strong>TT 02/2025</strong> &amp; <strong>QĐ 2422</strong> của Bộ GD&amp;ĐT</span>
        </div>
      </div>

      {/* 2. KHỐI GIỮA: SYSTEM CORE TERMINAL (THU GỌN VỪA VẶN ĐỂ THEO DÕI LOGS) */}
      <div className="bg-[#0f172a] rounded-2xl p-4 shadow-lg border border-slate-800 flex flex-col h-[200px] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-75"></div>
        
        <div className="flex items-center justify-between mb-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">System Console</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {isProcessing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isProcessing ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
            </span>
          </div>
        </div>
        
        <div 
          ref={terminalRef} 
          className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 font-mono text-[10px] leading-relaxed pr-1 scroll-smooth"
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500/80 gap-1">
              <Cpu className="w-5 h-5 opacity-40 text-indigo-400" />
              <p className="text-[10px]">Sẵn sàng tiếp nhận tài liệu...</p>
            </div>
          ) : (
            logs.map((log, i) => {
              const isLast = i === logs.length - 1;
              const opacityClass = isLast ? 'opacity-100' : 'opacity-70';
              
              return (
                <div key={i} className={`flex gap-1.5 animate-fade-in-left ${opacityClass}`}>
                  <span className="text-slate-600 shrink-0 select-none">➜</span>
                  <span className={`${log.includes("❌") ? "text-rose-400 font-bold" : log.includes("✓") ? "text-emerald-400 font-bold" : log.includes("🚀") ? "text-amber-400 font-bold" : "text-indigo-200"}`}>
                    {log.replace("✓ ", "").replace("🚀 ", "")}
                  </span>
                </div>
              );
            })
          )}
          {isProcessing && <div className="w-1 h-2 bg-indigo-500 animate-pulse mt-1 ml-4"></div>}
        </div>
      </div>

      {/* 3. KHỐI DƯỚI CÙNG: THÔNG TIN TÁC GIẢ BÁM SÁT NGAY DƯỚI */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-100">
            GV
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Đặng Mạnh Hùng</h4>
            <p className="text-[10px] text-slate-500 font-medium">THPT LÝ NHÂN TÔNG</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold">
            097 8386 357
          </span>
        </div>
      </div>
    </div>
  );
}