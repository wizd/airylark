"use client";

import { useState, useRef, useCallback } from "react";

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  acceptedFileTypes?: string;
  maxFileSize?: number; // 单位：MB
  multiple?: boolean;
}

export default function FileUploader({
  onFileSelect,
  acceptedFileTypes = ".pdf,.doc,.docx,.txt,.md",
  maxFileSize = 10, // 默认10MB
  multiple = false
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError(null);
      const fileArray = Array.from(files);
      const validFiles: File[] = [];

      // 验证文件
      for (const file of fileArray) {
        // 检查文件大小
        if (file.size > maxFileSize * 1024 * 1024) {
          setError(`文件 "${file.name}" 超过最大限制 ${maxFileSize}MB`);
          continue;
        }

        // 检查文件类型（如果指定了接受的文件类型）
        if (acceptedFileTypes && acceptedFileTypes !== "*") {
          const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
          const acceptedTypes = acceptedFileTypes.split(",");

          if (
            !acceptedTypes.some(
              (type) =>
                type.trim() === fileExtension ||
                type.trim() === ".*" ||
                type.trim() === "*"
            )
          ) {
            setError(
              `文件 "${file.name}" 类型不支持。支持的类型: ${acceptedFileTypes}`
            );
            continue;
          }
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onFileSelect(validFiles);
      }
    },
    [acceptedFileTypes, maxFileSize, onFileSelect]
  );

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 拖放事件处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) {
        setIsDragging(true);
      }
    },
    [isDragging]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [handleFileSelect]
  );

  return (
    <div className="w-full">
      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={acceptedFileTypes}
        multiple={multiple}
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* 上传按钮 */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-blue-600 dark:text-blue-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          上传文件
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-4">
          支持 PDF、Word、TXT 等多种格式
        </p>
        <button
          onClick={handleButtonClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          选择文件
        </button>
      </div>

      {/* 拖放区域 */}
      <div
        className={`mt-6 w-full h-24 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-gray-600"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="text-gray-500 dark:text-gray-300 text-sm">
          {isDragging ? "释放文件以上传" : "拖放文件到这里"}
        </p>
      </div>

      {/* 错误提示 */}
      {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
    </div>
  );
}
