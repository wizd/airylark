import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: Request) {
    try {
        console.log('开始处理Word文档解析请求');

        // 获取上传的文件
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            console.log('未提供文件');
            return NextResponse.json({ error: '未提供文件' }, { status: 400 });
        }

        // 检查文件类型
        console.log(`接收到文件: ${file.name}, 大小: ${file.size} 字节, 类型: ${file.type}`);

        if (!file.name.toLowerCase().endsWith('.docx')) {
            console.log('文件不是Word文档格式');
            return NextResponse.json({ error: '文件必须是Word文档(.docx)格式' }, { status: 400 });
        }

        // 将文件转换为ArrayBuffer
        console.log('正在将文件转换为ArrayBuffer');
        const arrayBuffer = await file.arrayBuffer();
        console.log(`ArrayBuffer大小: ${arrayBuffer.byteLength} 字节`);

        // 创建Buffer对象
        const buffer = Buffer.from(arrayBuffer);
        console.log(`Buffer大小: ${buffer.length} 字节`);

        try {
            // 方法1：使用convertToHtml方法
            console.log('尝试方法1: 使用mammoth.convertToHtml解析Word文档');
            try {
                const htmlResult = await mammoth.convertToHtml({
                    buffer: buffer
                });

                if (htmlResult && htmlResult.value) {
                    // 从HTML中提取纯文本
                    const html = htmlResult.value;
                    // 简单的HTML到文本转换
                    const text = html.replace(/<[^>]*>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();

                    console.log(`方法1成功: HTML长度: ${html.length} 字符，纯文本长度: ${text.length} 字符`);

                    // 如果有警告，记录下来
                    if (htmlResult.messages && htmlResult.messages.length > 0) {
                        console.log('解析警告:', htmlResult.messages);
                    }

                    // 返回解析后的文本
                    return NextResponse.json({ text });
                } else {
                    console.log('方法1失败: 结果为空，尝试方法2');
                }
            } catch (error) {
                console.log(`方法1失败: ${error instanceof Error ? error.message : String(error)}，尝试方法2`);
            }

            // 方法2：使用extractRawText方法
            console.log('尝试方法2: 使用mammoth.extractRawText解析Word文档');
            const textResult = await mammoth.extractRawText({
                buffer: buffer
            });

            if (!textResult || !textResult.value) {
                console.error('方法2失败: mammoth解析结果为空');
                return NextResponse.json({ error: 'Word文档解析失败：无法提取文本' }, { status: 500 });
            }

            const text = textResult.value;
            console.log(`方法2成功: 提取文本长度: ${text.length} 字符`);

            // 如果有警告，记录下来
            if (textResult.messages && textResult.messages.length > 0) {
                console.log('解析警告:', textResult.messages);
            }

            // 返回解析后的文本
            return NextResponse.json({ text });
        } catch (mammothError) {
            console.error('mammoth解析错误:', mammothError);
            return NextResponse.json({
                error: `解析Word文档失败: ${mammothError instanceof Error ? mammothError.message : String(mammothError)}`
            }, { status: 500 });
        }
    } catch (error) {
        console.error('解析Word文档时出错:', error);
        return NextResponse.json({
            error: `服务器错误: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
} 