import { NextResponse } from 'next/server';
import { respondJson } from '@/app/lib/llm';
import { finalizePlan, planParams } from '@/app/lib/translation';

export async function POST(request: Request) {
    const { text } = await request.json();
    if (!text) {
        return NextResponse.json({ error: '缺少文本参数' }, { status: 400 });
    }
    return respondJson(planParams(text), finalizePlan);
}
