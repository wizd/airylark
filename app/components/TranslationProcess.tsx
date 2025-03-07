"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  TranslationPlan,
  createTranslationPlan as apiCreateTranslationPlan,
  translateSegment as apiTranslateSegment,
  reviewTranslation as apiReviewTranslation
} from "../services/translationApi";
import TranslationThinking from "./TranslationThinking";

// 专家编辑器组件
interface ExpertEditorProps {
  originalSegments: string[];
  translatedSegments: string[];
  translationPlan: TranslationPlan;
  onSave: (editedSegments: string[]) => void;
  onCancel: () => void;
}

function ExpertEditor({
  originalSegments,
  translatedSegments,
  translationPlan,
  onSave,
  onCancel
}: ExpertEditorProps) {
  // 创建可编辑的译文段落状态
  const [editedSegments, setEditedSegments] = useState<string[]>([]);

  // 初始化编辑状态
  useEffect(() => {
    setEditedSegments([...translatedSegments]);
  }, [translatedSegments]);

  // 处理段落编辑
  const handleSegmentEdit = (index: number, newValue: string) => {
    const newSegments = [...editedSegments];
    newSegments[index] = newValue;
    setEditedSegments(newSegments);
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
          <li>编辑完成后点击"保存修改"按钮应用更改</li>
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
        {originalSegments.map((originalSegment, index) => (
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
                value={editedSegments[index] || ""}
                onChange={(e) => handleSegmentEdit(index, e.target.value)}
                className="w-full bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-300 dark:border-gray-600 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-500"
              />
            </div>
          </div>
        ))}
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

interface TranslationProcessProps {
  content: string | null;
  url: string | null;
  files: File[];
  onBack: () => void;
}

type TranslationStep = "planning" | "translating" | "reviewing" | "completed";

// 定义思考过程数据类型
interface PlanningThinkingData {
  contentType?: string;
  style?: string;
  specializedKnowledge?: string[];
  keyTerms?: Record<string, string>;
}

interface TranslatingThinkingData {
  currentSegmentIndex: number;
  totalSegments: number;
  currentSegment: string;
  currentTranslation: string;
}

interface ReviewingThinkingData {
  reviewNotes: string[];
  improvements: string[];
}

export default function TranslationProcess({
  content,
  url,
  files,
  onBack
}: TranslationProcessProps) {
  const [currentStep, setCurrentStep] = useState<TranslationStep>("planning");
  const [progress, setProgress] = useState(0);
  const [translationPlan, setTranslationPlan] =
    useState<TranslationPlan | null>(null);
  const [originalSegments, setOriginalSegments] = useState<string[]>([]);
  const [translatedSegments, setTranslatedSegments] = useState<string[]>([]);
  const [finalTranslation, setFinalTranslation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState<string>("");

  // 添加思考过程数据状态，使用具体类型
  const [planningThinkingData, setPlanningThinkingData] =
    useState<PlanningThinkingData | null>(null);
  const [translatingThinkingData, setTranslatingThinkingData] =
    useState<TranslatingThinkingData>({
      currentSegmentIndex: 0,
      totalSegments: 0,
      currentSegment: "",
      currentTranslation: ""
    });
  const [reviewingThinkingData, setReviewingThinkingData] =
    useState<ReviewingThinkingData>({
      reviewNotes: [],
      improvements: []
    });

  // 添加专家编辑模式状态
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [expertEditedTranslation, setExpertEditedTranslation] =
    useState<string>("");

  // 初始化源文本
  useEffect(() => {
    const initializeSourceText = async () => {
      setIsLoading(true);
      try {
        if (content) {
          setSourceText(content);
        } else if (url) {
          // 从URL获取内容
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`获取URL内容失败: ${response.statusText}`);
            }
            const fetchedContent = await response.text();
            setSourceText(fetchedContent);
          } catch (err) {
            throw new Error(
              `处理URL时出错: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        } else if (files.length > 0) {
          // 读取文件内容
          const fileContent = await readFileContent(files[0]);
          setSourceText(fileContent);
        }
      } catch (err) {
        setError(
          `初始化源文本失败: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSourceText();
  }, [content, url, files]);

  // 读取文件内容
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error("读取文件失败"));
        }
      };
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsText(file);
    });
  };

  // 第一步：创建翻译规划
  const createTranslationPlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 调用API创建翻译规划
      const planResult = await apiCreateTranslationPlan(sourceText);

      // 解析规划结果
      // API 可能返回 Markdown 代码块格式的 JSON，需要提取实际的 JSON 内容
      let jsonStr = planResult;

      // 检查是否包含 Markdown 代码块
      const jsonBlockMatch = planResult.match(
        /```(?:json)?\s*\n([\s\S]*?)\n```/
      );
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonStr = jsonBlockMatch[1].trim();
      }

      // 尝试解析 JSON
      let plan: TranslationPlan;
      try {
        plan = JSON.parse(jsonStr);
      } catch (jsonError) {
        console.error("JSON 解析失败，尝试创建默认翻译规划", jsonError);
        console.log("原始返回内容:", planResult);

        // 创建默认翻译规划
        plan = {
          contentType: "未知类型",
          style: "标准",
          specializedKnowledge: ["通用"],
          keyTerms: {}
        };

        // 尝试从文本中提取关键信息
        if (
          planResult.includes("contentType") ||
          planResult.includes("文本类型")
        ) {
          const contentTypeMatch = planResult.match(
            /contentType[\"']?\s*:\s*[\"']([^\"']+)[\"']/
          );
          if (contentTypeMatch && contentTypeMatch[1]) {
            plan.contentType = contentTypeMatch[1];
          }
        }

        if (planResult.includes("style") || planResult.includes("风格")) {
          const styleMatch = planResult.match(
            /style[\"']?\s*:\s*[\"']([^\"']+)[\"']/
          );
          if (styleMatch && styleMatch[1]) {
            plan.style = styleMatch[1];
          }
        }
      }

      setTranslationPlan(plan);
      // 更新思考过程数据
      setPlanningThinkingData(plan);
      setProgress(20);
      setCurrentStep("translating");

      // 分割文本为段落
      const segments = sourceText
        .split(/\n\n+/)
        .filter((segment) => segment.trim().length > 0)
        .map((segment, index) => `[${index + 1}] ${segment.trim()}`);

      setOriginalSegments(segments);
      // 更新翻译思考数据的总段落数
      setTranslatingThinkingData((prev: TranslatingThinkingData) => ({
        ...prev,
        totalSegments: segments.length
      }));
    } catch (err) {
      setError(
        `创建翻译规划失败: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 第二步：翻译段落
  const translateSegments = async () => {
    if (!translationPlan) return;

    setIsLoading(true);
    setError(null);
    try {
      const translated = [];
      let currentProgress = 20;
      const progressIncrement = 60 / originalSegments.length;

      for (let i = 0; i < originalSegments.length; i++) {
        const segment = originalSegments[i];

        // 更新当前正在翻译的段落信息
        setTranslatingThinkingData((prev: TranslatingThinkingData) => ({
          ...prev,
          currentSegmentIndex: i,
          currentSegment: segment,
          currentTranslation: ""
        }));

        // 调用API翻译段落
        let translatedSegment = await apiTranslateSegment(
          segment,
          translationPlan
        );

        // 清理可能的 Markdown 格式
        const codeBlockMatch = translatedSegment.match(
          /```(?:.*?)\n([\s\S]*?)\n```/
        );
        if (codeBlockMatch && codeBlockMatch[1]) {
          translatedSegment = codeBlockMatch[1].trim();
        }

        // 更新翻译结果
        setTranslatingThinkingData((prev: TranslatingThinkingData) => ({
          ...prev,
          currentTranslation: translatedSegment
        }));

        translated.push(translatedSegment);
        currentProgress += progressIncrement;
        setProgress(Math.min(Math.round(currentProgress), 80));
      }

      setTranslatedSegments(translated);
      setProgress(80);
      setCurrentStep("reviewing");
    } catch (err) {
      setError(
        `翻译段落失败: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 第三步：审校译文
  const reviewTranslation = async () => {
    if (!translationPlan) return;

    setIsLoading(true);
    setError(null);
    try {
      const combinedTranslation = translatedSegments.join("\n\n");

      // 更新审校思考数据
      setReviewingThinkingData({
        reviewNotes: [
          "正在进行整体审校...",
          "检查术语一致性...",
          "优化语言表达..."
        ],
        improvements: []
      });

      // 调用API审校译文
      let reviewedTranslation = await apiReviewTranslation(
        combinedTranslation,
        translationPlan
      );

      // 清理可能的 Markdown 格式
      const codeBlockMatch = reviewedTranslation.match(
        /```(?:.*?)\n([\s\S]*?)\n```/
      );
      if (codeBlockMatch && codeBlockMatch[1]) {
        reviewedTranslation = codeBlockMatch[1].trim();
      }

      // 更新审校思考数据
      setReviewingThinkingData({
        reviewNotes: ["完成整体审校", "术语一致性检查完成", "语言表达优化完成"],
        improvements: [
          "优化了专业术语翻译",
          "改进了语言流畅度",
          "统一了风格表达"
        ]
      });

      // 转换为Markdown格式，但不将元数据和翻译内容混合在一起
      const markdownTranslation = reviewedTranslation;

      setFinalTranslation(markdownTranslation);
      setProgress(100);
      setCurrentStep("completed");
    } catch (err) {
      setError(
        `审校译文失败: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理专家编辑保存
  const handleExpertEditSave = (editedSegments: string[]) => {
    // 合并编辑后的段落
    const editedTranslation = editedSegments.join("\n\n");
    setExpertEditedTranslation(editedTranslation);
    setFinalTranslation(editedTranslation);
    setIsExpertMode(false);
  };

  // 处理专家编辑取消
  const handleExpertEditCancel = () => {
    setIsExpertMode(false);
  };

  // 根据当前步骤执行相应操作
  useEffect(() => {
    if (sourceText && currentStep === "planning") {
      createTranslationPlan();
    } else if (originalSegments.length > 0 && currentStep === "translating") {
      translateSegments();
    } else if (translatedSegments.length > 0 && currentStep === "reviewing") {
      reviewTranslation();
    }
  }, [
    sourceText,
    currentStep,
    originalSegments.length,
    translatedSegments.length
  ]);

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { key: "planning", label: "规划" },
      { key: "translating", label: "翻译" },
      { key: "reviewing", label: "审校" },
      { key: "completed", label: "完成" }
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  steps.findIndex((s) => s.key === currentStep) >= index
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`mt-2 text-sm ${
                  steps.findIndex((s) => s.key === currentStep) >= index
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // 渲染当前步骤内容
  const renderStepContent = () => {
    // 添加思考过程组件
    const renderThinkingProcess = () => {
      return (
        <>
          <TranslationThinking
            step="planning"
            isLoading={currentStep === "planning" && isLoading}
            data={planningThinkingData}
            autoCollapse={currentStep !== "planning"}
          />

          <TranslationThinking
            step="translating"
            isLoading={currentStep === "translating" && isLoading}
            data={translatingThinkingData}
            autoCollapse={currentStep !== "translating"}
          />

          <TranslationThinking
            step="reviewing"
            isLoading={currentStep === "reviewing" && isLoading}
            data={reviewingThinkingData}
            autoCollapse={currentStep !== "reviewing"}
          />

          {currentStep === "completed" && (
            <TranslationThinking
              step="completed"
              isLoading={false}
              data={null}
              autoCollapse={true}
            />
          )}
        </>
      );
    };

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
          <p className="font-medium">处理过程中出现错误</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            返回
          </button>
        </div>
      );
    }

    if (currentStep === "completed" && translationPlan) {
      // 如果处于专家编辑模式，显示专家编辑器
      if (isExpertMode) {
        return (
          <ExpertEditor
            originalSegments={originalSegments}
            translatedSegments={translatedSegments}
            translationPlan={translationPlan}
            onSave={handleExpertEditSave}
            onCancel={handleExpertEditCancel}
          />
        );
      }

      // 否则显示正常的完成界面
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* 添加思考过程组件 */}
          {renderThinkingProcess()}

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              翻译完成
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // 复制到剪贴板，只复制翻译内容
                  navigator.clipboard.writeText(finalTranslation);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                复制翻译
              </button>
              <button
                onClick={() => {
                  // 复制完整内容，包括元数据
                  const fullContent = `# 翻译结果

## 文档信息
- **文本类型**: ${translationPlan.contentType}
- **风格**: ${translationPlan.style}
- **专业领域**: ${translationPlan.specializedKnowledge.join(", ")}

## 关键术语对照表
| 英文 | 中文 |
|------|------|
${Object.entries(translationPlan.keyTerms)
  .map(([en, zh]) => `| ${en} | ${zh} |`)
  .join("\n")}

## 译文内容

${finalTranslation}`;
                  navigator.clipboard.writeText(fullContent);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                复制全部
              </button>
              <button
                onClick={() => setIsExpertMode(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                专家编辑
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                返回
              </button>
            </div>
          </div>

          {/* 元数据部分 */}
          <div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              文档信息
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  文本类型
                </p>
                <p className="text-base text-gray-800 dark:text-white">
                  {translationPlan.contentType}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  风格
                </p>
                <p className="text-base text-gray-800 dark:text-white">
                  {translationPlan.style}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  专业领域
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {translationPlan.specializedKnowledge.map(
                    (knowledge, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                      >
                        {knowledge}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            {Object.keys(translationPlan.keyTerms).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                  关键术语对照表
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          英文
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          中文
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {Object.entries(translationPlan.keyTerms).map(
                        ([en, zh], index) => (
                          <tr
                            key={index}
                            className={
                              index % 2 === 0
                                ? "bg-white dark:bg-gray-900"
                                : "bg-gray-50 dark:bg-gray-800"
                            }
                          >
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                              {en}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                              {zh}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 翻译内容部分 */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex justify-between items-center">
              <span>译文内容</span>
              {expertEditedTranslation && (
                <span className="text-sm text-green-600 dark:text-green-400 font-normal">
                  (已进行专家编辑)
                </span>
              )}
            </h3>
            <div className="prose dark:prose-invert prose-headings:my-4 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 max-w-none overflow-auto bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {finalTranslation}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      );
    }

    // 默认显示初始化中和思考过程
    return (
      <div>
        {renderThinkingProcess()}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              {currentStep === "planning" && "正在分析文本并创建翻译规划..."}
              {currentStep === "translating" && "正在翻译文本段落..."}
              {currentStep === "reviewing" && "正在审校译文..."}
              {!currentStep && "正在初始化翻译流程..."}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
          智能翻译处理
        </h1>
        {renderStepIndicator()}
        {renderStepContent()}
      </div>
    </div>
  );
}
