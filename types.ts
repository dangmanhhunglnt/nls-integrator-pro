export interface EnhancedActivityItem {
  activity_name: string;
  enhanced_content: string;
  location?: string;
}

export interface SummaryTableItem {
  stt: string;
  code: string;
  component: string;
  expression: string;
  activity: string;
}

export interface GeneratedNLSContent {
  objectives_addition: string;
  materials_addition: string;
  activities_enhancement: EnhancedActivityItem[];
  summary_table?: SummaryTableItem[];
}

export type IntegrationMode = 'NLS_AI' | 'NLS' | 'NAI';
export type SubjectType = string;
export type GradeType = string;

// Bổ sung: Mức độ tích hợp (Tiêu chuẩn / Chuyên sâu thao giảng)
export type IntegrationLevel = 'STANDARD' | 'INTENSIVE';

// Bổ sung: Kiểu xuất file (Chèn trực tiếp vào giáo án gốc / Xuất phụ lục riêng)
export type OutputFormat = 'INJECT_DIRECT' | 'APPENDIX_ONLY';

// Bổ sung: Tùy chỉnh màu chữ chèn (Đỏ / Xanh dương đậm / Đen)
export type HighlightColor = 'FF0000' | '1D4ED8' | '000000';

export interface AppState {
  file: File | null;
  subject: SubjectType;
  grade: GradeType;
  isProcessing: boolean;
  step: 'upload' | 'review' | 'done';
  logs: string[];
  config: {
    insertObjectives: boolean;
    insertMaterials: boolean;
    insertActivities: boolean;
    appendTable: boolean;
  };
  highlightColor: HighlightColor; // Quản lý màu chữ chèn
  generatedContent: GeneratedNLSContent | null;
  result: { fileName: string; blob: Blob } | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  plan: 'FREE' | 'PRO' | 'SCHOOL';
  usageCount: number; // Số lượt giáo án đã tích hợp
  maxUsage: number;   // Giới hạn (Ví dụ: Free = 3 lượt, Pro = 9999)
  expireDate?: string; // Hạn dùng gói Pro
}