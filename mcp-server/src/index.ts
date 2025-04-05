import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// 定义翻译API响应类型
interface TranslationResponse {
  translated_text: string;
  source_language?: string;
  confidence?: number;
}

// 翻译计划接口
interface TranslationPlan {
  contentType: string;
  style: string;
  specializedKnowledge: string[];
  keyTerms: Record<string, string>;
}

// 创建翻译规划API的响应类型
interface TranslationPlanResponse {
  contentType: string;
  style: string;
  specializedKnowledge: string[];
  keyTerms: Record<string, string>;
}

// 翻译段落API的响应类型
interface TranslateSegmentResponse {
  translated_text: string;
}

// 审校译文API的响应类型
interface ReviewTranslationResponse {
  final_translation: string;
  review_notes?: string[];
}

const server = new McpServer({
  name: "translation-server",
  version: "1.0.0",
  description: "高精度文本翻译服务器，基于三阶段翻译流程（分析规划、翻译、审校）",
});

// 定义翻译工具
server.tool(
  "translate_text", 
  {
    text: z.string().describe("需要翻译的源文本"),
    target_language: z.string().describe("目标语言代码，例如 'zh'、'en'、'ja'等"),
    source_language: z.string().optional().describe("源语言代码，可选参数"),
    high_quality: z.boolean().optional().default(true).describe("是否启用高精度翻译流程"),
  },
  async ({ text, target_language, source_language, high_quality }) => {
    try {
      // 启用复合高精度流程或简单翻译
      const translation = high_quality 
        ? await translateTextHighQuality(text, target_language, source_language)
        : await translateTextSimple(text, target_language, source_language);
        
      return { 
        content: [{ 
          type: "text", 
          text: translation 
        }] 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ 
          type: "text", 
          text: `翻译失败: ${errorMessage}` 
        }],
        isError: true
      };
    }
  }
);

// 简单翻译方法（直接调用翻译API）
async function translateTextSimple(
  text: string, 
  target_language: string, 
  source_language?: string
): Promise<string> {
  const baseUrl = process.env.TRANSLATION_BASE_URL;
  const apiKey = process.env.TRANSLATION_API_KEY;
  const model = process.env.TRANSLATION_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error('缺少翻译API的环境变量配置');
  }

  const response = await fetch(`${baseUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      text,
      target_language,
      source_language,
      model,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`翻译API请求失败: ${response.status} ${response.statusText} ${errorText}`);
  }

  const data = await response.json() as TranslationResponse;
  
  if (!data.translated_text) {
    throw new Error('翻译API返回无效响应');
  }
  
  return data.translated_text;
}

// 高精度翻译方法（三阶段流程）
async function translateTextHighQuality(
  text: string, 
  target_language: string, 
  source_language?: string
): Promise<string> {
  console.log(`开始高精度翻译流程，文本长度: ${text.length}字符`);
  
  // 阶段1：创建翻译规划
  const translationPlan = await createTranslationPlan(text, target_language, source_language);
  console.log(`阶段1完成：创建翻译规划，内容类型: ${translationPlan.contentType}`);
  
  // 阶段2：分段翻译
  // 将长文本分段，便于更精确的翻译
  const segments = segmentText(text);
  console.log(`文本已分为${segments.length}个段落`);
  
  const translatedSegments = [];
  for (let i = 0; i < segments.length; i++) {
    console.log(`翻译段落 ${i+1}/${segments.length}`);
    const translatedSegment = await translateSegment(
      segments[i], 
      translationPlan, 
      target_language, 
      source_language
    );
    translatedSegments.push(translatedSegment);
  }
  
  // 合并翻译结果
  const combinedTranslation = translatedSegments.join('\n\n');
  console.log(`阶段2完成：所有段落翻译完成`);
  
  // 阶段3：审校翻译
  const finalTranslation = await reviewTranslation(
    combinedTranslation, 
    translationPlan, 
    target_language
  );
  console.log(`阶段3完成：翻译审校完成`);
  
  return finalTranslation;
}

// 文本分段
function segmentText(text: string): string[] {
  // 按段落分割（空行分隔）
  const segments = text.split(/\n\s*\n/).filter(segment => segment.trim().length > 0);
  
  // 如果没有段落分隔，或者只有一个段落，可以考虑按句子分割
  if (segments.length <= 1 && text.length > 500) {
    return text.split(/(?<=[.!?。！？])\s+/).filter(segment => segment.trim().length > 0);
  }
  
  return segments;
}

// 阶段1：创建翻译规划
async function createTranslationPlan(
  text: string, 
  target_language: string, 
  source_language?: string
): Promise<TranslationPlan> {
  const baseUrl = process.env.TRANSLATION_BASE_URL;
  const apiKey = process.env.TRANSLATION_API_KEY;
  const model = process.env.TRANSLATION_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error('缺少翻译API的环境变量配置');
  }

  const response = await fetch(`${baseUrl}/create-translation-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      text,
      target_language,
      source_language,
      model,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`创建翻译规划失败: ${response.status} ${response.statusText} ${errorText}`);
  }

  const data = await response.json() as TranslationPlanResponse;
  
  // 确保返回结果包含必要字段
  if (!data.contentType || !data.style || !Array.isArray(data.specializedKnowledge)) {
    throw new Error('创建翻译规划返回无效响应');
  }
  
  return {
    contentType: data.contentType,
    style: data.style,
    specializedKnowledge: data.specializedKnowledge,
    keyTerms: data.keyTerms || {}
  };
}

// 阶段2：翻译段落
async function translateSegment(
  segment: string, 
  plan: TranslationPlan, 
  target_language: string, 
  source_language?: string
): Promise<string> {
  const baseUrl = process.env.TRANSLATION_BASE_URL;
  const apiKey = process.env.TRANSLATION_API_KEY;
  const model = process.env.TRANSLATION_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error('缺少翻译API的环境变量配置');
  }

  const response = await fetch(`${baseUrl}/translate-segment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      text: segment,
      translation_plan: plan,
      target_language,
      source_language,
      model,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`翻译段落失败: ${response.status} ${response.statusText} ${errorText}`);
  }

  const data = await response.json() as TranslateSegmentResponse;
  
  if (!data.translated_text) {
    throw new Error('翻译段落返回无效响应');
  }
  
  return data.translated_text;
}

// 阶段3：审校译文
async function reviewTranslation(
  translation: string, 
  plan: TranslationPlan, 
  target_language: string
): Promise<string> {
  const baseUrl = process.env.TRANSLATION_BASE_URL;
  const apiKey = process.env.TRANSLATION_API_KEY;
  const model = process.env.TRANSLATION_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error('缺少翻译API的环境变量配置');
  }

  const response = await fetch(`${baseUrl}/review-translation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      translation,
      translation_plan: plan,
      target_language,
      model,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`审校译文失败: ${response.status} ${response.statusText} ${errorText}`);
  }

  const data = await response.json() as ReviewTranslationResponse;
  
  if (!data.final_translation) {
    throw new Error('审校译文返回无效响应');
  }
  
  return data.final_translation;
}

// 添加支持的语言列表资源
server.resource(
  "supported_languages",
  "languages://list",
  async () => {
    return {
      contents: [{
        uri: "languages://list",
        text: JSON.stringify({
          languages: [
            { code: "zh", name: "中文" },
            { code: "en", name: "英文" },
            { code: "ja", name: "日语" },
            { code: "ko", name: "韩语" },
            { code: "fr", name: "法语" },
            { code: "de", name: "德语" },
            { code: "es", name: "西班牙语" },
            { code: "ru", name: "俄语" },
            { code: "pt", name: "葡萄牙语" },
            { code: "it", name: "意大利语" },
          ]
        }, null, 2)
      }]
    };
  }
);

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
console.log("翻译服务器已启动");