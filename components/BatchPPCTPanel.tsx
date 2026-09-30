import React, { useState } from 'react';
import { processBatchPPCT } from '../services/ppctParser';
import { createZipFromBlobs } from '../services/docxManipulator';
import { HighlightColor, IntegrationMode, GeneratedNLSContent } from '../types';

export default function BatchPPCTPanel() {
  const [ppctFile, setPpctFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('Toan');
  const [grade, setGrade] = useState('11');
  const [colorHex, setColorHex] = useState<HighlightColor>('red' as HighlightColor);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logMessage, setLogMessage] = useState('');

  const handleRunBatch = async () => {
    if (!ppctFile || !templateFile) {
      alert("Vui lòng tải lên cả file Phân phối chương trình (PPCT) và file giáo án mẫu chuẩn!");
      return;
    }

    try {
      setIsProcessing(true);
      setLogMessage("Đang đọc và phân tích bảng PPCT vạn năng...");

      const dummyAIContent = async (baihoc: string, mode: IntegrationMode): Promise<GeneratedNLSContent> => {
        return {
          objectives_addition: `Tích hợp nội dung ${mode} cho bài: ${baihoc}`,
          materials_addition: "Máy chiếu, bảng tương tác, phần mềm mô phỏng số.",
          activities_enhancement: [
            // Đảm bảo không dùng thuộc tính lạ 'content' gây lỗi kiểu dữ liệu
          ],
          summary_table: []
        };
      };

      const generatedFiles = await processBatchPPCT(
        ppctFile,
        templateFile,
        subject,
        grade,
        colorHex,
        dummyAIContent
      );

      setLogMessage(`Đã xử lý xong ${generatedFiles.length} tiết học. Đang đóng gói file ZIP...`);

      const zipBlob = await createZipFromBlobs(generatedFiles);
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GiaoAn_${subject}_Lop${grade}_TheoPPCT.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setLogMessage("Hoàn tất! Đã tải xuống tệp ZIP giáo án tự động theo PPCT.");
    } catch (error) {
      console.error(error);
      setLogMessage("Có lỗi xảy ra trong quá trình xử lý PPCT. Thầy kiểm tra lại định dạng file nhé.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-200 mt-6 max-w-4xl mx-auto">
      <h3 className="text-lg font-bold text-slate-800 mb-2">🚀 Xử lý hàng loạt tự động theo PPCT (Vạn năng mọi môn & khối)</h3>
      <p className="text-sm text-slate-500 mb-4">
        Hệ thống tự động nhận diện cột ghi chú để tích hợp (STEM, NLS, AI) hoặc đưa về chuẩn 5512, tự động đặt tên file chuẩn <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">monlop_tuanx_tiet_tenbai</code>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Môn học:</label>
          <input 
            type="text" 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)} 
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Khối lớp:</label>
          <select 
            value={grade} 
            onChange={(e) => setGrade(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="10">Lớp 10</option>
            <option value="11">Lớp 11</option>
            <option value="12">Lớp 12</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Màu chữ chèn:</label>
          <select 
            value={colorHex} 
            onChange={(e) => setColorHex(e.target.value as HighlightColor)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="red">Đỏ</option>
            <option value="blue">Xanh</option>
            <option value="black">Đen</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">1. Tải lên file Phân phối chương trình (.docx):</label>
          <input 
            type="file" 
            accept=".docx" 
            onChange={(e) => e.target.files && setPpctFile(e.target.files[0])}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">2. Tải lên file Giáo án mẫu chuẩn (.docx):</label>
          <input 
            type="file" 
            accept=".docx" 
            onChange={(e) => e.target.files && setTemplateFile(e.target.files[0])}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          />
        </div>
      </div>

      <button
        onClick={handleRunBatch}
        disabled={isProcessing}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white shadow-md transition-all ${
          isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isProcessing ? 'Đang phân tích và xuất hàng loạt...' : '⚡ Bắt đầu tự động hóa toàn bộ PPCT & Tải file ZIP'}
      </button>

      {logMessage && (
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
          💡 <strong>Trạng thái:</strong> {logMessage}
        </div>
      )}
    </div>
  );
}