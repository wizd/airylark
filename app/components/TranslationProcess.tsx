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
  const [useRealApi, setUseRealApi] = useState(false);

  // 模拟API调用
  const mockApiCall = async (prompt: string, delay = 1000): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`模拟API响应: ${prompt}`);
      }, delay);
    });
  };

  // 初始化源文本
  useEffect(() => {
    const initializeSourceText = async () => {
      setIsLoading(true);
      try {
        if (content) {
          setSourceText(content);
        } else if (url) {
          // 模拟从URL获取内容
          const fetchedContent = await mockApiCall(
            `从URL获取内容: ${url}`,
            1500
          );
          setSourceText(fetchedContent);
        } else if (files.length > 0) {
          // 读取文件内容
          const fileContent = await readFileContent(files[0]);
          setSourceText(fileContent);
        }
      } catch (err) {
        setError("初始化源文本失败");
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
      let planResult: string;

      if (useRealApi) {
        // 使用实际API
        planResult = await apiCreateTranslationPlan(sourceText);
      } else {
        // 模拟API调用
        const prompt = `分析以下文本，识别其类型、风格以及专业知识领域，并创建翻译规划和关键术语字典：\n\n${sourceText.substring(
          0,
          500
        )}...`;
        await mockApiCall(prompt, 2000);

        // 模拟解析API响应
        planResult = JSON.stringify({
          contentType: "学术论文",
          style: "正式、专业",
          specializedKnowledge: ["人工智能", "大语言模型", "中国科技发展"],
          keyTerms: {
            "large model": "大模型",
            industry: "产业",
            challenges: "挑战",
            opportunities: "机遇"
          }
        });
      }

      // 解析规划结果
      const plan: TranslationPlan = JSON.parse(planResult);

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
      setError("创建翻译规划失败");
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
        const segmentNumber = segment.match(/^\[(\d+)\]/)?.[0] || `[${i + 1}]`;

        let translatedSegment: string;

        if (useRealApi) {
          // 使用实际API
          translatedSegment = await apiTranslateSegment(
            segment,
            translationPlan
          );
        } else {
          // 模拟API调用
          const prompt = `
请将以下文本翻译成中文。保持原文的风格和专业性。
文本类型: ${translationPlan.contentType}
风格: ${translationPlan.style}
专业领域: ${translationPlan.specializedKnowledge.join(", ")}
关键术语对照:
${Object.entries(translationPlan.keyTerms)
  .map(([en, zh]) => `- ${en}: ${zh}`)
  .join("\n")}

原文:
${segment}

请确保在翻译结果前保留段落编号 ${segmentNumber}。
`;

          await mockApiCall(prompt, 1000);

          // 模拟翻译结果
          translatedSegment = `${segmentNumber} 这是第${
            i + 1
          }段的中文翻译内容。这里模拟了翻译API的返回结果，实际应用中会返回真实的翻译内容。`;
        }

        translated.push(translatedSegment);
        currentProgress += progressIncrement;
        setProgress(Math.min(Math.round(currentProgress), 80));
      }

      setTranslatedSegments(translated);
      setProgress(80);
      setCurrentStep("reviewing");
    } catch (err) {
      setError("翻译段落失败");
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

      let reviewedTranslation: string;

      if (useRealApi) {
        // 使用实际API
        reviewedTranslation = await apiReviewTranslation(
          combinedTranslation,
          translationPlan
        );
      } else {
        // 模拟API调用
        const prompt = `
请审校以下中文翻译，确保准确性、流畅性和一致性。特别注意专业术语的翻译是否准确。
原文类型: ${translationPlan.contentType}
原文风格: ${translationPlan.style}
专业领域: ${translationPlan.specializedKnowledge.join(", ")}

译文:
${combinedTranslation}

请提供修改后的最终译文，保留原有的段落编号。
`;

        await mockApiCall(prompt, 2000);

        // 模拟审校后的结果
        reviewedTranslation = translatedSegments
          .map((segment, index) => {
            const segmentNumber =
              segment.match(/^\[(\d+)\]/)?.[0] || `[${index + 1}]`;
            return `${segmentNumber} 这是经过审校的第${
              index + 1
            }段翻译内容。审校确保了术语一致性、语法正确性和表达流畅性。`;
          })
          .join("\n\n");
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
      setError("审校译文失败");
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            智能翻译处理
          </h1>
          <div className="flex items-center">
            <span className="mr-2 text-sm text-gray-600 dark:text-gray-300">
              使用实际API
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={useRealApi}
                onChange={() => setUseRealApi(!useRealApi)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
        {renderStepIndicator()}
        {renderStepContent()}
      </div>
    </div>
  );
}
