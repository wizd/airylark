import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import express, { Request, Response, NextFunction } from 'express';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 相对于当前文件找到.env文件
dotenv.config({ path: resolve(__dirname, '../../.env') });

// 使用环境变量中的端口或默认端口3041
const PORT = process.env.PORT || 3041;

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

// 修改简单翻译方法，使用OpenAI API
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

  // 构建提示信息，简洁明了
  const systemPrompt = `你是一位专业翻译。请将以下${source_language || "检测到的语言"}文本翻译成${target_language}。
只输出翻译结果，不要添加解释、原文或其他内容。保持专业、准确、自然的翻译风格。`;

  try {
    // 使用OpenAI兼容API进行翻译
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3, // 较低的temperature以获得更一致的翻译
        max_tokens: Math.max(1024, text.length * 2), // 动态设置输出长度限制
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OpenAI API请求失败: ${response.status} ${response.statusText} ${errorText}`);
    }

    const data = await response.json() as {
      choices: [{
        message: {
          content: string;
        }
      }]
    };
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message.content) {
      throw new Error('OpenAI API返回无效响应');
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('翻译请求失败:', error);
    throw error;
  }
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

// 在底部的异步函数中替换启动代码
(async function main() {
  try {
    // 根据环境变量决定使用哪种传输方式
    if (process.env.NODE_ENV === 'production' || process.env.USE_HTTP === 'true') {
      // 使用HTTP/SSE传输方式
      console.log(`启动HTTP MCP服务器，端口: ${PORT}`);
      
      const app = express();
      
      // 跨域支持
      app.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
      
      // 会话管理
      const transports: {[sessionId: string]: SSEServerTransport} = {};
      
      app.get("/sse", (_: Request, res: Response) => {
        const transport = new SSEServerTransport('/messages', res);
        transports[transport.sessionId] = transport;
        
        res.on("close", () => {
          delete transports[transport.sessionId];
        });
        
        server.connect(transport);
      });
      
      app.post("/messages", (req: Request, res: Response) => {
        const sessionId = req.query.sessionId as string;
        const transport = transports[sessionId];
        
        if (transport) {
          transport.handlePostMessage(req, res);
        } else {
          res.status(400).send('无效的会话ID');
        }
      });
      
      // 健康检查端点
      app.get("/health", (_: Request, res: Response) => {
        res.json({ status: 'healthy', version: '0.1.0' });
      });
      
      // 启动HTTP服务器
      app.listen(Number(PORT), () => {
        console.log(`MCP HTTP服务器运行在 http://localhost:${PORT}`);
        console.log(`- SSE端点: http://localhost:${PORT}/sse`);
        console.log(`- 消息端点: http://localhost:${PORT}/messages`);
      });
    } else {
      // 使用标准输入/输出传输方式 (适用于开发环境)
      console.log("启动标准输入/输出MCP服务器");
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log("翻译服务器已启动，使用标准输入/输出通信");
    }
  } catch (error) {
    console.error("启动翻译服务器失败:", error);
    process.exit(1);
  }
})();