"use strict";

import { createScheduling } from "./srs.js";
import { STORAGE_KEYS } from "./storage.js";

/**
 * Flashcard data layer. Card *content* always comes fresh from the glossary
 * cache; only the SM-2 *scheduling state* is persisted (keyed by card id), so
 * editing a glossary term never desyncs the deck. Pure builders are separated
 * from chrome.storage I/O for testability.
 */

const FLASHCARD_STATE_KEY = "brse.flashcards";
const SCHEDULE_FIELDS = ["ease", "intervalDays", "repetitions", "dueAt", "lastReviewedAt"];

/** Stable id derived from the term's JP/EN so saved progress survives reloads. */
export function cardIdFromTerm(term) {
  const jp = String(term?.japanese || "").trim().toLowerCase();
  const en = String(term?.english || "").trim().toLowerCase();
  return `fc:${jp}|${en}`;
}

function pickSchedule(state) {
  const out = {};
  for (const field of SCHEDULE_FIELDS) out[field] = state[field];
  return out;
}

/**
 * Merge glossary terms with saved scheduling states into a deck of cards.
 * Terms missing a front or back face are skipped; duplicates are de-duped by id.
 */
export function buildCardsFromGlossary(glossary, savedStates = {}, now = Date.now()) {
  const cards = [];
  const seen = new Set();
  for (const term of Array.isArray(glossary) ? glossary : []) {
    const front = String(term?.japanese || term?.english || "").trim();
    const back = String(term?.vietnamese || term?.english || "").trim();
    if (!front || !back) continue;
    const id = cardIdFromTerm(term);
    if (seen.has(id)) continue;
    seen.add(id);
    const prior = savedStates[id];
    cards.push({
      id,
      front,
      reading: String(term?.kana || "").trim(),
      back,
      english: String(term?.english || "").trim(),
      ...(prior ? pickSchedule(prior) : createScheduling(now)),
    });
  }
  return cards;
}

// --- chrome.storage.local I/O ---

export function loadFlashcardStates() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) return resolve({});
    chrome.storage.local.get([FLASHCARD_STATE_KEY], (res) => {
      resolve(res?.[FLASHCARD_STATE_KEY] || {});
    });
  });
}

/** Persist one card's scheduling state, merged into the saved map. */
export function saveFlashcardState(card) {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local || !card?.id) return resolve();
    chrome.storage.local.get([FLASHCARD_STATE_KEY], (res) => {
      const states = res?.[FLASHCARD_STATE_KEY] || {};
      states[card.id] = pickSchedule(card);
      chrome.storage.local.set({ [FLASHCARD_STATE_KEY]: states }, resolve);
    });
  });
}

export function loadGlossaryCache() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) return resolve([]);
    chrome.storage.local.get([STORAGE_KEYS.GLOSSARY_CACHE], (res) => {
      const cache = res?.[STORAGE_KEYS.GLOSSARY_CACHE];
      resolve(Array.isArray(cache) ? cache : []);
    });
  });
}
