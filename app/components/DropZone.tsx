"use client";

import { useState, useCallback } from "react";

interface DropZoneProps {
  onFilesDrop: (files: File[]) => void;
  acceptedFileTypes?: string;
  maxFileSize?: number; // 单位：MB
}

export default function DropZone({
  onFilesDrop,
  acceptedFileTypes = ".pdf,.doc,.docx,.txt,.md",
  maxFileSize = 10 // 默认10MB
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      setError(null);
      const validFiles: File[] = [];

      for (const file of files) {
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

      return validFiles;
    },
    [acceptedFileTypes, maxFileSize]
  );

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

      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(droppedFiles);

      if (validFiles.length > 0) {
        onFilesDrop(validFiles);
      }
    },
    [onFilesDrop, validateFiles]
  );

  return (
    <div className="w-full">
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          拖放文件
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-4">
          直接拖放文件到此处开始翻译
        </p>
      </div>

      <div
        className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
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
