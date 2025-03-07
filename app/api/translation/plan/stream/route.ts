import { NextResponse } from 'next/server';

// 这里在服务器端使用环境变量
const API_KEY = process.env.TRANSLATION_API_KEY || '';
const API_URL = process.env.TRANSLATION_BASE_URL || '';
const MODEL = process.env.TRANSLATION_MODEL || 'deepseek-ai/DeepSeek-V3';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function POST(request: Request) {
    try {
        // 从请求中获取文本
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: '缺少文本参数' }, { status: 400 });
        }

        if (!API_KEY) {
            return NextResponse.json({ error: 'API 密钥未配置' }, { status: 500 });
        }

        // 构建提示词
        const prompt = `
分析以下文本，识别其类型、风格以及专业知识领域，并创建翻译规划和关键术语字典。
请以JSON格式返回结果，包含以下字段：
- contentType: 文本类型（如学术论文、新闻报道、技术文档等）
- style: 文本风格（如正式、非正式、技术性等）
- specializedKnowledge: 专业知识领域（数组）
- keyTerms: 关键术语字典（对象，英文术语为键，中文翻译为值）

请确保返回的是有效的JSON格式，不要包含Markdown代码块标记，直接返回JSON对象。
例如：
{
  "contentType": "学术论文",
  "style": "正式",
  "specializedKnowledge": ["人工智能", "机器学习"],
  "keyTerms": {
    "machine learning": "机器学习",
    "artificial intelligence": "人工智能"
  }
}

源文本:
${text.substring(0, 1500)}${text.length > 1500 ? '...' : ''}
`;

        const messages: Message[] = [
            { role: 'user', content: prompt }
        ];

        // 创建一个新的 ReadableStream
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // 调用 API 并获取流式响应
                    const response = await fetch(API_URL + '/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: MODEL,
                            messages,
                            stream: true, // 启用流式输出
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        controller.error(`API 请求失败: ${errorData.error?.message || response.statusText}`);
                        return;
                    }

                    if (!response.body) {
                        controller.error('响应体为空');
                        return;
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        // 解码二进制数据
                        const chunk = decoder.decode(value, { stream: true });

                        // 处理SSE格式的数据
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                try {
                                    const data = JSON.parse(line.substring(6));
                                    const content = data.choices[0]?.delta?.content || '';
                                    if (content) {
                                        controller.enqueue(new TextEncoder().encode(content));
                                    }
                                } catch (e) {
                                    console.error('解析SSE数据失败:', e);
                                }
                            }
                        }
                    }
                } catch (error) {
                    controller.error(`流式处理错误: ${error instanceof Error ? error.message : String(error)}`);
                } finally {
                    controller.close();
                }
            }
        });

        // 返回流式响应
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('创建翻译规划时出错:', error);
        return NextResponse.json({
            error: `服务器错误: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
} 