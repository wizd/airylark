import assert from "node:assert/strict";
import { test } from "node:test";
import { tokenizeWords, alignKnownTerms } from "../app/utils/wordAlignment.ts";

test("preserves punctuation, spaces and Chinese word boundaries", () => {
  const text = "Hello, world! 机器学习很有用。\n";
  const tokens = tokenizeWords(text);
  assert.equal(tokens.map((token) => token.text).join(""), text);
  assert.ok(tokens.some((token) => token.text === "机器" && token.word));
  assert.ok(tokens.some((token) => token.text === "," && !token.word));
});

test("aligns multiword terms in both directions across reordered text", () => {
  const source = tokenizeWords("Machine learning uses data.");
  const target = tokenizeWords("数据用于机器学习。");
  const links = alignKnownTerms(source, target, { "machine learning": "机器学习", data: "数据" });
  assert.equal(links.length, 2);
  for (const link of links) {
    assert.ok(link.source.every((index) => source[index].word));
    assert.ok(link.target.every((index) => target[index].word));
  }
  assert.equal(links[0].source.map((index) => source[index].text).join(" "), "Machine learning");
  assert.equal(links[0].target.map((index) => target[index].text).join(""), "机器学习");
});

test("pairs repeated terms by occurrence without matching partial words", () => {
  const source = tokenizeWords("data database data");
  const target = tokenizeWords("数据，数据");
  const links = alignKnownTerms(source, target, { data: "数据", missing: "不存在" });
  assert.equal(links.length, 2);
  assert.notDeepEqual(links[0].target, links[1].target);
  assert.ok(links.every((link) => link.source.length === 1 && source[link.source[0]].text === "data"));
});
