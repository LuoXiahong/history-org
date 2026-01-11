import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FileDropzone } from '../components/FileDropzone';
import { uploadDocument } from '../api/ingestion.api';
import type { DocumentResponse } from '../types';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedDocument, setUploadedDocument] =
    useState<DocumentResponse | null>(null);

  const mutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: (data) => {
      setUploadedDocument(data);
    },
  });

  const status: UploadStatus = mutation.isPending
    ? 'uploading'
    : mutation.isSuccess
      ? 'success'
      : mutation.isError
        ? 'error'
        : 'idle';

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadedDocument(null);
    mutation.reset();
  }, [mutation]);

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      mutation.mutate(selectedFile);
    }
  }, [selectedFile, mutation]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setUploadedDocument(null);
    mutation.reset();
  }, [mutation]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
        <p className="mt-2 text-gray-600">
          Upload a Markdown document to index and extract historical entities.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {status === 'success' && uploadedDocument ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Upload Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              Your document has been uploaded and is being processed.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">File Name</dt>
                  <dd className="font-medium text-gray-900">
                    {uploadedDocument.fileName}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Document ID</dt>
                  <dd className="font-mono text-xs text-gray-700">
                    {uploadedDocument.id}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Indexed At</dt>
                  <dd className="text-gray-900">
                    {new Date(uploadedDocument.indexedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="
                  px-6 py-3 rounded-xl border border-gray-300
                  text-gray-700 font-medium
                  hover:bg-gray-50 transition-colors
                "
              >
                Upload Another
              </button>
              <Link
                to="/search"
                className="
                  inline-flex items-center justify-center gap-2
                  px-6 py-3 rounded-xl
                  bg-indigo-600 text-white font-medium
                  hover:bg-indigo-700 transition-colors
                "
              >
                Search Knowledge
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <FileDropzone
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              disabled={status === 'uploading'}
              error={
                mutation.isError
                  ? mutation.error instanceof Error
                    ? mutation.error.message
                    : 'Upload failed. Please try again.'
                  : null
              }
            />

            {selectedFile && status !== 'error' && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={status === 'uploading'}
                  className="
                    inline-flex items-center gap-2
                    px-8 py-3 rounded-xl
                    bg-indigo-600 text-white font-semibold
                    hover:bg-indigo-700 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {status === 'uploading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Upload & Index</>
                  )}
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="
                    inline-flex items-center gap-2
                    px-6 py-3 rounded-xl
                    border border-gray-300 text-gray-700 font-medium
                    hover:bg-gray-50 transition-colors
                  "
                >
                  <AlertCircle className="w-5 h-5" />
                  Try Again
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8 p-6 bg-indigo-50 rounded-xl border border-indigo-100">
        <h3 className="font-semibold text-indigo-900 mb-2">How it works</h3>
        <ol className="space-y-2 text-sm text-indigo-800">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Upload a Markdown (.md) file with historical content</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>
              The document is saved and indexed in the knowledge base
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>
              AI extracts persons, events, and relationships automatically
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>Search and explore the extracted entities</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
