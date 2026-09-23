import React, { useState, useEffect } from 'react';
import { Activity, BookOpen, ChevronRight, Info, FileUp, Wand2, Sparkles, Download, Layers, Target, CheckCircle2, RefreshCw, Sliders, FileText, Palette, Files, Lightbulb } from 'lucide-react';
import { AppState, SubjectType, GradeType, GeneratedNLSContent, IntegrationMode, IntegrationLevel, OutputFormat, HighlightColor } from '../types';
import { PEDAGOGY_MODELS } from '../utils';
import SmartEditor from './SmartEditor';

interface ControlCenterProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  mode: IntegrationMode;
  setMode: React.Dispatch<React.SetStateAction<IntegrationMode>>;
  stemTopic?: string;
  setStemTopic?: (topic: string) => void;
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
  state, setState, mode, setMode, stemTopic = '', setStemTopic, level, setLevel, outputFormat, setOutputFormat, highlightColor, setHighlightColor, pedagogy, setPedagogy, handleFileChange, handleAnalyze, handleFinalizeAndDownload
}: ControlCenterProps) {

  // State độc lập quản lý trạng thái bật/tắt nút STEM (không phụ thuộc vào độ dài chuỗi stemTopic)
  const [isStemActive, setIsStemActive] = useState<boolean>(Boolean(stemTopic));

  // Tự động đồng bộ trạng thái khi prop stemTopic từ component cha thay đổi
  useEffect(() => {
    if (Boolean(stemTopic)) {
      setIsStemActive(true);
    }
  }, [stemTopic]);

  const handleSelectMode = (selectedMode: IntegrationMode) => {
    // Nếu đang chọn chính nút đó thì bấm lần nữa sẽ bỏ chọn (tắt NLS/AI để chỉ làm STEM)
    const newMode = mode === selectedMode ? ('' as any) : selectedMode;
    setMode(newMode);
    setState(prev => ({ ...prev, mode: newMode }));
  };

  const fileCount = state.files && state.files.length > 0 ? state.files.length : (state.file ? 1 : 0);

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
                
                {/* 4 Nút chế độ tích hợp: Cho phép bật song song cả NLS, AI và STEM */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                        <span className="flex items-center gap-1.5">
                          {mode === 'NLS_AI' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                          Tích hợp NLS & AI
                        </span>
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
                        <span className="flex items-center gap-1.5">
                          {mode === 'NLS' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                          Chỉ Năng lực số
                        </span>
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
                        <span className="flex items-center gap-1.5">
                          {mode === 'NAI' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                          Giáo dục AI
                        </span>
                        <span className="text-[9px] font-normal text-slate-500">Theo Khung giáo dục AI</span>
                    </button>

                    <button 
                        type="button"
                        onClick={() => {
                          const nextActive = !isStemActive;
                          setIsStemActive(nextActive);
                          if (setStemTopic) {
                            if (!nextActive) {
                              setStemTopic('');
                            } else if (!stemTopic) {
                              setStemTopic('Thiết kế mô hình & sản phẩm học tập STEM thực tế');
                            }
                          }
                        }} 
                        className={`relative p-3.5 rounded-xl text-left border text-xs font-bold transition-all flex flex-col gap-1 cursor-pointer justify-between ${
                            isStemActive
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md ring-2 ring-emerald-500/30' 
                            : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                        }`}
                    >
                        <span className={`absolute -top-2 right-3 px-2 py-0.5 text-[9px] font-bold rounded-full shadow-xs ${
                            isStemActive 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-indigo-600 text-white animate-pulse'
                            }`}>
                            {isStemActive ? 'ĐÃ BẬT' : 'MỚI'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {isStemActive ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <span>🚀</span>}
                          Tích hợp STEM
                        </span>
                        <span className="text-[9px] font-normal text-slate-500">Kết hợp cùng NLS / AI</span>
                    </button>
                </div>

                {/* KHUNG CẤU HÌNH CHỦ ĐỀ STEM (HIỂN THỊ KHI BẬT NÚT STEM) */}
                {isStemActive && setStemTopic && (
                    <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 rounded-xl border border-emerald-200 space-y-2.5 animate-fade-in-up">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5 text-emerald-600" /> Chủ đề STEM bài học:
                            </label>
                            <span className="text-[10px] text-emerald-700 italic">Nhập chủ đề hoặc bấm chọn gợi ý bên dưới</span>
                        </div>
                        <input
                            type="text"
                            placeholder="VD: Thiết kế giác kế đo góc/chiều cao, Mô hình tháp đa diện, Dự án lãi suất tiết kiệm..."
                            value={stemTopic}
                            onChange={(e) => setStemTopic(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-emerald-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-emerald-800">Gợi ý nhanh:</span>
                            {[
                                'Thiết kế giác kế đo khoảng cách thực địa',
                                'Chế tạo mô hình hình học không gian 3D',
                                'Dự án phân tích dữ liệu & biểu đồ tài chính',
                                'Mô hình chuyển động và quỹ đạo vật lý'
                            ].map((topic, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setStemTopic(topic)}
                                    className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition cursor-pointer shadow-2xs"
                                >
                                    + {topic}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3 CỤM TÙY CHỌN: MỨC ĐỘ, KIỂU XUẤT, MÀU CHỮ CHÈN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
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
                          <select 
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:bg-white" 
                            value={state.subject} 
                            onChange={(e) => {
                              const newSub = e.target.value as SubjectType;
                              setState(prev => ({
                                ...prev, 
                                subject: newSub,
                                grade: '' as GradeType
                              }));
                            }}
                          >
                              <option value="">-- Chọn môn --</option>
                              
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

                              <optgroup label="Cấp Tiểu học (Cấp 1)">
                                  <option value="Toán (Tiểu học)">Toán (Tiểu học)</option>
                                  <option value="Tiếng Việt">Tiếng Việt</option>
                                  <option value="Tiếng Anh (Tiểu học)">Tiếng Anh (Tiểu học)</option>
                                  <option value="Tự nhiên và Xã hội">Tự nhiên và Xã hội (Lớp 1, 2, 3)</option>
                                  <option value="Khoa học">Khoa học (Lớp 4, 5)</option>
                                  <option value="Lịch sử và Địa lí (Tiểu học)">Lịch sử và Địa lí (Lớp 4, 5)</option>
                                  <option value="Tin học và Công nghệ">Tin học và Công nghệ (Lớp 3, 4, 5)</option>
                                  <option value="Đạo đức">Đạo đức</option>
                                  <option value="Âm Nhạc (Tiểu học)">Âm Nhạc (Tiểu học)</option>
                                  <option value="Mỹ Thuật (Tiểu học)">Mĩ Thuật (Tiểu học)</option>
                                  <option value="Giáo dục thể chất (Tiểu học)">Giáo dục thể chất (Tiểu học)</option>
                                  <option value="Hoạt động trải nghiệm">Hoạt động trải nghiệm (Tiểu học)</option>
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

            {/* Card 3: Tài liệu đầu vào */}
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

            {/* Nút Kích hoạt AI: Gọn gàng, kết thúc cột trái một cách mạch lạc */}
            <div className="col-span-1 md:col-span-2 mt-2">
                <button 
                  disabled={fileCount === 0 || state.isProcessing} 
                  onClick={handleAnalyze} 
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer active:scale-[0.99] ${
                        state.isProcessing
                        ? 'bg-slate-800 text-slate-300 cursor-wait shadow-none'
                        : fileCount === 0 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                        : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
                    }`}
                >
                  {state.isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" /> 
                        Đang xử lý dữ liệu giáo án...
                      </>
                  ) : (
                      <>
                        <Wand2 className="w-4 h-4 text-amber-300" /> 
                        {fileCount > 1 ? `Kích hoạt AI xử lý ${fileCount} giáo án` : 'Kích hoạt AI'}
                      </>
                  )}
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