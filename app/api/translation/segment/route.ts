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
        console.error('翻译段落时出错:', error);
        return NextResponse.json({
            error: `服务器错误: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
} 