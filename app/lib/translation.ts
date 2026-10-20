import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { parseJson, type TaskParams } from './llm';

// 并非所有 OpenAI 兼容接口都会强制执行 response_format，因此在提示词中也给出 JSON Schema
function jsonFormat(schema: z.ZodType, name: string) {
    // 去掉 $schema 元信息，避免模型把它当作字段原样输出
    const jsonSchema: Record<string, unknown> = { ...z.toJSONSchema(schema) };
    delete jsonSchema.$schema;
    return {
        response_format: zodResponseFormat(schema, name),
        instruction: `只返回一个符合以下 JSON Schema 的 JSON 对象（直接填写各字段的值，不要返回 Schema 本身），字段名必须完全一致，不要附加其他文字:\n${JSON.stringify(jsonSchema)}`,
    };
}

/** 按 Schema 校验模型输出；兼容把结果包在 properties 或单个键下的情况 */
function parseStructured<T>(schema: z.ZodType<T>, text: string): T {
    const data = parseJson(text);
    const candidates: unknown[] = [data];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const obj = data as Record<string, unknown>;
        if (obj.properties) candidates.push(obj.properties);
        const nested = Object.values(obj).filter((v) => v && typeof v === 'object' && !Array.isArray(v));
        if (nested.length === 1) candidates.push(nested[0]);
    }
    for (const candidate of candidates) {
        const result = schema.safeParse(candidate);
        if (result.success) return result.data;
    }
    console.error('模型输出不符合 Schema:', text);
    throw new Error('模型返回的 JSON 结构不符合要求，请重试');
}

// ---------- 翻译规划 ----------

export const PlanSchema = z.object({
    contentType: z.string().describe('文本类型，如学术论文、新闻报道、技术文档'),
    style: z.string().describe('文本风格，如正式、非正式、技术性'),
    specializedKnowledge: z.array(z.string()).describe('涉及的专业知识领域'),
    keyTerms: z
        .array(z.object({ source: z.string(), target: z.string() }))
        .describe('关键术语及其中文译法'),
});

export interface TranslationPlan {
    contentType: string;
    style: string;
    specializedKnowledge: string[];
    keyTerms: Record<string, string>;
}

export function planParams(text: string): TaskParams {
    const { response_format, instruction } = jsonFormat(PlanSchema, 'translation_plan');
    return {
        response_format,
        messages: [
            { role: 'system', content: `你是专业的翻译规划专家，为后续逐段翻译成中文制定统一的策略。\n\n${instruction}` },
            {
                role: 'user',
                content: `<document>\n${text}\n</document>\n\n分析上面的文档：识别文本类型、风格和涉及的专业领域，并整理出需要在全文中统一译法的关键术语及其中文翻译。`,
            },
        ],
    };
}

export function finalizePlan(text: string): TranslationPlan {
    const plan = parseStructured(PlanSchema, text);
    return {
        ...plan,
        keyTerms: Object.fromEntries(plan.keyTerms.map(({ source, target }) => [source, target])),
    };
}

function describePlan(plan: TranslationPlan): string {
    const terms = Object.entries(plan.keyTerms ?? {})
        .map(([source, target]) => `- ${source}: ${target}`)
        .join('\n');
    return `文本类型: ${plan.contentType}\n风格: ${plan.style}\n专业领域: ${plan.specializedKnowledge.join(', ')}\n关键术语:\n${terms || '（无）'}`;
}

// ---------- 段落翻译 ----------

export function segmentParams(segment: string, plan: TranslationPlan, document?: string): TaskParams {
    // 固定指令和全文放在最前面，各段请求共享同一前缀，便于接口自动缓存
    const context = document
        ? `\n\n完整原文（仅供理解上下文，每次只翻译用户给出的段落）:\n<document>\n${document}\n</document>`
        : '';
    return {
        messages: [
            {
                role: 'system',
                content: `你是专业译者，负责把文档逐段翻译成中文。保持原文的风格、语气、逻辑结构和段落编号，关键术语按规划统一译法。只输出该段的译文本身，不要附加说明。${context}`,
            },
            {
                role: 'user',
                content: `<translation_plan>\n${describePlan(plan)}\n</translation_plan>\n\n<segment>\n${segment}\n</segment>`,
            },
        ],
    };
}

// ---------- 审校 ----------

export const ReviewSchema = z.object({
    reviewNotes: z.array(z.string()).describe('审校发现：准确性、流畅性、术语一致性、风格一致性方面的问题'),
    improvements: z.array(z.string()).describe('对译文所做的具体修改'),
    finalTranslation: z.string().describe('修改后的完整译文，保留段落编号和段落划分'),
});

export type Review = z.infer<typeof ReviewSchema>;

export function reviewParams(translatedText: string, plan: TranslationPlan, sourceText?: string): TaskParams {
    const source = sourceText ? `<source>\n${sourceText}\n</source>\n\n` : '';
    const { response_format, instruction } = jsonFormat(ReviewSchema, 'translation_review');
    return {
        response_format,
        messages: [
            {
                role: 'system',
                content: `你是资深翻译审校。对照原文审校中文译文，修正误译、漏译、不通顺的表达以及术语和风格不一致之处。\n\n<translation_plan>\n${describePlan(plan)}\n</translation_plan>\n\n${instruction}`,
            },
            {
                role: 'user',
                content: `${source}<translation>\n${translatedText}\n</translation>\n\n请审校上面的译文，给出审校发现、所做修改和最终译文。`,
            },
        ],
    };
}

export function finalizeReview(text: string): Review {
    return parseStructured(ReviewSchema, text);
}

// ---------- 质量评估 ----------

export const EvaluationSchema = z.object({
    score: z.number().describe('总体评分，0-100'),
    comments: z.array(z.string()).describe('总体评价'),
    segmentScores: z.array(z.number()).describe('按译文段落顺序的评分，0-100'),
    segmentFeedbacks: z.array(
        z.object({
            segmentIndex: z.number().describe('译文段落索引，从 0 开始'),
            issues: z.array(
                z.object({
                    type: z.string().describe('问题类型，如误译、术语、流畅性、风格'),
                    description: z.string(),
                    originalText: z.string().describe('对应的原文片段'),
                    translatedText: z.string().describe('有问题的译文片段，需与译文原样一致'),
                    suggestion: z.string().describe('修改后的译文片段本身，不含“改为”等指示词'),
                    start: z.number().describe('有问题片段在该段译文中的起始字符位置'),
                    end: z.number().describe('有问题片段在该段译文中的结束字符位置'),
                    reason: z.string(),
                })
            ),
        })
    ),
});

export function evaluationParams(originalText: string, translatedText: string): TaskParams {
    const { response_format, instruction } = jsonFormat(EvaluationSchema, 'translation_evaluation');
    return {
        response_format,
        messages: [
            {
                role: 'system',
                content: `你是专业的翻译质量评估专家。先通读原文确定评估重点，再从准确性、流畅性、术语使用、风格一致性四个方面评估译文。段落以空行分隔。\n\n${instruction}`,
            },
            {
                role: 'user',
                content: `<source>\n${originalText}\n</source>\n\n<translation>\n${translatedText}\n</translation>`,
            },
        ],
    };
}

export function finalizeEvaluation(text: string) {
    return parseStructured(EvaluationSchema, text);
}
