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

  // 构建提示信息，用于创建翻译规划
  const systemPrompt = `你是专业翻译分析专家。请分析以下${source_language || ""}文本，创建一个翻译规划用于将其翻译成${target_language}。
返回一个JSON对象，包含以下字段：
1. contentType: 文本的类型或体裁（如"技术文档"、"新闻报道"、"科普文章"等）
2. style: 翻译应采用的风格（如"正式学术"、"通俗易懂"、"简明直接"等）
3. specializedKnowledge: 文本涉及的专业领域，返回一个字符串数组
4. keyTerms: 一个对象，包含文本中的关键术语及其对应的${target_language}翻译

只返回JSON格式的数据，不要包含任何解释或说明。`;

  try {
    // 使用OpenAI兼容API进行翻译规划创建
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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`创建翻译规划失败: ${response.status} ${response.statusText} ${errorText}`);
    }

    const data = await response.json() as {
      choices: [{
        message: {
          content: string;
        }
      }]
    };
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message.content) {
      throw new Error('翻译API返回无效响应');
    }
    
    // 解析JSON响应
    const planText = data.choices[0].message.content.trim();
    const planJson = JSON.parse(cleanJsonString(planText));
    
    // 确保返回结果符合TranslationPlan类型
    return {
      contentType: planJson.contentType || "一般文本",
      style: planJson.style || "标准",
      specializedKnowledge: Array.isArray(planJson.specializedKnowledge) ? planJson.specializedKnowledge : [],
      keyTerms: planJson.keyTerms || {}
    };
  } catch (error) {
    console.error('创建翻译规划失败:', error);
    // 返回默认翻译规划，以便流程继续
    return {
      contentType: "一般文本",
      style: "标准",
      specializedKnowledge: [],
      keyTerms: {}
    };
  }
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

  // 构建关键术语列表
  const keyTermsList = Object.entries(plan.keyTerms)
    .map(([term, translation]) => `- "${term}": "${translation}"`)
    .join('\n');

  // 构建提示信息，用于段落翻译
  const systemPrompt = `你是一位专业${plan.specializedKnowledge.join('、')}领域的翻译专家。请将以下${source_language || ""}文本翻译成${target_language}。

## 翻译规划
- 文本类型: ${plan.contentType}
- 风格要求: ${plan.style}
- 专业领域: ${plan.specializedKnowledge.join('、')}

## 关键术语表
${keyTermsList}

请遵循以下要求:
1. 准确传达原文的全部信息和意图
2. 使用合适的${target_language}表达方式，避免直译
3. 保持专业领域的术语一致性
4. 风格符合${plan.style}的要求
5. 只输出翻译结果，不要添加解释或原文

===TRANSLATION===`;

  try {
    // 使用OpenAI兼容API进行段落翻译
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
          { role: "user", content: segment }
        ],
        temperature: 0.3,
        max_tokens: Math.max(1024, segment.length * 2),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`翻译段落失败: ${response.status} ${response.statusText} ${errorText}`);
    }

    const data = await response.json() as {
      choices: [{
        message: {
          content: string;
        }
      }]
    };
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message.content) {
      throw new Error('翻译API返回无效响应');
    }
    
    const translationResult = data.choices[0].message.content.trim();
    
    // 如果返回包含分隔标记，提取实际翻译部分
    const parts = translationResult.split("===TRANSLATION===");
    return parts.length > 1 ? parts[1].trim() : translationResult;
  } catch (error) {
    console.error('翻译段落失败:', error);
    return `[翻译错误: ${error instanceof Error ? error.message : String(error)}]`;
  }
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

  // 构建关键术语列表
  const keyTermsList = Object.entries(plan.keyTerms)
    .map(([term, translation]) => `- "${term}": "${translation}"`)
    .join('\n');

  // 构建提示信息，用于审校译文
  const systemPrompt = `你是一位专业的${target_language}编辑和校对专家，精通${plan.specializedKnowledge.join('、')}领域。请审校以下${target_language}译文，确保其质量达到专业出版标准。

## 翻译规划
- 文本类型: ${plan.contentType}
- 风格要求: ${plan.style}
- 专业领域: ${plan.specializedKnowledge.join('、')}

## 关键术语表
${keyTermsList}

请详细审校以下方面:
1. 术语一致性和准确性
2. 语法和表达通顺性
3. 风格与目标读者的匹配度
4. 专业性和准确性

进行必要的修改，然后输出最终的译文版本。在输出最终译文之前，使用===FINAL_TRANSLATION===标记。`;

  try {
    // 使用OpenAI兼容API进行审校
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
          { role: "user", content: translation }
        ],
        temperature: 0.3,
        max_tokens: Math.max(1024, translation.length * 2),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`审校译文失败: ${response.status} ${response.statusText} ${errorText}`);
    }

    const data = await response.json() as {
      choices: [{
        message: {
          content: string;
        }
      }]
    };
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message.content) {
      throw new Error('翻译API返回无效响应');
    }
    
    const reviewResult = data.choices[0].message.content.trim();
    
    // 如果返回包含分隔标记，提取最终翻译部分
    const parts = reviewResult.split("===FINAL_TRANSLATION===");
    return parts.length > 1 ? parts[1].trim() : reviewResult;
  } catch (error) {
    console.error('审校译文失败:', error);
    // 如果审校失败，返回原译文
    return translation;
  }
}

/**
 * 清理可能包含Markdown格式的JSON字符串
 * @param jsonString 可能包含Markdown格式的JSON字符串
 * @returns 清理后的JSON字符串
 */
function cleanJsonString(jsonString: string): string {
  // 移除可能的Markdown代码块标记
  let cleaned = jsonString.trim();

  // 移除开头的```json、```、或其他代码块标记
  cleaned = cleaned.replace(/^```(\w*\n|\n)?/, '');

  // 移除结尾的```
  cleaned = cleaned.replace(/```$/, '');

  // 移除可能的注释
  cleaned = cleaned.replace(/\/\/.*/g, '');

  return cleaned.trim();
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
    if (process.env.NODE_ENV === 'production') {
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