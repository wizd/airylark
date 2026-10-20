import type { Review, TranslationPlan } from '../lib/translation';

export type { Review, TranslationPlan };

// 浏览器可访问的环境变量需以 NEXT_PUBLIC_ 开头，构建时注入
const useStreaming = process.env.NEXT_PUBLIC_USE_STREAMING === 'true';

/** 流式过程中累积的思考摘要与输出文本 */
export interface Progress {
    thinking: string;
    text: string;
}

export interface TaskResult<T> {
    thinking: string;
    result: T;
}

/**
 * 调用一个翻译任务接口。开启流式时读取 `${path}/stream` 返回的 NDJSON 事件，
 * 通过 onProgress 回调实时反馈；否则直接请求 JSON 结果。
 */
async function callTask<T>(
    path: string,
    body: unknown,
    onProgress?: (progress: Progress) => void
): Promise<TaskResult<T>> {
    const response = await fetch(useStreaming ? `${path}/stream` : path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText);
    }

    if (!useStreaming) {
        return response.json();
    }

    if (!response.body) {
        throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const progress: Progress = { thinking: '', text: '' };
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);
            switch (event.type) {
                case 'thinking':
                    progress.thinking += event.text;
                    onProgress?.({ ...progress });
                    break;
                case 'text':
                    progress.text += event.text;
                    onProgress?.({ ...progress });
                    break;
                case 'done':
                    return { thinking: event.thinking, result: event.result };
                case 'error':
                    throw new Error(event.error);
            }
        }
    }

    throw new Error('响应流意外结束');
}

/** 分析全文，生成翻译规划和术语表 */
export function createTranslationPlan(
    text: string,
    onProgress?: (progress: Progress) => void
) {
    return callTask<TranslationPlan>('/api/translation/plan', { text }, onProgress);
}

/** 翻译单个段落；document 为完整原文，作为上下文 */
export function translateSegment(
    segment: string,
    translationPlan: TranslationPlan,
    document: string,
    onProgress?: (progress: Progress) => void
) {
    return callTask<string>(
        '/api/translation/segment',
        { segment, translationPlan, document },
        onProgress
    );
}

/** 对照原文审校译文 */
export function reviewTranslation(
    translatedText: string,
    translationPlan: TranslationPlan,
    sourceText: string,
    onProgress?: (progress: Progress) => void
) {
    return callTask<Review>(
        '/api/translation/review',
        { translatedText, translationPlan, sourceText },
        onProgress
    );
}
