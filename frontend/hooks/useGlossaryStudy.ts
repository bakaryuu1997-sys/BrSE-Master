"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { type GlossaryTerm } from "@/lib/glossary";

interface UseGlossaryStudyProps {
  displayedTerms: GlossaryTerm[];
  toggleMastered: (termId: string) => void;
}

export function useGlossaryStudy({ displayedTerms, toggleMastered }: UseGlossaryStudyProps) {
  const [studyMode, setStudyMode] = useState<"list" | "flashcard">("list");
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledTerms, setShuffledTerms] = useState<GlossaryTerm[]>([]);
  const [speakingKey, setSpeakingKey] = useState("");

  const flashcardTerms = useMemo(() => {
    return isShuffled ? shuffledTerms : displayedTerms;
  }, [isShuffled, shuffledTerms, displayedTerms]);

  const handleShuffle = useCallback(() => {
    const arr = [...displayedTerms];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffledTerms(arr);
    setIsShuffled(true);
    setFlashcardIndex(0);
    setIsFlipped(false);
  }, [displayedTerms]);

  // Reset flashcard state when terms or page changes
  useEffect(() => {
    setFlashcardIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
    setShuffledTerms([]);
  }, [displayedTerms.length]);

  function speakTerm(termId: string, text: string, lang: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synthesis = window.speechSynthesis;
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang.startsWith("ja") ? 0.92 : 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeakingKey(`${termId}:${lang}`);
    utterance.onend = () => setSpeakingKey("");
    utterance.onerror = () => setSpeakingKey("");

    const matchingVoice = synthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    if (matchingVoice) utterance.voice = matchingVoice;

    synthesis.speak(utterance);
  }

  // Keyboard Shortcuts for Flashcards
  useEffect(() => {
    if (studyMode !== "flashcard" || flashcardTerms.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      }
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setIsFlipped(false);
        setFlashcardIndex((curr) => Math.min(flashcardTerms.length - 1, curr + 1));
      }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsFlipped(false);
        setFlashcardIndex((curr) => Math.max(0, curr - 1));
      }
      else if (e.key.toLowerCase() === "r" || e.key.toLowerCase() === "m") {
        e.preventDefault();
        const currentTerm = flashcardTerms[flashcardIndex];
        if (currentTerm) {
          toggleMastered(currentTerm.id);
        }
      }
      else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        const currentTerm = flashcardTerms[flashcardIndex];
        if (currentTerm) {
          speakTerm(currentTerm.id, currentTerm.japanese, "ja-JP");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [studyMode, flashcardIndex, flashcardTerms, toggleMastered]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  return {
    studyMode,
    setStudyMode,
    flashcardIndex,
    setFlashcardIndex,
    isFlipped,
    setIsFlipped,
    isShuffled,
    setIsShuffled,
    speakingKey,
    flashcardTerms,
    handleShuffle,
    speakTerm,
  };
}
