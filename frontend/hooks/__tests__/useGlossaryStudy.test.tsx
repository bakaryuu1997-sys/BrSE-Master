import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGlossaryStudy } from "../useGlossaryStudy";
import type { GlossaryTerm } from "@/lib/glossary";

function term(id: string): GlossaryTerm {
  return {
    id,
    english: `EN ${id}`,
    japanese: `JP ${id}`,
    vietnamese: `VI ${id}`,
    roles: ["BrSE"],
    category: "Business",
    note: "",
  };
}

const TERMS = [term("a"), term("b"), term("c")];

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
  });
}

describe("useGlossaryStudy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in list mode showing the displayed terms in order", () => {
    const { result } = renderHook(() =>
      useGlossaryStudy({ displayedTerms: TERMS, toggleMastered: vi.fn() }),
    );
    expect(result.current.studyMode).toBe("list");
    expect(result.current.flashcardIndex).toBe(0);
    expect(result.current.isFlipped).toBe(false);
    expect(result.current.flashcardTerms).toEqual(TERMS);
  });

  it("shuffle keeps the same members, flips on isShuffled, and resets index/flip", () => {
    const { result } = renderHook(() =>
      useGlossaryStudy({ displayedTerms: TERMS, toggleMastered: vi.fn() }),
    );
    act(() => result.current.setFlashcardIndex(2));
    act(() => result.current.setIsFlipped(true));
    act(() => result.current.handleShuffle());

    expect(result.current.isShuffled).toBe(true);
    expect(result.current.flashcardIndex).toBe(0);
    expect(result.current.isFlipped).toBe(false);
    expect([...result.current.flashcardTerms].map((t) => t.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("navigates with arrow keys (clamped) and flips with space in flashcard mode", () => {
    const { result } = renderHook(() =>
      useGlossaryStudy({ displayedTerms: TERMS, toggleMastered: vi.fn() }),
    );
    act(() => result.current.setStudyMode("flashcard"));

    press("ArrowLeft"); // already at 0 → clamped
    expect(result.current.flashcardIndex).toBe(0);

    press("ArrowRight");
    expect(result.current.flashcardIndex).toBe(1);

    press("ArrowRight");
    press("ArrowRight"); // clamp at last index (2)
    expect(result.current.flashcardIndex).toBe(2);

    press(" ");
    expect(result.current.isFlipped).toBe(true);
    press(" ");
    expect(result.current.isFlipped).toBe(false);
  });

  it("toggles mastered for the current card on 'r'/'m'", () => {
    const toggleMastered = vi.fn();
    const { result } = renderHook(() =>
      useGlossaryStudy({ displayedTerms: TERMS, toggleMastered }),
    );
    act(() => result.current.setStudyMode("flashcard"));
    press("ArrowRight"); // index 1 → term "b"
    press("r");
    expect(toggleMastered).toHaveBeenCalledWith("b");
  });

  it("ignores shortcuts while in list mode", () => {
    const toggleMastered = vi.fn();
    const { result } = renderHook(() =>
      useGlossaryStudy({ displayedTerms: TERMS, toggleMastered }),
    );
    press("ArrowRight");
    press("r");
    expect(result.current.flashcardIndex).toBe(0);
    expect(toggleMastered).not.toHaveBeenCalled();
  });

  it("resets flashcard position when the displayed term count changes", () => {
    const { result, rerender } = renderHook(
      ({ terms }) => useGlossaryStudy({ displayedTerms: terms, toggleMastered: vi.fn() }),
      { initialProps: { terms: TERMS } },
    );
    act(() => result.current.setStudyMode("flashcard"));
    press("ArrowRight");
    expect(result.current.flashcardIndex).toBe(1);

    rerender({ terms: [term("a"), term("b")] }); // length changed 3 → 2
    expect(result.current.flashcardIndex).toBe(0);
    expect(result.current.isShuffled).toBe(false);
  });
});
