import React, { useState, useEffect, useRef } from 'react';
import { 
  FileUp, Wand2, FileCheck, Download,
  BookOpen, GraduationCap, Sparkles, ChevronRight,
  Activity, Cpu, Info, ShieldCheck, Key, CheckCircle2,
  Rocket, LayoutTemplate, Zap
} from 'lucide-react';
import { AppState, SubjectType, GradeType, GeneratedNLSContent } from './types';
import { extractTextFromDocx, createIntegrationTextPrompt, PEDAGOGY_MODELS } from './utils';
import { generateCompetencyIntegration } from './services/geminiService';
import { injectContentIntoDocx } from './services/docxManipulator';
import SmartEditor from './components/SmartEditor';

type IntegrationMode = 'NLS' | 'NAI';

const App: React.FC = () => {
  const APP_VERSION = "v3.3 COMPACT"; 
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const [pedagogy, setPedagogy] = useState<string>('DEFAULT');
  const [state, setState] = useState<AppState>({
    file: null, subject: '' as SubjectType, grade: '' as GradeType, isProcessing: false, step: 'upload', logs: [],
    config: { insertObjectives: true, insertMaterials: true, insertActivities: true, appendTable: true },
    generatedContent: null, result: null
  });
  const [mode, setMode] = useState<IntegrationMode>('NLS');
  const [userApiKey, setUserApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) { setUserApiKey(savedKey); setIsKeySaved(true); }
  }, []);

  // Tự động cuộn xuống dòng mới nhất trong terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [state.logs]);

  const saveKeyToLocal = () => {
    if (userApiKey.trim()) { 
      localStorage.setItem('gemini_api_key', userApiKey); 
      setIsKeySaved(true); 
      addLog("🔐 Đã kích hoạt bản quyền API."); 
    } else { 
      alert("Vui lòng nhập Key!"); 
    }
  };
   
  const handleEditKey = () => setIsKeySaved(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.docx')) {
      setState(prev => ({ ...prev, file, result: null, generatedContent: null, step: 'upload', logs: [`📂 Đã nạp file: ${file.name}`] }));
    } else { 
      alert("Chỉ hỗ trợ định dạng Word (.docx)!"); 
    }
  };

  const addLog = (msg: string) => { setState(prev => ({ ...prev, logs: [...prev.logs, msg] })); };

  const handleAnalyze = async () => {
    if (!userApiKey.trim()) { alert("Vui lòng nhập API Key!"); return; }
    if (!state.file || !state.subject || !state.grade) { alert("Vui lòng chọn đầy đủ Môn và Khối lớp!"); return; }

    setState(prev => ({ ...prev, isProcessing: true, logs: [`🚀 Khởi động Core ${APP_VERSION}...`] }));

    try {
      const modelName = PEDAGOGY_MODELS[pedagogy as keyof typeof PEDAGOGY_MODELS]?.name || "Linh hoạt";
      addLog(`⚙️ Chiến lược: ${modelName}`);
      addLog(`📚 Môn: ${state.subject} - Khối: ${state.grade}`);
      addLog("🔍 Đang phân tích cấu trúc giáo án...");
      
      const textContext = await extractTextFromDocx(state.file);
      const prompt = createIntegrationTextPrompt(textContext, state.subject, state.grade, mode);
      
      addLog("🧠 AI đang tư duy và thiết kế nội dung...");
      const generatedContent = await generateCompetencyIntegration(prompt, userApiKey);
      addLog(`✓ Hoàn tất thiết kế.`);
      
      setState(prev => ({ ...prev, isProcessing: false, generatedContent, step: 'review' }));
    } catch (error) {
      addLog(`❌ Lỗi: ${error instanceof Error ? error.message : "Không xác định"}`);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleFinalizeAndDownload = async (finalContent: GeneratedNLSContent) => {
    if (!state.file) return;
    setState(prev => ({ ...prev, isProcessing: true, logs: [...prev.logs, "📦 Đang đóng gói file..."] }));
    try {
      const newBlob = await injectContentIntoDocx(state.file, finalContent, mode, addLog);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        step: 'done', 
        result: { fileName: `[NLS-PRO] ${state.file?.name}`, blob: newBlob }, 
        logs: [...prev.logs, "✨ Xuất bản thành công!"] 
      }));
    } catch (error) {
       addLog(`❌ Lỗi đóng gói: ${error instanceof Error ? error.message : "Thất bại"}`);
       setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 pb-10 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                      <Sparkles className="w-4 h-4" />
                  </div>
                  <h1 className="font-bold text-slate-800 text-lg tracking-tight">NLS Integrator <span className="text-indigo-600">Pro</span></h1>
              </div>

              <div className="flex items-center gap-3">
                  {isKeySaved ? (
                      <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-emerald-700 font-bold text-[10px] uppercase">AI Ready</span>
                          <button onClick={handleEditKey} className="ml-1 text-[10px] text-slate-400 hover:text-indigo-600 underline">Đổi Key</button>
                      </div>
                  ) : (
                      <div className="flex gap-2">
                        <input type="password" value={userApiKey} onChange={(e) => setUserApiKey(e.target.value)} placeholder="Nhập API Key..." className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 outline-none w-40 focus:border-indigo-500 transition-colors" />
                        <button onClick={saveKeyToLocal} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">Lưu</button>
                      </div>
                  )}
              </div>
          </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        
        {/* HERO SECTION (MỚI - GIỚI THIỆU PHẦN MỀM) */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-indigo-50/50 relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-50 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-3xl">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wide">GDPT 2018</span>
                        <span className="text-[10px] text-slate-400 font-medium">|</span>
                        <span className="text-[10px] text-slate-500 font-medium">Phiên bản {APP_VERSION}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Trợ lý AI Soạn Giáo án <span className="text-indigo-600">Chuyển đổi số</span>
                    </h2>
                    <p className="text-slate-500 text-xs leading-relaxed max-w-xl">
                        Tự động tích hợp Năng lực số và Công nghệ vào bài dạy. Hỗ trợ đầy đủ các môn học theo định hướng mới nhất của Bộ GD&ĐT.
                    </p>
                </div>
                
                <div className="flex gap-3 shrink-0">
                    <div className="flex flex-col items-center justify-center w-20 h-16 bg-slate-50 rounded-lg border border-slate-100">
                        <Rocket className="w-4 h-4 text-blue-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-600">Tốc độ</span>
                    </div>
                    <div className="flex flex-col items-center justify-center w-20 h-16 bg-slate-50 rounded-lg border border-slate-100">
                        <LayoutTemplate className="w-4 h-4 text-purple-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-600">Chuẩn Form</span>
                    </div>
                    <div className="flex flex-col items-center justify-center w-20 h-16 bg-slate-50 rounded-lg border border-slate-100">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-600">Bảo mật</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: CONTROL CENTER */}
          <div className="lg:col-span-8 space-y-6">
            
            {state.step === 'upload' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                  
                  {/* Card 1: Chế độ */}
                  <div className="col-span-1 md:col-span-2 bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600"><Activity className="w-4 h-4" /></div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-xs uppercase">Chế độ</h3>
                              <p className="text-[10px] text-slate-500">Chọn loại năng lực</p>
                          </div>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-md">
                          <button onClick={() => setMode('NLS')} className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${mode === 'NLS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Năng lực Số</button>
                          <button onClick={() => setMode('NAI')} className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${mode === 'NAI' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Năng lực AI</button>
                      </div>
                  </div>

                  {/* Card 2: Thông tin chuyên môn */}
                  <div className="col-span-1 md:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Thông tin Giáo án</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Môn học</label>
                              <div className="relative group">
                                <select className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:bg-white" value={state.subject} onChange={(e) => setState(prev => ({...prev, subject: e.target.value as SubjectType}))}>
                                    <option value="">-- Chọn môn --</option>
                                    <optgroup label="Môn Bắt buộc">
                                        <option value="Toán">Toán học</option>
                                        <option value="Ngữ Văn">Ngữ Văn</option>
                                        <option value="Tiếng Anh">Tiếng Anh</option>
                                        <option value="Lịch Sử">Lịch Sử</option>
                                        <option value="Giáo dục thể chất">GD Thể chất</option>
                                        <option value="Giáo dục quốc phòng và an ninh">GDQP & AN</option>
                                        <option value="Hoạt động trải nghiệm, hướng nghiệp">HĐ Trải nghiệm</option>
                                    </optgroup>
                                    <optgroup label="Môn Lựa chọn">
                                        <option value="Vật Lí">Vật Lí</option>
                                        <option value="Hóa Học">Hóa Học</option>
                                        <option value="Sinh Học">Sinh Học</option>
                                        <option value="Địa Lí">Địa Lí</option>
                                        <option value="Giáo dục kinh tế và pháp luật">GDKT & PL</option>
                                        <option value="Tin Học">Tin Học</option>
                                        <option value="Công nghệ Công nghiệp">CN (Công nghiệp)</option>
                                        <option value="Công nghệ Nông nghiệp">CN (Nông nghiệp)</option>
                                        <option value="Âm Nhạc">Âm Nhạc</option>
                                        <option value="Mỹ Thuật">Mỹ Thuật</option>
                                    </optgroup>
                                </select>
                                <ChevronRight className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                              </div>
                          </div>

                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Khối lớp</label>
                              <div className="relative group">
                                <select className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:bg-white" value={state.grade} onChange={(e) => setState(prev => ({...prev, grade: e.target.value as GradeType}))}>
                                    <option value="">-- Chọn khối --</option>
                                    <optgroup label="Trung học Phổ thông">
                                        <option value="Lớp 10">Lớp 10</option>
                                        <option value="Lớp 11">Lớp 11</option>
                                        <option value="Lớp 12">Lớp 12</option>
                                    </optgroup>
                                    <optgroup label="Trung học Cơ sở">
                                        <option value="Lớp 6">Lớp 6</option>
                                        <option value="Lớp 7">Lớp 7</option>
                                        <option value="Lớp 8">Lớp 8</option>
                                        <option value="Lớp 9">Lớp 9</option>
                                    </optgroup>
                                </select>
                                <ChevronRight className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                              </div>
                          </div>
                      </div>

                      <div className="space-y-1 pt-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Chiến lược</label>
                          <div className="relative group">
                            <select className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:bg-white" value={pedagogy} onChange={(e) => setPedagogy(e.target.value)}>
                                {Object.entries(PEDAGOGY_MODELS).map(([key, value]) => (
                                    <option key={key} value={key}>{value.name}</option>
                                ))}
                            </select>
                            <ChevronRight className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                          </div>
                          <p className="text-[10px] text-slate-400 italic pl-1 flex items-center gap-1"><Info className="w-3 h-3" /> {PEDAGOGY_MODELS[pedagogy as keyof typeof PEDAGOGY_MODELS]?.desc}</p>
                      </div>
                  </div>

                  {/* Card 3: Upload & Action (ĐÃ THU NHỎ CHIỀU CAO) */}
                  <div className="col-span-1 md:col-span-2">
                      <label className={`relative flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group bg-white ${state.file ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/5'}`}>
                          <div className="flex flex-col items-center justify-center text-center z-10 transition-transform duration-300 group-hover:scale-105">
                              {state.file ? (
                                  <>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-sm"><FileCheck className="w-4 h-4" /></div>
                                        <p className="font-bold text-indigo-900 text-xs">{state.file.name}</p>
                                    </div>
                                  </>
                              ) : (
                                  <>
                                    <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-1 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors"><FileUp className="w-4 h-4" /></div>
                                    <p className="font-bold text-slate-600 text-xs">Chọn giáo án (.docx)</p>
                                  </>
                              )}
                          </div>
                          <input type="file" accept=".docx" className="hidden" onChange={handleFileChange} />
                      </label>

                      <button 
                        disabled={!state.file || state.isProcessing} 
                        onClick={handleAnalyze} 
                        className={`mt-3 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200/50 active:scale-[0.98] ${
                            !state.file || state.isProcessing 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-indigo-500/40 hover:-translate-y-0.5'
                        }`}
                      >
                        {state.isProcessing ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang thiết kế...</>) : (<><Wand2 className="w-4 h-4" /> Kích hoạt AI</>)}
                      </button>
                  </div>
              </div>
            )}

            {/* Smart Editor */}
            {state.step === 'review' && state.generatedContent && (
               <SmartEditor initialContent={state.generatedContent} onConfirm={handleFinalizeAndDownload} onCancel={() => setState(prev => ({ ...prev, step: 'upload', generatedContent: null }))} />
            )}
            
            {/* Result */}
            {state.step === 'done' && state.result && (
              <div className="bg-white rounded-2xl p-8 shadow-xl shadow-emerald-500/10 border border-emerald-100 text-center animate-fade-in-up">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 mx-auto ring-4 ring-emerald-50/50"><Sparkles className="w-8 h-8" /></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Thành công!</h3>
                  <p className="text-slate-500 mb-6 text-xs">Giáo án đã được tích hợp năng lực {mode === 'NAI' ? 'AI' : 'Số'} chuẩn GDPT 2018.</p>
                  
                  <div className="flex justify-center gap-3">
                      <button onClick={() => setState(prev => ({ ...prev, step: 'upload', result: null, generatedContent: null }))} className="px-5 py-2.5 rounded-lg font-bold text-xs text-slate-600 hover:bg-slate-50 border border-slate-200">Làm lại</button>
                      <button onClick={() => { if (state.result) { const url = URL.createObjectURL(state.result.blob); const a = document.createElement('a'); a.href = url; a.download = state.result.fileName; a.click(); } }} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:-translate-y-0.5 transition-all"><Download className="w-4 h-4" /> Tải về ngay</button>
                  </div>
              </div>
            )}
          </div>
          
          {/* RIGHT: LIVE TERMINAL (THU NHỎ & HIỆU ỨNG MỜ) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
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
                   {state.logs.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-700/50">
                        <Cpu className="w-6 h-6 mb-2 opacity-50" />
                        <p className="text-[9px]">Sẵn sàng nhận lệnh...</p>
                     </div>
                   ) : (
                     state.logs.map((log, i) => {
                       // LOGIC LÀM MỜ: Dòng cuối cùng rõ nhất, các dòng trên mờ dần
                       const isLast = i === state.logs.length - 1;
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
                   {state.isProcessing && <div className="w-1 h-2 bg-indigo-500 animate-pulse mt-1 ml-4"></div>}
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
          </div>
        </div>
      </main>
      
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-fade-in-left { animation: fadeInLeft 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;