'use server';

import { TranslationPlan } from './translationApi';

const API_KEY = process.env.TRANSLATION_API_KEY || '';
const API_URL = process.env.TRANSLATION_BASE_URL || '';
const MODEL = process.env.TRANSLATION_MODEL || 'deepseek-ai/DeepSeek-V3';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ApiResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * 清理JSON字符串输出
 */
function cleanJsonOutput(content: string): string {
    // 移除可能的Markdown代码块标记
    let cleaned = content;
    // 移除```json或```等标记
    cleaned = cleaned.replace(/```json\s*|\s*```/g, '');
    return cleaned;
}

/**
 * 创建翻译规划 - Server Action
 */
export async function createTranslationPlanAction(text: string): Promise<string> {
    if (!text) {
        throw new Error('缺少文本参数');
    }

    if (!API_KEY) {
        throw new Error('API 密钥未配置');
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

    try {
        // 调用 API
        const response = await fetch(API_URL + '/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 请求失败: ${errorData.error?.message || response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        return data.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('创建翻译规划时出错:', error);
        throw error;
    }
}

/**
 * 创建翻译规划(流式) - Server Action
 */
export async function createTranslationPlanStreamAction(text: string): Promise<ReadableStream> {
    if (!text) {
        throw new Error('缺少文本参数');
    }

    if (!API_KEY) {
        throw new Error('API 密钥未配置');
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
        { role: 'system', content: '你是一个专业的翻译规划助手。请直接返回JSON格式的结果，不要添加任何Markdown格式或代码块标记。' },
        { role: 'user', content: prompt }
    ];

    // 创建一个新的 ReadableStream
    return new ReadableStream({
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
                                    // 清理内容中可能的Markdown格式
                                    const cleanedContent = cleanJsonOutput(content);
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
}

/**
 * 翻译文本段落 - Server Action
 */
export async function translateSegmentAction(
    segment: string,
    translationPlan: TranslationPlan
): Promise<string> {
    if (!segment) {
        throw new Error('缺少段落参数');
    }

    if (!translationPlan) {
        throw new Error('缺少翻译规划参数');
    }

    if (!API_KEY) {
        throw new Error('API 密钥未配置');
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
`;

    const messages: Message[] = [
        { role: 'user', content: prompt }
    ];

    try {
        // 调用 API
        const response = await fetch(API_URL + '/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 请求失败: ${errorData.error?.message || response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        return data.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('翻译段落时出错:', error);
        throw error;
    }
}

/**
 * 翻译文本段落(流式) - Server Action
 */
export async function translateSegmentStreamAction(
    segment: string,
    translationPlan: TranslationPlan
): Promise<ReadableStream> {
    if (!segment) {
        throw new Error('缺少段落参数');
    }

    if (!translationPlan) {
        throw new Error('缺少翻译规划参数');
    }

    if (!API_KEY) {
        throw new Error('API 密钥未配置');
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
`;

    const messages: Message[] = [
        { role: 'system', content: '你是一个专业的翻译助手。请直接返回译文，不要添加任何Markdown格式或代码块标记。' },
        { role: 'user', content: prompt }
    ];

    // 创建一个新的 ReadableStream
    return new ReadableStream({
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
}

/**
 * 审校译文 - Server Action
 */
export async function reviewTranslationAction(
    translatedText: string,
    translationPlan: TranslationPlan
): Promise<string> {
    if (!translatedText) {
        throw new Error('缺少译文参数');
    }

    if (!translationPlan) {
        throw new Error('缺少翻译规划参数');
    }

    if (!API_KEY) {
        throw new Error('API 密钥未配置');
    }

    // 构建提示词
    const prompt = `
请审校以下中文翻译，确保准确性、流畅性和一致性。特别注意专业术语的翻译是否准确。
原文类型: ${translationPlan.contentType}
原文风格: ${translationPlan.style}
专业领域: ${translationPlan.specializedKnowledge.join(', ')}

译文:
${translatedText}

请提供修改后的最终译文，保留原有的段落编号。
请直接返回审校后的文本，不要使用Markdown代码块或其他格式标记。
`;

    const messages: Message[] = [
        { role: 'user', content: prompt }
    ];

    try {
        // 调用 API
        const response = await fetch(API_URL + '/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 请求失败: ${errorData.error?.message || response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        return data.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('审校译文时出错:', error);
        throw error;
    }
}

/**
 * 审校译文(流式) - Server Action
 */
export async function reviewTranslationStreamAction(
    translatedText: string,
    translationPlan: TranslationPlan
): Promise<ReadableStream> {
    if (!translatedText) {
        throw new Error('缺少译文参数');
    }

    if (!translationPlan) {
        throw new Error('缺少翻译规划参数');
    }

    if (!API_KEY) {
        throw new Error('API 密钥未配置');
    }

    // 构建提示词
    const prompt = `
请审校以下中文翻译，确保准确性、流畅性和一致性。特别注意专业术语的翻译是否准确。
原文类型: ${translationPlan.contentType}
原文风格: ${translationPlan.style}
专业领域: ${translationPlan.specializedKnowledge.join(', ')}

译文:
${translatedText}

请提供修改后的最终译文，保留原有的段落编号。
请直接返回审校后的文本，不要使用Markdown代码块或其他格式标记。
`;

    const messages: Message[] = [
        { role: 'system', content: '你是一个专业的翻译审校助手。请直接返回审校后的文本，不要添加任何Markdown格式或代码块标记。' },
        { role: 'user', content: prompt }
    ];

    // 创建一个新的 ReadableStream
    return new ReadableStream({
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
} 