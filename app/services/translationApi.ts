// 这里应该使用环境变量来存储 API 密钥
const API_KEY = process.env.NEXT_PUBLIC_TRANSLATION_API_KEY || '';
const API_URL = process.env.NEXT_PUBLIC_TRANSLATION_API_URL || '';

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

export interface TranslationPlan {
    contentType: string;
    style: string;
    specializedKnowledge: string[];
    keyTerms: Record<string, string>;
}

/**
 * 发送请求到 OpenAI 兼容的 API
 * @param messages 消息数组
 * @param model 模型名称
 * @returns API 响应
 */
export async function callTranslationApi(
    messages: Message[],
    model: string = process.env.NEXT_PUBLIC_TRANSLATION_MODEL || ''
): Promise<string> {
    try {
        if (!API_KEY) {
            throw new Error('API 密钥未设置');
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
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
        console.error('调用翻译 API 时出错:', error);
        throw error;
    }
}

/**
 * 创建翻译规划
 * @param text 源文本
 * @returns 翻译规划
 */
export async function createTranslationPlan(text: string): Promise<string> {
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

    return callTranslationApi(messages);
}

/**
 * 翻译文本段落
 * @param segment 文本段落
 * @param translationPlan 翻译规划
 * @returns 翻译后的段落
 */
export async function translateSegment(
    segment: string,
    translationPlan: TranslationPlan
): Promise<string> {
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

    return callTranslationApi(messages);
}

/**
 * 审校译文
 * @param translatedText 翻译后的文本
 * @param translationPlan 翻译规划
 * @returns 审校后的文本
 */
export async function reviewTranslation(
    translatedText: string,
    translationPlan: TranslationPlan
): Promise<string> {
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

    return callTranslationApi(messages);
}
