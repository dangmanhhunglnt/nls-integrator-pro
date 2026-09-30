// API Configuration
const PANDOC_API_URL = 'https://pandocserver-production.up.railway.app/convert';

/**
 * Convert Markdown to DOCX using Pandoc API
 * This ensures Tables are real Word Tables and Math is real Word Equations (OMML)
 */
export async function convertMarkdownToDocx(markdown: string): Promise<Blob> {
  try {
    const response = await fetch(PANDOC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ markdown: markdown })
    });
    
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      // Nếu server trả về HTML (lỗi 502/503 do Railway ngủ đông)
      if (contentType.includes('text/html')) {
        throw new Error(`Máy chủ Pandoc đang khởi động lại (Railway Sleep Mode). Thầy vui lòng đợi 10 giây rồi bấm lại giúp em nhé!`);
      }
      const errorText = await response.text();
      throw new Error(`Pandoc Server Error: ${response.status} - ${errorText}`);
    }
    
    // Kiểm tra nếu server trả về JSON lỗi thay vì file Blob Word
    if (contentType.includes('application/json')) {
      const jsonRes = await response.json();
      throw new Error(jsonRes.error || 'Lỗi xử lý từ máy chủ chuyển đổi.');
    }

    return await response.blob();
  } catch (error: any) {
    console.error("Docx Conversion Error:", error);
    throw new Error(`${error.message}`);
  }
}

/**
 * Helper to download Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}