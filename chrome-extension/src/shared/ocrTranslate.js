"use strict";

import { translateText } from "./google-translate.js";

/**
 * Tiered OCR translation fallback.
 *
 * OCR translations (translation_ja/vi/en) are normally produced by the backend
 * AI runtime (Gemini Vision or a chat-completion). When that runtime is down,
 * those fields come back empty. These pure helpers + a thin network filler let
 * the extension top up the missing target languages client-side via the free
 * Google Translate endpoint, so EN/VI/JP stay usable without the local AI.
 *
 * Everything except `fillMissingTranslations` is pure and unit-testable; the
 * network call is injected so tests can run without `fetch`.
 */

export const TARGET_LANGS = ["ja", "vi", "en"];
const FIELD = { ja: "translation_ja", vi: "translation_vi", en: "translation_en" };

function hasText(value) {
  return Boolean(String(value || "").trim());
}

/** Which of ja/vi/en are still missing for a region (skips the source lang). */
export function regionMissingTargets(region) {
  if (!region || !hasText(region.text)) return [];
  const source = String(region.source_language || "").toLowerCase();
  return TARGET_LANGS.filter((lang) => {
    if (lang === source) return false; // source text already is this language
    return !hasText(region[FIELD[lang]]);
  });
}

/** True if any region still needs at least one target language translated. */
export function needsTranslationFill(translations) {
  return (Array.isArray(translations) ? translations : []).some(
    (region) => regionMissingTargets(region).length > 0,
  );
}

/**
 * Merge a { ja, vi, en } translation map into a region without overwriting
 * existing non-empty values. Also keeps the `translation` alias in sync with
 * Vietnamese and fills the source-language field from the original text.
 */
export function applyTranslations(region, map) {
  const next = { ...region };
  for (const lang of TARGET_LANGS) {
    const field = FIELD[lang];
    if (!hasText(next[field]) && hasText(map?.[lang])) {
      next[field] = map[lang];
    }
  }
  const source = String(next.source_language || "").toLowerCase();
  if (FIELD[source] && !hasText(next[FIELD[source]]) && hasText(next.text)) {
    next[FIELD[source]] = next.text;
  }
  if (!hasText(next.translation) && hasText(next.translation_vi)) {
    next.translation = next.translation_vi;
  }
  return next;
}

/**
 * Fill every region's missing target languages via Google Translate.
 * Regions that are already complete trigger zero network calls. Returns a new
 * array; never throws — per-region/per-language failures leave that field empty.
 *
 * @param {Array} translations OCR regions
 * @param {object} [options]
 * @param {(text:string, lang:string)=>Promise<string>} [options.translate] injectable translator
 */
export async function fillMissingTranslations(translations, options = {}) {
  const translate = options.translate || translateText;
  const list = Array.isArray(translations) ? translations : [];
  const result = [];
  for (const region of list) {
    const targets = regionMissingTargets(region);
    if (targets.length === 0) {
      result.push(applyTranslations(region, {}));
      continue;
    }
    const map = {};
    await Promise.all(
      targets.map(async (lang) => {
        try {
          map[lang] = await translate(region.text, lang);
        } catch {
          map[lang] = "";
        }
      }),
    );
    result.push(applyTranslations(region, map));
  }
  return result;
}
