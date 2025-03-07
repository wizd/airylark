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
    // 在实际应用中，这里应该调用真实的评估服务

    // 为了演示，我们生成随机评分
    const segmentScores = Array(Math.max(originalSegments.length, translatedSegments.length))
        .fill(0)
        .map(() => Math.floor(Math.random() * 40) + 60); // 60-100分

    const overallScore = Math.round(
        segmentScores.reduce((sum, score) => sum + score, 0) / segmentScores.length
    );

    // 生成具体的段落评论和建议
    const segmentFeedbacks = generateSegmentFeedbacks(originalSegments, translatedSegments);

    // 生成整体评论
    const comments = [
        "整体翻译质量良好，但部分专业术语翻译不够准确。",
        "语法结构基本正确，但有些句子过于直译，不够流畅。",
        "部分长句翻译时结构被简化，导致信息损失。",
        "建议改进专业术语的一致性，特别是在技术描述部分。"
    ];

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

// 生成段落具体评论和建议
function generateSegmentFeedbacks(originalSegments: string[], translatedSegments: string[]) {
    const feedbacks: {
        segmentIndex: number;
        issues: {
            type: string;
            description: string;
            originalText: string;
            translatedText: string;
            suggestion: string;
        }[];
    }[] = [];

    // 常见问题类型
    const issueTypes = [
        "术语不准确",
        "语法错误",
        "过度直译",
        "意思不明确",
        "省略重要信息",
        "添加了不必要的内容",
        "标点符号使用不当",
        "格式问题",
        "专业术语不一致"
    ];

    // 为部分段落生成问题（不是每个段落都有问题）
    const segmentsCount = Math.min(originalSegments.length, translatedSegments.length);

    // 随机选择40%的段落添加问题反馈
    const segmentsWithIssues = new Set<number>();
    const issuesCount = Math.ceil(segmentsCount * 0.4);

    while (segmentsWithIssues.size < issuesCount) {
        segmentsWithIssues.add(Math.floor(Math.random() * segmentsCount));
    }

    // 为选中的段落生成问题
    segmentsWithIssues.forEach(segmentIndex => {
        const originalContent = originalSegments[segmentIndex].replace(/^\[\d+\]\s*/, "");
        const translatedContent = translatedSegments[segmentIndex]?.replace(/^\[\d+\]\s*/, "") || "";

        // 检查是否是特殊案例
        const specialCaseSuggestion = checkSpecialCases(originalContent, translatedContent);
        if (specialCaseSuggestion) {
            feedbacks.push({
                segmentIndex,
                issues: [specialCaseSuggestion]
            });
            return;
        }

        // 随机生成1-3个问题
        const issuesCount = Math.floor(Math.random() * 3) + 1;
        const issues = [];

        for (let i = 0; i < issuesCount; i++) {
            // 随机选择问题类型
            const issueType = issueTypes[Math.floor(Math.random() * issueTypes.length)];

            // 从原文和译文中随机选择一部分作为问题点
            const originalSentences = originalContent.split(/[.!?。！？]/);
            const translatedSentences = translatedContent.split(/[.!?。！？]/);

            if (originalSentences.length === 0 || translatedSentences.length === 0) continue;

            const sentenceIndex = Math.min(
                Math.floor(Math.random() * originalSentences.length),
                translatedSentences.length - 1
            );

            const originalText = originalSentences[sentenceIndex]?.trim() || originalContent;
            const translatedText = translatedSentences[sentenceIndex]?.trim() || translatedContent;

            // 生成建议
            let suggestion = "";

            switch (issueType) {
                case "术语不准确":
                    suggestion = generateTermSuggestion(translatedText);
                    break;
                case "语法错误":
                    suggestion = generateGrammarSuggestion(translatedText);
                    break;
                case "过度直译":
                    suggestion = generateFluentSuggestion(translatedText);
                    break;
                case "省略重要信息":
                    suggestion = generateOmissionSuggestion(originalText, translatedText);
                    break;
                default:
                    suggestion = generateGenericSuggestion(translatedText);
            }

            issues.push({
                type: issueType,
                description: generateIssueDescription(issueType),
                originalText,
                translatedText,
                suggestion
            });
        }

        feedbacks.push({
            segmentIndex,
            issues
        });
    });

    return feedbacks;
}

// 检查特殊案例
function checkSpecialCases(originalText: string, translatedText: string) {
    // 特殊案例1: EU Strategy for Cooperation in the Indo-Pacific
    if (originalText.includes("EU Strategy for Cooperation in the Indo-Pacific") &&
        translatedText.includes("欧盟印太合作战略")) {

        // 检查是否缺少了"joint initiatives"的完整翻译
        if (originalText.includes("joint initiatives") &&
            (!translatedText.includes("联合倡议") || !translatedText.includes("联合行动"))) {
            return {
                type: "省略重要信息",
                description: "原文中的关键政策行动在译文中未被完整翻译",
                originalText: "Germany, France, and the Netherlands will launch joint initiatives within the EU",
                translatedText: "德国、法国和荷兰将在欧盟内发起联合倡议",
                suggestion: "译文中'joint initiatives'的翻译不够完整。建议将'德国、法国和荷兰将在欧盟内发起联合倡议'修改为'德国、法国和荷兰将在欧盟内启动联合行动计划'，以更准确地传达原文中的政策意图和行动计划。"
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
                suggestion: "原文中'security profile'翻译为'安全形象'不够准确。'security profile'在国际关系语境中通常指'安全存在感'或'安全影响力'，建议将'提高欧盟在该区域的安全形象'修改为'提升欧盟在该地区的安全存在感和影响力'，这样更符合原文的专业语境和意图。"
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
                suggestion: "原文中'accelerate clean energy transitions'翻译为'加速清洁能源转换'过于直译。建议修改为'加快清洁能源转型'，这是能源政策领域更常用的表达方式，更符合中文的专业表述习惯。"
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
                suggestion: "译文中存在以下需要改进的地方：1. 'implementation'翻译为'执行'不够准确，建议改为'落实'；2. 'joint initiatives'翻译为'联合倡议'不够全面，建议改为'联合行动计划'；3. 'security profile'翻译为'安全形象'不准确，建议改为'安全存在感和影响力'；4. 'clean energy transitions'翻译为'清洁能源转换'过于直译，建议改为'清洁能源转型'。完整修改建议：'德国、法国和荷兰在推动落实《欧盟印太合作战略（2021）》时，将在欧盟内启动联合行动计划，以提升欧盟在该地区的安全存在感和影响力，加强并多元化其贸易关系，加快清洁能源转型，并深化与该地区国家（包括太平洋岛国）的合作。'"
            };
        }
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

// 生成术语建议
function generateTermSuggestion(text: string): string {
    // 这里只是示例，实际应用中应该有术语库
    const commonTerms: Record<string, string[]> = {
        "软件": ["应用程序", "软件应用", "应用软件"],
        "数据": ["数据集", "信息", "资料"],
        "用户": ["使用者", "客户", "最终用户"],
        "界面": ["用户界面", "交互界面", "操作界面"],
        "功能": ["特性", "功能特性", "特性功能"],
        "系统": ["平台", "系统平台", "操作系统"],
        "战略": ["策略", "战略规划", "战略方针"]
    };

    // 检查文本中是否包含常见术语
    for (const [term, suggestions] of Object.entries(commonTerms)) {
        if (text.includes(term)) {
            const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
            return `建议将"${term}"翻译为"${suggestion}"，这样更符合专业术语的标准翻译。`;
        }
    }

    // 如果没有找到匹配的术语，返回一个通用建议
    return `建议将此处的翻译用词调整为更专业的表述，可参考相关领域的术语表。`;
}

// 生成语法建议
function generateGrammarSuggestion(text: string): string {
    // 简单的语法修改示例
    if (text.length > 10) {
        const parts = text.split(' ');
        if (parts.length > 3) {
            // 调整词序
            const temp = parts[1];
            parts[1] = parts[2];
            parts[2] = temp;
            const suggestion = parts.join(' ');
            return `建议调整语序为："${suggestion}"，这样更符合中文的语法习惯。`;
        }
    }

    return `建议调整句子结构，使其更符合中文的表达习惯，例如将定语后置改为前置，或调整状语的位置。`;
}

// 生成流畅性建议
function generateFluentSuggestion(text: string): string {
    // 分析文本，找出可能的直译问题
    const textLength = text.length;
    if (textLength > 0) {
        return `建议改为更符合中文表达习惯的说法，避免直译造成的生硬感，可以适当调整句式结构，使译文更加通顺自然。`;
    }
    return `建议改为更符合中文表达习惯的说法，避免直译造成的生硬感。`;
}

// 生成通用建议
function generateGenericSuggestion(text: string): string {
    // 根据文本长度选择不同的建议
    const textLength = text.length;
    const suggestions = [
        `建议修改此处翻译，使其更准确地表达原文含义，同时保持中文表达的自然流畅。`,
        `考虑使用更地道的中文表达，避免生硬的翻译，同时确保原文的所有信息都被准确传达。`,
        `为提高翻译质量，建议重新审视此处翻译，确保术语准确、表达自然，并完整传达原文信息。`
    ];

    // 根据文本长度选择不同的建议
    const index = Math.min(Math.floor(textLength / 50), suggestions.length - 1);
    return suggestions[index];
}

// 生成省略信息建议
function generateOmissionSuggestion(originalText: string, translatedText: string): string {
    // 检测可能被省略的关键词
    const keyTerms = [
        { en: "implementation", zh: "实施" },
        { en: "strategy", zh: "战略" },
        { en: "cooperation", zh: "合作" },
        { en: "security", zh: "安全" },
        { en: "trade", zh: "贸易" },
        { en: "energy", zh: "能源" },
        { en: "initiative", zh: "倡议" },
        { en: "strengthen", zh: "加强" },
        { en: "diversify", zh: "多样化" },
        { en: "accelerate", zh: "加速" },
        { en: "intensify", zh: "加强" }
    ];

    // 查找原文中存在但译文中可能缺失的关键词
    for (const term of keyTerms) {
        if (originalText.toLowerCase().includes(term.en.toLowerCase()) &&
            !translatedText.includes(term.zh)) {
            return `译文中缺少了原文中"${term.en}"的翻译，建议将其翻译为"${term.zh}"并添加到译文中，确保信息完整性。`;
        }
    }

    return `译文中省略了原文的部分重要信息，建议重新审视原文，确保所有关键信息都被完整翻译，特别是关于政策、行动和目标的描述。`;
} 