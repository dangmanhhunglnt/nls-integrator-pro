import React, { useState, useEffect, useMemo } from 'react';
import { AppState, SubjectType, GradeType, GeneratedNLSContent, IntegrationMode, IntegrationLevel, OutputFormat, HighlightColor, UserProfile } from './types';
import { generateCompetencyIntegration } from './services/geminiService';
import { injectContentIntoDocx, createAppendixDocx, extractTextFromDocx, createZipFromBlobs } from './services/docxManipulator';
import { PEDAGOGY_MODELS, getDeviceId } from './utils';
import packageJson from './package.json';

import { Sparkles, ShieldAlert, Cpu, CheckCircle, Activity, Layers, Zap } from 'lucide-react';
import { supabase } from './config/supabaseClient';

import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ControlCenter from './components/ControlCenter';
import { PricingModal } from './components/PricingModal';

function formatCleanFilenamePart(str: string): string {
  return (str || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
}

const App: React.FC = () => {
  const APP_VERSION = `v${packageJson.version} PRO`; 

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [pedagogy, setPedagogy] = useState<string>('DEFAULT');
  const [mode, setMode] = useState<IntegrationMode>('NLS_AI');
  const [stemTopic, setStemTopic] = useState<string>(''); 
  const [level, setLevel] = useState<IntegrationLevel>('STANDARD');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('INJECT_DIRECT');
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('FF0000');
  const [userApiKey, setUserApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [ppctFile, setPpctFile] = useState<File | null>(null);

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

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      alert("Đăng nhập thất bại, vui lòng thử lại!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    const autoSyncLicenseAndBindDevice = async () => {
      const savedCode = localStorage.getItem('USER_LICENSE_CODE') || localStorage.getItem('nls_license_key');
      const savedPlan = localStorage.getItem('USER_PLAN_TYPE') || localStorage.getItem('nls_plan_type');

      if (savedPlan === 'PRO' || (savedCode && savedCode.startsWith('NLS-VIP-'))) {
        setUser(prev => prev ? ({ ...prev, plan: 'PRO', maxUsage: 9999 }) : prev);
      }

      if (!savedCode) return;

      try {
        const deviceId = await getDeviceId();
        const cleanCode = savedCode.trim().toUpperCase();
        const { data: license } = await supabase.from('licenses').select('bound_device_id').eq('code', cleanCode).maybeSingle();
        if (license && !license.bound_device_id) {
          await supabase.from('licenses').update({ bound_device_id: deviceId, activated_at: new Date().toISOString() }).eq('code', cleanCode);
        }
      } catch (err) {
        console.warn('Lỗi tự động khóa máy:', err);
      }
    };
    autoSyncLicenseAndBindDevice();
  }, [user?.uid]);

  const [state, setState] = useState<AppState>({
    file: null, 
    files: [], 
    subject: '' as SubjectType, 
    grade: '' as GradeType, 
    lessonCategory: 'MAIN',
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(f => f.name.endsWith('.docx'));
    if (selectedFiles.length > 0) {
      setState(prev => ({ 
        ...prev, 
        files: selectedFiles,
        file: selectedFiles[0], 
        result: null, 
        generatedContent: null, 
        step: 'upload', 
        logs: [`📂 Đã nạp file giáo án: ${selectedFiles[0].name}`] 
      }));
    } else { 
      alert("Chỉ hỗ trợ định dạng Word (.docx)!"); 
    }
  };

  const handlePpctFileChange = (file: File | null) => {
    setPpctFile(file);
    if (file) {
      addLog(`📋 Đã nạp File Phân phối chương trình: ${file.name}`);
    } else {
      addLog(`📋 Đã gỡ File Phân phối chương trình.`);
    }
  };

  const addLog = (msg: string) => { 
    setState(prev => ({ ...prev, logs: [...prev.logs, msg] })); 
  };

  const fileCount = state.file ? 1 : 0;

  const pedagogicalEvaluation = useMemo(() => {
    if (fileCount === 0 && !state.subject) return null;
    const fileName = (state.file?.name.toLowerCase() || '');
    const subject = (state.subject || '').toLowerCase();
    const query = `${fileName} ${subject}`;

    const isPracticeOrDrill = query.includes('luyện tập') || query.includes('thực hành') || query.includes('ôn tập');
    const isSpatialOrSimulation = query.includes('không gian') || query.includes('hình học') || query.includes('đồ thị') || query.includes('lượng giác');
    const isDataOrAI = query.includes('thống kê') || query.includes('xác suất') || query.includes('tin học');

    if (isPracticeOrDrill && !isSpatialOrSimulation && !isDataOrAI) {
      return {
        status: "KHÔNG NÊN GƯỢNG ÉP NĂNG LỰC SỐ / AI",
        badgeColor: "bg-amber-50/90 border-amber-200 text-amber-900",
        icon: <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />,
        tool: "Bảng phấn, Giấy vở, Phiếu in trực tiếp",
        action: "Tập trung rèn kỹ năng biến đổi, thao tác tay và tư duy chiều sâu.",
        recommendedLevel: "STANDARD"
      };
    }

    if (isSpatialOrSimulation) {
      return {
        status: "BẮT BUỘC TÍCH HỢP NĂNG LỰC SỐ (MÔ PHỎNG TRỰC QUAN)",
        badgeColor: "bg-blue-50/90 border-blue-200 text-blue-900",
        icon: <Cpu className="w-5 h-5 text-blue-600 shrink-0" />,
        tool: "GeoGebra 3D, PhET Simulations, Phần mềm mô phỏng hình học",
        action: "Chèn vào Hoạt động Khám phá & Hình thành kiến thức.",
        recommendedLevel: "INTENSIVE"
      };
    }

    if (isDataOrAI) {
      return {
        status: "TÍCH HỢP NĂNG LỰC SỐ & TRỢ LÝ AI (XỬ LÝ DỮ LIỆU)",
        badgeColor: "bg-purple-50/90 border-purple-200 text-purple-900",
        icon: <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />,
        tool: "Bảng tính Excel/Google Sheets, Công cụ phân tích AI",
        action: "Chèn vào Hoạt động Luyện tập & Vận dụng.",
        recommendedLevel: "INTENSIVE"
      };
    }

    return {
      status: "TÍCH HỢP MỨC HỖ TRỢ TRÌNH CHIẾU THỰC CHẤT",
      badgeColor: "bg-emerald-50/90 border-emerald-200 text-emerald-900",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
      tool: "Slide trình chiếu, Phiếu học tập số",
      action: "Chèn câu hỏi tương tác mở đầu hoặc củng cố.",
      recommendedLevel: "STANDARD"
    };
  }, [state.file, state.subject, fileCount]);

  useEffect(() => {
    if (pedagogicalEvaluation?.recommendedLevel) {
      setLevel(pedagogicalEvaluation.recommendedLevel as IntegrationLevel);
    }
  }, [pedagogicalEvaluation]);

  const handleAnalyze = async () => {
    if (!state.file || !state.subject || !state.grade) { 
      alert("Vui lòng chọn đầy đủ Môn, Khối lớp và File giáo án!"); 
      return; 
    }

    if (!user) {
      alert("Vui lòng Đăng nhập tài khoản Google để tiếp tục!");
      handleLogin();
      return;
    }

    const hasLocalLicense = typeof window !== 'undefined' && (
      localStorage.getItem('USER_PLAN_TYPE') === 'PRO' ||
      localStorage.getItem('nls_plan_type') === 'PRO' ||
      Boolean(localStorage.getItem('USER_LICENSE_CODE')) ||
      Boolean(localStorage.getItem('nls_license_key'))
    );

    const isAccountPro = user.plan === 'PRO' || hasLocalLicense;

    if (!isAccountPro && user.usageCount >= user.maxUsage) {
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
    addLog(`📚 Môn: ${state.subject} | Khối: ${state.grade}`);
    addLog(`🎨 Màu chữ chèn: ${highlightColor === 'FF0000' ? 'Đỏ' : highlightColor === '1D4ED8' ? 'Xanh đậm' : 'Đen'}`);

    try {
      const isChuyenDe = state.lessonCategory === 'CHUYEN_DE' || 
                         Boolean(state.file.name.toLowerCase().includes('cdht') || state.file.name.toLowerCase().includes('chuyen de'));

      const gradeNum = (state.grade || '11').replace(/\D/g, '');
      const subjectPrefix = isChuyenDe 
        ? `CD${gradeNum}` 
        : formatCleanFilenamePart(`${state.subject || 'Mon'}${state.grade || ''}`);

      if (ppctFile) {
        addLog(`📋 Đang đọc và đối chiếu file PPCT: ${ppctFile.name}...`);
        
        const { parsePPCTDocument, processSingleLessonFromPPCT } = await import('./services/ppctParser');
        const ppctRows = await parsePPCTDocument(ppctFile);

        const currentLessonRawName = state.selectedLessonManual || state.file.name.replace(/\.docx$/i, '');
        addLog(`🎯 Đang xử lý bài học theo lựa chọn: "${currentLessonRawName}"...`);

        const generatedFiles = await processSingleLessonFromPPCT(
          ppctRows,
          currentLessonRawName,
          state.file,
          state.subject,
          state.grade,
          highlightColor,
          async (lessonTitle, targetMode) => {
            const textContext = await extractTextFromDocx(state.file!);
            return await generateCompetencyIntegration(
              textContext,
              state.subject,
              state.grade,
              targetMode,
              userApiKey,
              level,
              lessonTitle
            );
          }
        );

        addLog(`📦 Đã đóng gói thành công ${generatedFiles.length} file cho bài học này!`);
        
        let finalResult: { fileName: string; blob: Blob };
        if (generatedFiles.length === 1 && generatedFiles[0]) {
          finalResult = { fileName: generatedFiles[0].name, blob: generatedFiles[0].blob };
        } else {
          const zipBlob = await createZipFromBlobs(generatedFiles);
          finalResult = { fileName: `[NLS-PRO-BÀI]_${subjectPrefix}_${formatCleanFilenamePart(currentLessonRawName)}.zip`, blob: zipBlob };
        }

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
        }

        setState(prev => ({ 
          ...prev, 
          isProcessing: false, 
          step: 'done', 
          result: { fileName: finalResult.fileName, blob: finalResult.blob },
          logs: [...prev.logs, `✨ Hoàn thành xuất bản bài học theo PPCT cực kỳ nhanh chóng!`]
        }));
        return;
      }

      const currentFile = state.file;
      addLog(`🔍 Phân tích cấu trúc giáo án: ${currentFile.name}...`);
      const textContext = await extractTextFromDocx(currentFile);

      let effectiveMode = (!mode && Boolean(stemTopic)) ? 'STEM' : (mode || 'STEM');

      addLog(`🎯 Chế độ: ${effectiveMode}`);
      addLog("🧠 AI đang phân tích và thiết kế nội dung...");

      const generatedContent = await generateCompetencyIntegration(
        textContext,
        state.subject,
        state.grade,
        effectiveMode as any,
        userApiKey,
        level,
        stemTopic
      );
      addLog(`✓ Hoàn tất thiết kế.`);

      const cleanTitle = formatCleanFilenamePart(currentFile.name.replace(/\.docx$/i, ''));
      const singleFileName = `${subjectPrefix}_${cleanTitle}.docx`;

      const finalBlob = await injectContentIntoDocx(
        currentFile,
        generatedContent,
        effectiveMode as any,
        addLog,
        highlightColor
      );

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
      }

      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        step: 'done', 
        result: { fileName: singleFileName, blob: finalBlob }
      }));

    } catch (error) {
      addLog(`❌ Lỗi: ${error instanceof Error ? error.message : "Không xác định"}`);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleFinalizeAndDownload = async (finalContent: GeneratedNLSContent) => {
    if (!state.file) return;
    const effectiveMode: string = (!mode && Boolean(stemTopic)) ? 'STEM' : (mode || 'STEM');
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      logs: [...prev.logs, "📦 Đang đóng gói file..."] 
    }));
    try {
      let newBlob: Blob;
      let outputFileName: string;

      if (outputFormat === 'APPENDIX_ONLY') {
        newBlob = await createAppendixDocx(finalContent, state.subject, state.grade, effectiveMode as any);
        outputFileName = (effectiveMode as string) === 'STEM' ? `[Phụ lục STEM] ${state.file.name}` : `[Phụ lục NLS-AI] ${state.file.name}`;
      } else {
        newBlob = await injectContentIntoDocx(state.file, finalContent, effectiveMode as any, addLog, highlightColor);
        outputFileName = (effectiveMode as string) === 'STEM' ? `[STEM-PRO] ${state.file.name}` : `[NLS-PRO] ${state.file.name}`;
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
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900">
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
          <HeroSection appVersion={APP_VERSION} />

          {/* BỐ CỤC MASTER - DETAIL CHUẨN SAAS (CỘT TRÁI: NHẬP LIỆU & CẤU HÌNH - CỘT PHẢI: TRẠNG THÁI & MA TRẬN) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
            
            {/* CỘT TRÁI (7 PHẦN): TOÀN BỘ CẤU HÌNH, CHỌN MÔN, TẢI FILE VÀ NÚT XỬ LÝ */}
            <div className="lg:col-span-7 space-y-6">
              <ControlCenter 
                state={state}
                setState={setState}
                mode={mode}
                setMode={setMode}
                stemTopic={stemTopic}
                setStemTopic={setStemTopic}
                level={level}
                setLevel={setLevel}
                outputFormat={outputFormat}
                setOutputFormat={setOutputFormat}
                highlightColor={highlightColor}
                setHighlightColor={setHighlightColor}
                pedagogy={pedagogy}
                setPedagogy={setPedagogy}
                handleFileChange={handleFileChange}
                handlePpctFileChange={handlePpctFileChange}
                handleAnalyze={handleAnalyze}
                handleFinalizeAndDownload={handleFinalizeAndDownload}
              />
            </div>

            {/* CỘT PHẢI (5 PHẦN - STICKY): MA TRẬN ĐỀ XUẤT, TRẠNG THÁI VÀ NHẬT KÝ XỬ LÝ */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
              
              {/* MA TRẬN ĐỀ XUẤT SƯ PHẠM */}
              {pedagogicalEvaluation && (
                <div className={`rounded-2xl p-4.5 border shadow-xs transition-all animate-fade-in-up backdrop-blur-md ${pedagogicalEvaluation.badgeColor}`}>
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-white shadow-2xs mt-0.5">{pedagogicalEvaluation.icon}</div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-white shadow-2xs text-slate-700">
                          Ma trận chuẩn hóa đề xuất
                        </span>
                      </div>
                      <h4 className="text-xs font-black tracking-wide uppercase text-slate-900">
                        {pedagogicalEvaluation.status}
                      </h4>
                      <div className="text-[11px] space-y-1 pt-1 border-t border-slate-200/60">
                        <div>
                          <span className="font-bold text-slate-700">🛠 Học liệu đề xuất: </span> 
                          <span className="font-semibold text-indigo-700">{pedagogicalEvaluation.tool}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700">📍 Hành động: </span> 
                          <span className="text-slate-600">{pedagogicalEvaluation.action}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TRẠNG THÁI HỆ THỐNG & NHẬT KÝ TIẾN TRÌNH */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Trạng thái Xử lý</h3>
                      <p className="text-[11px] text-slate-400">Hệ thống AI chuẩn hóa tự động</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 ${
                    state.isProcessing 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' 
                      : state.result 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${state.isProcessing ? 'bg-amber-500 animate-ping' : state.result ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {state.isProcessing ? 'Đang phân tích...' : state.result ? 'Sẵn sàng tải về' : 'Đang chờ file'}
                  </span>
                </div>

                {state.isProcessing ? (
                  <div className="py-6 text-center space-y-3 animate-fade-in-up">
                    <div className="relative w-12 h-12 mx-auto">
                      <div className="absolute inset-0 rounded-full border-3 border-indigo-100"></div>
                      <div className="absolute inset-0 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">AI Core đang chạy...</h4>
                      <p className="text-[11px] text-slate-500">Giữ nguyên định dạng MathType & chuẩn 5512.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-100 space-y-2">
                      <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Nhật ký hoạt động</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 text-[11px] text-slate-600 font-mono pr-1 custom-scrollbar">
                        {state.logs.length > 0 ? (
                          state.logs.map((log, idx) => (
                            <div key={idx} className="py-0.5 border-b border-slate-200/40 last:border-0 flex items-start gap-1.5">
                              <span className="text-indigo-500 shrink-0 font-bold">›</span>
                              <span className="break-all">{log}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 italic py-2 text-center">
                            Chưa có hoạt động. Hãy tải file và bấm khởi tạo.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* HƯỚNG DẪN TÍCH HỢP CHUYÊN MÔN */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <h4 className="font-extrabold text-xs uppercase tracking-wide text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">💡</span>
                  <span>Định hướng tích hợp chuyên môn</span>
                </h4>
                <div className="text-[11px] text-slate-600 space-y-2 leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span><strong>Mục tiêu:</strong> Bổ sung chuẩn đầu ra NLS (TT 02/2025), Giáo dục AI hoặc Năng lực STEM vào mục II.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span><strong>Học liệu số:</strong> Ưu tiên công cụ trực quan, tuyệt đối không yêu cầu học sinh tạo tài khoản cá nhân.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span><strong>Tiến trình bài dạy:</strong> Thao tác thực chất, đúng tâm lý lứa tuổi và không làm loãng thời lượng tiết học.</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      <footer className="mt-16 border-t border-slate-200/80 bg-white/90 backdrop-blur-md py-4 text-xs text-slate-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-[11px] shadow-xs">
              NLS
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-black text-slate-900 text-xs">NLS Integrator Pro</span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-gradient-to-r from-emerald-500 to-indigo-600 text-white shadow-2xs">v3.0 PRO</span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 hidden sm:inline">Tác giả: <strong className="text-slate-800">Đặng Mạnh Hùng</strong> (THPT Lý Nhân Tông)</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>CV 2345 • CV 5512 • TT 02/2025 • CV 3089 (GD STEM)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsPricingOpen(true)}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <span>💎</span> Mở khóa Gói PRO
            </button>
            <a
              href="https://zalo.me/0978386357"
              target="_blank"
              rel="noreferrer"
              className="py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center gap-1.5 transition"
            >
              💬 Zalo
            </a>
            <a
              href="tel:0978386357"
              className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition"
            >
              📞 097 8386 357
            </a>
          </div>
        </div>
      </footer>

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
        .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;