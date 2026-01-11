import { apiClient } from '../../../lib/axios';
import type { DocumentResponse } from '../types';

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<DocumentResponse>(
    '/ingestion/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}

export async function indexDocument(filePath: string): Promise<DocumentResponse> {
  const response = await apiClient.post<DocumentResponse>('/ingestion/documents', {
    filePath,
  });

  return response.data;
}
