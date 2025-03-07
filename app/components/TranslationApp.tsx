"use client";

import { useState } from "react";
import FileUploader from "./FileUploader";
import LinkInput from "./LinkInput";
import DropZone from "./DropZone";
import UploadStatus from "./UploadStatus";
import TranslationProcess from "./TranslationProcess";
import TranslationQualityEvaluator from "./TranslationQualityEvaluator";

export default function TranslationApp() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [translationUrl, setTranslationUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "upload" | "link" | "drop" | "evaluate"
  >("upload");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
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

  // 开始翻译质量评估
  const startEvaluation = () => {
    setIsEvaluating(true);
  };

  // 返回上传界面
  const handleBack = () => {
    setIsTranslating(false);
    setIsEvaluating(false);
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

  // 如果正在评估，显示翻译质量评估页面
  if (isEvaluating) {
    return <TranslationQualityEvaluator onBack={handleBack} />;
  }

  // 检查是否有可翻译的内容
  const hasTranslatableContent =
    uploadedFiles.length > 0 || !!translationUrl || !!manualContent;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
          智能翻译平台
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          专业多语言翻译服务 | 高精度 | 高效率 | 智能校对
        </p>

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
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${
              activeTab === "evaluate"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("evaluate")}
          >
            翻译质量评估
          </button>
        </div>

        {/* 内容区域 */}
        <div className="mb-8">
          {activeTab === "upload" && (
            <FileUploader onFileSelect={handleFileSelect} multiple={true} />
          )}
          {activeTab === "link" && (
            <LinkInput onLinkSubmit={handleLinkSubmit} />
          )}
          {activeTab === "drop" && <DropZone onFilesDrop={handleFilesDrop} />}
          {activeTab === "evaluate" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                翻译质量评估
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                上传或粘贴原文和译文，我们将对翻译质量进行专业评估，提供详细的评分和改进建议。
              </p>
              <div className="flex justify-center">
                <button
                  onClick={startEvaluation}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg font-semibold"
                >
                  开始评估翻译质量
                </button>
              </div>
            </div>
          )}
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
    </div>
  );
}
