"use strict";

// The extractive fallback is all the user sees when AI refine is unavailable, so
// keep it substantial rather than a 7-line skeleton (reported as "quá sơ sài").
const MAX_SENTENCES = 10;
const MAX_TERMS = 8;
const STOPWORDS = new Set([
  "this", "that", "with", "from", "into", "have", "will", "your", "about", "more", "read",
  "the", "and", "for", "you", "are", "was", "were", "can", "not", "all", "new",
  "cua", "cho", "voi", "mot", "cac", "nhung", "trong", "duoc", "khong", "nguoi",
]);

/** Extractive sentence selection for a source page (pure, reused by localizer). */
export function selectSummarySentences(source) {
  const text = String(source?.promptText || "").trim();
  return pickImportantSentences(splitSentences(text));
}

/**
 * Same fast draft as buildFastPageSummary, but the extracted page sentences are
 * translated into the target language via an injected translator
 * (text, lang) => Promise<string>. Used so the no-AI fallback reads in VI/JA
 * instead of the page's original language when AI refine fails or times out.
 * Never throws: a failed sentence keeps its original text.
 */
export async function buildLocalizedFastSummary(source, options = {}, translate = null) {
  const selected = selectSummarySentences(source);
  if (typeof translate !== "function" || selected.length === 0) {
    return buildFastPageSummary(source, options);
  }
  const lang = options.lang === "ja" ? "ja" : "vi";
  const translated = await Promise.all(
    selected.map(async (sentence) => {
      try {
        const out = await translate(sentence, lang);
        return String(out || "").trim() || sentence;
      } catch {
        return sentence;
      }
    }),
  );
  return buildFastPageSummary(source, { ...options, sentencesOverride: translated });
}

export function buildFastPageSummary(source, options = {}) {
  const lang = options.lang === "ja" ? "ja" : "vi";
  const title = cleanLine(options.title || source.title || "");
  const text = String(source.promptText || "").trim();
  const selected = Array.isArray(options.sentencesOverride)
    ? options.sentencesOverride
    : pickImportantSentences(splitSentences(text));
  const terms = extractProposedTerms(text);
  const labels = getLabels(lang);

  const lines = [
    `### ${labels.title}`,
    `_${labels.extractiveNote}_`,
    title ? `- ${labels.page}: ${title}` : "",
    source.noTranscript ? `- ${labels.source}: ${labels.noTranscript}` : "",
    selected.length
      ? selected.map((sentence) => `- ${sentence}`).join("\n")
      : `- ${labels.empty}`,
  ].filter(Boolean);

  const actions = inferActionItems(text, lang);
  if (actions.length > 0) {
    lines.push("", `### ${labels.actions}`, ...actions.map((item) => `- ${item}`));
  }

  if (source.isFallback) {
    lines.push("", `_${labels.fallback}_`);
  }

  if (terms.length > 0) {
    lines.push("", renderDictionaryBlock(terms, lang));
  }

  return lines.join("\n");
}

export function buildAiSummaryInput(source, options = {}) {
  const lang = options.lang === "ja" ? "Japanese" : "Vietnamese";
  const title = cleanLine(options.title || source.title || "");
  const localSummary = String(options.localSummary || "").replace(/--- DICTIONARY START ---[\s\S]*?--- DICTIONARY END ---/g, "").trim();
  return [
    "You are BrSE OS page summarizer. Return concise Markdown only.",
    "Do not output JSON. Do not repeat source metadata. Do not mention that you are an AI.",
    "Format: short overview, key points, action items if any, risks/unknowns if any.",
    `Target language: ${lang}`,
    title ? `Page title: ${title}` : "",
    source.noTranscript ? "Note: YouTube captions were not available; summarize only from title/description/page text and say that captions were unavailable." : "",
    localSummary ? `Fast local draft:\n${localSummary.slice(0, 1800)}` : "",
    `Source text:\n${String(source.promptText || "").slice(0, 5200)}`,
  ].filter(Boolean).join("\n\n");
}

export function isAiErrorText(text) {
  const value = String(text || "").trim();
  return /^(?:❌|⚠️|AI runtime error|Backend AI|Cloud Fallback|Local Backend)/i.test(value);
}

export function appendAiFailureNotice(localSummary, errorText, lang = "vi") {
  const note = lang === "ja"
    ? "AIによる詳細化に失敗したため、上記はローカル抽出の高速要約です。"
    : "AI chưa refine được, nên bản trên là tóm tắt nhanh bằng local extractive summary.";
  const detail = String(errorText || "").replace(/^❌\s*/, "").slice(0, 220);
  return `${localSummary || ""}\n\n_⚠️ ${note}${detail ? ` (${detail})` : ""}_`;
}

function getLabels(lang) {
  if (lang === "ja") {
    return {
      title: "高速要約",
      extractiveNote: "原文からの抜粋です。AIで日本語の要約に更新中…",
      page: "ページ",
      source: "入力",
      noTranscript: "字幕なし。タイトル/説明文から要約しています",
      actions: "確認すべき点",
      empty: "このページから十分な本文を取得できませんでした。",
      fallback: "これはAIなしのローカル要約です。AIが利用可能な場合は後続で自然な要約に更新されます。",
    };
  }
  return {
    title: "Tóm tắt nhanh",
    extractiveNote: "Trích nguyên văn từ trang; đang tạo bản tóm tắt bằng AI…",
    page: "Trang",
    source: "Nguồn",
    noTranscript: "Không có phụ đề; đang tóm tắt từ tiêu đề/mô tả",
    actions: "Điểm cần chú ý",
    empty: "Không lấy được đủ nội dung đọc được từ trang này.",
    fallback: "Đây là bản tóm tắt local không cần AI. Khi AI sẵn sàng, nội dung sẽ được refine tự động.",
  };
}

function splitSentences(text) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = normalized
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map(cleanLine)
    .filter((line) => line.length >= 45 && line.length <= 360)
    .slice(0, 80);
  if (sentences.length > 0 || normalized.length < 45) return sentences;
  return chunkLongReadableText(normalized).slice(0, 80);
}

function chunkLongReadableText(text) {
  const chunks = [];
  const words = String(text || "").split(/\s+/).filter(Boolean);
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 240 && current.length >= 45) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current.length >= 30) chunks.push(current);
  return chunks.filter((line) => line.length >= 30 && line.length <= 360);
}

function jaccardOverlap(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

function pickImportantSentences(sentences) {
  if (sentences.length <= MAX_SENTENCES) return sentences;
  const frequency = buildTokenFrequency(sentences.join(" "));
  const ranked = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      tokens: new Set(tokenize(sentence)),
      score: scoreSentence(sentence, index, frequency),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  // Greedy pick by score, skipping near-duplicates so the (few) selected lines
  // cover distinct ideas instead of restating the same point — a thin, repetitive
  // summary was a big part of the "quá sơ sài" complaint.
  const picked = [];
  for (const candidate of ranked) {
    if (picked.length >= MAX_SENTENCES) break;
    const redundant = picked.some((item) => jaccardOverlap(item.tokens, candidate.tokens) > 0.6);
    if (!redundant) picked.push(candidate);
  }
  // Backfill by score if aggressive dedup left us short on a very repetitive page.
  if (picked.length < MAX_SENTENCES) {
    for (const candidate of ranked) {
      if (picked.length >= MAX_SENTENCES) break;
      if (!picked.includes(candidate)) picked.push(candidate);
    }
  }

  return picked
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
}

function scoreSentence(sentence, index, frequency) {
  const lower = sentence.toLowerCase();
  const keywords = /(summary|overview|requirement|important|breaking|release|setup|install|error|warning|todo|action|decision|仕様|重要|要件|概要|注意|エラー|リリース|cảnh báo|quan trọng|yêu cầu|tóm tắt|lỗi|cài đặt|hành động)/i;
  const tokens = tokenize(sentence);
  const freqScore = tokens.reduce((sum, token) => sum + (frequency.get(token) || 0), 0) / Math.max(tokens.length, 1);
  const positionBoost = index < 5 ? 2.4 : index < 12 ? 1.2 : 0;
  const keywordBoost = keywords.test(lower) ? 2.2 : 0;
  const lengthPenalty = sentence.length > 240 ? -0.6 : 0;
  return freqScore + positionBoost + keywordBoost + lengthPenalty;
}

function buildTokenFrequency(text) {
  const map = new Map();
  tokenize(text).forEach((token) => map.set(token, (map.get(token) || 0) + 1));
  return map;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .match(/[a-z][a-z0-9_-]{2,}|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{2,}/gu)
    ?.filter((token) => !STOPWORDS.has(token) && token.length >= 3)
    .slice(0, 300) || [];
}

function inferActionItems(text, lang) {
  const labels = lang === "ja"
    ? ["前提条件・設定を確認する", "エラー/警告があれば原因を切り分ける", "必要な手順や依存関係をメモ化する"]
    : ["Kiểm tra điều kiện/cấu hình chính trước khi làm theo trang này", "Nếu có lỗi hoặc warning, tách nguyên nhân và bước xử lý", "Ghi lại thuật ngữ hoặc dependency quan trọng vào glossary/notes"];
  if (!text || text.length < 400) return [];
  return labels.slice(0, 3);
}

function extractProposedTerms(text) {
  const candidates = new Map();
  const regexes = [
    /\b[A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)+\b/g,
    /\b[a-z]+(?:[A-Z][a-z0-9]+){1,}\b/g,
    /\b(?:API|SDK|CLI|CSP|OCR|JSON|JWT|HTTP|HTTPS|Docker|Kubernetes|React|Next\.js|TypeScript|JavaScript|FastAPI|PostgreSQL|Cloudflare|Ollama|9Router)\b/g,
    /\b[a-zA-Z][a-zA-Z0-9]+(?:[-_/][a-zA-Z0-9]+)+\b/g,
  ];
  regexes.forEach((regex) => {
    String(text || "").match(regex)?.forEach((raw) => {
      const term = cleanLine(raw).replace(/[.,:;!?()[\]{}"'`]+$/g, "");
      if (term.length >= 3 && term.length <= 48 && !STOPWORDS.has(term.toLowerCase())) {
        candidates.set(term.toLowerCase(), term);
      }
    });
  });
  return Array.from(candidates.values()).slice(0, MAX_TERMS).map((term) => ({
    english: term,
    japanese: "",
    kana: "",
    vietnamese: term,
    category: categorizeTerm(term),
    note: `Thuật ngữ xuất hiện trong trang hiện tại; nên kiểm tra ngữ cảnh trước khi đưa vào glossary chính thức.`,
    example: `Review "${term}" trong nội dung trang trước khi thêm vào tài liệu dự án.`,
  }));
}

function categorizeTerm(term) {
  if (/test|qa|lint|warning|error|bug|validation|verify/i.test(term)) return "Quality";
  if (/cloud|docker|kubernetes|server|api|http|jwt|database|postgres|tunnel|router/i.test(term)) return "Infrastructure";
  if (/release|deploy|plan|workflow|process|todo|schedule/i.test(term)) return "Process";
  if (/customer|requirement|business|contract|report/i.test(term)) return "Business";
  return "Technical";
}

function renderDictionaryBlock(terms, lang) {
  const intro = lang === "ja"
    ? "### 追加候補の用語"
    : "### Từ vựng có thể thêm nhanh";
  return `${intro}\n--- DICTIONARY START ---\n${JSON.stringify(terms, null, 2)}\n--- DICTIONARY END ---`;
}

function cleanLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
