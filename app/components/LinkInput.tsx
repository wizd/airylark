"use client";

import { useState } from "react";

interface LinkInputProps {
  onLinkSubmit: (url: string) => void;
}

export default function LinkInput({ onLinkSubmit }: LinkInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 简单的URL验证
    if (!url.trim()) {
      setError("请输入链接");
      return;
    }

    // 检查URL格式
    try {
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith("http")) {
        setError("请输入有效的http或https链接");
        return;
      }
      setError(null);
      onLinkSubmit(url);
    } catch {
      setError("请输入有效的URL");
    }
  };

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
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          输入链接
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-4">
          直接翻译网页或在线文档内容
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            翻译链接
          </button>
        </div>
      </form>

      {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
    </div>
  );
}
