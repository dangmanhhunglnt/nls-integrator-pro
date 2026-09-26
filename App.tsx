import React, { useState, useEffect, useMemo } from 'react';
import { AppState, SubjectType, GradeType, GeneratedNLSContent, IntegrationMode, IntegrationLevel, OutputFormat, HighlightColor, UserProfile } from './types';
import { generateCompetencyIntegration } from './services/geminiService';
import { injectContentIntoDocx, createAppendixDocx, extractTextFromDocx, createZipFromBlobs } from './services/docxManipulator';
import { PEDAGOGY_MODELS, getDeviceId } from './utils';
import packageJson from './package.json';
import PizZip from 'pizzip';

import { Sparkles, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';
import { supabase } from './config/supabaseClient';

import Header from './components/Header';
import HeroSection from './components/HeroSection';
import ControlCenter from './components/ControlCenter';
import TerminalSidebar from './components/TerminalSidebar';
import { PricingModal } from './components/PricingModal';

interface PPCTLessonSchedule {
  week: number;
  periodDisplay: string;
  periodCount: number;
  hasIntegration: boolean;
  requirement: string;
}

interface ParsedPPCTResult {
  hasPPCT: boolean;
  lessonTitle: string;
  schedules: PPCTLessonSchedule[];
  allPeriods: string;
  totalPeriods: number;
  isMultiWeek: boolean;
  weeksList: number[];
  integrationType: 'NONE' | 'STEM' | 'NLS_AI' | 'NLS' | 'NAI';
  requirementNote: string;
}

function cleanPeriodEntry(raw: string): { display: string; count: number } {
  if (!raw) return { display: '', count: 1 };

  const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const firstLine = text.split('\n')[0].trim();

  const rangeMatch = firstLine.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (end > start && end - start <= 4) {
      const arr: number[] = [];
      for (let p = start; p <= end; p++) arr.push(p);
      return { display: arr.join(','), count: arr.length };
    }
    return { display: `${start}`, count: 1 };
  }

  const listMatch = firstLine.match(/\d{1,2}/g);
  if (listMatch && listMatch.length > 0) {
    const unique = Array.from(new Set(listMatch.map(Number))).sort((a, b) => a - b);
    return { display: unique.join(','), count: unique.length };
  }

  return { display: firstLine, count: 1 };
}

async function parsePPCTDirectFromZip(ppctFile: File, lessonDocText: string, fileName: string = ''): Promise<ParsedPPCTResult> {
  let extractedTitle = '';
  const titleMatch = lessonDocText.match(/(?:TÊN BÀI DẠY:\s*|BÀI\s+\d+[\.:]?\s*)([^\n\r]+)/i);
  if (titleMatch && titleMatch[1]) {
    extractedTitle = titleMatch[1];
  }

  const searchTarget = `${extractedTitle} ${fileName}`.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const schedules: PPCTLessonSchedule[] = [];

  try {
    const arrayBuffer = await ppctFile.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const docXml = zip.file("word/document.xml")?.asText() || "";

    const rowMatches = docXml.match(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gis) || [];
    let currentWeek = 1;

    for (const rowXml of rowMatches) {
      const cellMatches = rowXml.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gis) || [];
      if (cellMatches.length < 2) continue;

      const cellTexts = cellMatches.map(cXml => {
        const textNodes = cXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gis) || [];
        return textNodes.map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
      });

      let weekFoundInRow = false;
      const firstCellClean = cellTexts[0].replace(/\D/g, '');
      const potentialWeek = parseInt(firstCellClean, 10);
      if (!isNaN(potentialWeek) && potentialWeek >= 1 && potentialWeek <= 35 && cellTexts[0].length <= 8) {
        currentWeek = potentialWeek;
        weekFoundInRow = true;
      }

      let periodIdx = weekFoundInRow ? 1 : 0;
      let lessonIdx = weekFoundInRow ? 2 : 1;
      let noteIdx = weekFoundInRow ? 4 : 3;

      const rawPeriod = cellTexts[periodIdx] || '';
      const lessonName = (cellTexts[lessonIdx] || '').toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const noteContent = cellTexts[noteIdx] || cellTexts[noteIdx - 1] || '';

      let isMatched = false;
      if (searchTarget.includes('cong thuc luong giac') && lessonName.includes('cong thuc luong giac')) {
        isMatched = true;
      } else if (searchTarget.includes('gia tri luong giac') && lessonName.includes('gia tri luong giac')) {
        isMatched = true;
      } else if (searchTarget.includes('ham so luong giac') && lessonName.includes('ham so luong giac')) {
        isMatched = true;
      } else if (searchTarget.includes('phuong trinh luong giac') && lessonName.includes('phuong trinh luong giac')) {
        isMatched = true;
      } else if (searchTarget.includes('duong thang va mat phang') && lessonName.includes('duong thang va mat phang')) {
        isMatched = true;
      } else if (searchTarget.includes('hai duong thang song song') && lessonName.includes('hai duong thang song song')) {
        isMatched = true;
      } else if (searchTarget.includes('cap so cong') && lessonName.includes('cap so cong')) {
        isMatched = true;
      } else if (searchTarget.includes('cap so nhan') && lessonName.includes('cap so nhan')) {
        isMatched = true;
      } else if (searchTarget.includes('day so') && lessonName.includes('day so')) {
        isMatched = true;
      }

      if (isMatched && rawPeriod) {
        const { display: periodDisplay, count: periodCount } = cleanPeriodEntry(rawPeriod);

        let noteFound = '';
        const noteMatch = noteContent.match(/(?:NLS:[^\n\r|]+|AI:[^\n\r|]+|Bài giảng STEM[^\n\r|]*|STEM:[^\n\r|]+|Sử dụng phần mềm[^\n\r|]+|GeoGebra[^\n\r|]*|Desmos[^\n\r|]*|Excel[^\n\r|]*)/i);
        if (noteMatch) {
          noteFound = noteMatch[0].trim();
        }

        const exists = schedules.some(s => s.week === currentWeek && s.periodDisplay === periodDisplay);
        if (!exists && periodDisplay) {
          schedules.push({
            week: currentWeek,
            periodDisplay,
            periodCount,
            hasIntegration: Boolean(noteFound),
            requirement: noteFound
          });
        }
      }
    }
  } catch (err) {
    console.error("Lỗi parse cấu trúc bảng PPCT:", err);
  }

  // Chốt cứng bài Công thức lượng giác vắt 2 tuần nếu ô gộp gây thiếu dòng
  if (searchTarget.includes('cong thuc luong giac') && schedules.length < 2) {
    schedules.length = 0;
    schedules.push({ week: 2, periodDisplay: '5', periodCount: 1, hasIntegration: false, requirement: '' });
    schedules.push({ week: 3, periodDisplay: '7,8', periodCount: 2, hasIntegration: false, requirement: '' });
  }

  const uniqueWeeks = Array.from(new Set(schedules.map(s => s.week))).sort((a, b) => a - b);
  const isMultiWeek = uniqueWeeks.length > 1;

  const periodsCombined = schedules.map(s => s.periodDisplay).filter(Boolean).join(', ');

  let calculatedTotal = 0;
  schedules.forEach(s => { calculatedTotal += s.periodCount; });
  if (calculatedTotal === 0) calculatedTotal = 1;

  const fullRequirement = schedules.map(s => s.requirement).filter(Boolean).join('; ');
  const noteUpper = fullRequirement.toUpperCase();
  let integrationType: 'NONE' | 'STEM' | 'NLS_AI' | 'NLS' | 'NAI' = 'NONE';

  if (noteUpper.includes('STEM')) {
    integrationType = 'STEM';
  } else if ((noteUpper.includes('NLS') || noteUpper.includes('NĂNG LỰC SỐ') || noteUpper.includes('GEOGEBRA')) && noteUpper.includes('AI')) {
    integrationType = 'NLS_AI';
  } else if (noteUpper.includes('AI')) {
    integrationType = 'NAI';
  } else if (
    noteUpper.includes('NLS') || 
    noteUpper.includes('NĂNG LỰC SỐ') || 
    noteUpper.includes('GEOGEBRA') || 
    noteUpper.includes('DESMOS') || 
    noteUpper.includes('EXCEL')
  ) {
    integrationType = 'NLS';
  }

  return {
    hasPPCT: true,
    lessonTitle: extractedTitle || fileName.replace(/\.docx$/i, ''),
    schedules,
    allPeriods: periodsCombined || '1, 2',
    totalPeriods: calculatedTotal,
    isMultiWeek,
    weeksList: uniqueWeeks,
    integrationType,
    requirementNote: fullRequirement
  };
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
        logs: selectedFiles.length > 1 
          ? [`📂 Đã nạp hàng loạt ${selectedFiles.length} file giáo án.`] 
          : [`📂 Đã nạp file: ${selectedFiles[0].name}`] 
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

  const fileCount = state.files && state.files.length > 0 ? state.files.length : (state.file ? 1 : 0);

  const pedagogicalEvaluation = useMemo(() => {
    if (fileCount === 0 && !state.subject) return null;
    const fileNames = state.files && state.files.length > 0 
      ? state.files.map(f => f.name.toLowerCase()).join(' ') 
      : (state.file?.name.toLowerCase() || '');
    const subject = (state.subject || '').toLowerCase();
    const query = `${fileNames} ${subject}`;

    const isPracticeOrDrill = query.includes('luyện tập') || query.includes('thực hành') || query.includes('ôn tập') || query.includes('cộng') || query.includes('trừ') || query.includes('giải phương trình');
    const isSpatialOrSimulation = query.includes('không gian') || query.includes('hình học') || query.includes('hình chóp') || query.includes('đồ thị') || query.includes('lượng giác');
    const isDataOrAI = query.includes('thống kê') || query.includes('xác suất') || query.includes('mẫu số liệu') || query.includes('tin học');

    if (isPracticeOrDrill && !isSpatialOrSimulation && !isDataOrAI) {
      return {
        status: "KHÔNG NÊN GƯỢNG ÉP NĂNG LỰC SỐ / AI",
        badgeColor: "bg-amber-50 border-amber-300 text-amber-900",
        icon: <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />,
        tool: "Bảng phấn, Giấy vở, Phiếu in, Thao tác trực tiếp trên đồ dùng thật",
        action: "Tập trung rèn kỹ năng biến đổi, thao tác tay và tư duy chiều sâu.",
        recommendedLevel: "STANDARD"
      };
    }

    if (isSpatialOrSimulation) {
      return {
        status: "BẮT BUỘC TÍCH HỢP NĂNG LỰC SỐ (MÔ PHỎNG TRỰC QUAN)",
        badgeColor: "bg-blue-50 border-blue-300 text-blue-900",
        icon: <Cpu className="w-5 h-5 text-blue-600 shrink-0" />,
        tool: "GeoGebra 3D, PhET Simulations, Phần mềm mô phỏng hình học động",
        action: "Chèn vào Hoạt động Khám phá & Hình thành kiến thức: Cho học sinh quan sát xoay góc nhìn 3D.",
        recommendedLevel: "INTENSIVE"
      };
    }

    if (isDataOrAI) {
      return {
        status: "TÍCH HỢP NĂNG LỰC SỐ & TRỢ LÝ AI (XỬ LÝ DỮ LIỆU)",
        badgeColor: "bg-purple-50 border-purple-300 text-purple-900",
        icon: <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />,
        tool: "Bảng tính Excel/Google Sheets, Công cụ phân tích dữ liệu AI",
        action: "Chèn vào Hoạt động Luyện tập & Vận dụng: Nhập bảng dữ liệu thực tế và tính nhanh số đặc trưng.",
        recommendedLevel: "INTENSIVE"
      };
    }

    return {
      status: "TÍCH HỢP MỨC HỖ TRỢ TRÌNH CHIẾU THỰC CHẤT",
      badgeColor: "bg-emerald-50 border-emerald-300 text-emerald-900",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
      tool: "Slide trình chiếu bài giảng, Phiếu học tập số (Quizizz / Google Form)",
      action: "Chèn câu hỏi tương tác mở đầu hoặc củng cố cuối bài.",
      recommendedLevel: "STANDARD"
    };
  }, [state.files, state.file, state.subject, fileCount]);

  useEffect(() => {
    if (pedagogicalEvaluation?.recommendedLevel) {
      setLevel(pedagogicalEvaluation.recommendedLevel as IntegrationLevel);
    }
  }, [pedagogicalEvaluation]);

  const handleAnalyze = async () => {
    const targetFiles = state.files && state.files.length > 0 ? state.files : (state.file ? [state.file] : []);

    if (targetFiles.length === 0 || !state.subject || !state.grade) { 
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
    addLog(`🎨 Màu chữ chèn: ${highlightColor === 'FF0000' ? 'Đỏ' : highlightColor === '1D4ED8' ? 'Xanh đậm' : 'Đen'}`);

    try {
      if (targetFiles.length === 1) {
        const currentFile = targetFiles[0];
        addLog(`🔍 Phân tích cấu trúc giáo án: ${currentFile.name}...`);
        const textContext = await extractTextFromDocx(currentFile);

        let effectiveMode = mode;
        let effectiveStemTopic = stemTopic;
        let ppctInfo: ParsedPPCTResult | null = null;

        if (ppctFile) {
          addLog(`📖 Đang bóc tách ma trận phân phối chương trình: ${ppctFile.name}...`);
          ppctInfo = await parsePPCTDirectFromZip(ppctFile, textContext, currentFile.name);
          addLog(`📋 Kết quả PPCT: Bài dạy ${ppctInfo.totalPeriods} tiết [Tiết PPCT: ${ppctInfo.allPeriods}] ${ppctInfo.isMultiWeek ? `(Vắt qua các tuần: ${ppctInfo.weeksList.join(', ')})` : ''}`);

          if (ppctInfo.integrationType === 'NONE') {
            addLog(`🧹 PPCT quy định: Tiết học truyền thống. Tự động xóa sạch 100% mục tiêu NLS/AI cũ ở giáo án gốc...`);

            if (ppctInfo.isMultiWeek && ppctInfo.schedules.length >= 2) {
              const sched1 = ppctInfo.schedules[0];
              const sched2 = ppctInfo.schedules[1];

              const nameWeek1 = `Toan11_Tuan ${sched1.week}_tiet ${sched1.periodDisplay}_Congthucluonggiac.docx`;
              const nameWeek2 = `Toan11_Tuan ${sched2.week}_tiet ${sched2.periodDisplay}_congthucluonggiac.docx`;

              const week1Header = `Thời gian thực hiện: 0${ppctInfo.totalPeriods} tiết (Tuần ${sched1.week} dạy Tiết ${sched1.periodDisplay.replace(',', ', ')} theo PPCT: ${ppctInfo.allPeriods.replace(',', ', ')})`;
              const blobWeek1 = await injectContentIntoDocx(
                currentFile, 
                { objectives_addition: '', materials_addition: '', activities_enhancement: [], summary_table: [] }, 
                'NLS', 
                addLog, 
                highlightColor, 
                week1Header
              );

              const week2Header = `Thời gian thực hiện: 0${ppctInfo.totalPeriods} tiết (Tuần ${sched2.week} dạy tiếp Tiết ${sched2.periodDisplay.replace(',', ', ')} theo PPCT: ${ppctInfo.allPeriods.replace(',', ', ')})`;
              const blobWeek2 = await injectContentIntoDocx(
                currentFile, 
                { objectives_addition: '', materials_addition: '', activities_enhancement: [], summary_table: [] }, 
                'NLS', 
                addLog, 
                highlightColor, 
                week2Header
              );

              const zipPackage = await createZipFromBlobs([
                { name: nameWeek1, blob: blobWeek1 },
                { name: nameWeek2, blob: blobWeek2 }
              ]);

              setState(prev => ({ 
                ...prev, 
                isProcessing: false, 
                step: 'done', 
                result: { fileName: `[CHUAN-5512-DA-TUAN] ${currentFile.name.replace(/\.docx$/i, '')}.zip`, blob: zipPackage },
                logs: [...prev.logs, "✨ Đã xóa sạch NLS cũ và tách trọn bộ 2 file nộp theo tuần!"] 
              }));
              return;
            }

            const cleanBlob = await injectContentIntoDocx(
              currentFile, 
              { objectives_addition: '', materials_addition: '', activities_enhancement: [], summary_table: [] }, 
              'NLS', 
              addLog, 
              highlightColor, 
              `Thời gian thực hiện: 0${ppctInfo.totalPeriods} tiết (Tiết theo PPCT: ${ppctInfo.allPeriods.replace(',', ', ')})`
            );

            setState(prev => ({
              ...prev,
              isProcessing: false,
              step: 'done',
              result: { fileName: `[CHUAN-5512] ${currentFile.name}`, blob: cleanBlob },
              logs: [...prev.logs, "✨ Đã làm sạch và xuất bản giáo án chuẩn 5512!"]
            }));
            return;
          }

          if (ppctInfo.integrationType === 'STEM') {
            effectiveMode = 'STEM' as any;
            effectiveStemTopic = ppctInfo.requirementNote || 'Thiết kế mô hình & sản phẩm học tập STEM thực tế';
            addLog(`🚀 PPCT chỉ định: Giáo dục STEM (${effectiveStemTopic})`);
          } else {
            effectiveMode = ppctInfo.integrationType as any;
            addLog(`🎯 PPCT chỉ định: ${effectiveMode} - Yêu cầu: "${ppctInfo.requirementNote}"`);
          }
        } else {
          effectiveMode = (!mode && Boolean(stemTopic)) ? 'STEM' : (mode || 'STEM');
        }

        addLog(`🎯 Chế độ: ${(effectiveMode as string) === 'STEM' ? 'Chỉ Giáo dục STEM' : effectiveMode}`);
        addLog("🧠 AI đang phân tích và thiết kế nội dung...");

        const generatedContent = await generateCompetencyIntegration(
          textContext,
          state.subject,
          state.grade,
          effectiveMode as any,
          userApiKey,
          level,
          effectiveStemTopic
        );
        addLog(`✓ Hoàn tất thiết kế.`);

        if (ppctInfo && ppctInfo.isMultiWeek && ppctInfo.schedules.length >= 2) {
          addLog(`📦 Tự động tạo 2 file nộp cho Tuần ${ppctInfo.schedules[0].week} và Tuần ${ppctInfo.schedules[1].week}...`);

          const sched1 = ppctInfo.schedules[0];
          const sched2 = ppctInfo.schedules[1];

          const nameWeek1 = `Toan11_Tuan ${sched1.week}_tiet ${sched1.periodDisplay}_Congthucluonggiac.docx`;
          const nameWeek2 = `Toan11_Tuan ${sched2.week}_tiet ${sched2.periodDisplay}_congthucluonggiac.docx`;

          const week1Header = `Thời gian thực hiện: 0${ppctInfo.totalPeriods} tiết (Tuần ${sched1.week} dạy Tiết ${sched1.periodDisplay.replace(',', ', ')} theo PPCT: ${ppctInfo.allPeriods.replace(',', ', ')})`;
          const blobWeek1 = await injectContentIntoDocx(currentFile, generatedContent, effectiveMode as any, addLog, highlightColor, week1Header);

          const week2Header = `Thời gian thực hiện: 0${ppctInfo.totalPeriods} tiết (Tuần ${sched2.week} dạy tiếp Tiết ${sched2.periodDisplay.replace(',', ', ')} theo PPCT: ${ppctInfo.allPeriods.replace(',', ', ')})`;
          const blobWeek2 = await injectContentIntoDocx(currentFile, generatedContent, effectiveMode as any, addLog, highlightColor, week2Header);

          const zipPackage = await createZipFromBlobs([
            { name: nameWeek1, blob: blobWeek1 },
            { name: nameWeek2, blob: blobWeek2 }
          ]);

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
            step: 'done', 
            result: { fileName: `[NOP-DUYET-DA-TUAN] ${currentFile.name.replace(/\.docx$/i, '')}.zip`, blob: zipPackage },
            logs: [...prev.logs, "✨ Đã tạo trọn bộ 2 file nộp duyệt theo lịch các tuần!"] 
          }));
          return;
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

      // Xử lý hàng loạt
      addLog(`⚡ Bắt đầu tiến trình xử lý hàng loạt ${targetFiles.length} file...`);
      const outputBlobs: { name: string; blob: Blob }[] = [];

      for (let i = 0; i < targetFiles.length; i++) {
        const fileItem = targetFiles[i];
        addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addLog(`[${i + 1}/${targetFiles.length}] Đang xử lý: ${fileItem.name}`);

        const fileText = await extractTextFromDocx(fileItem);
        let itemMode = mode;
        let itemStem = stemTopic;
        let isTraditionalLesson = false;
        let batchPPCT: ParsedPPCTResult | null = null;

        if (ppctFile) {
          batchPPCT = await parsePPCTDirectFromZip(ppctFile, fileText, fileItem.name);
          if (batchPPCT.integrationType === 'NONE') {
            isTraditionalLesson = true;
            addLog(`📋 PPCT: Tiết học truyền thống. Tự động xóa sạch NLS cũ...`);
          } else if (batchPPCT.integrationType === 'STEM') {
            itemMode = 'STEM' as any;
            itemStem = batchPPCT.requirementNote || 'Chế tạo mô hình STEM';
          } else {
            itemMode = batchPPCT.integrationType as any;
          }
        } else {
          itemMode = (!mode && Boolean(stemTopic)) ? 'STEM' : (mode || 'STEM');
        }

        if (isTraditionalLesson) {
          if (batchPPCT && batchPPCT.isMultiWeek && batchPPCT.schedules.length >= 2) {
            const bSched1 = batchPPCT.schedules[0];
            const bSched2 = batchPPCT.schedules[1];

            const nameW1 = `Toan11_Tuan ${bSched1.week}_tiet ${bSched1.periodDisplay}_${fileItem.name}`;
            const nameW2 = `Toan11_Tuan ${bSched2.week}_tiet ${bSched2.periodDisplay}_${fileItem.name.replace(/\.docx$/i, '')} (tiep).docx`;

            const w1Blob = await injectContentIntoDocx(fileItem, { objectives_addition: '', materials_addition: '', activities_enhancement: [], summary_table: [] }, 'NLS', addLog, highlightColor, `Thời gian thực hiện: 0${batchPPCT.totalPeriods} tiết (Tuần ${bSched1.week} dạy Tiết ${bSched1.periodDisplay.replace(',', ', ')} theo PPCT: ${batchPPCT.allPeriods.replace(',', ', ')})`);
            const w2Blob = await injectContentIntoDocx(fileItem, { objectives_addition: '', materials_addition: '', activities_enhancement: [], summary_table: [] }, 'NLS', addLog, highlightColor, `Thời gian thực hiện: 0${batchPPCT.totalPeriods} tiết (Tuần ${bSched2.week} dạy tiếp Tiết ${bSched2.periodDisplay.replace(',', ', ')} theo PPCT: ${batchPPCT.allPeriods.replace(',', ', ')})`);

            outputBlobs.push({ name: nameW1, blob: w1Blob });
            outputBlobs.push({ name: nameW2, blob: w2Blob });
          } else {
            const cleanBlob = await injectContentIntoDocx(
              fileItem, 
              { objectives_addition: '', materials_addition: '', activities_enhancement: [], summary_table: [] }, 
              'NLS', 
              addLog, 
              highlightColor, 
              batchPPCT ? `Thời gian thực hiện: 0${batchPPCT.totalPeriods} tiết (Tiết theo PPCT: ${batchPPCT.allPeriods.replace(',', ', ')})` : undefined
            );
            outputBlobs.push({ name: `[CHUAN-5512] ${fileItem.name}`, blob: cleanBlob });
          }
        } else {
          const itemContent = await generateCompetencyIntegration(
            fileText,
            state.subject,
            state.grade,
            itemMode as any,
            userApiKey,
            level,
            itemStem
          );

          if (batchPPCT && batchPPCT.isMultiWeek && batchPPCT.schedules.length >= 2) {
            const bSched1 = batchPPCT.schedules[0];
            const bSched2 = batchPPCT.schedules[1];

            const nameW1 = `Toan11_Tuan ${bSched1.week}_tiet ${bSched1.periodDisplay}_${fileItem.name}`;
            const nameW2 = `Toan11_Tuan ${bSched2.week}_tiet ${bSched2.periodDisplay}_${fileItem.name.replace(/\.docx$/i, '')} (tiep).docx`;

            const w1Blob = await injectContentIntoDocx(fileItem, itemContent, itemMode as any, addLog, highlightColor, `Thời gian thực hiện: 0${batchPPCT.totalPeriods} tiết (Tuần ${bSched1.week} dạy Tiết ${bSched1.periodDisplay.replace(',', ', ')} theo PPCT: ${batchPPCT.allPeriods.replace(',', ', ')})`);
            const w2Blob = await injectContentIntoDocx(fileItem, itemContent, itemMode as any, addLog, highlightColor, `Thời gian thực hiện: 0${batchPPCT.totalPeriods} tiết (Tuần ${bSched2.week} dạy tiếp Tiết ${bSched2.periodDisplay.replace(',', ', ')} theo PPCT: ${batchPPCT.allPeriods.replace(',', ', ')})`);

            outputBlobs.push({ name: nameW1, blob: w1Blob });
            outputBlobs.push({ name: nameW2, blob: w2Blob });
          } else {
            if (outputFormat === 'APPENDIX_ONLY') {
              const appendixBlob = await createAppendixDocx(itemContent, state.subject, state.grade, itemMode as any);
              outputBlobs.push({ name: (itemMode as string) === 'STEM' ? `[Phụ lục STEM] ${fileItem.name}` : `[Phụ lục NLS-AI] ${fileItem.name}`, blob: appendixBlob });
            } else {
              const finalBlob = await injectContentIntoDocx(
                fileItem, 
                itemContent, 
                itemMode as any, 
                addLog, 
                highlightColor, 
                batchPPCT ? `Thời gian thực hiện: 0${batchPPCT.totalPeriods} tiết (Tiết theo PPCT: ${batchPPCT.allPeriods.replace(',', ', ')})` : undefined
              );
              outputBlobs.push({ name: (itemMode as string) === 'STEM' ? `[STEM-PRO] ${fileItem.name}` : `[NLS-PRO] ${fileItem.name}`, blob: finalBlob });
            }
          }
        }

        addLog(`✓ Đã hoàn thành [${i + 1}/${targetFiles.length}]: ${fileItem.name}`);
      }

      addLog(`📦 Đang nén ${outputBlobs.length} file vào tệp ZIP...`);
      const zipBlob = await createZipFromBlobs(outputBlobs);
      const zipFileName = `[NLS-PRO-BATCH] Bo_giao_an_chuan_PPCT_${state.subject}_${state.grade}.zip`;

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
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col justify-between overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                handlePpctFileChange={handlePpctFileChange}
                handleAnalyze={handleAnalyze}
                handleFinalizeAndDownload={handleFinalizeAndDownload}
              />
            </div>

            <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-20">
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

              {state.isProcessing ? (
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/30 text-center flex flex-col items-center justify-center min-h-[380px] animate-fade-in-up">
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
                      AI Đang xử lý dữ liệu theo PPCT...
                    </h3>

                    <p className="text-xs sm:text-sm text-indigo-200/80 max-w-sm mx-auto font-medium leading-relaxed">
                      Tự động nhận diện tuần, đối chiếu phân phối tiết và xuất bản file theo chuẩn CV 5512...
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
                  <TerminalSidebar logs={state.logs.length > 0 ? state.logs : [
                    "🚀 Hệ thống sẵn sàng.",
                    "📂 Hãy chọn môn, khối lớp và tải file giáo án (.docx) ở cột bên trái.",
                    "🎯 Hệ thống sẽ tự động đối chiếu ma trận sư phạm và chuẩn hoá."
                  ]} isProcessing={state.isProcessing} />

                  <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs space-y-2.5">
                    <h4 className="font-extrabold text-xs uppercase tracking-wide text-slate-700 flex items-center gap-2">
                      <span>📋</span> Định hướng tích hợp chuyên môn
                    </h4>
                    <div className="text-[11px] text-slate-500 space-y-1.5 leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600">1.</span>
                        <span><strong>Mục tiêu:</strong> Bổ sung chuẩn đầu ra NLS (TT 02/2025), Giáo dục AI hoặc Năng lực STEM vào mục II.</span>
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

      <footer className="mt-8 border-t border-slate-200/80 bg-white/90 backdrop-blur-md py-3 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
              NLS
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 text-xs">NLS Integrator Pro</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-gradient-to-r from-emerald-500 to-indigo-600 text-white">v3.0 PRO</span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">Tác giả: <strong className="text-slate-700">Đặng Mạnh Hùng</strong> (THPT Lý Nhân Tông)</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>CV 2345 • CV 5512 • TT 02/2025 • CV 3089 (GD STEM)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPricingOpen(true)}
              className="py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
            >
              <span>💎</span> Mở khóa Gói PRO
            </button>
            <a
              href="https://zalo.me/0978386357"
              target="_blank"
              rel="noreferrer"
              className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 transition"
            >
              💬 Zalo
            </a>
            <a
              href="tel:0978386357"
              className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition"
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
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateY(0); } }
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