"use strict";

/**
 * Pure SM-2 spaced-repetition scheduler (no DOM/chrome deps, unit-testable).
 *
 * SM-2 reference: each card tracks an ease factor, an interval (days) and a
 * repetition count. A review grade maps to a quality 0-5; quality < 3 is a
 * lapse that resets the schedule. See https://super-memory.com/english/ol/sm2.htm
 */

export const GRADE = { AGAIN: "again", HARD: "hard", GOOD: "good", EASY: "easy" };

// UI grade → SM-2 quality. "again" is a lapse (<3); the rest pass.
const QUALITY = { again: 2, hard: 3, good: 4, easy: 5 };

export const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Fresh scheduling state for a brand-new card (due immediately). */
export function createScheduling(now = Date.now()) {
  return { ease: DEFAULT_EASE, intervalDays: 0, repetitions: 0, dueAt: now, lastReviewedAt: null };
}

/**
 * Apply a review grade to a card's scheduling and return the next state.
 * Pure: returns a new object, never mutates the input.
 */
export function reviewCard(card, grade, now = Date.now()) {
  const quality = QUALITY[grade] ?? QUALITY.good;
  let ease = Number(card?.ease) || DEFAULT_EASE;
  let intervalDays = Number(card?.intervalDays) || 0;
  let repetitions = Number(card?.repetitions) || 0;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1; // re-show tomorrow
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
    repetitions += 1;
  }

  ease += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  if (ease < MIN_EASE) ease = MIN_EASE;
  ease = Math.round(ease * 1000) / 1000;

  return {
    ...card,
    ease,
    intervalDays,
    repetitions,
    dueAt: now + intervalDays * DAY_MS,
    lastReviewedAt: now,
  };
}

/** A card is due when it has no due date or its due date has passed. */
export function isDue(card, now = Date.now()) {
  return !card?.dueAt || card.dueAt <= now;
}

/** Due cards, soonest-due first. */
export function getDueCards(cards, now = Date.now()) {
  return (Array.isArray(cards) ? cards : [])
    .filter((card) => isDue(card, now))
    .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0));
}
