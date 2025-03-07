import { NextResponse } from 'next/server';

// 这里在服务器端使用环境变量
const API_KEY = process.env.TRANSLATION_API_KEY || '';
const API_URL = process.env.TRANSLATION_BASE_URL || '';
const MODEL = process.env.TRANSLATION_MODEL || 'deepseek-ai/DeepSeek-V3';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// 检查并清理可能的Markdown格式
function cleanOutput(content: string): string {
    // 这里我们不需要像JSON那样严格清理，但仍然可以移除一些不必要的格式标记
    return content;
}

export async function POST(request: Request) {
    try {
        // 从请求中获取段落和翻译规划
        const { segment, translationPlan } = await request.json();

        if (!segment) {
            return NextResponse.json({ error: '缺少段落参数' }, { status: 400 });
        }

        if (!translationPlan) {
            return NextResponse.json({ error: '缺少翻译规划参数' }, { status: 400 });
        }

        if (!API_KEY) {
            return NextResponse.json({ error: 'API 密钥未配置' }, { status: 500 });
        }

        // 构建提示词
        const prompt = `
请将以下文本翻译成中文。保持原文的风格和专业性。
文本类型: ${translationPlan.contentType}
风格: ${translationPlan.style}
专业领域: ${translationPlan.specializedKnowledge.join(', ')}
关键术语对照:
${Object.entries(translationPlan.keyTerms).map(([en, zh]) => `- ${en}: ${zh}`).join('\n')}

原文:
${segment}

请确保在翻译结果前保留段落编号（如果有）。
请直接返回翻译结果，不要使用Markdown代码块或其他格式标记。

请先详细分析原文的含义和结构，然后再进行翻译。在翻译过程中，请思考以下几点：
1. 原文的主要意思是什么？
2. 有哪些专业术语需要准确翻译？
3. 原文的语气和风格是什么样的？
4. 如何保持原文的逻辑结构？

在你的回复中，请先提供你的分析思考过程，然后使用"===TRANSLATION==="分隔符，最后给出最终翻译。
`;

        const messages: Message[] = [
            { role: 'system', content: '你是一个专业的翻译助手。请按照要求格式返回结果，不要添加额外的Markdown格式。' },
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
                                        // 清理内容中可能的格式标记
                                        const cleanedContent = cleanOutput(content);
                                        controller.enqueue(new TextEncoder().encode(cleanedContent));
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
        console.error('翻译段落时出错:', error);
        return NextResponse.json({
            error: `服务器错误: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
} 