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