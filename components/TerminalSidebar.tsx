import React, { useEffect, useRef } from 'react';
import { Cpu, GraduationCap } from 'lucide-react';

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
    <>
       {/* Terminal Card */}
       <div className="bg-[#0f172a] rounded-xl p-4 shadow-xl shadow-slate-900/10 border border-slate-800 flex flex-col h-[250px] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-75"></div>
          
          <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
              <div className="flex items-center gap-2">
                 <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                 <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">System Core</span>
              </div>
              <div className="flex gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div><div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div></div>
          </div>
          
          <div 
            ref={terminalRef} 
            className="flex-1 overflow-y-auto custom-scrollbar space-y-2 font-mono text-[10px] leading-relaxed pr-1 relative scroll-smooth"
          >
             {logs.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-700/50">
                  <Cpu className="w-6 h-6 mb-2 opacity-50" />
                  <p className="text-[9px]">Sẵn sàng nhận lệnh...</p>
               </div>
             ) : (
               logs.map((log, i) => {
                const isLast = i === logs.length - 1;
                const opacityClass = isLast ? 'opacity-100' : 'opacity-40';
                
                return (
                  <div key={i} className={`flex gap-2 animate-fade-in-left transition-opacity duration-500 ${opacityClass}`}>
                    <span className="text-slate-600 shrink-0 select-none">➜</span>
                    <span className={`${log.includes("❌") ? "text-rose-400 font-bold" : log.includes("✓") ? "text-emerald-400 font-bold" : log.includes("🚀") ? "text-amber-400 font-bold" : "text-indigo-200"}`}>
                      {log.replace("✓ ", "").replace("🚀 ", "")}
                    </span>
                  </div>
                )
               })
             )}
             {isProcessing && <div className="w-1 h-2 bg-indigo-500 animate-pulse mt-1 ml-4"></div>}
          </div>
       </div>
       
       {/* Info Card */}
       <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white flex flex-col gap-3">
          <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-2"><GraduationCap className="w-3 h-3" /> Tác giả</h4>
          <div className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-lg border border-slate-100">
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold text-[10px] border border-slate-100 shadow-sm">GV</div>
             <div>
                <p className="text-xs font-bold text-slate-800">Đặng Mạnh Hùng</p>
                <p className="text-[9px] text-slate-500 uppercase font-medium">THPT Lý Nhân Tông</p>
             </div>
          </div>
          <div className="text-center pt-1">
             <p className="text-[9px] text-slate-400">Hỗ trợ: <span className="text-indigo-500 font-mono font-medium">097 8386 357</span></p>
          </div>
       </div>
    </>
  );
}