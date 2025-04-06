import { NextResponse } from 'next/server';

// 使用环境变量
const API_KEY = process.env.TRANSLATION_API_KEY || '';
const API_URL = process.env.TRANSLATION_BASE_URL || '';
const MODEL = process.env.TRANSLATION_MODEL || 'deepseek-ai/DeepSeek-V3';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ApiResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

// 定义问题类型接口
interface Issue {
    type: string;
    description: string;
    originalText: string;
    translatedText: string;
    suggestion: string;
    start: number;
    end: number;
    reason: string;
    operations?: Array<{
        type: 'keep' | 'delete' | 'insert' | 'replace';
        sourceStart: number;
        sourceEnd: number;
        targetStart: number;
        targetEnd: number;
        content?: string;
    }>;
}

// 定义反馈类型接口
interface SegmentFeedback {
    segmentIndex: number;
    issues: Issue[];
}

export async function POST(request: Request) {
    try {
        const { originalText, translatedText } = await request.json();

        // 验证输入
        if (!originalText || !translatedText) {
            return NextResponse.json(
                { error: '原文和译文都是必需的' },
                { status: 400 }
            );
        }

        if (!API_KEY) {
            return NextResponse.json({ error: 'API 密钥未配置' }, { status: 500 });
        }

        // 构建评估提示词
        const prompt = `
你是专业的翻译质量评估专家，请对以下翻译进行质量评估：

原文：
\`\`\`
${originalText}
\`\`\`

请你首先阅读上面的原文，制订一个评估翻译质量的策略，然后对比下面的译文：

译文：
\`\`\`
${translatedText}
\`\`\`

请从以下几个方面进行评估：
1. 准确性：译文是否准确传达了原文的意思
2. 流畅性：译文是否符合中文表达习惯
3. 术语使用：专业术语的翻译是否准确
4. 风格一致性：译文是否保持了原文的风格

请按照以下格式返回评估结果：
{
    "score": 评分（0-100分）,
    "comments": [
        "具体评价1",
        "具体评价2",
        ...
    ],
    "segmentScores": [
        段落1评分,
        段落2评分,
        ...
    ],
    "segmentFeedbacks": [
        {
            "segmentIndex": 段落索引,
            "issues": [
                {
                    "type": "问题类型",
                    "description": "问题描述",
                    "originalText": "原文片段",
                    "translatedText": "译文片段",
                    "suggestion": "建议的翻译结果（直接输出修改后的文本，不要包含'改为'等指示词）",
                    "start": 起始位置,
                    "end": 结束位置,
                    "reason": "修改理由"
                }
            ]
        }
    ]
}

请确保返回的是有效的JSON格式。
`;

        const messages: Message[] = [
            { role: 'system', content: '你是一个专业的翻译质量评估专家。请严格按照要求的JSON格式返回评估结果。' },
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
                temperature: 0.3, // 降低随机性，使评估更稳定
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

        try {
            // 处理可能存在的 Markdown 代码块标记
            let jsonContent = result;
            if (result.includes('```json')) {
                jsonContent = result.split('```json')[1].split('```')[0].trim();
            } else if (result.includes('```')) {
                jsonContent = result.split('```')[1].split('```')[0].trim();
            }
            
            console.log('processedContent:', jsonContent);
            const evaluationResult = JSON.parse(jsonContent);
            
            // 验证必要的字段
            if (!evaluationResult.score || !evaluationResult.comments || !evaluationResult.segmentScores) {
                throw new Error('评估结果缺少必要字段');
            }
            
            // 分割文本为段落
            const originalSegments = segmentText(originalText);
            const translatedSegments = segmentText(translatedText);

            return NextResponse.json({
                ...evaluationResult,
                originalSegments,
                translatedSegments
            });
        } catch (error) {
            console.error('解析评估结果失败:', error);
            console.error('原始内容:', result);
            return NextResponse.json(
                { error: `解析评估结果失败: ${error instanceof Error ? error.message : String(error)}` },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('翻译质量评估失败:', error);
        return NextResponse.json(
            { error: '处理请求时出错' },
            { status: 500 }
        );
    }
}

// 分割文本为段落
function segmentText(text: string): string[] {
    // 按段落分割（空行分隔）
    const segments = text.split(/\n\s*\n/).filter(segment => segment.trim() !== '');

    // 为每个段落添加编号
    return segments.map((segment, index) => `[${index + 1}] ${segment.trim()}`);
}

// 生成整体评论
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateOverallComments(segmentFeedbacks: SegmentFeedback[], score: number): string[] {
    const comments: string[] = [];
    
    // 统计问题类型
    const issueTypes = new Map<string, number>();
    segmentFeedbacks.forEach(feedback => {
        feedback.issues.forEach((issue: Issue) => {
            issueTypes.set(issue.type, (issueTypes.get(issue.type) || 0) + 1);
        });
    });

    // 根据分数生成评论，使用更通用的评分反馈
    if (score < 70) {
        comments.push("翻译质量需要改进，存在需要修正的问题。");
    } else if (score < 80) {
        comments.push("翻译整体可用，有一些需要改进的地方。");
    } else if (score < 90) {
        comments.push("翻译质量良好，有少量可优化之处。");
    } else {
        comments.push("翻译质量优秀，基本符合专业标准。");
    }

    // 基于问题类型统计生成通用评论
    const problemTypes = Array.from(issueTypes.keys());
    if (problemTypes.length > 0) {
        const typeCount = problemTypes.length;
        if (typeCount <= 2) {
            comments.push(`主要存在 ${problemTypes.join('、')} 等问题，可针对性改进。`);
        } else {
            comments.push(`存在多种问题类型，包括 ${problemTypes.slice(0, 3).join('、')} 等，建议全面检查。`);
        }
    }

    // 如果评分低但没有具体问题，添加默认评论
    if (score < 80 && comments.length < 2) {
        comments.push("建议检查译文的准确性和流畅度。");
        comments.push("可考虑调整表达方式，使译文更符合目标读者的阅读习惯。");
    }

    return comments;
}

// 计算最小编辑距离并返回编辑操作
function calculateMinimumEditOperations(source: string, target: string): {
    operations: Array<{
        type: 'keep' | 'delete' | 'insert' | 'replace';
        sourceStart: number;
        sourceEnd: number;
        targetStart: number;
        targetEnd: number;
        content?: string;
    }>;
} {
    const m = source.length;
    const n = target.length;
    
    // 创建DP表
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    const operations: Array<{
        type: 'keep' | 'delete' | 'insert' | 'replace';
        sourceStart: number;
        sourceEnd: number;
        targetStart: number;
        targetEnd: number;
        content?: string;
    }> = [];

    // 初始化DP表
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // 填充DP表
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (source[i - 1] === target[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,  // 删除
                    dp[i][j - 1] + 1,  // 插入
                    dp[i - 1][j - 1] + 1  // 替换
                );
            }
        }
    }

    // 回溯找出编辑操作
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && source[i - 1] === target[j - 1]) {
            operations.unshift({
                type: 'keep',
                sourceStart: i - 1,
                sourceEnd: i,
                targetStart: j - 1,
                targetEnd: j
            });
            i--; j--;
        } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
            operations.unshift({
                type: 'replace',
                sourceStart: i - 1,
                sourceEnd: i,
                targetStart: j - 1,
                targetEnd: j,
                content: target[j - 1]
            });
            i--; j--;
        } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
            operations.unshift({
                type: 'delete',
                sourceStart: i - 1,
                sourceEnd: i,
                targetStart: j,
                targetEnd: j
            });
            i--;
        } else {
            operations.unshift({
                type: 'insert',
                sourceStart: i,
                sourceEnd: i,
                targetStart: j - 1,
                targetEnd: j,
                content: target[j - 1]
            });
            j--;
        }
    }

    return { operations };
}

// 改进的术语检查函数
function analyzeTermIssues(originalContent: string, translatedContent: string): Issue[] {
    const issues: Issue[] = [];

    // 术语列表应该从配置或数据库中加载，这里仅作示例
    const terms: {
        en: string;
        zh: string;
        suggestion: string;
        reason: string;
    }[] = [];

    // 未来可以通过API或配置文件导入术语列表
    // 示例：const terms = await fetchTermsFromDatabase();

    for (const term of terms) {
        if (originalContent.includes(term.en)) {
            // 使用正则表达式或其他方法找出可能的翻译
            const translationPattern = new RegExp(term.zh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            let match;
            
            while ((match = translationPattern.exec(translatedContent)) !== null) {
                const actualTranslation = match[0];
                if (actualTranslation !== term.zh) {
                    // 计算实际翻译和建议翻译之间的字符级别差异
                    const { operations } = calculateMinimumEditOperations(actualTranslation, term.zh);
                    
                    issues.push({
                        type: "术语不准确",
                        description: generateIssueDescription("术语不准确"),
                        originalText: term.en,
                        translatedText: actualTranslation,
                        suggestion: term.zh,
                        reason: term.reason,
                        start: 0,  // 这些会在调用时被正确赋值
                        end: 0,
                        operations: operations
                    });
                }
            }
        }
    }

    return issues;
}

// 在生成段落反馈时包含编辑操作信息
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateSegmentFeedbacks(originalSegments: string[], translatedSegments: string[]): SegmentFeedback[] {
    const feedbacks: SegmentFeedback[] = [];

    // 为每个段落生成问题
    for (let segmentIndex = 0; segmentIndex < translatedSegments.length; segmentIndex++) {
        const originalContent = originalSegments[segmentIndex]?.replace(/^\[\d+\]\s*/, "") || "";
        const translatedContent = translatedSegments[segmentIndex]?.replace(/^\[\d+\]\s*/, "") || "";

        if (!originalContent || !translatedContent) continue;

        // 存储已检测过的文本范围，避免重复检测
        const checkedRanges: { start: number; end: number }[] = [];

        // 分析段落中的问题
        const issues = analyzeSegmentIssues(originalContent, translatedContent, checkedRanges);

        // 在添加术语问题时包含操作信息
        const termIssues = analyzeTermIssues(originalContent, translatedContent);
        for (const issue of termIssues) {
            const start = translatedContent.indexOf(issue.translatedText);
            if (start !== -1 && !isRangeOverlapping({ start, end: start + issue.translatedText.length }, checkedRanges)) {
                issues.push({
                    ...issue,
                    start,
                    end: start + issue.translatedText.length,
                    operations: issue.operations
                });
                checkedRanges.push({ start, end: start + issue.translatedText.length });
            }
        }

        if (issues.length > 0) {
            feedbacks.push({
                segmentIndex,
                issues
            });
        }
    }

    return feedbacks;
}

// 检查文本范围是否已被检测过
function isRangeOverlapping(range: { start: number; end: number }, checkedRanges: { start: number; end: number }[]): boolean {
    return checkedRanges.some(checked => 
        (range.start >= checked.start && range.start < checked.end) ||
        (range.end > checked.start && range.end <= checked.end) ||
        (range.start <= checked.start && range.end >= checked.end)
    );
}

// 分析段落中的问题
function analyzeSegmentIssues(
    originalContent: string,
    translatedContent: string,
    checkedRanges: { start: number; end: number }[]
): Issue[] {
    const issues: Issue[] = [];

    // 使用更智能的分词方式
    const segments = translatedContent.split(/([。！？，；：\s])/);
    let position = 0;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (!segment.trim()) {
            position += segment.length;
            continue;
        }

        // 检查数字格式问题
        const numberIssues = checkNumberFormat(segment, position);
        if (numberIssues) {
            const { start, end, suggestion } = numberIssues;
            if (!isRangeOverlapping({ start, end }, checkedRanges)) {
                issues.push({
                    type: "数字格式",
                    description: "数字格式需要规范化",
                    originalText: translatedContent.substring(start, end),
                    translatedText: translatedContent.substring(start, end),
                    suggestion,
                    start,
                    end,
                    reason: "数字的表达方式需要符合中文写作规范",
                    operations: numberIssues.operations
                });
                checkedRanges.push({ start, end });
            }
        }

        // 检查重复内容（改进版）
        const duplicateIssue = checkDuplicateContent(segment, translatedContent, position);
        if (duplicateIssue && !isRangeOverlapping(duplicateIssue, checkedRanges)) {
            issues.push({
                type: "重复内容",
                description: "译文中存在不必要的重复",
                originalText: translatedContent.substring(duplicateIssue.start, duplicateIssue.end),
                translatedText: translatedContent.substring(duplicateIssue.start, duplicateIssue.end),
                suggestion: "删除重复内容",
                start: duplicateIssue.start,
                end: duplicateIssue.end,
                reason: "文本中出现了不必要的重复内容，影响阅读流畅度",
                operations: calculateMinimumEditOperations(translatedContent.substring(duplicateIssue.start, duplicateIssue.end), translatedContent.substring(duplicateIssue.start, duplicateIssue.end)).operations
            });
            checkedRanges.push(duplicateIssue);
        }

        position += segment.length;
    }

    return issues;
}

// 检查数字格式
function checkNumberFormat(text: string, basePosition: number): { 
    start: number; 
    end: number; 
    suggestion: string;
    operations?: Array<{
        type: 'keep' | 'delete' | 'insert' | 'replace';
        sourceStart: number;
        sourceEnd: number;
        targetStart: number;
        targetEnd: number;
        content?: string;
    }>;
} | null {
    // 使用通用的数字格式检查模式，检测数字之间有空格的情况
    const numberPattern = /\d+\s+\d+/g;
    let match;

    while ((match = numberPattern.exec(text)) !== null) {
        const matchedText = match[0];
        const start = basePosition + match.index;
        const end = start + matchedText.length;

        // 处理普通数字，移除中间的空格
        const suggestion = matchedText.replace(/\s+/g, '');
        return { start, end, suggestion };
    }

    return null;
}

// 改进的重复内容检查
function checkDuplicateContent(segment: string, fullText: string, basePosition: number): { start: number; end: number } | null {
    // 忽略过短的片段，避免误判
    if (segment.length < 5) return null;

    const segmentEnd = basePosition + segment.length;

    // 在当前位置之后查找重复
    const restText = fullText.substring(segmentEnd);
    const escapedSegment = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicateMatch = restText.match(new RegExp(escapedSegment));

    if (duplicateMatch && typeof duplicateMatch.index === 'number') {
        const duplicateStart = segmentEnd + duplicateMatch.index;
        const duplicateEnd = duplicateStart + segment.length;

        // 检查重复是否有意义（避免误判正常的重复，如标点符号）
        // 使用更通用的检查逻辑：内容足够长或包含实质性内容
        if (segment.length > 10 || /\w+/.test(segment)) {
            return {
                start: duplicateStart,
                end: duplicateEnd
            };
        }
    }

    return null;
}

// 检查特殊案例 - 移除特殊案例检查，改为通用检查
function checkSpecialCases(originalText: string, translatedText: string): Issue | null {
    // 此函数不再检查特定内容，而是返回null
    // 未来可以实现通用的检查逻辑
    return null;
}

// 生成问题描述
function generateIssueDescription(issueType: string): string {
    // 使用通用的问题描述，未来可以从配置或数据库加载
    const descriptions: Record<string, string[]> = {
        "术语不准确": [
            "术语翻译不符合领域规范",
            "专业术语的翻译不准确",
            "术语选择需要优化"
        ],
        "语法错误": [
            "句子结构需要调整",
            "语法使用不当",
            "句法需要改进"
        ],
        "过度直译": [
            "翻译过于字面",
            "需要更符合目标语言表达习惯",
            "表达方式需要本地化"
        ],
        "意思不明确": [
            "译文表达不够清晰",
            "意思传达不够准确",
            "语义模糊"
        ],
        "省略重要信息": [
            "译文缺少原文的重要内容",
            "信息有所遗漏",
            "内容不完整"
        ],
        "添加了不必要的内容": [
            "译文添加了原文中不存在的内容",
            "内容有额外添加",
            "翻译过于扩展"
        ],
        "标点符号使用不当": [
            "标点符号使用需要调整",
            "标点符号使用不规范",
            "标点使用问题"
        ],
        "格式问题": [
            "格式需要保持一致",
            "格式与原文不匹配",
            "布局结构需要调整"
        ],
        "专业术语不一致": [
            "术语使用不一致",
            "相同概念有不同表述",
            "需要统一术语"
        ],
        "数字格式": [
            "数字格式需要规范化",
            "数字表示方式不规范",
            "数字格式不符合标准"
        ],
        "重复内容": [
            "存在不必要的重复",
            "内容重复影响阅读",
            "冗余内容"
        ]
    };

    const options = descriptions[issueType] || ["需要改进翻译质量"];
    return options[Math.floor(Math.random() * options.length)];
}

// 生成修改理由
function generateReason(type: string, originalText: string, suggestion: string): string {
    // 使用更通用的理由模板，不包含特定翻译内容
    const templates: Record<string, string[]> = {
        "术语不准确": [
            `当前译文不符合专业领域术语规范，建议修改为更准确的表达`,
            `专业术语翻译需要遵循行业标准`,
            `该术语有更专业的翻译方式`
        ],
        "语法错误": [
            `当前表达方式在语法上需要调整`,
            `语法结构需要优化以提高可读性`,
            `调整语法结构使句子更加通顺`
        ],
        "过度直译": [
            `需要采用更符合目标语言习惯的表达方式`,
            `字面翻译影响了流畅度，需要意译`,
            `调整表达方式使其更加自然`
        ],
        "省略重要信息": [
            `译文缺少原文的关键信息，需要补充`,
            `保留原文所有重要内容是必要的`,
            `完整传达原文信息很重要`
        ],
        "添加了不必要的内容": [
            `译文添加了原文中不存在的内容，应当删除`,
            `应当避免添加原文中没有的解释`,
            `忠实原文是翻译的基本原则`
        ],
        "数字格式": [
            `数字格式应当符合标准写法`,
            `数字的表达方式需要规范化`,
            `数字格式调整可提高阅读体验`
        ],
        "重复内容": [
            `重复内容会影响阅读流畅度`,
            `应当避免不必要的内容重复`,
            `删除冗余内容可提高文本质量`
        ]
    };

    // 获取该类型的模板，如果没有特定类型的模板，使用默认模板
    const typeTemplates = templates[type] || [`建议将文本修改为更准确的表达`];
    
    // 随机选择一个模板
    const template = typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
    
    return template;
} 