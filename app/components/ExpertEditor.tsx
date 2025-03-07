"use client";

import { useState, useEffect, useRef } from "react";
import { TranslationPlan } from "../services/translationApi";

interface ExpertEditorProps {
  originalSegments: string[];
  translatedSegments: string[];
  translationPlan: TranslationPlan;
  onSave: (editedSegments: string[]) => void;
  onCancel: () => void;
}

export default function ExpertEditor({
  originalSegments,
  translatedSegments,
  translationPlan,
  onSave,
  onCancel
}: ExpertEditorProps) {
  // 创建可编辑的译文段落状态
  const [editedSegments, setEditedSegments] = useState<string[]>([]);
  // 创建文本框引用数组
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // 初始化编辑状态
  useEffect(() => {
    setEditedSegments([...translatedSegments]);
    // 初始化文本框引用数组
    textareaRefs.current = textareaRefs.current.slice(
      0,
      translatedSegments.length
    );

    // 在下一个渲染周期调整所有文本框高度
    setTimeout(() => {
      textareaRefs.current.forEach((textarea) => {
        if (textarea) {
          adjustTextareaHeight(textarea);
        }
      });
    }, 0);
  }, [translatedSegments]);

  // 调整文本框高度的函数
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    if (!textarea) return;

    // 重置高度，以便正确计算新的高度
    textarea.style.height = "0px";
    // 设置新的高度，加上一点额外空间以避免滚动条
    const newHeight = textarea.scrollHeight + 4;
    textarea.style.height = `${newHeight}px`;
  };

  // 初始化后调整所有文本框高度
  useEffect(() => {
    textareaRefs.current.forEach((textarea) => {
      if (textarea) {
        adjustTextareaHeight(textarea);
      }
    });
  }, [editedSegments]);

  // 处理段落编辑
  const handleSegmentEdit = (index: number, newValue: string) => {
    const newSegments = [...editedSegments];
    newSegments[index] = newValue;
    setEditedSegments(newSegments);

    // 调整当前编辑的文本框高度
    setTimeout(() => {
      if (textareaRefs.current[index]) {
        adjustTextareaHeight(textareaRefs.current[index]!);
      }
    }, 0);
  };

  // 处理保存
  const handleSave = () => {
    onSave(editedSegments);
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

  // 设置文本框引用的回调函数
  const setTextareaRef = (el: HTMLTextAreaElement | null, index: number) => {
    textareaRefs.current[index] = el;
    // 如果元素存在且已经有内容，立即调整高度
    if (el && editedSegments[index]) {
      adjustTextareaHeight(el);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          专家级编辑校对
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            保存修改
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
        </div>
      </div>

      {/* 编辑说明 */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
          编辑说明
        </h3>
        <ul className="list-disc list-inside text-blue-700 dark:text-blue-400 text-sm">
          <li>左侧显示原文，右侧为可编辑的译文</li>
          <li>每个段落保持对应，可以直接在右侧文本框中编辑译文</li>
          <li>编辑完成后点击&quot;保存修改&quot;按钮应用更改</li>
          <li>
            专业术语参考：
            {Object.keys(translationPlan.keyTerms).map((term, i) => (
              <span key={i} className="inline-flex items-center mx-1">
                <span className="font-medium">{term}</span>
                <span className="mx-1">→</span>
                <span className="text-blue-800 dark:text-blue-300">
                  {translationPlan.keyTerms[term]}
                </span>
              </span>
            ))}
          </li>
        </ul>
      </div>

      {/* 段落编辑区 */}
      <div className="space-y-6">
        {originalSegments.map((originalSegment, index) => {
          const originalContent = extractSegmentContent(originalSegment);

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
                    {originalContent}
                  </p>
                </div>
              </div>

              {/* 译文段落（可编辑） */}
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                    {extractSegmentNumber(originalSegment)}
                  </span>
                  <h4 className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    译文
                  </h4>
                </div>
                <textarea
                  ref={(el) => setTextareaRef(el, index)}
                  value={editedSegments[index] || ""}
                  onChange={(e) => handleSegmentEdit(index, e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-300 dark:border-gray-600 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-500 overflow-hidden resize-none"
                  style={{ height: "auto" }}
                  onFocus={(e) => adjustTextareaHeight(e.target)}
                  rows={3}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部操作按钮 */}
      <div className="mt-8 flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          保存修改
        </button>
      </div>
    </div>
  );
}
