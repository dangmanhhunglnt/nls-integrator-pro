import React, { useState, useEffect, useMemo } from 'react';
import { AppState, SubjectType, GradeType, GeneratedNLSContent, IntegrationMode, IntegrationLevel, OutputFormat, HighlightColor, UserProfile } from './types';
import { generateCompetencyIntegration } from './services/geminiService';
import { injectContentIntoDocx, createAppendixDocx, extractTextFromDocx, createZipFromBlobs } from './services/docxManipulator';
import { PEDAGOGY_MODELS, getDeviceId } from './utils';
import packageJson from './package.json';

// Import icons cho cột bên phải
import { Sparkles, ShieldAlert, Cpu, BookOpen, CheckCircle } from 'lucide-react';

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
  const [stemTopic, setStemTopic] = useState<string>(''); // Bổ sung state lưu chủ đề STEM
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

  // TỰ ĐỘNG ĐỒNG BỘ: ĐỌC BẢN QUYỀN VÀ KHÓA MÁY VÀO SUPABASE KHI MỞ TRANG
  useEffect(() => {
    const autoSyncLicenseAndBindDevice = async () => {
      const savedCode = localStorage.getItem('USER_LICENSE_CODE') || localStorage.getItem('nls_license_key');
      const savedPlan = localStorage.getItem('USER_PLAN_TYPE') || localStorage.getItem('nls_plan_type');

      // Nếu máy đã lưu key hoặc gói PRO, cập nhật state sang PRO ngay
      if (savedPlan === 'PRO' || (savedCode && savedCode.startsWith('NLS-VIP-'))) {
        setUser(prev => prev ? ({
          ...prev,
          plan: 'PRO',
          maxUsage: 9999
        }) : prev);
      }

      if (!savedCode) return;

      // Gửi deviceId lên Supabase để bảng Admin hiện "Đã khóa máy"
      try {
        const deviceId = await getDeviceId();
        const cleanCode = savedCode.trim().toUpperCase();

        const { data: license } = await supabase
          .from('licenses')
          .select('bound_device_id')
          .eq('code', cleanCode)
          .maybeSingle();

        if (license && !license.bound_device_id) {
          await supabase
            .from('licenses')
            .update({
              bound_device_id: deviceId,
              activated_at: new Date().toISOString()
            })
            .eq('code', cleanCode);
          console.log('✅ Đã tự động ghi nhận khóa máy cho mã:', cleanCode);
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

  // TÍNH TOÁN MA TRẬN PHÂN LOẠI SƯ PHẠM (HIỂN THỊ CỘT PHẢI)
  const fileCount = state.files && state.files.length > 0 ? state.files.length : (state.file ? 1 : 0);

  const pedagogicalEvaluation = useMemo(() => {
    if (fileCount === 0 && !state.subject) return null;

    const fileNames = state.files && state.files.length > 0 
      ? state.files.map(f => f.name.toLowerCase()).join(' ') 
      : (state.file?.name.toLowerCase() || '');
    
    const subject = (state.subject || '').toLowerCase();
    const query = `${fileNames} ${subject}`;

    const isPracticeOrDrill = 
      query.includes('luyện tập') || 
      query.includes('thực hành') || 
      query.includes('rèn kỹ năng') || 
      query.includes('ôn tập') ||
      query.includes('cộng') || 
      query.includes('trừ') || 
      query.includes('nhân') || 
      query.includes('chia') ||
      query.includes('phân số') || 
      query.includes('tính nhẩm') || 
      query.includes('giải phương trình') || 
      query.includes('bất đẳng thức') ||
      query.includes('chính tả') || 
      query.includes('tập đọc') || 
      query.includes('luyện viết') || 
      query.includes('cảm thụ') ||
      query.includes('kể chuyện') ||
      query.includes('thể chất') ||
      query.includes('chạy') ||
      query.includes('đá cầu');

    const isSpatialOrSimulation = 
      query.includes('không gian') || 
      query.includes('hình học') || 
      query.includes('hình chóp') || 
      query.includes('lăng trụ') || 
      query.includes('mặt cầu') || 
      query.includes('vectơ') || 
      query.includes('đồ thị') || 
      query.includes('hàm số') || 
      query.includes('lượng giác') ||
      query.includes('chuyển động') || 
      query.includes('mô phỏng') || 
      query.includes('vũ trụ') || 
      query.includes('quang hợp') ||
      query.includes('nguyên tử');

    const isDataOrAI = 
      query.includes('thống kê') || 
      query.includes('xác suất') || 
      query.includes('mẫu số liệu') || 
      query.includes('biểu đồ') || 
      query.includes('dữ liệu') || 
      query.includes('tin học') || 
      query.includes('thuật toán') || 
      query.includes('lập trình') ||
      query.includes('kinh tế');

    const isSocialOrLanguage = 
      query.includes('lịch sử') || 
      query.includes('địa lí') || 
      query.includes('tiếng anh') || 
      query.includes('tự nhiên và xã hội') || 
      query.includes('văn minh') || 
      query.includes('khoa học');

    if (isPracticeOrDrill && !isSpatialOrSimulation && !isDataOrAI) {
      return {
        status: 'KHÔNG NÊN GƯỢNG ÉP NĂNG LỰC SỐ / AI',
        badgeColor: 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200',
        icon: <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />,
        tool: 'Bảng phấn, Giấy vở, Phiếu in, Thao tác trực tiếp trên đồ dùng thật',
        action: 'Tập trung rèn kỹ năng biến đổi, thao tác tay và tư duy chiều sâu. Không đưa công nghệ vào để tránh làm phân tán học sinh.',
        recommendedLevel: 'STANDARD'
      };
    }

    if (isSpatialOrSimulation) {
      return {
        status: 'BẮT BUỘC TÍCH HỢP NĂNG LỰC SỐ (MÔ PHỎNG TRỰC QUAN)',
        badgeColor: 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200',
        icon: <Cpu className="w-5 h-5 text-blue-600 shrink-0" />,
        tool: 'GeoGebra 3D, PhET Simulations, Phần mềm mô phỏng hình học động',
        action: 'Chèn vào Hoạt động Khám phá & Hình thành kiến thức: Cho học sinh quan sát xoay góc nhìn 3D, thay đổi tham số để tự phát hiện quy luật.',
        recommendedLevel: 'INTENSIVE'
      };
    }

    if (isDataOrAI) {
      return {
        status: 'TÍCH HỢP NĂNG LỰC SỐ & TRỢ LÝ AI (XỬ LÝ DỮ LIỆU)',
        badgeColor: 'bg-purple-50 border-purple-300 text-purple-900 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-200',
        icon: <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />,
        tool: 'Bảng tính Excel/Google Sheets, Công cụ phân tích dữ liệu AI',
        action: 'Chèn vào Hoạt động Luyện tập & Vận dụng: Nhập bảng dữ liệu thực tế, dùng hàm tính các số đặc trưng và biểu diễn bằng biểu đồ trực tuyến.',
        recommendedLevel: 'INTENSIVE'
      };
    }

    if (isSocialOrLanguage) {
      return {
        status: 'TÍCH HỢP HỌC LIỆU SỐ & NỀN TẢNG TƯƠNG TÁC',
        badgeColor: 'bg-cyan-50 border-cyan-300 text-cyan-900 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-200',
        icon: <BookOpen className="w-5 h-5 text-cyan-600 shrink-0" />,
        tool: 'Bản đồ số (Google Earth), Video tư liệu lịch sử, Ứng dụng phát âm AI',
        action: 'Chèn vào Hoạt động Mở đầu & Khám phá: Khai thác tư liệu hình ảnh, lược đồ tương tác số.',
        recommendedLevel: 'STANDARD'
      };
    }

    return {
      status: 'TÍCH HỢP MỨC HỖ TRỢ TRÌNH CHIẾU THỰC CHẤT',
      badgeColor: 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
      tool: 'Slide trình chiếu bài giảng, Phiếu học tập số (Quizizz / Google Form)',
      action: 'Chèn câu hỏi tương tác mở đầu hoặc củng cố cuối bài.',
      recommendedLevel: 'STANDARD'
    };
  }, [state.files, state.file, state.subject, fileCount]);

  useEffect(() => {
    if (pedagogicalEvaluation?.recommendedLevel) {
      setLevel(pedagogicalEvaluation.recommendedLevel as IntegrationLevel);
    }
  }, [pedagogicalEvaluation]);

  // 3. Hàm phân tích giáo án & Hỗ trợ Xử lý hàng loạt (Batch Processing)
  const handleAnalyze = async () => {
    const targetFiles = state.files && state.files.length > 0 ? state.files : (state.file ? [state.file] : []);

    if (targetFiles.length === 0 || !state.subject || !state.grade) { 
      alert("Vui lòng chọn đầy đủ Môn, Khối lớp và File giáo án!"); 
      return; 
    }

    // Chế độ thực tế: nếu tắt các nút NLS và có stemTopic thì chạy 'STEM'
    const effectiveMode: string = (!mode && Boolean(stemTopic)) ? 'STEM' : (mode || 'STEM');
    if (!mode && !stemTopic) {
      alert("Vui lòng chọn ít nhất một chế độ tích hợp (NLS, AI hoặc STEM)!");
      return;
    }

    // 1. Kiểm tra tài khoản
    if (!user) {
      alert("Vui lòng Đăng nhập tài khoản Google để tiếp tục!");
      handleLogin();
      return;
    }

    // 2. Kiểm tra bản quyền PRO (từ Supabase hoặc mã đã kích hoạt trên máy)
    const hasLocalLicense = typeof window !== 'undefined' && (
      localStorage.getItem('USER_PLAN_TYPE') === 'PRO' ||
      localStorage.getItem('nls_plan_type') === 'PRO' ||
      Boolean(localStorage.getItem('USER_LICENSE_CODE')) ||
      Boolean(localStorage.getItem('nls_license_key'))
    );

    const isAccountPro = user.plan === 'PRO' || hasLocalLicense;

    // Nếu không phải PRO và hết hạn mức -> Mới hiện bảng nạp tiền
    if (!isAccountPro && (user.usageCount + targetFiles.length) > user.maxUsage) {
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
    addLog(`🎯 Chế độ: ${effectiveMode === 'STEM' ? 'Chỉ Giáo dục STEM' : effectiveMode}${stemTopic ? ` (STEM: ${stemTopic})` : ''}`);
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
          effectiveMode as any,
          userApiKey,
          level,
          stemTopic
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
          effectiveMode as any,
          userApiKey,
          level,
          stemTopic
        );

        let finalBlob: Blob;
        let outName: string;

        if (outputFormat === 'APPENDIX_ONLY') {
          finalBlob = await createAppendixDocx(itemContent, state.subject, state.grade, effectiveMode as any);
          outName = effectiveMode === 'STEM' ? `[Phụ lục STEM] ${fileItem.name}` : `[Phụ lục NLS-AI] ${fileItem.name}`;
        } else {
          finalBlob = await injectContentIntoDocx(fileItem, itemContent, effectiveMode as any, addLog, highlightColor);
          outName = effectiveMode === 'STEM' ? `[STEM-PRO] ${fileItem.name}` : `[NLS-PRO] ${fileItem.name}`;
        }

        outputBlobs.push({ name: outName, blob: finalBlob });
        addLog(`✓ Đã hoàn thành [${i + 1}/${targetFiles.length}]: ${fileItem.name}`);
      }

      // Đóng gói thành 1 file ZIP duy nhất
      addLog(`📦 Đang nén ${outputBlobs.length} file vào tệp ZIP...`);
      const zipBlob = await createZipFromBlobs(outputBlobs);
      const zipFileName = `[NLS-PRO-BATCH] Bo_giao_an_${effectiveMode === 'STEM' ? 'STEM' : 'tich_hop'}_${state.subject}_${state.grade}.zip`;

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
        outputFileName = effectiveMode === 'STEM' ? `[Phụ lục STEM] ${state.file.name}` : `[Phụ lục NLS-AI] ${state.file.name}`;
      } else {
        newBlob = await injectContentIntoDocx(state.file, finalContent, effectiveMode as any, addLog, highlightColor);
        outputFileName = effectiveMode === 'STEM' ? `[STEM-PRO] ${state.file.name}` : `[NLS-PRO] ${state.file.name}`;
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

          {/* 3. MAIN WORKSPACE GRID: CHIA TỶ LỆ CÂN ĐỐI 6 : 6 (50% - 50%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: CONTROL CENTER COMPONENT (6 PHẦN) */}
            <div className="lg:col-span-6 space-y-6">
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
                handleAnalyze={handleAnalyze}
                handleFinalizeAndDownload={handleFinalizeAndDownload}
              />
            </div>
            
            {/* RIGHT COLUMN: GIÁM SÁT SƯ PHẠM, LOADER VÀ CONSOLE LOG (6 PHẦN) */}
            <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-20">
              
              {/* BẢNG ĐÁNH GIÁ SƯ PHẠM: TỰ ĐỘNG HIỆN Ở CỘT PHẢI KHI CHỌN MÔN/FILE */}
              {pedagogicalEvaluation && (
                <div className={`rounded-2xl p-4.5 border shadow-sm transition-all animate-fade-in-up ${pedagogicalEvaluation.badgeColor}`}>
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">{pedagogicalEvaluation.icon}</div>
                        <div className="flex-1 space-y-2">
                            <h4 className="text-xs font-black tracking-wide uppercase">
                                {pedagogicalEvaluation.status}
                            </h4>
                            
                            <div className="text-[11px] grid grid-cols-1 gap-1.5 pt-1.5 border-t border-black/5 dark:border-white/5">
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">🛠 Công cụ / Học liệu: </span> 
                                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">{pedagogicalEvaluation.tool}</span>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">📍 Khuyến nghị triển khai: </span> 
                                    <span className="text-slate-700 dark:text-slate-300">{pedagogicalEvaluation.action}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {/* TRẠNG THÁI: KHI AI ĐANG CHẠY THÌ HIỆN KHỐI TÍM ĐEN CÂN ĐỐI */}
              {state.isProcessing ? (
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/30 text-center flex flex-col items-center justify-center min-h-[380px] animate-fade-in-up">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center justify-center w-full">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-5">
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin"></div>
                            <div className="absolute inset-2 sm:inset-3 rounded-full border-4 border-purple-400 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 animate-pulse" />
                            </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-black text-white tracking-wide mb-2 uppercase">
                            {Boolean(stemTopic) && !mode 
                                ? 'AI Đang xây dựng Bài học / Dự án STEM...' 
                                : Boolean(stemTopic) && mode 
                                ? 'AI Đang tích hợp NLS, AI & Thiết kế STEM...' 
                                : 'AI Đang phân tích & tích hợp Năng lực số...'}
                        </h3>
                        
                        <p className="text-xs sm:text-sm text-indigo-200/80 max-w-sm mx-auto font-medium leading-relaxed">
                            {Boolean(stemTopic) && !mode 
                                ? `Thiết kế quy trình kỹ thuật 5 bước cho chủ đề: "${stemTopic}" theo chuẩn GDPT 2018...`
                                : Boolean(stemTopic) && mode 
                                ? `Kết hợp chuẩn NLS (TT 02/2025), Khung AI và quy trình STEM: "${stemTopic}"...`
                                : 'Đang quét cấu trúc bài dạy (CV 2345 / CV 5512), đối chiếu chuẩn Năng lực số (TT 02/2025) & Khung AI 2026...'}
                        </p>
                        
                        <div className="w-56 sm:w-64 h-2 bg-slate-800 rounded-full mt-6 overflow-hidden border border-white/10 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-[shimmer_1.5s_infinite]"></div>
                        </div>

                        <span className="text-[11px] text-slate-400 font-mono mt-4 block">
                            ⚡ Đang thực hiện kết nối máy chủ phân tích...
                        </span>
                    </div>
                </div>
              ) : (
                <>
                  {/* Console Log chuẩn hoá */}
                  <TerminalSidebar logs={state.logs.length > 0 ? state.logs : [
                    "🚀 Hệ thống sẵn sàng.",
                    "📂 Hãy chọn môn, khối lớp và tải file giáo án (.docx) ở cột bên trái.",
                    "🎯 Hệ thống sẽ tự động đối chiếu ma trận sư phạm và chuẩn hoá."
                  ]} isProcessing={state.isProcessing} />

                  {/* Thẻ hướng dẫn quy chuẩn sư phạm để lấp đầy cột phải */}
                  <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs space-y-2.5">
                    <h4 className="font-extrabold text-xs uppercase tracking-wide text-slate-700 flex items-center gap-2">
                      <span>📋</span> Định hướng tích hợp chuyên môn
                    </h4>
                    <div className="text-[11px] text-slate-500 space-y-1.5 leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600">1.</span>
                        <span><strong>Mục tiêu:</strong> Bổ sung chuẩn đầu ra NLS (TT 02/2025) hoặc Năng lực STEM vào mục II.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600">2.</span>
                        <span><strong>Học liệu số:</strong> Ưu tiên công cụ trực quan, tuyệt đối không yêu cầu HS tạo tài khoản cá nhân.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600">3.</span>
                        <span><strong>Tiến trình bài dạy:</strong> Thao tác thực chất, đúng tâm lý lứa tuổi và không làm loãng thời lượng tiết học.</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>

          </div>
        </main>
      </div>

      <footer className="mt-20 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md pt-10 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          
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
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-emerald-500 to-indigo-600 text-white shadow-xs">v3.0 PRO</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Hệ sinh thái Tích hợp NLS, AI & Giáo dục STEM Chuẩn GDPT 2018</p>
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
                <span>CV 2345 &bull; CV 5512 &bull; TT 02/2025 &bull; CV 3089 (GD STEM)</span>
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
            <span>© 2026 NLS Integrator Pro v3.0. Nền tảng tự động hóa tích hợp Năng lực số, AI & Giáo dục STEM hàng đầu.</span>
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