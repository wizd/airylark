"use client";

import { useState } from "react";
import FileUploader from "./FileUploader";
import LinkInput from "./LinkInput";
import DropZone from "./DropZone";
import UploadStatus from "./UploadStatus";
import TranslationProcess from "./TranslationProcess";

export default function TranslationApp() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [translationUrl, setTranslationUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "link" | "drop">(
    "upload"
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [manualContent, setManualContent] = useState<string | null>(null);

  // 处理文件上传
  const handleFileSelect = (files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
    setTranslationUrl(null);
    setManualContent(null);
  };

  // 处理链接提交
  const handleLinkSubmit = (url: string) => {
    setTranslationUrl(url);
    setUploadedFiles([]);
    setManualContent(null);
  };

  // 处理文件拖放
  const handleFilesDrop = (files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
    setTranslationUrl(null);
    setManualContent(null);
  };

  // 移除上传的文件
  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 开始翻译
  const startTranslation = () => {
    setIsTranslating(true);
  };

  // 返回上传界面
  const handleBack = () => {
    setIsTranslating(false);
  };

  // 如果正在翻译，显示翻译处理页面
  if (isTranslating) {
    return (
      <TranslationProcess
        content={manualContent}
        url={translationUrl}
        files={uploadedFiles}
        onBack={handleBack}
      />
    );
  }

  // 检查是否有可翻译的内容
  const hasTranslatableContent =
    uploadedFiles.length > 0 || !!translationUrl || !!manualContent;

  return (
    <div className="w-full max-w-4xl mx-auto rounded-xl bg-white dark:bg-gray-800 shadow-lg p-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
          智能文档翻译
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          上传您的文档、输入链接或拖放文件，获取高质量翻译
        </p>
      </div>

      {/* 选项卡 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${
            activeTab === "upload"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("upload")}
        >
          上传文件
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${
            activeTab === "link"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("link")}
        >
          输入链接
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm focus:outline-none ${
            activeTab === "drop"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("drop")}
        >
          拖放文件
        </button>
      </div>

      {/* 内容区域 */}
      <div className="mb-8">
        {activeTab === "upload" && (
          <FileUploader onFileSelect={handleFileSelect} multiple={true} />
        )}
        {activeTab === "link" && <LinkInput onLinkSubmit={handleLinkSubmit} />}
        {activeTab === "drop" && <DropZone onFilesDrop={handleFilesDrop} />}
      </div>

      {/* 上传状态 */}
      {uploadedFiles.length > 0 && (
        <div>
          <UploadStatus files={uploadedFiles} onRemove={handleRemoveFile} />
          <div className="mt-4 flex justify-end">
            <button
              onClick={startTranslation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              开始翻译
            </button>
          </div>
        </div>
      )}

      {/* 链接状态 */}
      {translationUrl && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            待翻译链接
          </h3>
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
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
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {translationUrl}
                </p>
              </div>
            </div>
            <div>
              <button
                onClick={() => setTranslationUrl(null)}
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
          <div className="mt-4 flex justify-end">
            <button
              onClick={startTranslation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              开始翻译
            </button>
          </div>
        </div>
      )}

      {/* 直接输入文本选项 */}
      {!uploadedFiles.length && !translationUrl && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            直接输入文本
          </h3>
          <textarea
            className="w-full h-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="在此处粘贴需要翻译的文本..."
            value={manualContent || ""}
            onChange={(e) => setManualContent(e.target.value)}
          ></textarea>
          {manualContent && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={startTranslation}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                开始翻译
              </button>
            </div>
          )}
        </div>
      )}

      {/* 全局开始翻译按钮 */}
      {hasTranslatableContent && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={startTranslation}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg font-semibold"
          >
            开始智能翻译
          </button>
        </div>
      )}

      {/* 支持的语言 */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          支持的语言
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            "英语",
            "中文",
            "日语",
            "韩语",
            "法语",
            "德语",
            "西班牙语",
            "俄语",
            "阿拉伯语"
          ].map((lang) => (
            <span
              key={lang}
              className="px-3 py-1 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm border border-gray-200 dark:border-gray-500"
            >
              {lang}
            </span>
          ))}
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm border border-blue-200 dark:border-blue-800">
            更多语言...
          </span>
        </div>
      </div>
    </div>
  );
}
