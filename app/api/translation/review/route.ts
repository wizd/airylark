import { NextResponse } from 'next/server';
import { respondJson } from '@/app/lib/llm';
import { finalizeReview, reviewParams } from '@/app/lib/translation';

export async function POST(request: Request) {
    const { translatedText, translationPlan, sourceText } = await request.json();
    if (!translatedText) {
        return NextResponse.json({ error: '缺少译文参数' }, { status: 400 });
    }
    if (!translationPlan) {
        return NextResponse.json({ error: '缺少翻译规划参数' }, { status: 400 });
    }
    return respondJson(reviewParams(translatedText, translationPlan, sourceText), finalizeReview);
}
