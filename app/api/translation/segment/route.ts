import { NextResponse } from 'next/server';
import { respondJson } from '@/app/lib/llm';
import { segmentParams } from '@/app/lib/translation';

export async function POST(request: Request) {
    const { segment, translationPlan, document } = await request.json();
    if (!segment) {
        return NextResponse.json({ error: '缺少段落参数' }, { status: 400 });
    }
    if (!translationPlan) {
        return NextResponse.json({ error: '缺少翻译规划参数' }, { status: 400 });
    }
    return respondJson(segmentParams(segment, translationPlan, document), (text) => text);
}
