export interface TranslationPlan {
    contentType: string;
    style: string;
    specializedKnowledge: string[];
    keyTerms: Record<string, string>;
}

/**
 * 创建翻译规划
 * @param text 源文本
 * @returns 翻译规划
 */
export async function createTranslationPlan(text: string): Promise<string> {
    try {
        const response = await fetch('/api/translation/plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '创建翻译规划失败');
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('调用翻译规划 API 时出错:', error);
        throw error;
    }
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
    try {
        const response = await fetch('/api/translation/segment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ segment, translationPlan }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '翻译段落失败');
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('调用翻译段落 API 时出错:', error);
        throw error;
    }
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
    try {
        const response = await fetch('/api/translation/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ translatedText, translationPlan }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '审校译文失败');
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('调用审校译文 API 时出错:', error);
        throw error;
    }
} 