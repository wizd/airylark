export interface WordToken {
  text: string;
  word: boolean;
}

export interface WordLink {
  source: number[];
  target: number[];
}

export function tokenizeWords(text: string): WordToken[] {
  return Array.from(new Intl.Segmenter(undefined, { granularity: "word" }).segment(text),
    ({ segment, isWordLike }) => ({ text: segment, word: Boolean(isWordLike) }));
}

function termIndices(tokens: WordToken[], term: string): number[][] {
  if (!term.trim()) return [];
  const text = tokens.map((token) => token.text).join("").toLocaleLowerCase();
  const needle = term.toLocaleLowerCase();
  const matches: number[][] = [];
  let offset = 0;
  const starts = tokens.map((token) => {
    const start = offset;
    offset += token.text.length;
    return start;
  });
  for (let start = text.indexOf(needle); start !== -1; start = text.indexOf(needle, start + needle.length)) {
    const end = start + needle.length;
    const indices = tokens.flatMap((token, index) =>
      token.word && starts[index] >= start && starts[index] + token.text.length <= end ? [index] : []);
    if (indices.length && starts[indices[0]] === start &&
      starts[indices[indices.length - 1]] + tokens[indices[indices.length - 1]].text.length === end) {
      matches.push(indices);
    }
  }
  return matches;
}

export function alignKnownTerms(source: WordToken[], target: WordToken[], terms: Record<string, string>): WordLink[] {
  return Object.entries(terms).flatMap(([original, translated]) => {
    const sources = termIndices(source, original);
    const targets = termIndices(target, translated);
    // Repeated terms pair by occurrence when possible; otherwise retain all valid matches.
    return sources.flatMap((indices, index) => {
      const counterparts = sources.length === targets.length ? [targets[index]] : targets;
      return counterparts.filter(Boolean).map((targetIndices) => ({ source: indices, target: targetIndices }));
    });
  });
}
