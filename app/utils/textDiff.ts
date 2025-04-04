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

// 找出两段文本中真正不同的部分
function findDifferences(text1: string, text2: string): {
    type: 'delete' | 'insert' | 'replace';
    start: number;
    end: number;
    text: string;
} | null {
    // 如果两段文本完全相同，返回null
    if (text1 === text2) {
        return null;
    }

    // 如果text2完全包含在text1中，说明只是删除了一部分
    const index1 = text1.indexOf(text2);
    if (index1 !== -1) {
        // 找出被删除的部分
        const beforeText = text1.substring(0, index1);
        const afterText = text1.substring(index1 + text2.length);
        const deletedText = beforeText || afterText;
        const start = beforeText ? 0 : index1 + text2.length;
        return {
            type: 'delete',
            start,
            end: start + deletedText.length,
            text: deletedText
        };
    }

    // 如果text1完全包含在text2中，说明只是添加了一部分
    const index2 = text2.indexOf(text1);
    if (index2 !== -1) {
        // 找出新增的部分
        const beforeText = text2.substring(0, index2);
        const afterText = text2.substring(index2 + text1.length);
        const addedText = beforeText || afterText;
        const start = beforeText ? 0 : index2 + text1.length;
        return {
            type: 'insert',
            start,
            end: start + addedText.length,
            text: addedText
        };
    }

    // 其他情况，从左到右找出不同部分
    let start = 0;
    while (start < text1.length && start < text2.length && text1[start] === text2[start]) {
        start++;
    }

    let end1 = text1.length - 1;
    let end2 = text2.length - 1;
    while (end1 >= start && end2 >= start && text1[end1] === text2[end2]) {
        end1--;
        end2--;
    }

    return {
        type: 'replace',
        start,
        end: end1 + 1,
        text: text2.substring(start, end2 + 1)
    };
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
}> {
    // 过滤掉完全相同的建议
    const validSuggestions = suggestions.filter(s => s.translatedText !== s.suggestion);
    
    return validSuggestions.map(suggestion => {
        const diff = findDifferences(suggestion.translatedText, suggestion.suggestion);
        if (!diff) {
            return null;
        }

        // 在原文中查找位置
        const position = text.indexOf(suggestion.translatedText);
        if (position === -1) {
            return null;
        }

        // 如果是删除操作，只标记要删除的部分
        if (diff.type === 'delete') {
            return {
                start: position + diff.start,
                end: position + diff.start + diff.text.length,
                originalText: diff.text,
                translatedText: suggestion.translatedText,
                suggestedText: '',  // 删除操作不需要建议文本
                type: suggestion.type,
                description: suggestion.description,
                reason: suggestion.reason
            };
        }

        // 如果是插入操作，只标记要插入的位置
        if (diff.type === 'insert') {
            return {
                start: position + diff.start,
                end: position + diff.start,
                originalText: '',
                translatedText: suggestion.translatedText,
                suggestedText: diff.text,
                type: suggestion.type,
                description: suggestion.description,
                reason: suggestion.reason
            };
        }

        // 替换操作
        return {
            start: position + diff.start,
            end: position + diff.end,
            originalText: suggestion.translatedText.substring(diff.start, diff.end),
            translatedText: suggestion.translatedText,
            suggestedText: diff.text,
            type: suggestion.type,
            description: suggestion.description,
            reason: suggestion.reason
        };
    }).filter((s): s is NonNullable<typeof s> => s !== null);
} 