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
        // 从请求中获取译文和翻译规划
        const { translatedText, translationPlan } = await request.json();

        if (!translatedText) {
            return NextResponse.json({ error: '缺少译文参数' }, { status: 400 });
        }

        if (!translationPlan) {
            return NextResponse.json({ error: '缺少翻译规划参数' }, { status: 400 });
        }

        if (!API_KEY) {
            return NextResponse.json({ error: 'API 密钥未配置' }, { status: 500 });
        }

        // 构建提示词
        const prompt = `
请审校以下中文翻译，确保准确性、流畅性和一致性。特别注意专业术语的翻译是否准确。
原文类型: ${translationPlan.contentType}
原文风格: ${translationPlan.style}
专业领域: ${translationPlan.specializedKnowledge.join(', ')}

译文:
${translatedText}

请先详细分析译文的质量，包括以下几个方面：
1. 翻译准确性：是否忠实原意
2. 语言流畅性：是否符合中文表达习惯
3. 术语一致性：专业术语是否统一
4. 风格一致性：是否符合原文风格

在你的回复中，请先提供你的审校分析，然后使用"===FINAL_TRANSLATION==="分隔符，最后给出最终修改后的译文。
请保留原有的段落编号。
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
        console.error('审校译文时出错:', error);
        return NextResponse.json({
            error: `服务器错误: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
} 