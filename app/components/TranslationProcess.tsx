"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  TranslationPlan,
  createTranslationPlan as apiCreateTranslationPlan,
  translateSegment as apiTranslateSegment,
  reviewTranslation as apiReviewTranslation
} from "../services/translationApi";

interface TranslationProcessProps {
  content: string | null;
  url: string | null;
  files: File[];
  onBack: () => void;
}

type TranslationStep = "planning" | "translating" | "reviewing" | "completed";

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
      setProgress(20);
      setCurrentStep("translating");

      // 分割文本为段落
      const segments = sourceText
        .split(/\n\n+/)
        .filter((segment) => segment.trim().length > 0)
        .map((segment, index) => `[${index + 1}] ${segment.trim()}`);

      setOriginalSegments(segments);
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

      // 转换为Markdown格式
      const markdownTranslation = `
# 翻译结果

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

${reviewedTranslation}
`;

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
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            {currentStep === "planning" && "正在分析文本并创建翻译规划..."}
            {currentStep === "translating" && "正在翻译文本段落..."}
            {currentStep === "reviewing" && "正在审校译文..."}
          </p>
        </div>
      );
    }

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

    if (currentStep === "completed") {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              翻译完成
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // 复制到剪贴板
                  navigator.clipboard.writeText(finalTranslation);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                复制
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                返回
              </button>
            </div>
          </div>
          <div className="prose dark:prose-invert max-w-none overflow-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <ReactMarkdown>{finalTranslation}</ReactMarkdown>
          </div>
        </div>
      );
    }

    // 默认显示初始化中
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          正在初始化翻译流程...
        </p>
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
