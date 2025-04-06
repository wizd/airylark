export interface TranslationPlan {
    contentType: string;
    style: string;
    specializedKnowledge: string[];
    keyTerms: Record<string, string>;
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

/**
 * 尝试解析可能包含Markdown格式的JSON字符串
 * @param jsonString 可能包含Markdown格式的JSON字符串
 * @returns 解析后的对象，如果解析失败则返回null
 */
export function tryParseJson<T>(jsonString: string): T | null {
    try {
        const cleaned = cleanJsonString(jsonString);
        return JSON.parse(cleaned) as T;
    } catch {
        // 在流式传输过程中，收到部分JSON数据时解析失败是正常现象，不记录错误
        return null;
    }
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
 * 流式创建翻译规划
 * @param text 源文本
 * @param onProgress 进度回调函数，接收部分结果
 * @returns 完整的翻译规划
 */
export async function createTranslationPlanStream(
    text: string,
    onProgress: (partialResult: string) => void
): Promise<string> {
    try {
        const response = await fetch('/api/translation/plan/stream', {
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

        if (!response.body) {
            throw new Error('响应体为空');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            result += chunk;
            onProgress(result);
        }

        return result;
    } catch (error) {
        console.error('调用流式翻译规划 API 时出错:', error);
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
 * 流式翻译文本段落
 * @param segment 文本段落
 * @param translationPlan 翻译规划
 * @param onProgress 进度回调函数，接收部分结果
 * @returns 完整的翻译结果
 */
export async function translateSegmentStream(
    segment: string,
    translationPlan: TranslationPlan,
    onProgress: (partialResult: string) => void
): Promise<string> {
    try {
        const response = await fetch('/api/translation/segment/stream', {
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

        if (!response.body) {
            throw new Error('响应体为空');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            result += chunk;
            onProgress(result);
        }

        return result;
    } catch (error) {
        console.error('调用流式翻译段落 API 时出错:', error);
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

/**
 * 流式审校译文
 * @param translatedText 翻译后的文本
 * @param translationPlan 翻译规划
 * @param onProgress 进度回调函数，接收部分结果
 * @returns 完整的审校结果
 */
export async function reviewTranslationStream(
    translatedText: string,
    translationPlan: TranslationPlan,
    onProgress: (partialResult: string) => void
): Promise<string> {
    try {
        const response = await fetch('/api/translation/review/stream', {
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

        if (!response.body) {
            throw new Error('响应体为空');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            result += chunk;
            onProgress(result);
        }

        return result;
    } catch (error) {
        console.error('调用流式审校译文 API 时出错:', error);
        throw error;
    }
} 