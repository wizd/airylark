import { NextResponse } from 'next/server';

// 这里在服务器端使用环境变量
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

请提供修改后的最终译文，保留原有的段落编号。
请直接返回审校后的文本，不要使用Markdown代码块或其他格式标记。
`;

        const messages: Message[] = [
            { role: 'user', content: prompt }
        ];

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
            return NextResponse.json({
                error: `API 请求失败: ${errorData.error?.message || response.statusText}`
            }, { status: response.status });
        }

        const data: ApiResponse = await response.json();
        const result = data.choices[0]?.message?.content || '';

        return NextResponse.json({ result });
    } catch (error) {
        console.error('审校译文时出错:', error);
        return NextResponse.json({
            error: `服务器错误: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
} 