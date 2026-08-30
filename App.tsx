import React, { useState, useEffect } from 'react';
import { AppState, SubjectType, GradeType, GeneratedNLSContent, IntegrationMode, IntegrationLevel, OutputFormat, HighlightColor, UserProfile } from './types';
import { generateCompetencyIntegration } from './services/geminiService';
import { injectContentIntoDocx, createAppendixDocx, extractTextFromDocx, createZipFromBlobs } from './services/docxManipulator';
import { PEDAGOGY_MODELS } from './utils';
import packageJson from './package.json';

// Import Supabase Client để quản lý Auth & Đếm lượt dùng
import { supabase } from './config/supabaseClient';

// Import các components giao diện
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ControlCenter from './components/ControlCenter';
import TerminalSidebar from './components/TerminalSidebar';
import { PricingModal } from './components/PricingModal';

const App: React.FC = () => {
  const APP_VERSION = `v${packageJson.version} PRO`; 
  
  // State tài khoản người dùng
  const [user, setUser] = useState<UserProfile | null>(null);

  // State quản lý hiển thị Modal Nâng cấp / Thanh toán
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);

  const [pedagogy, setPedagogy] = useState<string>('DEFAULT');
  const [mode, setMode] = useState<IntegrationMode>('NLS_AI');
  const [level, setLevel] = useState<IntegrationLevel>('STANDARD');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('INJECT_DIRECT');
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('FF0000');
  const [userApiKey, setUserApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);

  // 1. Hàm lấy Profile và số lượt dùng thực tế từ Supabase
  const fetchUserProfile = async (userId: string, email: string, displayName: string, photoURL: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setUser({
          uid: userId,
          email: email,
          displayName: data.full_name || displayName || 'Giáo viên',
          photoURL: photoURL || '',
          plan: data.role === 'pro' ? 'PRO' : 'FREE',
          usageCount: data.usage_count || 0,
          maxUsage: data.max_usage || 3
        });
      } else {
        // Dự phòng nếu chưa có profile trong bảng
        setUser({
          uid: userId,
          email: email,
          displayName: displayName || 'Giáo viên',
          photoURL: photoURL || '',
          plan: 'FREE',
          usageCount: 0,
          maxUsage: 3
        });
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin profile:", err);
    }
  };

  // 2. Lắng nghe trạng thái đăng nhập Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
      if (data?.session?.user) {
        const u = data.session.user;
        fetchUserProfile(u.id, u.email || '', u.user_metadata?.full_name || '', u.user_metadata?.avatar_url || '');
      } else {
        setUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        const u = session.user;
        fetchUserProfile(u.id, u.email || '', u.user_metadata?.full_name || '', u.user_metadata?.avatar_url || '');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Xử lý Đăng nhập Google qua Supabase
  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Đăng nhập thất bại:", error);
      alert("Đăng nhập thất bại, vui lòng thử lại!");
    }
  };

  // Xử lý Đăng xuất
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const [state, setState] = useState<AppState>({
    file: null, 
    files: [], // Khắc phục lỗi thiếu trường files của AppState
    subject: '' as SubjectType, 
    grade: '' as GradeType, 
    isProcessing: false, 
    step: 'upload', 
    logs: [],
    config: { insertObjectives: true, insertMaterials: true, insertActivities: true, appendTable: true },
    highlightColor: 'FF0000',
    generatedContent: null, 
    result: null
  });

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) { 
      setUserApiKey(savedKey); 
      setIsKeySaved(true); 
    }
  }, []);

  const saveKeyToLocal = () => {
    if (userApiKey.trim()) { 
      localStorage.setItem('gemini_api_key', userApiKey); 
      setIsKeySaved(true); 
      addLog("🔐 Đã kích hoạt bản quyền API cá nhân."); 
    } else { 
      localStorage.removeItem('gemini_api_key');
      setUserApiKey('');
      setIsKeySaved(false); 
      addLog("⚡ Chuyển sang chế độ Dùng thử hệ thống."); 
    }
  };
    
  const handleEditKey = () => setIsKeySaved(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(f => f.name.endsWith('.docx'));
    if (selectedFiles.length > 0) {
      setState(prev => ({ 
        ...prev, 
        files: selectedFiles,
        file: selectedFiles[0], 
        result: null, 
        generatedContent: null, 
        step: 'upload', 
        logs: selectedFiles.length > 1 
          ? [`📂 Đã nạp hàng loạt ${selectedFiles.length} file giáo án.`] 
          : [`📂 Đã nạp file: ${selectedFiles[0].name}`] 
      }));
    } else { 
      alert("Chỉ hỗ trợ định dạng Word (.docx)!"); 
    }
  };

  const addLog = (msg: string) => { 
    setState(prev => ({ ...prev, logs: [...prev.logs, msg] })); 
  };

  // 3. Hàm phân tích giáo án & Hỗ trợ Xử lý hàng loạt (Batch Processing)
  const handleAnalyze = async () => {
    const targetFiles = state.files && state.files.length > 0 ? state.files : (state.file ? [state.file] : []);

    if (targetFiles.length === 0 || !state.subject || !state.grade) { 
      alert("Vui lòng chọn đầy đủ Môn, Khối lớp và File giáo án!"); 
      return; 
    }

    // 1. Kiểm tra tài khoản
    if (!user) {
      alert("Vui lòng Đăng nhập tài khoản Google để tiếp tục!");
      handleLogin();
      return;
    }

    // 2. Kiểm tra hạn mức nếu là tài khoản Free -> Tự mở modal bảng giá nạp tiền
    if (user.plan !== 'PRO' && (user.usageCount + targetFiles.length) > user.maxUsage) {
      setIsPricingOpen(true);
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      logs: [`🚀 Khởi động Core ${APP_VERSION}...`] 
    }));

    const modelName = PEDAGOGY_MODELS[pedagogy as keyof typeof PEDAGOGY_MODELS]?.name || "Linh hoạt";
    addLog(`⚙️ Chiến lược: ${modelName}`);
    addLog(`📚 Môn: ${state.subject} - Khối: ${state.grade}`);
    addLog(`🎯 Mức độ: ${level === 'INTENSIVE' ? 'Chuyên sâu (Thao giảng)' : 'Tiêu chuẩn (Lên lớp)'}`);
    addLog(`🎨 Màu chữ chèn: ${highlightColor === 'FF0000' ? 'Đỏ' : highlightColor === '1D4ED8' ? 'Xanh đậm' : 'Đen'}`);

    try {
      // TRƯỜNG HỢP 1: XỬ LÝ 1 FILE ĐƠN LẺ -> Cho phép xem lại (Smart Editor)
      if (targetFiles.length === 1) {
        const currentFile = targetFiles[0];
        addLog(`🔍 Đang phân tích cấu trúc giáo án: ${currentFile.name}...`);
        const textContext = await extractTextFromDocx(currentFile);
              
        addLog("🧠 AI đang tư duy và thiết kế nội dung...");
        const generatedContent = await generateCompetencyIntegration(
          textContext,
          state.subject,
          state.grade,
          mode,
          userApiKey,
          level
        );
        addLog(`✓ Hoàn tất thiết kế.`);

        // 3. Tự động tăng và lưu số lượt vào Supabase nếu là FREE
        if (user.plan !== 'PRO') {
          const nextUsage = (user.usageCount || 0) + 1;
          
          await supabase
            .from('profiles')
            .upsert({ 
              id: user.uid, 
              email: user.email, 
              full_name: user.displayName,
              usage_count: nextUsage,
              max_usage: user.maxUsage,
              role: (user.plan as string) === 'PRO' ? 'pro' : 'free'
            });
          
          setUser(prev => prev ? ({ ...prev, usageCount: nextUsage }) : null);
          addLog(`⚡ Đã sử dụng lượt: ${nextUsage}/${user.maxUsage}`);
        }
        
        setState(prev => ({ 
          ...prev, 
          isProcessing: false, 
          generatedContent, 
          step: 'review' 
        }));
        return;
      }

      // TRƯỜNG HỢP 2: XỬ LÝ HÀNG LOẠT (BATCH PROCESSING) -> Tự động chạy tuần tự & nén ZIP
      addLog(`⚡ Bắt đầu tiến trình xử lý hàng loạt ${targetFiles.length} file...`);
      const outputBlobs: { name: string; blob: Blob }[] = [];

      for (let i = 0; i < targetFiles.length; i++) {
        const fileItem = targetFiles[i];
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog(`[${i + 1}/${targetFiles.length}] Đang xử lý: ${fileItem.name}`);
        
        const fileText = await extractTextFromDocx(fileItem);
        const itemContent = await generateCompetencyIntegration(
          fileText,
          state.subject,
          state.grade,
          mode,
          userApiKey,
          level
        );

        let finalBlob: Blob;
        let outName: string;

        if (outputFormat === 'APPENDIX_ONLY') {
          finalBlob = await createAppendixDocx(itemContent, state.subject, state.grade, mode);
          outName = `[Phụ lục NLS-AI] ${fileItem.name}`;
        } else {
          finalBlob = await injectContentIntoDocx(fileItem, itemContent, mode, addLog, highlightColor);
          outName = `[NLS-PRO] ${fileItem.name}`;
        }

        outputBlobs.push({ name: outName, blob: finalBlob });
        addLog(`✓ Đã hoàn thành [${i + 1}/${targetFiles.length}]: ${fileItem.name}`);
      }

      // Đóng gói thành 1 file ZIP duy nhất
      addLog(`📦 Đang nén ${outputBlobs.length} file vào tệp ZIP...`);
      const zipBlob = await createZipFromBlobs(outputBlobs);
      const zipFileName = `[NLS-PRO-BATCH] Bo_giao_an_tich_hop_${state.subject}_${state.grade}.zip`;

      if (user.plan !== 'PRO') {
        const nextUsage = (user.usageCount || 0) + targetFiles.length;
        await supabase
          .from('profiles')
          .upsert({ 
            id: user.uid, 
            email: user.email, 
            full_name: user.displayName,
            usage_count: nextUsage,
            max_usage: user.maxUsage,
            role: (user.plan as string) === 'PRO' ? 'pro' : 'free'
          });
        setUser(prev => prev ? ({ ...prev, usageCount: nextUsage }) : null);
        addLog(`⚡ Đã sử dụng lượt: ${nextUsage}/${user.maxUsage}`);
      }

      addLog(`✨ Đã đóng gói thành công tệp ZIP!`);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        step: 'done',
        result: { fileName: zipFileName, blob: zipBlob }
      }));

    } catch (error) {
      addLog(`❌ Lỗi: ${error instanceof Error ? error.message : "Không xác định"}`);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // 4. Hàm đóng gói và xuất bản file Word (Chèn trực tiếp hoặc Xuất phụ lục riêng)
  const handleFinalizeAndDownload = async (finalContent: GeneratedNLSContent) => {
    if (!state.file) return;
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      logs: [...prev.logs, "📦 Đang đóng gói file..."] 
    }));
    try {
      let newBlob: Blob;
      let outputFileName: string;

      if (outputFormat === 'APPENDIX_ONLY') {
        newBlob = await createAppendixDocx(finalContent, state.subject, state.grade, mode);
        outputFileName = `[Phụ lục NLS-AI] ${state.file.name}`;
      } else {
        newBlob = await injectContentIntoDocx(state.file, finalContent, mode, addLog, highlightColor);
        outputFileName = `[NLS-PRO] ${state.file.name}`;
      }

      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        step: 'done', 
        result: { fileName: outputFileName, blob: newBlob }, 
        logs: [...prev.logs, "✨ Xuất bản thành công!"] 
      }));
    } catch (error) {
       addLog(`❌ Lỗi đóng gói: ${error instanceof Error ? error.message : "Thất bại"}`);
       setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col justify-between overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 1. HEADER COMPONENT */}
      <div>
        <Header 
          userApiKey={userApiKey}
          setUserApiKey={setUserApiKey}
          isKeySaved={isKeySaved}
          saveKeyToLocal={saveKeyToLocal}
          handleEditKey={handleEditKey}
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onOpenPricing={() => setIsPricingOpen(true)}
        />

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          
          {/* 2. HERO SECTION COMPONENT */}
          <HeroSection appVersion={APP_VERSION} />

          {/* 3. MAIN WORKSPACE GRID: Cân bằng tỷ lệ 7/5 giúp 2 cột đều và đẹp hơn */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* LEFT: CONTROL CENTER COMPONENT */}
            <div className="lg:col-span-7 space-y-6">
              <ControlCenter 
                state={state}
                setState={setState}
                mode={mode}
                setMode={setMode}
                level={level}
                setLevel={setLevel}
                outputFormat={outputFormat}
                setOutputFormat={setOutputFormat}
                highlightColor={highlightColor}
                setHighlightColor={setHighlightColor}
                pedagogy={pedagogy}
                setPedagogy={setPedagogy}
                handleFileChange={handleFileChange}
                handleAnalyze={handleAnalyze}
                handleFinalizeAndDownload={handleFinalizeAndDownload}
              />
            </div>
            
            {/* RIGHT: TERMINAL & AUTHOR SIDEBAR COMPONENT (Bám dính mượt mà) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
               <TerminalSidebar logs={state.logs} isProcessing={state.isProcessing} />
            </div>
          </div>
        </main>
      </div>

      <footer className="mt-20 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md pt-10 pb-8">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
    
    {/* Khối 3 Card chức năng */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
      {/* Card 1: Bản quyền & Tác giả */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none">
            NLS
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white">NLS Integrator Pro</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">v2.6</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Trợ lý AI Tích hợp Giáo án Chuẩn GDPT 2018</p>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
          Tác giả: <span className="font-semibold text-slate-800 dark:text-slate-200">Đặng Mạnh Hùng</span> (THPT Lý Nhân Tông)
        </div>
      </div>

      {/* Card 2: Chuẩn quy định & Nâng cấp */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200/70 dark:border-indigo-800/50 shadow-sm flex flex-col justify-between items-center text-center space-y-3">
        <button
          type="button"
          onClick={() => setIsPricingOpen(true)}
          className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs shadow-md shadow-indigo-200 dark:shadow-none transition hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>💎</span> Mở khóa Gói Bản Quyền & Nạp Lượt
        </button>
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>CV 2345 (Tiểu học) &bull; CV 5512 (Trung học) &bull; TT 02/2025</span>
        </div>
      </div>

      {/* Card 3: Hotline & Zalo hỗ trợ */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hỗ trợ kỹ thuật</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Trực tuyến 24/7
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://zalo.me/0978386357"
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>💬</span> Nhắn Zalo
          </a>
          <a
            href="tel:0978386357"
            className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition"
          >
            📞 097 8386 357
          </a>
        </div>
      </div>

    </div>

    {/* Dòng bản quyền cuối */}
    <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[11px] text-slate-400 dark:text-slate-500">
      <span>© 2026 NLS Integrator Pro. Nền tảng tự động hóa tích hợp Năng lực số & AI giáo dục hàng đầu.</span>
      <span className="text-[10px] bg-slate-200/60 dark:bg-slate-800/60 px-2 py-0.5 rounded text-slate-500">Bảo mật thiết bị 1:1</span>
    </div>

  </div>
</footer>

      {/* POPUP BẢNG GIÁ & NẠP TIỀN VIETQR */}
      <PricingModal 
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        userEmail={user?.email}
        onSuccessUpgrade={() => {
          if (user?.uid) {
            fetchUserProfile(user.uid, user.email || '', user.displayName, user.photoURL);
          }
        }}
      />
      
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