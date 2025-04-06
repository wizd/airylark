"use client";

import { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

// 定义各个步骤的数据类型
interface PlanningData {
  contentType?: string;
  style?: string;
  specializedKnowledge?: string[];
  keyTerms?: Record<string, string>;
}

interface TranslatingData {
  currentSegmentIndex?: number;
  totalSegments?: number;
  currentSegment?: string;
  currentTranslation?: string;
}

interface ReviewingData {
  reviewNotes?: string | string[];
  improvements?: string | string[];
}

// 使用联合类型代替 any
type ThinkingData = PlanningData | TranslatingData | ReviewingData | null;

interface TranslationThinkingProps {
  step: "planning" | "translating" | "reviewing" | "completed";
  isLoading: boolean;
  data: ThinkingData;
  autoCollapse?: boolean;
}

export default function TranslationThinking({
  step,
  isLoading,
  data,
  autoCollapse = true
}: TranslationThinkingProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // 当翻译完成时自动折叠
  useEffect(() => {
    if (autoCollapse && step === "completed") {
      setIsExpanded(false);
    }
  }, [step, autoCollapse]);

  const getStepTitle = () => {
    switch (step) {
      case "planning":
        return "规划翻译策略";
      case "translating":
        return "翻译文本内容";
      case "reviewing":
        return "审校优化译文";
      case "completed":
        return "翻译处理完成";
      default:
        return "处理中";
    }
  };

  const getThinkingContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
          <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>思考中...</span>
        </div>
      );
    }

    switch (step) {
      case "planning":
        return renderPlanningThinking(data as PlanningData);
      case "translating":
        return renderTranslatingThinking(data as TranslatingData);
      case "reviewing":
        return renderReviewingThinking(data as ReviewingData);
      case "completed":
        return (
          <div className="text-green-500 dark:text-green-400">处理完成</div>
        );
      default:
        return null;
    }
  };

  const renderPlanningThinking = (data: PlanningData) => {
    if (!data) return null;

    return (
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            文本分析
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            正在分析文本类型、风格特点和专业领域...
          </p>
        </div>

        {data.contentType && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              识别文本类型
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              检测到文本类型为:{" "}
              <span className="text-blue-500 dark:text-blue-400">
                {data.contentType}
              </span>
            </p>
          </div>
        )}

        {data.style && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              风格分析
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              文本风格:{" "}
              <span className="text-blue-500 dark:text-blue-400">
                {data.style}
              </span>
            </p>
          </div>
        )}

        {data.specializedKnowledge && data.specializedKnowledge.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              专业领域
            </h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.specializedKnowledge.map(
                (knowledge: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                  >
                    {knowledge}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {data.keyTerms && Object.keys(data.keyTerms).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              关键术语识别
            </h4>
            <div className="mt-1 text-sm">
              {Object.entries(data.keyTerms).map(
                ([en, zh]: [string, string], index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-gray-800 dark:text-gray-200">
                      {en}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-blue-500 dark:text-blue-400">
                      {zh}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTranslatingThinking = (data: TranslatingData) => {
    if (!data) return null;

    return (
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            翻译进度
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            正在翻译段落{" "}
            {data.currentSegmentIndex ? data.currentSegmentIndex + 1 : "..."}/
            {data.totalSegments || "..."}
          </p>
        </div>

        {data.currentSegment && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              当前段落
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded">
              {data.currentSegment}
            </p>
          </div>
        )}

        {data.currentTranslation && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              翻译结果
            </h4>
            <p className="text-sm text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-2 rounded">
              {data.currentTranslation}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderReviewingThinking = (data: ReviewingData) => {
    if (!data) return null;

    return (
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            审校进度
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            正在进行整体审校和优化...
          </p>
        </div>

        {data.reviewNotes && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              审校笔记
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
              {Array.isArray(data.reviewNotes) ? (
                data.reviewNotes.map((note: string, index: number) => (
                  <li key={index}>{note}</li>
                ))
              ) : (
                <li>{data.reviewNotes}</li>
              )}
            </ul>
          </div>
        )}

        {data.improvements && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              改进项
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
              {Array.isArray(data.improvements) ? (
                data.improvements.map((improvement: string, index: number) => (
                  <li key={index}>{improvement}</li>
                ))
              ) : (
                <li>{data.improvements}</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              step === "completed"
                ? "bg-green-500"
                : isLoading
                ? "bg-blue-500 animate-pulse"
                : "bg-blue-500"
            }`}
          ></div>
          <h3 className="font-medium text-gray-800 dark:text-white">
            {getStepTitle()}
          </h3>
        </div>
        <div>
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {getThinkingContent()}
        </div>
      )}
    </div>
  );
}
