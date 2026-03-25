'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function FileUpload({ onFileSelect, disabled = false }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-800/50 border-slate-700' : ''}
        ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}
        ${isDragReject ? 'border-red-500 bg-red-500/10' : ''}
      `}
    >
      <input {...getInputProps()} />
      <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-indigo-400' : 'text-slate-500'}`} />
      
      {isDragActive ? (
        <p className="text-indigo-300 font-medium">Drop the Excel/CSV file here...</p>
      ) : (
        <div className="space-y-1">
          <p className="text-slate-300 font-medium text-lg">
            Drag & drop your file here, or click to select
          </p>
          <p className="text-slate-500 text-sm text-balance">
            Supports .xlsx, .xls, and .csv files. Ensure it contains columns for State, NPI Type, and Taxonomy Description.
          </p>
        </div>
      )}
    </div>
  );
}
