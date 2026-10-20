"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { alignKnownTerms, tokenizeWords, type WordLink } from "../utils/wordAlignment";

type Side = "source" | "target";
interface AlignmentResult { links: WordLink[]; error?: string; pending?: boolean; slow?: boolean }

export function useWordAlignment(originals: string[], translations: string[], terms: Record<string, string>, editingIndices: number[] = []) {
  const [paragraph, setParagraph] = useState<number | null>(null);
  const [hover, setHover] = useState<{ paragraph: number; side: Side; token: number } | null>(null);
  const [results, setResults] = useState<Record<string, AlignmentResult>>({});
  const requests = useRef(new Map<string, AbortController>());
  const [retry, setRetry] = useState(0);
  const paragraphs = useMemo(() => originals.map((original, index) => {
    const source = original.replace(/^\[\d+\]\s*/, "");
    const target = translations[index] || "";
    const sourceTokens = tokenizeWords(source);
    const targetTokens = tokenizeWords(target);
    return { source, target, sourceTokens, targetTokens, index, key: JSON.stringify([source, target]),
      known: alignKnownTerms(sourceTokens, targetTokens, terms) };
  }), [originals, translations, terms]);
  const priority = paragraph === null ? undefined : paragraphs[paragraph];
  const needsAlignment = (pair: typeof priority) => pair && pair.source.trim() && pair.target.trim()
    && !editingIndices.includes(pair.index) && !results[pair.key];
  const current = needsAlignment(priority) ? priority : paragraphs.find(needsAlignment);
  const key = current?.key;
  const source = current?.source;
  const target = current?.target;

  // Only leaving the editor cancels in-flight work; moving between paragraphs does not.
  useEffect(() => {
    const activeRequests = requests.current;
    return () => {
      activeRequests.forEach((controller) => controller.abort());
      activeRequests.clear();
    };
  }, []);

  const result = key ? results[key] : undefined;
  useEffect(() => {
    if (!key || !source?.trim() || !target?.trim() || result || requests.current.has(key) || requests.current.size >= 2) return;
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      requests.current.set(key, controller);
      setResults((previous) => ({ ...previous, [key]: { links: [], pending: true } }));
      const timeout = setTimeout(() => controller.abort(new Error("词语对齐超时，请重试")), 45000);
      const slow = setTimeout(() => {
        if (!controller.signal.aborted) setResults((previous) => ({ ...previous,
          [key]: { links: [], pending: true, slow: true } }));
      }, 8000);
      try {
        const response = await fetch("/api/translation/align", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, target }), signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "词语对齐失败");
        if (controller.signal.aborted) return;
        const completed = { links: data.links as WordLink[] };
        setResults((previous) => ({ ...previous, [key]: completed }));
      } catch (error) {
        if (requests.current.get(key) !== controller) return;
        const failed = { links: [], error: controller.signal.aborted ? "词语对齐超时，请重试" : error instanceof Error ? error.message : "词语对齐失败" };
        setResults((previous) => ({ ...previous, [key]: failed }));
      } finally {
        clearTimeout(timeout);
        clearTimeout(slow);
        requests.current.delete(key);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [key, source, target, result, retry, results]);

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
    error: (index: number) => results[paragraphs[index].key]?.error,
    retry: (index: number) => {
      const key = paragraphs[index].key;
      setResults((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
      setParagraph(index);
      setRetry((previous) => previous + 1);
    },
    status: (index: number) => {
      const pair = paragraphs[index];
      if (editingIndices.includes(index)) return "编辑完成后自动更新对齐";
      if (results[pair.key]?.error) return "词语对齐暂不可用，仍可查看术语对应";
      if (results[pair.key]?.pending) return results[pair.key].slow
        ? "模型响应较慢，正在等待（最长 45 秒）…" : "正在对齐词语…";
      if (results[pair.key]) return "词语对齐已就绪";
      if (!pair.source.trim() || !pair.target.trim()) return "原文或译文为空，无法对齐";
      return "等待后台对齐…";
    } };
}
