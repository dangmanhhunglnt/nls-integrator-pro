import React, { useState, useEffect } from 'react';
import { AppState, SubjectType, GradeType, GeneratedNLSContent, IntegrationMode, UserProfile } from './types';
import { generateCompetencyIntegration } from './services/geminiService';
import { injectContentIntoDocx, extractTextFromDocx } from './services/docxManipulator';
import { PEDAGOGY_MODELS } from './utils';
import packageJson from './package.json';

// Import Firebase Auth
import { auth, loginWithGoogle, logoutUser } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Import các components giao diện
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ControlCenter from './components/ControlCenter';
import TerminalSidebar from './components/TerminalSidebar';

const App: React.FC = () => {
  const APP_VERSION = `v${packageJson.version} PRO`; 
  
  // State tài khoản người dùng
  const [user, setUser] = useState<UserProfile | null>(null);

  const [pedagogy, setPedagogy] = useState<string>('DEFAULT');
  const [mode, setMode] = useState<IntegrationMode>('NLS_AI');
  const [userApiKey, setUserApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);

  // Lắng nghe trạng thái đăng nhập Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Đã đăng nhập
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Giáo viên',
          photoURL: firebaseUser.photoURL || '',
          plan: 'FREE',
          usageCount: 0,
          maxUsage: 3
        });
      } else {
        // Chưa đăng nhập / đã đăng xuất
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Xử lý Đăng nhập Google
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Đăng nhập thất bại:", error);
    }
  };

  // Xử lý Đăng xuất
  const handleLogout = async () => {
    await logoutUser();
  };

  const [state, setState] = useState<AppState>({
    file: null, 
    subject: '' as SubjectType, 
    grade: '' as GradeType, 
    isProcessing: false, 
    step: 'upload', 
    logs: [],
    config: { insertObjectives: true, insertMaterials: true, insertActivities: true, appendTable: true },
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
      addLog("🔐 Đã kích hoạt bản quyền API."); 
    } else { 
      alert("Vui lòng nhập Key!"); 
    }
  };
    
  const handleEditKey = () => setIsKeySaved(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.docx')) {
      setState(prev => ({ 
        ...prev, 
        file, 
        result: null, 
        generatedContent: null, 
        step: 'upload', 
        logs: [`📂 Đã nạp file: ${file.name}`] 
      }));
    } else { 
      alert("Chỉ hỗ trợ định dạng Word (.docx)!"); 
    }
  };

  const addLog = (msg: string) => { 
    setState(prev => ({ ...prev, logs: [...prev.logs, msg] })); 
  };

  const handleAnalyze = async () => {
    if (!userApiKey.trim()) { 
      alert("Vui lòng nhập API Key!"); 
      return; 
    }
    if (!state.file || !state.subject || !state.grade) { 
      alert("Vui lòng chọn đầy đủ Môn và Khối lớp!"); 
      return; 
    }

    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      logs: [`🚀 Khởi động Core ${APP_VERSION}...`] 
    }));

    try {
      const modelName = PEDAGOGY_MODELS[pedagogy as keyof typeof PEDAGOGY_MODELS]?.name || "Linh hoạt";
      addLog(`⚙️ Chiến lược: ${modelName}`);
      addLog(`📚 Môn: ${state.subject} - Khối: ${state.grade}`);
      addLog("🔍 Đang phân tích cấu trúc giáo án...");
      
      const textContext = await extractTextFromDocx(state.file);
            
      addLog("🧠 AI đang tư duy và thiết kế nội dung...");
      const generatedContent = await generateCompetencyIntegration(
        textContext,
        state.subject,
        state.grade,
        mode,
        userApiKey
      );
      addLog(`✓ Hoàn tất thiết kế.`);
      
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        generatedContent, 
        step: 'review' 
      }));
    } catch (error) {
      addLog(`❌ Lỗi: ${error instanceof Error ? error.message : "Không xác định"}`);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleFinalizeAndDownload = async (finalContent: GeneratedNLSContent) => {
    if (!state.file) return;
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      logs: [...prev.logs, "📦 Đang đóng gói file..."] 
    }));
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
      
      {/* HEADER COMPONENT */}
      <Header 
        userApiKey={userApiKey}
        setUserApiKey={setUserApiKey}
        isKeySaved={isKeySaved}
        saveKeyToLocal={saveKeyToLocal}
        handleEditKey={handleEditKey}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenPricing={() => alert("Màn hình Nâng cấp gói cước Pro sẽ mở trong bước tiếp theo!")}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        
        {/* HERO SECTION COMPONENT */}
        <HeroSection appVersion={APP_VERSION} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: CONTROL CENTER COMPONENT */}
          <div className="lg:col-span-8 space-y-6">
            <ControlCenter 
              state={state}
              setState={setState}
              mode={mode}
              setMode={setMode}
              pedagogy={pedagogy}
              setPedagogy={setPedagogy}
              handleFileChange={handleFileChange}
              handleAnalyze={handleAnalyze}
              handleFinalizeAndDownload={handleFinalizeAndDownload}
            />
          </div>
          
          {/* RIGHT: TERMINAL & AUTHOR SIDEBAR COMPONENT */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
             <TerminalSidebar logs={state.logs} isProcessing={state.isProcessing} />
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