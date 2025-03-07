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

    // 生成评论
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
        originalSegments,
        translatedSegments
    };
} 