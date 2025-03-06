"use client";

import { useState, useEffect } from "react";

interface UploadStatusProps {
  files: File[];
  onRemove: (index: number) => void;
  uploadProgress?: number;
}

export default function UploadStatus({
  files,
  onRemove,
  uploadProgress = 0
}: UploadStatusProps) {
  const [progress, setProgress] = useState(uploadProgress);

  // 模拟上传进度
  useEffect(() => {
    if (files.length > 0 && progress < 100) {
      const timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + 5, 100));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [files.length, progress]);

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
        上传文件 ({files.length})
      </h3>

      <div className="space-y-3">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {progress < 100 ? (
                <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              ) : (
                <span className="text-xs text-green-500">完成</span>
              )}

              <button
                onClick={() => onRemove(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {progress < 100 && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
            {progress}%
          </p>
        </div>
      )}

      {progress === 100 && (
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            开始翻译
          </button>
        </div>
      )}
    </div>
  );
}
