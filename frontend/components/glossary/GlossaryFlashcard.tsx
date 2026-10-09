"use client";

import { CheckCheck, RotateCw, Volume2 } from "lucide-react";
import type { GlossaryTerm } from "@/lib/glossary";

interface GlossaryFlashcardProps {
  term: GlossaryTerm;
  isFlipped: boolean;
  isMastered: boolean;
  speakingKey: string;
  onFlip: () => void;
  onSpeak: (termId: string, text: string, lang: string) => void;
  onToggleMastered: (termId: string) => void;
}

export default function GlossaryFlashcard({
  term,
  isFlipped,
  isMastered,
  speakingKey,
  onFlip,
  onSpeak,
  onToggleMastered,
}: GlossaryFlashcardProps) {
  return (
    <div
      className={`flashcard-container h-[400px] w-full max-w-2xl cursor-pointer ${isFlipped ? "flashcard-flipped" : ""}`}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? "Flip card to front" : "Flip card to back"}
      onKeyDown={(e) => {
        if (e.key === "Enter") onFlip();
      }}
    >
      <div className="flashcard-inner">
        {/* ── Front face ── */}
        <div className="flashcard-face flashcard-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <p className="absolute top-6 left-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {term.category}
          </p>
          <div className="absolute top-6 right-6 flex items-center gap-2">
            {isMastered && (
              <span className="rounded-full border border-matcha/35 bg-matcha/12 px-2.5 py-0.5 text-[10px] font-bold text-matcha">
                ✓ Remembered
              </span>
            )}
            <RotateCw className="h-4 w-4 text-textMuted/40" />
          </div>

          <h2 className="text-4xl font-bold text-ink mb-2">{term.japanese}</h2>
          {term.kana && (
            <p className="text-base text-textMuted/80 mb-1">{term.kana}</p>
          )}
          <p className="text-lg font-semibold text-primary/70 mt-1">{term.english}</p>

          <div className="absolute bottom-6 flex flex-wrap justify-center gap-2">
            {term.roles.map((role) => (
              <span
                key={role}
                className="rounded-full border border-[var(--brse-panel-border)] bg-background/60 px-2.5 py-1 text-[10px] font-bold text-textMuted uppercase tracking-wider"
              >
                {role}
              </span>
            ))}
          </div>

          <div
            className="absolute bottom-6 right-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onSpeak(term.id, term.japanese, "ja-JP")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                speakingKey === `${term.id}:ja-JP`
                  ? "border-cyan/50 bg-cyan/15 text-cyan"
                  : "border-[var(--brse-panel-border)] bg-background/50 text-ink hover:border-cyan/35 hover:text-cyan"
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              JP
            </button>
          </div>
        </div>

        {/* ── Back face ── */}
        <div className="flashcard-face flashcard-back flashcard-card flashcard-card-back rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <p className="absolute top-6 left-6 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">
            {term.category}
          </p>

          <p className="text-3xl font-bold text-ink">{term.japanese}</p>
          {term.kana && (
            <p className="mt-1 text-sm text-textMuted">{term.kana}</p>
          )}
          <p className="mt-4 text-2xl font-semibold text-matcha">{term.vietnamese}</p>
          <p className="mt-2 text-base text-textMuted/80">{term.english}</p>

          {term.example && (
            <div className="mt-5 w-full max-w-md rounded-lg border border-cyan/20 bg-cyan/5 px-4 py-3">
              <p className="text-sm leading-6 text-cyan font-mono">
                &quot;{term.example}&quot;
              </p>
            </div>
          )}

          {term.note && !term.example && (
            <p className="mt-5 text-sm text-textMuted/70 max-w-md leading-6 italic">
              {term.note}
            </p>
          )}

          <div
            className="absolute bottom-6 flex flex-wrap justify-center gap-3 w-full px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onSpeak(term.id, term.english, "en-US")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                speakingKey === `${term.id}:en-US`
                  ? "border-cyan/50 bg-cyan/15 text-cyan"
                  : "border-[var(--brse-panel-border)] bg-background/50 text-ink hover:border-cyan/35 hover:text-cyan"
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              EN
            </button>
            <button
              type="button"
              onClick={() => onSpeak(term.id, term.japanese, "ja-JP")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                speakingKey === `${term.id}:ja-JP`
                  ? "border-cyan/50 bg-cyan/15 text-cyan"
                  : "border-[var(--brse-panel-border)] bg-background/50 text-ink hover:border-cyan/35 hover:text-cyan"
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              JP
            </button>
            <button
              type="button"
              onClick={() => onToggleMastered(term.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isMastered
                  ? "border-matcha/40 bg-matcha/15 text-matcha"
                  : "border-[var(--brse-panel-border)] bg-background/50 text-ink hover:border-matcha/35 hover:text-matcha"
              }`}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {isMastered ? "Remembered" : "Mark Remembered"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
