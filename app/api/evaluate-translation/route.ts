import { NextResponse } from 'next/server';

// 模拟翻译质量评估API
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

        // 分割文本为段落
        const originalSegments = segmentText(originalText);
        const translatedSegments = segmentText(translatedText);

        // 模拟评估过程（在实际应用中，这里应该调用真实的评估服务）
        const result = await simulateEvaluation(originalSegments, translatedSegments);

        return NextResponse.json(result);
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

// 模拟评估过程
async function simulateEvaluation(originalSegments: string[], translatedSegments: string[]) {
    // 分析每个段落的问题
    const segmentFeedbacks = generateSegmentFeedbacks(originalSegments, translatedSegments);
    
    // 根据问题数量和严重程度计算评分
    const segmentScores = originalSegments.map((originalSegment, index) => {
        const feedback = segmentFeedbacks.find(f => f.segmentIndex === index);
        if (!feedback) return 85; // 没有明显问题，给予较高基础分
        
        // 根据问题严重程度扣分
        let score = 85;
        feedback.issues.forEach(issue => {
            switch (issue.type) {
                case "术语不准确":
                    score -= 10;
                    break;
                case "重复内容":
                    score -= 8;
                    break;
                case "省略重要信息":
                    score -= 15;
                    break;
                case "过度直译":
                    score -= 5;
                    break;
                default:
                    score -= 3;
            }
        });
        
        return Math.max(60, score); // 确保分数不会低于60分
    });

    // 计算总体评分
    const overallScore = Math.round(
        segmentScores.reduce((sum, score) => sum + score, 0) / segmentScores.length
    );

    // 生成整体评论
    const comments = generateOverallComments(segmentFeedbacks, overallScore);

    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
        score: overallScore,
        comments,
        segmentScores,
        segmentFeedbacks,
        originalSegments,
        translatedSegments
    };
}

// 生成整体评论
function generateOverallComments(segmentFeedbacks: any[], score: number): string[] {
    const comments: string[] = [];
    
    // 统计问题类型
    const issueTypes = new Map<string, number>();
    segmentFeedbacks.forEach(feedback => {
        feedback.issues.forEach((issue: any) => {
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
function analyzeTermIssues(originalContent: string, translatedContent: string): {
    type: string;
    description: string;
    originalText: string;
    translatedText: string;
    suggestion: string;
    reason: string;
    operations?: Array<{
        type: 'keep' | 'delete' | 'insert' | 'replace';
        sourceStart: number;
        sourceEnd: number;
        targetStart: number;
        targetEnd: number;
        content?: string;
    }>;
}[] {
    const issues: {
        type: string;
        description: string;
        originalText: string;
        translatedText: string;
        suggestion: string;
        reason: string;
        operations?: Array<any>;
    }[] = [];

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
                        operations: operations
                    });
                }
            }
        }
    }

    return issues;
}

// 在生成段落反馈时包含编辑操作信息
function generateSegmentFeedbacks(originalSegments: string[], translatedSegments: string[]) {
    const feedbacks: {
        segmentIndex: number;
        issues: {
            type: string;
            description: string;
            originalText: string;
            translatedText: string;
            suggestion: string;
            start: number;
            end: number;
            reason: string;
            operations?: Array<any>;
        }[];
    }[] = [];

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
): {
    type: string;
    description: string;
    originalText: string;
    translatedText: string;
    suggestion: string;
    start: number;
    end: number;
    reason: string;
}[] {
    const issues: {
        type: string;
        description: string;
        originalText: string;
        translatedText: string;
        suggestion: string;
        start: number;
        end: number;
        reason: string;
    }[] = [];

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
                    reason: "数字的表达方式需要符合中文写作规范"
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
                reason: "文本中出现了不必要的重复内容，影响阅读流畅度"
            });
            checkedRanges.push(duplicateIssue);
        }

        position += segment.length;
    }

    return issues;
}

// 检查数字格式
function checkNumberFormat(text: string, basePosition: number): { start: number; end: number; suggestion: string } | null {
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

    const segmentStart = basePosition;
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
function checkSpecialCases(originalText: string, translatedText: string) {
    // 特殊案例1: EU Strategy for Cooperation in the Indo-Pacific
    if (originalText.includes("EU Strategy for Cooperation in the Indo-Pacific") &&
        translatedText.includes("欧盟印太合作战略")) {
        return {
            type: "术语不准确",
            description: "战略相关术语翻译不够准确",
            originalText: "EU Strategy for Cooperation in the Indo-Pacific",
            translatedText: "欧盟印太合作战略",
            suggestion: "欧盟印太合作战略（EU Strategy for Cooperation in the Indo-Pacific）"
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
            suggestion: "提升欧盟在该地区的安全存在感和影响力"
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
            suggestion: "加快清洁能源转型"
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
            suggestion: "德国、法国和荷兰在推动落实《欧盟印太合作战略（2021）》时，将在欧盟内启动联合行动计划，以提升欧盟在该地区的安全存在感和影响力，加强并多元化其贸易关系，加快清洁能源转型，并深化与该地区国家（包括太平洋岛国）的合作。"
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

// 修改生成建议的函数，返回建议和理由
function generateTermSuggestion(text: string): { suggestion: string; reason: string } {
    const commonTerms: Record<string, { suggestions: string[]; reason: string }> = {
        "软件": {
            suggestions: ["应用程序", "软件应用", "应用软件"],
            reason: "在软件开发领域，需要根据具体语境选择更准确的术语。"
        },
        "数据": {
            suggestions: ["数据集", "信息", "资料"],
            reason: "在数据科学领域，不同场景下的'数据'有特定的专业术语。"
        },
        "用户": {
            suggestions: ["使用者", "客户", "最终用户"],
            reason: "在用户界面设计中，需要根据具体场景选择更准确的术语。"
        },
        "界面": {
            suggestions: ["用户界面", "交互界面", "操作界面"],
            reason: "在界面设计中，需要根据具体功能选择更准确的术语。"
        },
        "功能": {
            suggestions: ["特性", "功能特性", "特性功能"],
            reason: "在功能描述中，需要根据具体功能选择更准确的术语。"
        },
        "系统": {
            suggestions: ["平台", "系统平台", "操作系统"],
            reason: "在系统描述中，需要根据具体系统选择更准确的术语。"
        },
        "战略": {
            suggestions: ["策略", "战略规划", "战略方针"],
            reason: "在战略描述中，需要根据具体战略选择更准确的术语。"
        }
    };

    for (const [term, info] of Object.entries(commonTerms)) {
        if (text.includes(term)) {
            const suggestion = info.suggestions[Math.floor(Math.random() * info.suggestions.length)];
            return {
                suggestion,
                reason: info.reason
            };
        }
    }

    return {
        suggestion: text,
        reason: "建议参考相关领域的术语表，使用更专业的表述。"
    };
}

// 修改其他生成建议的函数，使其返回建议和理由
function generateGrammarSuggestion(text: string): { suggestion: string; reason: string } {
    if (text.length > 10) {
        const parts = text.split(' ');
        if (parts.length > 3) {
            const temp = parts[1];
            parts[1] = parts[2];
            parts[2] = temp;
            return {
                suggestion: parts.join(' '),
                reason: "调整语序可以使句子更符合中文的语法习惯，提高可读性。"
            };
        }
    }

    return {
        suggestion: text,
        reason: "建议调整句子结构，使其更符合中文的表达习惯。"
    };
}

function generateFluentSuggestion(text: string): { suggestion: string; reason: string } {
    return {
        suggestion: text,
        reason: "直译往往会导致表达生硬，建议采用更符合中文表达习惯的说法。"
    };
}

function generateOmissionSuggestion(originalText: string, translatedText: string): { suggestion: string; reason: string } {
    const keyTerms = [
        { en: "implementation", zh: "实施", reason: "这是政策执行过程中的关键术语" },
        { en: "strategy", zh: "战略", reason: "这是重要的战略规划术语" },
        { en: "cooperation", zh: "合作", reason: "这是重要的合作关系术语" },
        { en: "security", zh: "安全", reason: "这是重要的安全相关术语" },
        { en: "trade", zh: "贸易", reason: "这是重要的经济活动术语" },
        { en: "energy", zh: "能源", reason: "这是重要的能源相关术语" },
        { en: "initiative", zh: "倡议", reason: "这是重要的行动术语" },
        { en: "strengthen", zh: "加强", reason: "这是重要的政策目标术语" },
        { en: "diversify", zh: "多样化", reason: "这是重要的经济活动术语" },
        { en: "accelerate", zh: "加速", reason: "这是重要的政策目标术语" },
        { en: "intensify", zh: "加强", reason: "这是重要的政策目标术语" }
    ];

    for (const term of keyTerms) {
        if (originalText.toLowerCase().includes(term.en.toLowerCase()) &&
            !translatedText.includes(term.zh)) {
            return {
                suggestion: translatedText.replace(/。$/, `${term.zh}。`),
                reason: `原文中的"${term.en}"是重要信息，${term.reason}，不应省略。`
            };
        }
    }

    return {
        suggestion: translatedText,
        reason: "建议重新审视原文，确保所有关键信息都被完整翻译。"
    };
}

function generateGenericSuggestion(text: string): { suggestion: string; reason: string } {
    return {
        suggestion: text,
        reason: "建议重新审视此处翻译，确保准确性和自然度。"
    };
} 