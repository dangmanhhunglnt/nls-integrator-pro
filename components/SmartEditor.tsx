import { useState } from 'react';
import { GeneratedNLSContent } from '../types';
import { CheckCircle2, Download, Copy, Check, FileText, Sparkles } from 'lucide-react';

interface SmartEditorProps {
  initialContent: GeneratedNLSContent;
  onConfirm: (finalContent: GeneratedNLSContent) => void;
  onCancel: () => void;
}

export default function SmartEditor({ initialContent, onConfirm, onCancel }: SmartEditorProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Hàm chuẩn hóa tiếng Việt Unicode (NFC) để xóa hoàn toàn lỗi tách dấu tiếng Việt
  const normalizeVietnamese = (str: string): string => {
    if (!str) return '';
    return str.normalize('NFC');
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(normalizeVietnamese(text));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const objectivesText = normalizeVietnamese(initialContent.objectives_addition);
  const activities = initialContent.activities_enhancement || [];

  // Tính số lượng mục thực tế: 1 mục Mục tiêu + số lượng Hoạt động thực tế
  const totalItems = (objectivesText ? 1 : 0) + activities.length;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden animate-fade-in-up">
      {/* Banner tiêu đề */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Phân tích giáo án thành công!</h3>
            <p className="text-indigo-200 text-xs">Đã trích xuất đầy đủ các phần NLS/AI để tích hợp vào bài dạy.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3.5 py-1.5 bg-indigo-700/80 hover:bg-indigo-700 border border-indigo-400/30 rounded-lg text-xs font-semibold text-indigo-100 transition-all cursor-pointer">
            ← Soạn giáo án khác
          </button>
          <div className="px-3 py-1.5 bg-indigo-700/80 border border-indigo-400/30 rounded-lg text-xs font-semibold text-indigo-100 flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Sẵn sàng xuất Word (.docx)
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
        <button onClick={() => setActiveTab('manual')} className={`pb-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 rounded-t-lg cursor-pointer ${activeTab === 'manual' ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm border-x border-t border-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <FileText className="w-4 h-4" /> Hướng dẫn chèn thủ công (Copy nhanh)
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px]">{totalItems} mục</span>
        </button>
        <button onClick={() => setActiveTab('auto')} className={`pb-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 rounded-t-lg cursor-pointer ${activeTab === 'auto' ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm border-x border-t border-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Download className="w-4 h-4" /> Xuất file Word tự động (.docx)
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'manual' ? (
          <div className="space-y-5">
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase">📍 Hướng dẫn chèn thủ công theo từng dòng/vị trí cụ thể</h4>
                <p className="text-slate-500 text-[11px] mt-1">AI đã trích xuất tất cả các phần NLS kèm trích dẫn vị trí dòng liền trước trong giáo án gốc của thầy/cô.</p>
              </div>
              <button onClick={() => handleCopyText(objectivesText, 99)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer">
                <Copy className="w-3.5 h-3.5" /> Copy tất cả hướng dẫn
              </button>
            </div>

            {/* Mục 1: Mục tiêu */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> MỤC 1: MỤC TIÊU</span>
                <button onClick={() => handleCopyText(objectivesText, 1)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[10px] flex items-center gap-1.5 cursor-pointer">
                  {copiedIndex === 1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedIndex === 1 ? "Đã copy!" : "Copy đoạn NLS này"}
                </button>
              </div>
              <div className="p-4 space-y-3 bg-white">
                <div className="bg-amber-50/80 border border-amber-200/60 rounded-lg p-3 text-xs">
                  <span className="font-bold text-amber-900">📍 VỊ TRÍ CHÈN TRONG GIÁO ÁN CỦA BẠN:</span>
                  <p className="text-slate-700 font-medium pl-2 mt-0.5">Mục I. MỤC TIÊU &gt; 2. Về năng lực &gt; Cuối mục 2.2 Năng lực chung (trước 3. Về phẩm chất)</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">📌 NỘI DUNG NLS CẦN DÁN (CHỮ MÀU ĐỎ - TIMES NEW ROMAN):</span>
                  <div 
                    className="text-red-600 whitespace-pre-line leading-relaxed font-bold"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    {objectivesText}
                  </div>
                </div>
              </div>
            </div>

            {/* Các Hoạt động 1, 2, 3 */}
            {activities.map((act: any, idx: number) => {
              const actName = normalizeVietnamese(act.activity_name || act.activity_title || `HOẠT ĐỘNG ${idx + 1}`);
              const actContent = normalizeVietnamese(act.enhanced_content || act.content || "");
              return (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> MỤC {idx + 2}: {actName.toUpperCase()}</span>
                    <button onClick={() => handleCopyText(actContent, idx + 2)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[10px] flex items-center gap-1.5 cursor-pointer">
                      {copiedIndex === idx + 2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedIndex === idx + 2 ? "Đã copy!" : "Copy đoạn NLS này"}
                    </button>
                  </div>
                  <div className="p-4 space-y-3 bg-white">
                    <div className="bg-amber-50/80 border border-amber-200/60 rounded-lg p-3 text-xs">
                      <span className="font-bold text-amber-900">📍 VỊ TRÍ CHÈN TRONG GIÁO ÁN CỦA BẠN:</span>
                      <p className="text-slate-700 font-medium pl-2 mt-0.5">
                        {act.location || `Mục III. TIẾN TRÌNH DẠY HỌC > ${actName} > Vùng Tổ chức thực hiện`}
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">📌 NỘI DUNG NLS CẦN DÁN (CHỮ MÀU ĐỎ - TIMES NEW ROMAN):</span>
                      <div 
                        className="text-red-600 whitespace-pre-line leading-relaxed font-bold"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                      >
                        {actContent}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        ) : (
          <div className="text-center py-12 space-y-5">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Download className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-base font-bold text-slate-800">Xuất file Word tự động (.docx)</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hệ thống sẽ tự động ghép nối tất cả các phần tích hợp năng lực vào đúng từng vị trí trong file Word gốc của bạn mà vẫn bảo lưu 100% định dạng, bảng biểu và công thức MathType.
              </p>
            </div>
            <button onClick={() => onConfirm(initialContent)} className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-200 flex items-center gap-2 mx-auto transition-all cursor-pointer">
              <Download className="w-4 h-4" /> Tải về file hoàn chỉnh (.docx)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}