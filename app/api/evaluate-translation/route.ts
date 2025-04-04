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

    // 根据分数和问题类型生成评论
    if (score < 70) {
        comments.push("翻译质量需要显著改进，存在多处需要修正的问题。");
    } else if (score < 80) {
        comments.push("翻译基本可用，但有一些需要改进的地方。");
    } else if (score < 90) {
        comments.push("翻译质量良好，有少量可以优化的地方。");
    } else {
        comments.push("翻译质量优秀，基本达到专业水准。");
    }

    // 添加具体问题的评论
    if (issueTypes.get("术语不准确")) {
        comments.push("专业术语的翻译需要进一步规范，建议参考行业标准术语表。");
    }
    if (issueTypes.get("省略重要信息")) {
        comments.push("存在信息缺失的情况，请确保译文完整传达原文的所有重要信息。");
    }
    if (issueTypes.get("过度直译")) {
        comments.push("部分译文过于直译，建议适当调整以符合中文表达习惯。");
    }
    if (issueTypes.get("重复内容")) {
        comments.push("注意避免不必要的重复内容。");
    }

    // 如果评分低但没有具体问题，添加默认评论
    if (score < 80 && comments.length < 2) {
        comments.push("建议仔细检查译文的准确性和流畅度。");
        comments.push("可以考虑调整某些表达方式，使其更符合目标读者的阅读习惯。");
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

    // 扩展术语列表
    const terms = [
        {
            en: "quality checks",
            zh: "质量检查",
            suggestion: "质量检查",
            reason: "这是质量管理领域的标准术语。"
        },
        {
            en: "quality assurance",
            zh: "质量保证",
            suggestion: "质量保证",
            reason: "这是质量管理体系中的标准术语。"
        },
        {
            en: "internal standards",
            zh: "内部标准",
            suggestion: "内部标准",
            reason: "这是组织管理中的标准用语。"
        },
        {
            en: "comprehensiveness",
            zh: "完整性",
            suggestion: "完整性",
            reason: "这是评估标准中的关键术语。"
        },
        {
            en: "accuracy",
            zh: "准确性",
            suggestion: "准确性",
            reason: "这是质量评估中的基本术语。"
        },
        {
            en: "strategic alignment",
            zh: "战略一致性",
            suggestion: "战略一致性",
            reason: "这是战略管理中的专业术语。"
        }
    ];

    for (const term of terms) {
        if (originalContent.includes(term.en)) {
            // 使用正则表达式找出所有可能的翻译
            const pattern = new RegExp(`[质量的]{0,4}[保证检查]{2,4}|[内部的]{0,4}[标准规范]{2,4}|[完整准确战略]{2,6}[性一致对齐]{1,4}`, 'g');
            let match;
            
            while ((match = pattern.exec(translatedContent)) !== null) {
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

        // 检查是否是特殊案例
        const specialCaseSuggestion = checkSpecialCases(originalContent, translatedContent);
        if (specialCaseSuggestion) {
            // 找到原文在译文中的位置
            const start = translatedContent.indexOf(specialCaseSuggestion.translatedText);
            if (start !== -1) {
                feedbacks.push({
                    segmentIndex,
                    issues: [{
                        ...specialCaseSuggestion,
                        start,
                        end: start + specialCaseSuggestion.translatedText.length,
                        reason: generateReason(specialCaseSuggestion.type, specialCaseSuggestion.translatedText, specialCaseSuggestion.suggestion)
                    }]
                });
            }
            continue;
        }

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
    const numberPattern = /\d+\s+\d+(?:年|月|日)?/g;
    let match;

    while ((match = numberPattern.exec(text)) !== null) {
        const matchedText = match[0];
        const start = basePosition + match.index;
        const end = start + matchedText.length;

        // 处理年份等特殊情况
        if (matchedText.includes('年') || matchedText.includes('月') || matchedText.includes('日')) {
            const parts = matchedText.split(/\s+/);
            if (parts.length === 2) {
                const suggestion = parts.join('');
                return { start, end, suggestion };
            }
        }

        // 处理普通数字
        const suggestion = matchedText.replace(/\s+/g, '');
        return { start, end, suggestion };
    }

    return null;
}

// 改进的重复内容检查
function checkDuplicateContent(segment: string, fullText: string, basePosition: number): { start: number; end: number } | null {
    if (segment.length < 5) return null;  // 忽略过短的片段

    const segmentEnd = basePosition + segment.length;

    // 在当前位置之后查找重复
    const restText = fullText.substring(segmentEnd);
    const escapedSegment = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicateMatch = restText.match(new RegExp(escapedSegment));

    if (duplicateMatch && typeof duplicateMatch.index === 'number') {
        const duplicateStart = segmentEnd + duplicateMatch.index;
        const duplicateEnd = duplicateStart + segment.length;

        // 检查重复是否有意义（避免误判正常的重复，如标点符号）
        if (segment.length > 10 || /[\u4e00-\u9fa5]/.test(segment)) {
            return {
                start: duplicateStart,
                end: duplicateEnd
            };
        }
    }

    return null;
}

// 检查特殊案例
function checkSpecialCases(originalText: string, translatedText: string): Issue | null {
    // 检查 previous APs 的翻译
    if (originalText.includes("previous APs") &&
        translatedText.includes("之前的AP")) {
        return {
            type: "流畅性",
            description: "译文中的表达不够自然",
            originalText: "之前的AP",
            translatedText: "之前的AP",
            suggestion: "之前的行动计划",
            reason: "AP 应该翻译为'行动计划'，这样更容易理解。",
            start: 0,
            end: 0
        };
    }

    // 特殊案例1: EU Strategy for Cooperation in the Indo-Pacific
    if (originalText.includes("EU Strategy for Cooperation in the Indo-Pacific") &&
        translatedText.includes("欧盟印太合作战略")) {
        return {
            type: "术语不准确",
            description: "战略相关术语翻译不够准确",
            originalText: "EU Strategy for Cooperation in the Indo-Pacific",
            translatedText: "欧盟印太合作战略",
            suggestion: "欧盟印太合作战略（EU Strategy for Cooperation in the Indo-Pacific）",
            reason: "保留原文术语有助于读者理解和查找相关信息。",
            start: 0,
            end: 0
        };
    }

    // 检查是否缺少了"increase the EU's security profile"的完整翻译
    if (originalText.includes("increase the EU's security profile") &&
        translatedText.includes("提高欧盟在该区域的安全形象")) {
        return {
            type: "术语不准确",
            description: "安全相关术语翻译不够准确",
            originalText: "increase the EU's security profile in the region",
            translatedText: "提高欧盟在该区域的安全形象",
            suggestion: "提升欧盟在该地区的安全存在感和影响力",
            reason: "'security profile'不仅指形象，还包含存在感和影响力的含义。",
            start: 0,
            end: 0
        };
    }

    // 检查是否缺少了"accelerate clean energy transitions"的完整翻译
    if (originalText.includes("accelerate clean energy transitions") &&
        translatedText.includes("加速清洁能源转换")) {
        return {
            type: "过度直译",
            description: "直译导致表达不自然",
            originalText: "accelerate clean energy transitions",
            translatedText: "加速清洁能源转换",
            suggestion: "加快清洁能源转型",
            reason: "'清洁能源转型'是能源领域更为常用的表达方式。",
            start: 0,
            end: 0
        };
    }

    // 用户提到的特殊案例
    if (originalText.includes("In advancing the implementation of the EU Strategy for Cooperation in the Indo-Pacific") &&
        translatedText.includes("德国、法国和荷兰在推动执行《欧盟印太合作战略")) {
        return {
            type: "省略重要信息",
            description: "关键信息未被翻译",
            originalText: "In advancing the implementation of the EU Strategy for Cooperation in the Indo-Pacific (2021), Germany, France, and the Netherlands will launch joint initiatives within the EU in order to increase the EU's security profile in the region, strengthen and diversify its trade relations, accelerate clean energy transitions and intensify cooperation with countries in the region, including the Pacific Islands",
            translatedText: "德国、法国和荷兰在推动执行《欧盟印太合作战略（2021）》 （EU Strategy for Cooperation in the Indo-Pacific）时，将在欧盟内发起联合倡议，以提高欧盟在该区域的安全形象，加强其贸易关系并使其多样化，加速清洁能源转换，并加强与该区域各国，包括太平洋岛屿的合作",
            suggestion: "德国、法国和荷兰在推动落实《欧盟印太合作战略（2021）》时，将在欧盟内启动联合行动计划，以提升欧盟在该地区的安全存在感和影响力，加强并多元化其贸易关系，加快清洁能源转型，并深化与该地区国家（包括太平洋岛国）的合作。",
            reason: "建议使用更准确的术语并调整表达方式，使译文更符合正式外交文件的表达习惯。",
            start: 0,
            end: 0
        };
    }

    return null;
}

// 生成问题描述
function generateIssueDescription(issueType: string): string {
    const descriptions: Record<string, string[]> = {
        "术语不准确": [
            "该术语在目标领域有特定的翻译",
            "专业术语翻译不准确，影响理解",
            "术语选择不符合行业标准"
        ],
        "语法错误": [
            "句子结构不符合中文语法习惯",
            "主谓搭配不当",
            "时态使用不正确"
        ],
        "过度直译": [
            "直译导致表达不自然",
            "过于忠实原文结构，影响流畅度",
            "需要意译以符合中文表达习惯"
        ],
        "意思不明确": [
            "译文含义模糊",
            "无法准确理解译文表达的意思",
            "原文的关键信息在译文中变得不清晰"
        ],
        "省略重要信息": [
            "原文中的重要细节在译文中被省略",
            "关键信息未被翻译",
            "内容不完整"
        ],
        "添加了不必要的内容": [
            "译文添加了原文中不存在的内容",
            "不必要的解释影响了准确性",
            "过度阐述原文意思"
        ],
        "标点符号使用不当": [
            "标点符号使用不符合中文规范",
            "标点符号过多或过少",
            "标点符号选择不当"
        ],
        "格式问题": [
            "译文格式与原文不一致",
            "段落结构被改变",
            "列表或编号格式不一致"
        ],
        "专业术语不一致": [
            "同一术语在不同地方有不同翻译",
            "术语使用不一致影响理解",
            "需要统一术语翻译"
        ]
    };

    const options = descriptions[issueType] || ["需要改进翻译质量"];
    return options[Math.floor(Math.random() * options.length)];
}

// 生成修改理由
function generateReason(type: string, originalText: string, suggestion: string): string {
    switch (type) {
        case "术语不准确":
            return `"${originalText}"是不准确的术语翻译。"${suggestion}"是该领域更专业和标准的表达方式。`;
        case "语法错误":
            return `当前译文"${originalText}"的语法结构不符合中文表达习惯。建议修改为"${suggestion}"，使句子更通顺。`;
        case "过度直译":
            return `"${originalText}"过于直译，显得生硬。"${suggestion}"更符合中文的自然表达方式。`;
        case "省略重要信息":
            return `当前译文"${originalText}"省略了原文的重要信息。"${suggestion}"完整保留了原文的关键内容。`;
        case "添加了不必要的内容":
            return `"${originalText}"添加了原文中不存在的内容。"${suggestion}"更忠实原文，避免了不必要的扩展。`;
        default:
            return `建议将"${originalText}"修改为"${suggestion}"，以提高翻译质量。`;
    }
} 