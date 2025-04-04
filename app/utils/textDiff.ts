// 将文本分割成字符数组，保持完整的中文词组和英文单词
function splitIntoCharacters(text: string): string[] {
    const chars: string[] = [];
    let currentWord = '';
    let i = 0;
    
    while (i < text.length) {
        const char = text[i];
        
        // 处理英文单词和数字
        if (/[a-zA-Z0-9]/.test(char)) {
            currentWord += char;
            if (i === text.length - 1 || !/[a-zA-Z0-9]/.test(text[i + 1])) {
                chars.push(currentWord);
                currentWord = '';
            }
            i++;
            continue;
        }
        
        // 处理中文词组
        if (/[\u4e00-\u9fa5]/.test(char)) {
            // 尝试向后查看是否可以组成完整词组
            let word = char;
            let j = i + 1;
            while (j < text.length && /[\u4e00-\u9fa5]/.test(text[j])) {
                word += text[j];
                j++;
            }
            chars.push(word);
            i = j;
            continue;
        }
        
        // 处理其他字符
        if (currentWord) {
            chars.push(currentWord);
            currentWord = '';
        }
        chars.push(char);
        i++;
    }
    
    return chars;
}

// 找出最长公共子序列的长度矩阵
function computeLCSMatrix(chars1: string[], chars2: string[]): number[][] {
    const m = chars1.length;
    const n = chars2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (chars1[i - 1] === chars2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    
    return dp;
}

// 找出最小差异
function findMinimalDifferences(text1: string, text2: string): Array<{
    type: 'keep' | 'insert' | 'delete';
    text: string;
    position: number;
}> {
    const chars1 = splitIntoCharacters(text1);
    const chars2 = splitIntoCharacters(text2);
    const dp = computeLCSMatrix(chars1, chars2);
    
    const differences: Array<{
        type: 'keep' | 'insert' | 'delete';
        text: string;
        position: number;
    }> = [];
    
    let i = chars1.length;
    let j = chars2.length;
    let pos1 = text1.length;
    let pos2 = text2.length;
    
    const getTextLength = (char: string) => char.length;
    
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && chars1[i - 1] === chars2[j - 1]) {
            const char = chars1[i - 1];
            differences.unshift({
                type: 'keep',
                text: char,
                position: pos1 - getTextLength(char)
            });
            pos1 -= getTextLength(char);
            pos2 -= getTextLength(char);
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i][j])) {
            const char = chars2[j - 1];
            differences.unshift({
                type: 'insert',
                text: char,
                position: pos2 - getTextLength(char)
            });
            pos2 -= getTextLength(char);
            j--;
        } else {
            const char = chars1[i - 1];
            differences.unshift({
                type: 'delete',
                text: char,
                position: pos1 - getTextLength(char)
            });
            pos1 -= getTextLength(char);
            i--;
        }
    }
    
    return differences;
}

// 合并连续的差异
function mergeDifferences(diffs: Array<{
    type: 'keep' | 'insert' | 'delete';
    text: string;
    position: number;
}>): Array<{
    type: 'keep' | 'insert' | 'delete';
    text: string;
    position: number;
}> {
    const merged: typeof diffs = [];
    let current: typeof diffs[0] | null = null;
    
    for (const diff of diffs) {
        if (!current) {
            current = { ...diff };
            continue;
        }
        
        if (current.type === diff.type && 
            current.position + current.text.length === diff.position) {
            // 合并连续的相同类型的差异
            current.text += diff.text;
        } else {
            merged.push(current);
            current = { ...diff };
        }
    }
    
    if (current) {
        merged.push(current);
    }
    
    return merged;
}

// 生成行内差异，保留共同部分，标记出具体的修改部分
export function generateInlineDiff(originalText: string, suggestedText: string): Array<{
    type: 'keep' | 'insert' | 'delete';
    text: string;
}> {
    // 如果两个文本相同，直接返回保持状态的文本
    if (originalText === suggestedText) {
        return [{ type: 'keep', text: originalText }];
    }
    
    // 获取两个文本的差异
    const diffs = findMinimalDifferences(originalText, suggestedText);
    
    // 将差异合并为可以直接渲染的格式
    return diffs.map(diff => ({
        type: diff.type,
        text: diff.text
    }));
}

// 找出两段文本中真正不同的部分
function findDifferences(text1: string, text2: string): {
    type: 'delete' | 'insert' | 'replace';
    start: number;
    end: number;
    text: string;
} | null {
    console.log('findDifferences 输入:');
    console.log('text1:', text1);
    console.log('text2:', text2);

    // 如果两段文本完全相同，返回null
    if (text1 === text2) {
        console.log('文本完全相同，返回null');
        return null;
    }

    // 使用findMinimalDifferences找出所有差异
    const minimalDiffs = findMinimalDifferences(text1, text2);
    console.log('找到的所有差异:', minimalDiffs);

    // 合并连续的差异
    const mergedDiffs = mergeDifferences(minimalDiffs);
    console.log('合并后的差异:', mergedDiffs);

    // 找出最大的差异块
    let maxDiffLength = 0;
    let maxDiff = null;
    let currentDiff = {
        type: 'keep' as const,
        start: 0,
        end: 0,
        deleteText: '',
        insertText: ''
    };

    for (const diff of mergedDiffs) {
        if (diff.type === 'keep') {
            // 如果当前差异块比之前找到的更大，保存它
            if (currentDiff.deleteText || currentDiff.insertText) {
                const diffLength = Math.max(
                    currentDiff.deleteText.length,
                    currentDiff.insertText.length
                );
                if (diffLength > maxDiffLength) {
                    maxDiffLength = diffLength;
                    maxDiff = { ...currentDiff };
                }
            }
            // 重置当前差异块
            currentDiff = {
                type: 'keep',
                start: diff.position + diff.text.length,
                end: diff.position + diff.text.length,
                deleteText: '',
                insertText: ''
            };
        } else {
            if (diff.type === 'delete') {
                currentDiff.deleteText += diff.text;
                currentDiff.end = diff.position + diff.text.length;
            } else if (diff.type === 'insert') {
                currentDiff.insertText += diff.text;
                currentDiff.end = diff.position + diff.text.length;
            }
        }
    }

    // 检查最后一个差异块
    if (currentDiff.deleteText || currentDiff.insertText) {
        const diffLength = Math.max(
            currentDiff.deleteText.length,
            currentDiff.insertText.length
        );
        if (diffLength > maxDiffLength) {
            maxDiff = currentDiff;
        }
    }

    // 如果没有找到差异，返回null
    if (!maxDiff || (!maxDiff.deleteText && !maxDiff.insertText)) {
        console.log('未找到有效差异');
        return null;
    }

    // 根据差异类型返回结果
    if (maxDiff.deleteText && !maxDiff.insertText) {
        console.log('处理删除操作');
        return {
            type: 'delete',
            start: maxDiff.start,
            end: maxDiff.end,
            text: maxDiff.deleteText
        };
    } else if (!maxDiff.deleteText && maxDiff.insertText) {
        console.log('处理插入操作');
        return {
            type: 'insert',
            start: maxDiff.start,
            end: maxDiff.start,
            text: maxDiff.insertText
        };
    } else {
        console.log('处理替换操作');
        return {
            type: 'replace',
            start: maxDiff.start,
            end: maxDiff.end,
            text: maxDiff.insertText
        };
    }
}

// 计算文本差异并返回差异部分
export function calculateTextDiff(originalText: string, suggestedText: string): string {
    const diff = findDifferences(originalText, suggestedText);
    
    if (!diff) {
        return '无差异';
    }

    switch (diff.type) {
        case 'delete':
            return `删除: "${diff.text}"`;
        case 'insert':
            return `添加: "${diff.text}"`;
        case 'replace':
            return `替换: "${originalText.substring(diff.start, diff.end)}" -> "${diff.text}"`;
    }
}

// 查找所有建议在文本中的位置
export function findSuggestionPositions(text: string, suggestions: Array<{
    translatedText: string;
    suggestion: string;
    type: string;
    description: string;
    reason: string;
}>): Array<{
    start: number;
    end: number;
    originalText: string;
    translatedText: string;
    suggestedText: string;
    type: string;
    description: string;
    reason: string;
    operations?: Array<{
        type: 'keep' | 'delete' | 'insert';
        text: string;
    }>;
}> {
    console.log('开始处理建议，共有建议数量:', suggestions.length);
    
    return suggestions.map((suggestion, index) => {
        console.log(`\n处理第 ${index + 1} 个建议:`);
        console.log('建议类型:', suggestion.type);
        console.log('原译文:', suggestion.translatedText);
        console.log('建议译文:', suggestion.suggestion);

        // 在原文中查找位置
        const position = text.indexOf(suggestion.translatedText);
        if (position === -1) {
            console.log('❌ 建议被忽略: 在原文中未找到匹配位置');
            return null;
        }

        // 生成行内差异，用于显示精确的字词修改
        const inlineDiffs = generateInlineDiff(suggestion.translatedText, suggestion.suggestion);
        console.log('行内差异:', inlineDiffs);

        // 使用findMinimalDifferences找出所有差异
        const diffs = findMinimalDifferences(suggestion.translatedText, suggestion.suggestion);
        console.log('找到的所有差异:', diffs);

        // 过滤掉 keep 类型的差异
        const changes = diffs.filter(d => d.type !== 'keep');
        console.log('过滤后的实际变化:', changes);

        if (changes.length === 0) {
            console.log('❌ 建议被忽略: 没有实际的文本差异');
            return null;
        }

        // 计算变化区域在 suggestion.translatedText 中的相对起止位置
        const relativeStart = Math.min(...changes.map(c => c.position));
        
        // 计算相对结束位置：取所有 delete 操作的最大结束点
        const deleteChanges = changes.filter(c => c.type === 'delete');
        let relativeEnd = relativeStart;
        if (deleteChanges.length > 0) {
             relativeEnd = Math.max(...deleteChanges.map(c => c.position + c.text.length));
        }
        // 如果只有 insert 操作，结束位置等于开始位置
        if (changes.every(c => c.type === 'insert')) {
            relativeEnd = relativeStart;
        } else {
            // 如果有 delete，确保 end 不小于 start
            relativeEnd = Math.max(relativeStart, relativeEnd);
        }
        
        console.log('相对起始位置:', relativeStart);
        console.log('相对结束位置:', relativeEnd);

        // 计算在原文 text 中的绝对起止位置
        const changeStart = position + relativeStart;
        const changeEnd = position + relativeEnd;

        // 提取要显示为删除线的原文片段
        const originalText = suggestion.translatedText.substring(relativeStart, relativeEnd);

        // 构建要显示为绿色的建议文本片段（只包含 insert 的内容）
        const suggestedParts = changes
            .filter(c => c.type === 'insert')
            .map(c => c.text);
        const suggestedText = suggestedParts.join('');

        console.log('处理结果:');
        console.log('绝对起始位置:', changeStart);
        console.log('绝对结束位置:', changeEnd);
        console.log('标记原文:', originalText);
        console.log('标记建议文本:', suggestedText);

        // 确保 start 不大于 end
        if (changeStart > changeEnd) {
             console.warn('计算出的 start 大于 end，可能存在问题', { changeStart, changeEnd });
             // 这里可以根据需要决定如何处理，例如返回 null 或调整 end
             // return null;
        }

        return {
            start: changeStart,
            end: changeEnd,
            originalText,
            translatedText: suggestion.translatedText, // 保留完整的译文用于查找
            suggestedText,
            type: suggestion.type,
            description: suggestion.description,
            reason: suggestion.reason,
            operations: inlineDiffs // 添加行内差异用于精确显示
        };
    }).filter((s): s is NonNullable<typeof s> => {
        if (!s) {
            console.log('❌ 建议被过滤：返回值为null');
        }
        return s !== null;
    });
} 