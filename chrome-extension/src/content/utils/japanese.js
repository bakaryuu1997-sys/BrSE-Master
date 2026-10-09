"use strict";

/**
 * Pure Japanese-text helpers for the furigana-hover feature. No DOM deps so
 * they are unit-testable.
 */

// Hiragana, katakana, CJK ideographs, prolonged sound mark, iteration marks.
const JP_CHAR = /[぀-ヿ㐀-䶿一-鿿ーｦ-ﾟ々〆〤]/;

export function isJapaneseChar(ch) {
  return !!ch && JP_CHAR.test(ch);
}

export function hasJapanese(text) {
  return JP_CHAR.test(String(text || ""));
}

/**
 * Return the contiguous run of Japanese characters surrounding `offset` in
 * `text`. Empty string when the offset is not on/next to Japanese.
 */
export function extractJapaneseSegment(text, offset) {
  const str = String(text || "");
  if (!str) return "";
  let i = Math.max(0, Math.min(Number(offset) || 0, str.length - 1));

  if (!isJapaneseChar(str[i])) {
    // Allow landing just past the end of a word (offset points to the next char).
    if (i > 0 && isJapaneseChar(str[i - 1])) i -= 1;
    else return "";
  }

  let start = i;
  let end = i;
  while (start > 0 && isJapaneseChar(str[start - 1])) start -= 1;
  while (end < str.length - 1 && isJapaneseChar(str[end + 1])) end += 1;

  // Cap length to keep transliteration requests small.
  const segment = str.slice(start, end + 1).trim();
  return segment.length > 40 ? segment.slice(0, 40) : segment;
}
