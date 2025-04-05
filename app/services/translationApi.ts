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
    } catch (error) {
        console.error('JSON解析失败:', error);
        return null;
    }
}

import { 
    createTranslationPlanAction, 
    createTranslationPlanStreamAction,
    translateSegmentAction,
    translateSegmentStreamAction,
    reviewTranslationAction,
    reviewTranslationStreamAction
} from './translationActions';

/**
 * 创建翻译规划
 * @param text 源文本
 * @returns 翻译规划
 */
export async function createTranslationPlan(text: string): Promise<string> {
    try {
        return await createTranslationPlanAction(text);
    } catch (error) {
        console.error('调用翻译规划时出错:', error);
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
        const stream = await createTranslationPlanStreamAction(text);
        const reader = stream.getReader();
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
        console.error('调用流式翻译规划时出错:', error);
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
        return await translateSegmentAction(segment, translationPlan);
    } catch (error) {
        console.error('调用翻译段落时出错:', error);
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
        const stream = await translateSegmentStreamAction(segment, translationPlan);
        const reader = stream.getReader();
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
        console.error('调用流式翻译段落时出错:', error);
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
        return await reviewTranslationAction(translatedText, translationPlan);
    } catch (error) {
        console.error('调用审校译文时出错:', error);
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
        const stream = await reviewTranslationStreamAction(translatedText, translationPlan);
        const reader = stream.getReader();
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
        console.error('调用流式审校译文时出错:', error);
        throw error;
    }
} 