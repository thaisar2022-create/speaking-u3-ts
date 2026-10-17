export type DocumentCategory = 
  | 'Lesson Notes' 
  | 'Homework' 
  | 'Audio Recordings' 
  | 'Certificates & IDs' 
  | 'Financial & Receipts' 
  | 'Other';

export interface UserDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // mime type
  uploadedAt: string; // ISO string
  dataUrl: string; // base64 or blob URI
  isEncrypted?: boolean;
  isLocked?: boolean;
  tags: string[];
  notes?: string;
}

export interface DocumentStats {
  totalCount: number;
  totalSize: number;
  categoryCounts: Record<string, number>;
}
