"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { alignKnownTerms, tokenizeWords, type WordLink } from "../utils/wordAlignment";

type Side = "source" | "target";
interface AlignmentResult { links: WordLink[]; error?: string }

export function useWordAlignment(originals: string[], translations: string[], terms: Record<string, string>) {
  const [paragraph, setParagraph] = useState<number | null>(null);
  const [hover, setHover] = useState<{ paragraph: number; side: Side; token: number } | null>(null);
  const [results, setResults] = useState<Record<string, AlignmentResult>>({});
  const cache = useRef(new Map<string, AlignmentResult>());
  const paragraphs = useMemo(() => originals.map((original, index) => {
    const source = original.replace(/^\[\d+\]\s*/, "");
    const target = translations[index] || "";
    const sourceTokens = tokenizeWords(source);
    const targetTokens = tokenizeWords(target);
    return { source, target, sourceTokens, targetTokens, key: JSON.stringify([source, target]),
      known: alignKnownTerms(sourceTokens, targetTokens, terms) };
  }), [originals, translations, terms]);
  const current = paragraph === null ? undefined : paragraphs[paragraph];
  const key = current?.key;
  const source = current?.source;
  const target = current?.target;

  useEffect(() => {
    if (!key || !source?.trim() || !target?.trim() || cache.current.has(key)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/translation/align", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, target }), signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "词语对齐失败");
        if (controller.signal.aborted) return;
        const result = { links: data.links as WordLink[] };
        cache.current.set(key, result);
        setResults((previous) => ({ ...previous, [key]: result }));
      } catch (error) {
        if (controller.signal.aborted) return;
        const result = { links: [], error: error instanceof Error ? error.message : "词语对齐失败" };
        cache.current.set(key, result);
        setResults((previous) => ({ ...previous, [key]: result }));
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, source, target]);

  const renderText = (index: number, side: Side) => {
    const pair = paragraphs[index];
    const tokens = side === "source" ? pair.sourceTokens : pair.targetTokens;
    const active = new Set<number>();
    if (hover?.paragraph === index) {
      if (hover.side === side) active.add(hover.token);
      const known = pair.known.filter((link) => link[hover.side].includes(hover.token));
      const links = known.length ? known : (results[pair.key]?.links || []).filter((link) => link[hover.side].includes(hover.token));
      links.forEach((link) => link[side].forEach((token) => active.add(token)));
    }
    return tokens.map((token, tokenIndex) => token.word ? (
      <span key={tokenIndex}
        className={`word-alignment-token${active.has(tokenIndex) ? (hover?.side === side ? " word-alignment-hover" : " word-alignment-match") : ""}`}
        onMouseEnter={() => setHover({ paragraph: index, side, token: tokenIndex })}
        onMouseLeave={() => setHover(null)}>{token.text}</span>
    ) : <span key={tokenIndex} onMouseEnter={() => setHover(null)}>{token.text}</span>);
  };

  return { renderText, enterParagraph: setParagraph, clearHover: () => setHover(null),
    status: (index: number) => {
      const pair = paragraphs[index];
      if (results[pair.key]?.error) return "词语对齐暂不可用，仍可查看术语对应";
      if (results[pair.key]) return "词语对齐已就绪";
      return paragraph === index ? "正在对齐词语…" : "悬停查看词语对应";
    } };
}
