export interface DocumentResponse {
  id: string;
  filePath: string;
  fileName: string;
  title: string | null;
  contentHash: string;
  lastModified: string;
  indexedAt: string;
  updatedAt: string;
}

export interface UploadProgress {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  message: string;
}
