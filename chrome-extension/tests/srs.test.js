import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  DEFAULT_EASE,
  GRADE,
  createScheduling,
  getDueCards,
  isDue,
  reviewCard,
} from "../src/shared/srs.js";
import { buildCardsFromGlossary, cardIdFromTerm } from "../src/shared/flashcardStore.js";

const NOW = 1_000_000_000_000;

describe("SM-2 reviewCard", () => {
  it("schedules the first three successful reviews as 1, 6, then interval*ease days", () => {
    let card = createScheduling(NOW);
    card = reviewCard(card, GRADE.GOOD, NOW);
    expect(card.intervalDays).toBe(1);
    expect(card.repetitions).toBe(1);

    card = reviewCard(card, GRADE.GOOD, NOW);
    expect(card.intervalDays).toBe(6);
    expect(card.repetitions).toBe(2);

    card = reviewCard(card, GRADE.GOOD, NOW);
    expect(card.intervalDays).toBe(Math.round(6 * card.ease));
    expect(card.dueAt).toBe(NOW + card.intervalDays * DAY_MS);
  });

  it("resets repetitions and re-shows tomorrow on AGAIN", () => {
    let card = reviewCard(createScheduling(NOW), GRADE.GOOD, NOW);
    card = reviewCard(card, GRADE.GOOD, NOW);
    card = reviewCard(card, GRADE.AGAIN, NOW);
    expect(card.repetitions).toBe(0);
    expect(card.intervalDays).toBe(1);
  });

  it("never lets ease fall below 1.3", () => {
    let card = createScheduling(NOW);
    for (let i = 0; i < 10; i += 1) card = reviewCard(card, GRADE.AGAIN, NOW);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("raises ease on EASY and lowers it on HARD relative to default", () => {
    const easy = reviewCard(createScheduling(NOW), GRADE.EASY, NOW);
    const hard = reviewCard(createScheduling(NOW), GRADE.HARD, NOW);
    expect(easy.ease).toBeGreaterThan(DEFAULT_EASE);
    expect(hard.ease).toBeLessThan(DEFAULT_EASE);
  });

  it("does not mutate the input card", () => {
    const card = createScheduling(NOW);
    const snapshot = { ...card };
    reviewCard(card, GRADE.GOOD, NOW);
    expect(card).toEqual(snapshot);
  });
});

describe("due selection", () => {
  it("treats undated and past-due cards as due, future cards as not", () => {
    expect(isDue({}, NOW)).toBe(true);
    expect(isDue({ dueAt: NOW - 1 }, NOW)).toBe(true);
    expect(isDue({ dueAt: NOW + 1 }, NOW)).toBe(false);
  });

  it("returns due cards soonest-first", () => {
    const cards = [
      { id: "a", dueAt: NOW + 5000 },
      { id: "b", dueAt: NOW - 2000 },
      { id: "c", dueAt: NOW - 9000 },
    ];
    expect(getDueCards(cards, NOW).map((c) => c.id)).toEqual(["c", "b"]);
  });
});

describe("buildCardsFromGlossary", () => {
  const glossary = [
    { japanese: "設定", english: "Settings", vietnamese: "Cài đặt", kana: "せってい" },
    { japanese: "", english: "", vietnamese: "" }, // skipped (no faces)
    { japanese: "設定", english: "Settings", vietnamese: "Cài đặt" }, // duplicate id
  ];

  it("builds one card per unique term with front/back/reading", () => {
    const cards = buildCardsFromGlossary(glossary, {}, NOW);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("設定");
    expect(cards[0].back).toBe("Cài đặt");
    expect(cards[0].reading).toBe("せってい");
    expect(cards[0].dueAt).toBe(NOW); // fresh card due now
  });

  it("reuses saved scheduling state by card id", () => {
    const id = cardIdFromTerm(glossary[0]);
    const saved = { [id]: { ease: 2.1, intervalDays: 12, repetitions: 4, dueAt: NOW + 99, lastReviewedAt: NOW } };
    const cards = buildCardsFromGlossary(glossary, saved, NOW);
    expect(cards[0].intervalDays).toBe(12);
    expect(cards[0].repetitions).toBe(4);
    expect(cards[0].dueAt).toBe(NOW + 99);
  });
});
