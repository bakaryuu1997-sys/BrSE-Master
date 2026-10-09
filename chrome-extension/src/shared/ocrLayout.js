"use strict";

/**
 * Pure OCR layout helpers shared by the content-script overlay (OCR.js) and the
 * sidepanel OCR panel. No DOM / chrome dependencies so they are unit-testable.
 */

export function normalizeOcrText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function looksLikeCodeCapture(text) {
  const value = String(text || "").trim();
  if (!value) return false;

  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  const keywordMatches = value.match(/\b(import|export|const|let|var|function|class|interface|type|return|await|async|from|extends|defineConfig)\b/g) || [];
  const syntaxLines = lines.filter((line) => /[{}[\]();=]|=>|<\/?[a-z][\w-]*(\s|>|\/>)/i.test(line));
  const indentedLines = value.split("\n").filter((line) => /^\s{2,}\S/.test(line));
  const punctuationMatches = value.match(/[{}[\]();=]/g) || [];

  if (keywordMatches.length >= 2) return true;
  if (syntaxLines.length >= 3 && punctuationMatches.length >= 4) return true;
  if (keywordMatches.length >= 1 && (syntaxLines.length >= 2 || indentedLines.length >= 2)) return true;

  return false;
}

export function groupOcrRows(translations) {
  const items = (translations || [])
    .filter((item) => item && (item.text || item.translation || item.translation_ja || item.translation_vi || item.translation_en))
    .map((item) => ({
      ...item,
      leftPercent: Number(item.leftPercent || 0),
      topPercent: Number(item.topPercent || 0),
      hPercent: Number(item.hPercent || 2),
    }))
    .sort((a, b) => (a.topPercent - b.topPercent) || (a.leftPercent - b.leftPercent));

  const rows = [];
  for (const item of items) {
    const tolerance = Math.max(1.2, item.hPercent * 0.7);
    const row = rows.find((candidate) => Math.abs(candidate.top - item.topPercent) <= tolerance);
    if (row) {
      row.items.push(item);
      row.top = Math.min(row.top, item.topPercent);
    } else {
      rows.push({ top: item.topPercent, items: [item] });
    }
  }
  return rows.map((row) => ({
    ...row,
    items: row.items.sort((a, b) => a.leftPercent - b.leftPercent),
  }));
}

export function buildLaidOutOcrText(translations, field = "text", options = {}) {
  const rows = groupOcrRows(translations);
  if (rows.length === 0) {
    return normalizeOcrText((translations || []).map((item) => item?.[field] || "").filter(Boolean).join("\n"));
  }

  const lines = rows.map((row) => {
    let cursor = 0;
    let line = "";
    for (const item of row.items) {
      const value = normalizeOcrText(item[field] || "");
      if (!value) continue;
      if (value.includes("\n")) {
        return value;
      }
      const targetColumn = options.preserveColumns ? Math.max(0, Math.round(item.leftPercent * 0.8)) : 0;
      const spaces = options.preserveColumns
        ? Math.max(targetColumn - cursor, line ? 1 : 0)
        : (line ? 1 : 0);
      line += " ".repeat(spaces) + value;
      cursor = line.length;
    }
    return line.trimEnd();
  });

  return lines.filter(Boolean).join("\n").trim();
}

export function buildOriginalOcrText(translations) {
  const plainText = buildLaidOutOcrText(translations, "text", { preserveColumns: false });
  const columnText = buildLaidOutOcrText(translations, "text", { preserveColumns: true });
  const isCodeCapture = looksLikeCodeCapture(plainText) || looksLikeCodeCapture(columnText);

  return {
    text: isCodeCapture ? columnText : plainText,
    isCodeCapture,
  };
}

const TRANSLATION_FIELD = { ja: "translation_ja", vi: "translation_vi", en: "translation_en" };

/** Build the laid-out translated text for a target language (ja/vi/en). */
export function buildTranslatedText(translations, lang) {
  const field = TRANSLATION_FIELD[lang] || "translation_vi";
  const { isCodeCapture } = buildOriginalOcrText(translations);
  return buildLaidOutOcrText(translations, field, { preserveColumns: isCodeCapture });
}

/**
 * Build glossary-term objects from short Japanese OCR regions (skips sentences),
 * matching the shape consumed by BRSE_ADD_GLOSSARY_TERM.
 */
export function buildGlossaryTermsFromOcr(translations) {
  const seen = new Set();
  const terms = [];
  for (const item of translations || []) {
    const jp = String(item?.text || "").trim();
    if (!/[぀-ヿ㐀-䶿一-鿿]/.test(jp)) continue; // must contain JP
    if (jp.length > 24 || /[\n。！？]/.test(jp)) continue; // skip full sentences
    if (seen.has(jp)) continue;
    seen.add(jp);
    const english = String(item?.translation_en || "").trim();
    const vietnamese = String(item?.translation_vi || item?.translation || "").trim();
    const slug = (english || jp).toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "term";
    terms.push({
      id: `ocr-${slug}-${terms.length}`,
      english: english || jp,
      japanese: jp,
      vietnamese,
      category: "Business",
      roles: ["BrSE"],
      note: "Trích từ OCR ảnh.",
    });
  }
  return terms;
}

/** Extract distinct CJK (Japanese) terms from OCR regions, for glossary capture. */
export function extractJapaneseTerms(translations) {
  const seen = new Set();
  const terms = [];
  for (const item of translations || []) {
    const text = String(item?.text || "");
    const matches = text.match(/[぀-ヿ㐀-䶿一-鿿]{2,}/g) || [];
    for (const m of matches) {
      if (!seen.has(m)) {
        seen.add(m);
        terms.push(m);
      }
    }
  }
  return terms;
}
