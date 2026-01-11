import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  disabled?: boolean;
  error?: string | null;
}

export function FileDropzone({
  onFileSelect,
  selectedFile,
  disabled = false,
  error,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        'text/markdown': ['.md'],
      },
      maxFiles: 1,
      disabled,
    });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 cursor-pointer',
          'flex flex-col items-center justify-center text-center',
          isDragActive && !isDragReject && 'border-indigo-500 bg-indigo-50',
          isDragReject && 'border-red-500 bg-red-50',
          !isDragActive &&
            !selectedFile &&
            'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50',
          selectedFile && !isDragActive && 'border-emerald-500 bg-emerald-50',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input {...getInputProps()} />

        {selectedFile ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-emerald-800">
              {selectedFile.name}
            </p>
            <p className="text-sm text-emerald-600 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop to
              change
            </p>
          </>
        ) : isDragReject ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-lg font-semibold text-red-800">
              Only .md files allowed
            </p>
          </>
        ) : (
          <>
            <div
              className={clsx(
                'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
                isDragActive ? 'bg-indigo-100' : 'bg-gray-100',
              )}
            >
              <Upload
                className={clsx(
                  'w-8 h-8 transition-colors',
                  isDragActive ? 'text-indigo-600' : 'text-gray-500',
                )}
              />
            </div>
            <p className="text-lg font-semibold text-gray-700">
              {isDragActive ? 'Drop your file here' : 'Drag & drop your file'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse • Only .md files
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
