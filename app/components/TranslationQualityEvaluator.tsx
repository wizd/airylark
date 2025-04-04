"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";

interface TranslationQualityEvaluatorProps {
  onBack: () => void;
}

interface Suggestion {
  start: number;
  end: number;
  originalText: string;
  suggestedText: string;
  type: string;
  description: string;
  reason: string;
  operations?: Array<{
    type: 'keep' | 'delete' | 'insert' | 'replace';
    sourceStart: number;
    sourceEnd: number;
    targetStart: number;
    targetEnd: number;
    content?: string;
  }>;
}

interface AnnotatedTranslationProps {
  text: string;
  suggestions: Suggestion[];
}

function AnnotatedTranslation({ text, suggestions }: AnnotatedTranslationProps) {
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);

  // 将建议按位置排序，并对重叠的建议进行合并
  const sortedSuggestions = [...suggestions]
    .sort((a, b) => a.start - b.start)
    .reduce((acc, curr) => {
      // 检查是否有重叠的建议
      const overlap = acc.find(s => 
        (curr.start >= s.start && curr.start <= s.end) ||
        (curr.end >= s.start && curr.end <= s.end)
      );
      
      if (overlap) {
        // 如果是相同类型的问题，合并它们
        if (overlap.type === curr.type) {
          overlap.end = Math.max(overlap.end, curr.end);
          overlap.reason = `${overlap.reason}; ${curr.reason}`;
        }
      } else {
        acc.push(curr);
      }
      return acc;
    }, [] as Suggestion[]);
  
  // 如果没有建议，直接显示原文
  if (sortedSuggestions.length === 0) {
    return <span>{text}</span>;
  }

  // 构建带有标注的文本
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedSuggestions.forEach((suggestion, index) => {
    // 添加建议前的文本
    if (suggestion.start > lastIndex) {
      elements.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, suggestion.start)}
        </span>
      );
    }

    // 显示修改建议
    const originalText = text.substring(suggestion.start, suggestion.end);

    // 始终显示原始文本（带删除线）和修改后的文本（绿色）
    elements.push(
      <span
        key={`suggestion-${index}`}
        className="group relative inline-block"
        onMouseEnter={() => setActiveSuggestion(suggestion)}
        onMouseLeave={() => setActiveSuggestion(null)}
      >
        <span className="text-red-500 dark:text-red-400 line-through">
          {suggestion.originalText}
        </span>
        {suggestion.suggestedText && (
          <span className="text-green-600 dark:text-green-400 ml-1">
            {suggestion.suggestedText}
          </span>
        )}
        {/* 悬浮提示 */}
        {activeSuggestion === suggestion && (
          <div
            className="absolute left-0 top-full mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 text-sm rounded shadow-lg 
                      z-10 whitespace-normal max-w-xs border border-yellow-200 dark:border-yellow-800"
          >
            <div className="font-medium mb-1 text-yellow-800 dark:text-yellow-200">
              {suggestion.type}
            </div>
            <div className="text-yellow-700 dark:text-yellow-300">
              {suggestion.reason}
            </div>
          </div>
        )}
      </span>
    );

    lastIndex = suggestion.end;
  });

  // 添加最后一个建议后的文本
  if (lastIndex < text.length) {
    elements.push(
      <span key="text-end">{text.substring(lastIndex)}</span>
    );
  }

  return <span className="relative">{elements}</span>;
}

export default function TranslationQualityEvaluator({
  onBack
}: TranslationQualityEvaluatorProps) {
  // 原文和译文状态
  const [originalText, setOriginalText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");

  // 分段后的原文和译文
  const [originalSegments, setOriginalSegments] = useState<string[]>([]);
  const [translatedSegments, setTranslatedSegments] = useState<string[]>([]);

  // 评分结果
  const [evaluationResults, setEvaluationResults] = useState<{
    score: number;
    comments: string[];
    segmentScores: number[];
    segmentFeedbacks?: {
      segmentIndex: number;
      issues: {
        type: string;
        description: string;
        originalText: string;
        translatedText: string;
        suggestion: string;
        start: number;
        end: number;
        reason: string;
      }[];
    }[];
  } | null>(null);

  // 加载状态
  const [isEvaluating, setIsEvaluating] = useState(false);

  // 文本框引用
  const originalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const translatedTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 调整文本框高度的函数
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    if (!textarea) return;
    textarea.style.height = "0px";
    const newHeight = textarea.scrollHeight;
    textarea.style.height = `${newHeight}px`;
  };

  // 监听窗口大小变化，重新调整所有文本框高度
  useEffect(() => {
    const handleResize = () => {
      if (originalTextareaRef.current) {
        adjustTextareaHeight(originalTextareaRef.current);
      }
      if (translatedTextareaRef.current) {
        adjustTextareaHeight(translatedTextareaRef.current);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 处理原文输入
  const handleOriginalTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setOriginalText(e.target.value);
    if (originalTextareaRef.current) {
      adjustTextareaHeight(originalTextareaRef.current);
    }
  };

  // 处理译文输入
  const handleTranslatedTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setTranslatedText(e.target.value);
    if (translatedTextareaRef.current) {
      adjustTextareaHeight(translatedTextareaRef.current);
    }
  };

  // 开始评估翻译质量
  const startEvaluation = async () => {
    if (!originalText.trim() || !translatedText.trim()) {
      alert("请同时输入原文和译文");
      return;
    }

    // 设置加载状态
    setIsEvaluating(true);

    try {
      // 调用API
      const response = await fetch("/api/evaluate-translation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          originalText,
          translatedText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('评估请求失败详情:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`评估请求失败: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('评估结果:', result);

      // 更新状态
      setOriginalSegments(result.originalSegments);
      setTranslatedSegments(result.translatedSegments);
      setEvaluationResults({
        score: result.score,
        comments: result.comments,
        segmentScores: result.segmentScores,
        segmentFeedbacks: result.segmentFeedbacks
      });
    } catch (error) {
      console.error("评估失败详情:", error);
      alert(`评估过程中出现错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 清空所有内容
  const handleClear = () => {
    setOriginalText("");
    setTranslatedText("");
    setOriginalSegments([]);
    setTranslatedSegments([]);
    setEvaluationResults(null);
  };

  // 重新评估
  const handleReassess = () => {
    setEvaluationResults(null);  // 只清空评估结果
    startEvaluation();  // 重新开始评估
  };

  // 提取段落编号
  const extractSegmentNumber = (segment: string) => {
    const match = segment.match(/^\[(\d+)\]/);
    return match ? match[1] : "";
  };

  // 提取段落内容（去除编号）
  const extractSegmentContent = (segment: string) => {
    return segment.replace(/^\[\d+\]\s*/, "");
  };

  // 获取评分对应的颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            翻译质量评估
          </h2>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            返回
          </button>
        </div>

        {!evaluationResults ? (
          <>
            {/* 输入区域 */}
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
                使用说明
              </h3>
              <ul className="list-disc list-inside text-blue-700 dark:text-blue-400 text-sm">
                <li>请在左侧输入原文，右侧输入译文</li>
                <li>系统将自动分析翻译质量并给出评分和建议</li>
                <li>评分标准包括准确性、流畅度、术语一致性等多个维度</li>
                <li>评估结果将指出具体问题所在的句子，并提供改进建议</li>
                <li>建议每次评估的文本不超过5000字</li>
              </ul>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* 原文输入 */}
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    原文
                  </h4>
                </div>
                <textarea
                  ref={originalTextareaRef}
                  value={originalText}
                  onChange={handleOriginalTextChange}
                  className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600 min-h-[300px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-500"
                  placeholder="请在此处粘贴原文..."
                  style={{ height: "auto", overflow: "hidden" }}
                  onInput={(e) =>
                    adjustTextareaHeight(e.target as HTMLTextAreaElement)
                  }
                />
              </div>

              {/* 译文输入 */}
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    译文
                  </h4>
                </div>
                <textarea
                  ref={translatedTextareaRef}
                  value={translatedText}
                  onChange={handleTranslatedTextChange}
                  className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600 min-h-[300px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-500"
                  placeholder="请在此处粘贴译文..."
                  style={{ height: "auto", overflow: "hidden" }}
                  onInput={(e) =>
                    adjustTextareaHeight(e.target as HTMLTextAreaElement)
                  }
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={startEvaluation}
                disabled={
                  !originalText.trim() || !translatedText.trim() || isEvaluating
                }
                className={`px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg font-semibold ${
                  (!originalText.trim() ||
                    !translatedText.trim() ||
                    isEvaluating) &&
                  "opacity-50 cursor-not-allowed"
                }`}
              >
                {isEvaluating ? "评估中..." : "开始评估"}
              </button>
              <button
                onClick={handleClear}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-lg font-semibold"
              >
                清空
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 评估结果 */}
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  评估结果
                </h3>
                <div className="flex items-center">
                  <span className="text-gray-700 dark:text-gray-300 mr-2">
                    总体评分：
                  </span>
                  <span
                    className={`text-3xl font-bold ${getScoreColor(
                      evaluationResults.score
                    )}`}
                  >
                    {evaluationResults.score}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  评价意见
                </h4>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                  {evaluationResults.comments.map((comment, index) => (
                    <li key={index} className="mb-1">
                      {comment}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 段落对比评估 */}
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              段落详细评估
            </h3>

            <div className="space-y-6">
              {originalSegments.map((originalSegment, index) => {
                const translatedSegment = translatedSegments[index] || "";
                const segmentScore =
                  evaluationResults.segmentScores[index] || 0;

                return (
                  <div key={index} className="flex flex-col md:flex-row gap-4">
                    {/* 原文段落 */}
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium">
                          {extractSegmentNumber(originalSegment)}
                        </span>
                        <h4 className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          原文
                        </h4>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[100px]">
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {extractSegmentContent(originalSegment)}
                        </p>
                      </div>
                    </div>

                    {/* 译文段落 */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                            {extractSegmentNumber(translatedSegment) ||
                              extractSegmentNumber(originalSegment)}
                          </span>
                          <h4 className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            译文
                          </h4>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">
                            评分：
                          </span>
                          <span
                            className={`text-lg font-bold ${getScoreColor(
                              segmentScore
                            )}`}
                          >
                            {segmentScore}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-300 dark:border-gray-600 min-h-[100px]">
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          <AnnotatedTranslation
                            text={extractSegmentContent(translatedSegment)}
                            suggestions={
                              evaluationResults?.segmentFeedbacks
                                ?.find((feedback) => feedback.segmentIndex === index)
                                ?.issues.map((issue) => {
                                  // 计算段落编号的长度
                                  const prefixLength = translatedSegment.length - extractSegmentContent(translatedSegment).length;
                                  return {
                                    start: Math.max(0, issue.start - prefixLength),
                                    end: Math.max(0, issue.end - prefixLength),
                                    originalText: issue.translatedText,
                                    suggestedText: issue.suggestion,
                                    type: issue.type,
                                    description: issue.description,
                                    reason: issue.reason
                                  };
                                }) || []
                            }
                          />
                        </p>
                      </div>

                      {/* 评论显示 */}
                      {evaluationResults?.segmentFeedbacks?.find(
                        (feedback) => feedback.segmentIndex === index
                      ) && (
                        <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <div className="space-y-2">
                            {evaluationResults.segmentFeedbacks
                              .find((feedback) => feedback.segmentIndex === index)
                              ?.issues.map((issue, issueIndex) => (
                                <div
                                  key={issueIndex}
                                  className="text-sm bg-blue-100 dark:bg-blue-900/30 p-2 rounded"
                                >
                                  <span className="font-medium text-blue-800 dark:text-blue-300">
                                    {issue.type}：
                                  </span>
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {issue.description}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 操作按钮 */}
            <div className="mt-8 flex justify-center space-x-4">
              <button
                onClick={handleReassess}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg font-semibold"
              >
                重新评估
              </button>
              <button
                onClick={handleClear}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-lg font-semibold"
              >
                清空内容
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
