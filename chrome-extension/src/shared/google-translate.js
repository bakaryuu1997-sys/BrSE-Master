"use strict";

const RICH_TRANSLATE_TIMEOUT_MS = 4500;
const FAST_TRANSLATE_TIMEOUT_MS = 3000;
const DICTIONARY_TIMEOUT_MS = 3500;
const memoryCache = new Map();
const simpleTranslateCache = new Map();

/**
 * Lightweight one-shot translation to a single target language (ja/vi/en/...),
 * returning just the translated string. Used as the OCR translation fallback
 * when the local AI backend/runtime is unavailable. Uses the free Google
 * endpoint — needs internet, but not the user's local AI runtime.
 */
export async function translateText(text, targetLang, timeoutMs = FAST_TRANSLATE_TIMEOUT_MS) {
  const normalized = String(text || "").trim();
  if (!normalized || !targetLang) return "";
  const cacheKey = `${targetLang}::${normalized.toLowerCase()}`;
  if (simpleTranslateCache.has(cacheKey)) return simpleTranslateCache.get(cacheKey);
  const data = await fetchGoogleTranslate(normalized, targetLang, "dt=t", timeoutMs);
  const translation = parseSimpleTranslation(data);
  if (translation) simpleTranslateCache.set(cacheKey, translation);
  return translation;
}

export async function googleTranslatePro(text) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) {
    throw new Error("Khong co van ban de dich.");
  }

  const cacheKey = normalizedText.toLowerCase();
  if (memoryCache.has(cacheKey)) {
    return { ...memoryCache.get(cacheKey) };
  }

  const japanesePromise = fetchGoogleTranslate(normalizedText, "ja", "dt=t&dt=rm", FAST_TRANSLATE_TIMEOUT_MS)
    .then((data) => parseSimpleTranslation(data))
    .catch((error) => {
      console.warn("[Google Translate] Japanese translation skipped:", error.message);
      return "";
    });
  const englishDictionaryPromise = fetchEnglishDictionary(normalizedText).catch((error) => {
    console.warn("[DictionaryAPI] English dictionary fallback skipped:", error.message);
    return null;
  });

  let parsed = null;
  let richError = null;
  try {
    const richData = await fetchGoogleTranslate(
      normalizedText,
      "vi",
      "dt=t&dt=bd&dt=rm&dt=at&dt=md&dt=ex&dt=ss",
      RICH_TRANSLATE_TIMEOUT_MS
    );
    parsed = parseGoogleTranslateResponse(normalizedText, richData);
  } catch (error) {
    richError = error;
    console.warn("[Google Translate] Rich dictionary request failed, trying fast translation:", error.message);
  }

  if (!parsed) {
    try {
      const fastData = await fetchGoogleTranslate(normalizedText, "vi", "dt=t&dt=rm", FAST_TRANSLATE_TIMEOUT_MS);
      parsed = parseGoogleTranslateResponse(normalizedText, fastData);
    } catch (fastError) {
      console.error("Google Translate API Error:", fastError);
    }
  }

  const [japaneseTranslation, englishDictionary] = await Promise.all([
    japanesePromise,
    englishDictionaryPromise,
  ]);

  if (!parsed && englishDictionary) {
    parsed = {
      originalText: normalizedText,
      sourceLang: "en",
      translation: englishDictionary.translationFallback || normalizedText,
      transliteration: "",
      dictionary: [],
      synonyms: [],
      definitions: [],
      examples: [],
      source: "dictionaryapi",
      translationLanguage: "en",
    };
  }

  if (!parsed) {
    const message = richError?.name === "AbortError"
      ? "Het thoi gian cho Google Translate."
      : "Loi ket noi Google Translate.";
    throw new Error(message);
  }

  if (japaneseTranslation) {
    parsed.japaneseTranslation = japaneseTranslation;
  }
  mergeEnglishDictionary(parsed, englishDictionary);

  memoryCache.set(cacheKey, parsed);
  return { ...parsed };
}

async function fetchGoogleTranslate(text, targetLang, params, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&hl=${encodeURIComponent(targetLang)}&${params}&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Google API status error: ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchEnglishDictionary(text) {
  if (!/^[a-z][a-z\s'-]{0,60}$/i.test(text) || text.trim().split(/\s+/).length > 3) {
    return null;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DICTIONARY_TIMEOUT_MS);
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text.toLowerCase())}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Dictionary API status error: ${response.status}`);
    const data = await response.json();
    return parseEnglishDictionaryResponse(data);
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseSimpleTranslation(data) {
  let translation = "";
  if (Array.isArray(data?.[0])) {
    data[0].forEach((item) => {
      if (item?.[0]) translation += item[0];
    });
  }
  return translation.trim();
}

export function parseGoogleTranslateResponse(text, data) {
  const result = {
    originalText: text,
    sourceLang: data?.[2] || "en",
    translation: parseSimpleTranslation(data),
    transliteration: "",
    dictionary: [],
    synonyms: [],
    definitions: [],
    examples: [],
    source: "google",
    translationLanguage: "vi",
  };

  if (Array.isArray(data?.[0])) {
    data[0].forEach((item) => {
      if (item?.[3]) result.transliteration += item[3];
    });
  }

  if (Array.isArray(data?.[1])) {
    data[1].forEach((item) => {
      result.dictionary.push({
        type: item?.[0] || "related",
        terms: item?.[1] || [],
        extra: item?.[2] || [],
      });
    });
  }

  if (Array.isArray(data?.[11])) {
    data[11].forEach((item) => {
      result.synonyms.push({
        type: item?.[0] || "synonym",
        terms: (item?.[1] || []).flatMap((group) => group?.[0] || []),
      });
    });
  }

  if (Array.isArray(data?.[12])) {
    data[12].forEach((item) => {
      result.definitions.push({
        type: item?.[0] || "definition",
        entries: (item?.[1] || []).map((entry) => ({
          desc: entry?.[0] || "",
          example: entry?.[2] || null,
        })),
      });
    });
  }

  if (Array.isArray(data?.[13]?.[0])) {
    data[13][0].forEach((example) => {
      if (example?.[0]) result.examples.push(example[0]);
    });
  }

  if (!result.translation) {
    throw new Error("Google Translate returned no translation.");
  }

  return result;
}

export function parseEnglishDictionaryResponse(data) {
  const firstEntry = Array.isArray(data) ? data[0] : null;
  const definitions = [];
  const dictionary = [];
  const examples = [];

  (firstEntry?.meanings || []).forEach((meaning) => {
    const type = meaning.partOfSpeech || "definition";
    const entries = (meaning.definitions || []).slice(0, 5).map((item) => {
      if (item.example) examples.push(item.example);
      return {
        desc: item.definition || "",
        example: item.example || null,
      };
    }).filter((item) => item.desc);
    if (entries.length > 0) definitions.push({ type, entries });
    if (Array.isArray(meaning.synonyms) && meaning.synonyms.length > 0) {
      dictionary.push({ type: `${type} synonyms`, terms: meaning.synonyms.slice(0, 8), extra: [] });
    }
  });

  return {
    definitions,
    dictionary,
    examples,
    translationFallback: definitions[0]?.entries?.[0]?.desc || "",
  };
}

function mergeEnglishDictionary(target, englishDictionary) {
  if (!englishDictionary) return;
  if (!Array.isArray(target.definitions) || target.definitions.length === 0) {
    target.definitions = englishDictionary.definitions || [];
  }
  if (!Array.isArray(target.dictionary) || target.dictionary.length === 0) {
    target.dictionary = englishDictionary.dictionary || [];
  }
  if (!Array.isArray(target.examples) || target.examples.length === 0) {
    target.examples = englishDictionary.examples || [];
  }
  if (target.source !== "google") {
    target.source = "dictionaryapi";
  }
}
