import React, {useMemo } from 'react';
import { Activity, BookOpen, ChevronRight, Info, FileUp, Wand2, Sparkles, Download, Layers, Target, CheckCircle2, RefreshCw, Sliders, FileText, Palette, Files, CheckCircle, ShieldAlert, Cpu } from 'lucide-react';
import { AppState, SubjectType, GradeType, GeneratedNLSContent, IntegrationMode, IntegrationLevel, OutputFormat, HighlightColor } from '../types';
import { PEDAGOGY_MODELS } from '../utils';
import SmartEditor from './SmartEditor';

interface ControlCenterProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  mode: IntegrationMode;
  setMode: React.Dispatch<React.SetStateAction<IntegrationMode>>;
  level: IntegrationLevel;
  setLevel: React.Dispatch<React.SetStateAction<IntegrationLevel>>;
  outputFormat: OutputFormat;
  setOutputFormat: React.Dispatch<React.SetStateAction<OutputFormat>>;
  highlightColor: HighlightColor;
  setHighlightColor: React.Dispatch<React.SetStateAction<HighlightColor>>;
  pedagogy: string;
  setPedagogy: (p: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAnalyze: () => void;
  handleFinalizeAndDownload: (content: GeneratedNLSContent) => void;
}

export default function ControlCenter({
  state, setState, mode, setMode, level, setLevel, outputFormat, setOutputFormat, highlightColor, setHighlightColor, pedagogy, setPedagogy, handleFileChange, handleAnalyze, handleFinalizeAndDownload
}: ControlCenterProps) {

  // Tùy chọn ép chèn NLS dành cho giáo viên đi thao giảng / thi giáo viên giỏi
  
  const handleSelectMode = (selectedMode: IntegrationMode) => {
    setMode(selectedMode);
    setState(prev => ({ ...prev, mode: selectedMode }));
  };

  const fileCount = state.files && state.files.length > 0 ? state.files.length : (state.file ? 1 : 0);

  // =========================================================================
  // MA TRẬN PHÂN LOẠI SƯ PHẠM ĐA MÔN HỌC (CHUẨN BỘ GD&ĐT CHO MỌI BÀI)
  // =========================================================================
  const pedagogicalEvaluation = useMemo(() => {
    if (fileCount === 0 && !state.subject) return null;

    const fileNames = state.files && state.files.length > 0 
      ? state.files.map(f => f.name.toLowerCase()).join(' ') 
      : (state.file?.name.toLowerCase() || '');
    
    const subject = (state.subject || '').toLowerCase();
    const query = `${fileNames} ${subject}`;

    // 1. NHÓM 1: BÀI RÈN KỸ NĂNG NỀN TẢNG / THỰC HÀNH CƠ BẢN (KHÔNG NÊN ÉP NLS/AI)
    // Áp dụng cho: Luyện tập tính toán, giải phương trình, rèn chữ, cảm thụ văn, thể dục, thao tác tay
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

    // 2. NHÓM 2: BÀI TRỰC QUAN HÓA / KHÔNG GIAN 3D / ĐỒ THỊ ĐỘNG (CẦN NLS MÔ PHỎNG SÂU)
    // Áp dụng cho: Hình học không gian, hàm số, lượng giác, chuyển động vật lý, thiên văn
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

    // 3. NHÓM 3: BÀI XỬ LÝ SỐ LIỆU / DỮ LIỆU LỚN / TIN HỌC (CẦN BẢNG TÍNH & AI)
    // Áp dụng cho: Thống kê, xác suất, kinh tế pháp luật, tin học, địa lý tự nhiên
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

    // 4. NHÓM 4: BÀI XÃ HỘI / TỰ NHIÊN / NGÔN NGỮ (CẦN HỌC LIỆU SỐ & TRA CỨU)
    // Áp dụng cho: Lịch sử, địa lý, tiếng Anh, tự nhiên xã hội
    const isSocialOrLanguage = 
      query.includes('lịch sử') || 
      query.includes('địa lí') || 
      query.includes('tiếng anh') || 
      query.includes('tự nhiên và xã hội') || 
      query.includes('văn minh') || 
      query.includes('khoa học');

    // --- XẾP LOẠI ƯU TIÊN ---

    // Trường hợp 1: Bài thuần rèn kỹ năng (kể cả có yếu tố khác, vẫn ưu tiên giữ truyền thống)
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

    // Trường hợp 2: Không gian / Mô phỏng
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

    // Trường hợp 3: Thống kê / Dữ liệu / AI
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

    // Trường hợp 4: Lịch sử, Địa lý, Tiếng Anh
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

    // Mặc định cho các bài lý thuyết chung khác
    return {
      status: 'TÍCH HỢP MỨC HỖ TRỢ TRÌNH CHIẾU THỰC CHẤT',
      badgeColor: 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
      tool: 'Slide trình chiếu bài giảng, Phiếu học tập số (Quizizz / Google Form)',
      action: 'Chèn câu hỏi tương tác mở đầu hoặc củng cố cuối bài.',
      recommendedLevel: 'STANDARD'
    };
  }, [state.files, state.file, state.subject, fileCount]);

  // TỰ ĐỘNG ĐỒNG BỘ: Cập nhật mức độ tích hợp phía trên theo đánh giá của bài học
  React.useEffect(() => {
    if (pedagogicalEvaluation?.recommendedLevel) {
      setLevel(pedagogicalEvaluation.recommendedLevel as IntegrationLevel);
    }
  }, [pedagogicalEvaluation, setLevel]);
  ;

  return (
    <>
      {state.step === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            
            {/* Card 1: Chế độ tích hợp năng lực */}
            <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Chế độ tích hợp năng lực</h3>
                        <p className="text-[11px] text-slate-400">Lựa chọn tiêu chuẩn tích hợp theo định hướng mới của Bộ GD&ĐT</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button 
                        type="button"
                        onClick={() => handleSelectMode('NLS_AI')} 
                        className={`relative p-3.5 rounded-xl text-left border text-xs font-bold transition-all flex flex-col gap-1 cursor-pointer justify-between ${
                            mode === 'NLS_AI' 
                            ? 'bg-gradient-to-br from-indigo-50/90 to-purple-50/50 border-indigo-500 text-indigo-900 shadow-md ring-2 ring-indigo-500/20' 
                            : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                        }`}
                    >
                        <span className="absolute -top-2 right-3 px-2 py-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-[9px] rounded-full shadow-xs">HOT 2026</span>
                        <span>Tích hợp NLS & AI</span>
                        <span className="text-[9px] font-normal text-slate-500">Kết hợp toàn diện (Khuyên dùng)</span>
                    </button>

                    <button 
                        type="button"
                        onClick={() => handleSelectMode('NLS')} 
                        className={`p-3.5 rounded-xl text-left border text-xs font-bold transition-all flex flex-col gap-1 cursor-pointer justify-between ${
                            mode === 'NLS' 
                            ? 'bg-indigo-50/90 border-indigo-500 text-indigo-700 shadow-md ring-2 ring-indigo-500/20' 
                            : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                        }`}
                    >
                        <span>Chỉ Năng lực số</span>
                        <span className="text-[9px] font-normal text-slate-500">Theo Thông tư 02/2025</span>
                    </button>

                    <button 
                        type="button"
                        onClick={() => handleSelectMode('NAI')} 
                        className={`p-3.5 rounded-xl text-left border text-xs font-bold transition-all flex flex-col gap-1 cursor-pointer justify-between ${
                            mode === 'NAI' 
                            ? 'bg-indigo-50/90 border-indigo-500 text-indigo-700 shadow-md ring-2 ring-indigo-500/20' 
                            : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                        }`}
                    >
                        <span>Giáo dục AI</span>
                        <span className="text-[9px] font-normal text-slate-500">Theo Khung giáo dục AI</span>
                    </button>
                </div>

                {/* BỔ SUNG: 3 CỤM TÙY CHỌN (MỨC ĐỘ, KIỂU XUẤT, MÀU CHỮ CHÈN) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    {/* Tùy chọn 1: Mức độ tích hợp */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
                            <Sliders className="w-3 h-3 text-indigo-500" /> Mức độ tích hợp
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setLevel('STANDARD')}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                                    level === 'STANDARD'
                                    ? 'bg-white text-indigo-700 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                🟢 Tiêu chuẩn
                            </button>
                            <button
                                type="button"
                                onClick={() => setLevel('INTENSIVE')}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                                    level === 'INTENSIVE'
                                    ? 'bg-white text-indigo-700 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                🟡 Chuyên sâu
                            </button>
                        </div>
                    </div>

                    {/* Tùy chọn 2: Kiểu xuất file */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-indigo-500" /> Kiểu xuất file
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setOutputFormat('INJECT_DIRECT')}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                                    outputFormat === 'INJECT_DIRECT'
                                    ? 'bg-white text-indigo-700 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                📄 Chèn vào gốc
                            </button>
                            <button
                                type="button"
                                onClick={() => setOutputFormat('APPENDIX_ONLY')}
                                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                                    outputFormat === 'APPENDIX_ONLY'
                                    ? 'bg-white text-indigo-700 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                📑 Phụ lục riêng
                            </button>
                        </div>
                    </div>

                    {/* Tùy chọn 3: Màu chữ chèn */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
                            <Palette className="w-3 h-3 text-indigo-500" /> Màu chữ chèn
                        </label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setHighlightColor('FF0000')}
                                className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                                    highlightColor === 'FF0000'
                                    ? 'bg-white text-red-600 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                🔴 Đỏ
                            </button>
                            <button
                                type="button"
                                onClick={() => setHighlightColor('1D4ED8')}
                                className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                                    highlightColor === '1D4ED8'
                                    ? 'bg-white text-blue-600 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                🔵 Xanh
                            </button>
                            <button
                                type="button"
                                onClick={() => setHighlightColor('000000')}
                                className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                                    highlightColor === '000000'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                ⚫ Đen
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Card 2: Thông tin chuyên môn */}
            <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide block">Thông tin Giáo án</span>
                      <p className="text-[11px] text-slate-400">Cấu hình môn học và chiến lược trích xuất</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-indigo-500" /> Môn học
                        </label>
                        <div className="relative group">
                          <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:bg-white" value={state.subject} onChange={(e) => setState(prev => ({...prev, subject: e.target.value as SubjectType}))}>
                              <option value="">-- Chọn môn --</option>
                              
                              {/* CẤP TIỂU HỌC (CẤP 1) */}
                              <optgroup label="Cấp Tiểu học (Cấp 1)">
                                  <option value="Toán">Toán (Tiểu học)</option>
                                  <option value="Tiếng Việt">Tiếng Việt</option>
                                  <option value="Tiếng Anh">Tiếng Anh (Tiểu học)</option>
                                  <option value="Tự nhiên và Xã hội">Tự nhiên và Xã hội (Lớp 1, 2, 3)</option>
                                  <option value="Khoa học">Khoa học (Lớp 4, 5)</option>
                                  <option value="Lịch sử và Địa lí">Lịch sử và Địa lí (Lớp 4, 5)</option>
                                  <option value="Tin học và Công nghệ">Tin học và Công nghệ (Lớp 3, 4, 5)</option>
                                  <option value="Đạo đức">Đạo đức</option>
                                  <option value="Âm Nhạc">Âm Nhạc (Tiểu học)</option>
                                  <option value="Mỹ Thuật">Mĩ Thuật (Tiểu học)</option>
                                  <option value="Giáo dục thể chất">Giáo dục thể chất (Tiểu học)</option>
                                  <option value="Hoạt động trải nghiệm">Hoạt động trải nghiệm (Tiểu học)</option>
                              </optgroup>

                              {/* CẤP THCS & THPT - MÔN BẮT BUỘC / CHUNG */}
                              <optgroup label="Cấp THCS & THPT - Môn Bắt buộc">
                                  <option value="Toán">Toán học</option>
                                  <option value="Ngữ Văn">Ngữ Văn</option>
                                  <option value="Tiếng Anh">Tiếng Anh</option>
                                  <option value="Lịch Sử">Lịch Sử</option>
                                  <option value="Khoa học tự nhiên">Khoa học tự nhiên (THCS)</option>
                                  <option value="Lịch sử và Địa lí">Lịch sử và Địa lí (THCS)</option>
                                  <option value="Giáo dục thể chất">GD Thể chất</option>
                                  <option value="Giáo dục quốc phòng và an ninh">GDQP & AN</option>
                                  <option value="Hoạt động trải nghiệm, hướng nghiệp">HĐ Trải nghiệm, hướng nghiệp</option>
                              </optgroup>

                              {/* CẤP THCS & THPT - MÔN LỰA CHỌN */}
                              <optgroup label="Cấp THCS & THPT - Môn Lựa chọn">
                                  <option value="Vật Lí">Vật Lí</option>
                                  <option value="Hóa Học">Hóa Học</option>
                                  <option value="Sinh Học">Sinh Học</option>
                                  <option value="Địa Lí">Địa Lí</option>
                                  <option value="Giáo dục công dân">Giáo dục công dân (THCS)</option>
                                  <option value="Giáo dục kinh tế và pháp luật">GDKT & PL (THPT)</option>
                                  <option value="Tin Học">Tin Học</option>
                                  <option value="Công nghệ (Công nghiệp)">Công nghệ (Công nghiệp)</option>
                                  <option value="Công nghệ (Nông nghiệp)">Công nghệ (Nông nghiệp)</option>
                                  <option value="Âm Nhạc">Âm Nhạc</option>
                                  <option value="Mỹ Thuật">Mỹ Thuật</option>
                              </optgroup>
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
                          <Target className="w-3 h-3 text-indigo-500" /> Khối lớp
                        </label>
                        <div className="relative group">
                          <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:bg-white" value={state.grade} onChange={(e) => setState(prev => ({...prev, grade: e.target.value as GradeType}))}>
                              <option value="">-- Chọn khối --</option>
                              <optgroup label="Trung học Phổ thông (Cấp 3)">
                                  <option value="Lớp 10">Lớp 10</option>
                                  <option value="Lớp 11">Lớp 11</option>
                                  <option value="Lớp 12">Lớp 12</option>
                              </optgroup>
                              <optgroup label="Trung học Cơ sở (Cấp 2)">
                                  <option value="Lớp 6">Lớp 6</option>
                                  <option value="Lớp 7">Lớp 7</option>
                                  <option value="Lớp 8">Lớp 8</option>
                                  <option value="Lớp 9">Lớp 9</option>
                              </optgroup>
                              <optgroup label="Tiểu học (Cấp 1)">
                                  <option value="Lớp 1">Lớp 1</option>
                                  <option value="Lớp 2">Lớp 2</option>
                                  <option value="Lớp 3">Lớp 3</option>
                                  <option value="Lớp 4">Lớp 4</option>
                                  <option value="Lớp 5">Lớp 5</option>
                              </optgroup>
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Chiến lược</label>
                    <div className="relative group">
                      <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:bg-white" value={pedagogy} onChange={(e) => setPedagogy(e.target.value)}>
                          {Object.entries(PEDAGOGY_MODELS).map(([key, value]) => (
                              <option key={key} value={key}>{value.name}</option>
                          ))}
                      </select>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-400 italic pl-1 flex items-center gap-1.5 mt-1"><Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> {PEDAGOGY_MODELS[pedagogy as keyof typeof PEDAGOGY_MODELS]?.desc}</p>
                </div>
            </div>

            {/* Card 3: Tài liệu đầu vào (Hỗ trợ nạp 1 hoặc nhiều file) */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1.5">
                        * File Giáo án (.docx) {fileCount > 1 && <span className="text-indigo-600 font-extrabold">(Đã chọn {fileCount} file)</span>}
                    </label>
                    <label className={`relative flex flex-col items-center justify-center w-full h-28 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden p-4 group ${
                      fileCount > 0 
                      ? 'border-emerald-500/80 bg-emerald-50/20 shadow-xs' 
                      : 'border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/20 shadow-xs'
                    }`}>
                        <div className="flex flex-col items-center justify-center text-center z-10 w-full transition-transform duration-300 group-hover:scale-[1.02]">
                            {fileCount > 0 ? (
                                <div className="flex items-center gap-3 w-full px-2">
                                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                                        {fileCount > 1 ? <Files className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                        <div className="flex items-center gap-1.5">
                                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-extrabold rounded-md uppercase">
                                            {fileCount > 1 ? `Đã nạp ${fileCount} file` : 'Đã nạp 1 file'}
                                          </span>
                                        </div>
                                        <p className="font-bold text-slate-800 text-xs truncate mt-0.5">
                                          {fileCount > 1 ? state.files.map(f => f.name).join(', ') : state.file?.name}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                      <RefreshCw className="w-3 h-3" /> Đổi
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-1.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <FileUp className="w-4 h-4" />
                                    </div>
                                    <p className="font-bold text-slate-700 text-xs">Tải lên Giáo án (.docx)</p>
                                    <span className="text-[10px] text-slate-400 mt-0.5">Chọn 1 hoặc giữ Ctrl chọn nhiều file cùng lúc</span>
                                </>
                            )}
                        </div>
                        <input type="file" accept=".docx" multiple className="hidden" onChange={handleFileChange} />
                    </label>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1.5">
                        File Phân phối chương trình (Tùy chọn)
                    </label>
                    <label className="relative flex flex-col items-center justify-center w-full h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer overflow-hidden p-4 group bg-white shadow-xs">
                        <div className="flex flex-col items-center justify-center text-center z-10 transition-transform duration-300 group-hover:scale-105">
                            <div className="w-9 h-9 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mb-1.5 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <FileUp className="w-4 h-4" />
                            </div>
                            <p className="font-bold text-slate-700 text-xs">Tải lên PPCT</p>
                            <span className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ định dạng .docx, .pdf</span>
                        </div>
                        <input type="file" accept=".docx,.pdf" className="hidden" onChange={(e) => {
                            const ppctFile = e.target.files?.[0];
                            if (ppctFile) {
                                console.log("Đã chọn file PPCT:", ppctFile.name);
                            }
                        }} />
                    </label>
                </div>
            </div>

            {/* BẢNG ĐÁNH GIÁ SƯ PHẠM TỰ ĐỘNG THEO MÔN & BÀI (KHÔNG CÒN NÚT BẤM TRÙNG LẶP) */}
            {pedagogicalEvaluation && (
                <div className={`col-span-1 md:col-span-2 rounded-2xl p-4 border transition-all animate-fade-in-up ${pedagogicalEvaluation.badgeColor}`}>
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">{pedagogicalEvaluation.icon}</div>
                        <div className="flex-1 space-y-1.5">
                            <h4 className="text-xs font-black tracking-wide uppercase">
                                {pedagogicalEvaluation.status}
                            </h4>
                            
                            <div className="text-[11px] grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-black/5 dark:border-white/5">
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

            {/* Vùng hiển thị trạng thái đang xử lý hoặc nút Kích hoạt AI */}
            <div className="col-span-1 md:col-span-2 mt-2">
                {state.isProcessing ? (
                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/30 text-center animate-fade-in-up">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center justify-center">
                            <div className="relative w-14 h-14 mb-3">
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin"></div>
                                <div className="absolute inset-2 rounded-full border-4 border-purple-400 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                                </div>
                            </div>

                            <h3 className="text-sm font-extrabold text-white tracking-wide mb-1">AI Đang phân tích & tích hợp...</h3>
                            <p className="text-xs text-indigo-200/80 max-w-md font-medium">Đang quét cấu trúc bài dạy (CV 2345 / CV 5512), đối chiếu chuẩn Năng lực số (TT 02/2025) & Khung AI 2026...</p>
                            
                            <div className="w-64 h-1.5 bg-slate-800 rounded-full mt-4 overflow-hidden border border-white/10">
                                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-[shimmer_1.5s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button 
                      disabled={fileCount === 0} 
                      onClick={handleAnalyze} 
                      className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer active:scale-[0.99] ${
                            fileCount === 0 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
                        }`}
                    >
                      <Wand2 className="w-4 h-4 text-amber-300" /> {fileCount > 1 ? `Kích hoạt AI xử lý ${fileCount} giáo án` : 'Kích hoạt AI'}
                    </button>
                )}
            </div>

        </div>
      )}

      {/* Smart Editor (Dành cho chế độ 1 file đơn lẻ) */}
      {state.step === 'review' && state.generatedContent && (
         <SmartEditor initialContent={state.generatedContent} onConfirm={handleFinalizeAndDownload} onCancel={() => setState(prev => ({ ...prev, step: 'upload', generatedContent: null }))} />
      )}
      
      {/* Result */}
      {state.step === 'done' && state.result && (
        <div className="bg-white rounded-2xl p-8 shadow-xl shadow-emerald-500/10 border border-emerald-100 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 mx-auto ring-4 ring-emerald-50/50"><Sparkles className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Thành công!</h3>
            <p className="text-slate-500 mb-6 text-xs">
              {state.result.fileName.endsWith('.zip') ? 'Tất cả các giáo án đã được xử lý hàng loạt và đóng gói thành công.' : 'Giáo án đã được tích hợp năng lực chuẩn GDPT 2018.'}
            </p>
            
            <div className="flex justify-center gap-3">
                <button onClick={() => setState(prev => ({ ...prev, step: 'upload', result: null, generatedContent: null, files: [], file: null }))} className="px-5 py-2.5 rounded-lg font-bold text-xs text-slate-600 hover:bg-slate-50 border border-slate-200">Làm lại</button>
                <button onClick={() => { if (state.result) { const url = URL.createObjectURL(state.result.blob); const a = document.createElement('a'); a.href = url; a.download = state.result.fileName; a.click(); } }} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:-translate-y-0.5 transition-all">
                  <Download className="w-4 h-4" /> {state.result.fileName.endsWith('.zip') ? 'Tải về toàn bộ (ZIP)' : 'Tải về ngay'}
                </button>
            </div>
        </div>
      )}
    </>
  );
}