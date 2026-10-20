import OpenAI from 'openai';
import type { ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions';
import { NextResponse } from 'next/server';

// 这里在服务器端使用环境变量（任意 OpenAI 兼容接口）
const API_KEY = process.env.TRANSLATION_API_KEY || '';
const API_URL = process.env.TRANSLATION_BASE_URL || undefined;
export const MODEL = process.env.TRANSLATION_MODEL || 'deepseek-ai/DeepSeek-V3';

let client: OpenAI | null = null;

function getClient(): OpenAI {
    if (!API_KEY) {
        throw new Error('API 密钥未配置 (TRANSLATION_API_KEY)');
    }
    client ??= new OpenAI({ apiKey: API_KEY, baseURL: API_URL });
    return client;
}

// 各任务的请求参数；model 和 stream 统一填入
export type TaskParams = Omit<ChatCompletionCreateParamsStreaming, 'model' | 'stream'>;

// 流式响应中逐行发送的事件（NDJSON）
export type StreamEvent<T> =
    | { type: 'thinking'; text: string }
    | { type: 'text'; text: string }
    | { type: 'done'; thinking: string; result: T }
    | { type: 'error'; error: string };

export interface TaskOutput {
    thinking: string;
    text: string;
}

// 部分推理模型通过 reasoning_content / reasoning 字段返回思考过程
interface Delta {
    content?: string | null;
    refusal?: string | null;
    reasoning_content?: string | null;
    reasoning?: string | null;
}

/**
 * 以流式方式调用模型（避免长输出触发 HTTP 超时），返回思考过程和输出文本。
 */
export async function runTask(
    params: TaskParams,
    onDelta?: (event: { type: 'thinking' | 'text'; text: string }) => void
): Promise<TaskOutput> {
    const stream = await getClient().chat.completions.create({ model: MODEL, ...params, stream: true });

    let thinking = '';
    let text = '';
    let refusal = '';
    let finishReason: string | null = null;

    for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;
        const delta = choice.delta as Delta;
        const reasoning = delta.reasoning_content ?? delta.reasoning;
        if (reasoning) {
            thinking += reasoning;
            onDelta?.({ type: 'thinking', text: reasoning });
        }
        if (delta.content) {
            text += delta.content;
            onDelta?.({ type: 'text', text: delta.content });
        }
        if (delta.refusal) refusal += delta.refusal;
        if (choice.finish_reason) finishReason = choice.finish_reason;
    }

    if (refusal) throw new Error(`模型拒绝了该请求: ${refusal}`);
    if (finishReason === 'content_filter') throw new Error('模型拒绝了该请求（内容过滤）');
    if (finishReason === 'length') throw new Error('输出超出长度上限，请缩短输入文本');

    return { thinking: thinking.trim(), text: text.trim() };
}

/** 解析模型返回的 JSON，兼容少数接口仍会附带的 Markdown 代码块 */
export function parseJson(text: string): unknown {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse(fenced ? fenced[1] : text);
}

export function errorMessage(error: unknown): string {
    if (error instanceof OpenAI.AuthenticationError) return 'API 密钥无效 (TRANSLATION_API_KEY)';
    if (error instanceof OpenAI.RateLimitError) return '请求过于频繁，请稍后重试';
    if (error instanceof OpenAI.APIError) return `API 请求失败 ${error.status ?? ''}: ${error.message}`;
    return error instanceof Error ? error.message : String(error);
}

export function errorStatus(error: unknown): number {
    return error instanceof OpenAI.APIError && error.status ? error.status : 500;
}

/** 运行一次请求并以 JSON 返回 { thinking, result } */
export async function respondJson<T>(params: TaskParams, finalize: (text: string) => T) {
    try {
        const { thinking, text } = await runTask(params);
        return NextResponse.json({ thinking, result: finalize(text) });
    } catch (error) {
        console.error('模型请求失败:', error);
        return NextResponse.json({ error: errorMessage(error) }, { status: errorStatus(error) });
    }
}

/** 运行一次请求并以 NDJSON 流式返回思考过程、文本增量和最终结果 */
export function respondStream<T>(params: TaskParams, finalize: (text: string) => T) {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
        async start(controller) {
            const send = (event: StreamEvent<T>) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
            try {
                const { thinking, text } = await runTask(params, send);
                send({ type: 'done', thinking, result: finalize(text) });
            } catch (error) {
                console.error('模型流式请求失败:', error);
                send({ type: 'error', error: errorMessage(error) });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(body, {
        headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-cache',
        },
    });
}
