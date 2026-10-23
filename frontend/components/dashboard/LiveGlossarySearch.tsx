"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, ExternalLink, Sparkles, RefreshCw, Volume2, CheckCircle2, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { glossaryTerms, type GlossaryTerm } from "@/lib/glossary";
import type { TranslationKey } from "@/lib/uiLanguage";

export function LiveGlossarySearch({ t }: { t: (key: TranslationKey) => string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<typeof glossaryTerms>([]);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Daily Flashcard Spaced Repetition State (Client-safe)
  const [dailyTerm, setDailyTerm] = useState<GlossaryTerm | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMastered, setIsMastered] = useState(false);

  useEffect(() => {
    // Pick daily term safely after mount
    const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const termIndex = seed % glossaryTerms.length;
    const term = glossaryTerms[termIndex] || glossaryTerms[0];
    setDailyTerm(term);

    try {
      const masteredList = JSON.parse(localStorage.getItem("brse.glossary.mastered") || "[]");
      if (term && masteredList.includes(term.id)) {
        setIsMastered(true);
      }
    } catch {}
  }, []);

  const handleNextRandomWord = () => {
    const randomIndex = Math.floor(Math.random() * glossaryTerms.length);
    const next = glossaryTerms[randomIndex];
    setDailyTerm(next);
    setIsFlipped(false);
    try {
      const masteredList = JSON.parse(localStorage.getItem("brse.glossary.mastered") || "[]");
      setIsMastered(masteredList.includes(next.id));
    } catch {}
  };

  const handleToggleMastered = () => {
    if (!dailyTerm) return;
    try {
      const current = JSON.parse(localStorage.getItem("brse.glossary.mastered") || "[]") as string[];
      let updated: string[];
      if (isMastered) {
        updated = current.filter((id) => id !== dailyTerm.id);
        setIsMastered(false);
      } else {
        updated = [...current, dailyTerm.id];
        setIsMastered(true);
      }
      localStorage.setItem("brse.glossary.mastered", JSON.stringify(updated));
    } catch {}
  };

  const handleSpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const q = query.toLowerCase();
      const hits = glossaryTerms
        .filter(
          (term) =>
            term.english.toLowerCase().includes(q) ||
            term.japanese.includes(q) ||
            term.vietnamese.toLowerCase().includes(q) ||
            (term.kana && term.kana.includes(q))
        )
        .slice(0, 4);
      setResults(hits);
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="space-y-3">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="relative flex items-center gap-2">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-textMuted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={t("dashboard.glossarySearchPlaceholder")}
            className="field-control w-full py-2 pl-8 pr-3 text-sm placeholder:text-textMuted/70"
            id="dashboard-glossary-search"
          />
        </div>

        {/* Inline dropdown results */}
        {isFocused && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-[var(--brse-panel-border)] bg-background/95 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            {results.map((term) => (
              <Link
                key={term.id}
                href={`/app/glossary?q=${encodeURIComponent(term.english)}`}
                className="flex items-center justify-between gap-3 border-b border-[var(--brse-panel-border)] px-4 py-3 transition-colors last:border-0 hover:bg-primary/10"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-textPrimary">{term.japanese}</p>
                  <p className="truncate text-[11px] text-textMuted">
                    {term.english} · {term.vietnamese}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-textMuted/40" />
              </Link>
            ))}
            <Link
              href={`/app/glossary?q=${encodeURIComponent(query)}`}
              className="flex items-center justify-center gap-1 bg-primary/5 py-2 text-[11px] font-bold text-primary hover:bg-primary/10"
            >
              <Search className="h-3 w-3" />
              {t("dashboard.viewAllResults")}
            </Link>
          </div>
        )}
        {isFocused && query.trim() && results.length === 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-[var(--brse-panel-border)] bg-background/95 px-4 py-3 text-xs text-textMuted backdrop-blur-xl">
            {t("dashboard.noGlossaryKeyword")}{" "}
            <Link href={`/app/glossary?q=${encodeURIComponent(query)}`} className="text-primary hover:underline">
              {t("dashboard.viewFullGlossaryArrow")}
            </Link>
          </div>
        )}
      </div>

      {/* Daily IT Glossary Flashcard & Spaced Repetition */}
      {dailyTerm && (
        <div className="rounded-xl border border-[var(--brse-panel-border)] bg-surface/40 p-3.5 shadow-sm transition hover:border-primary/25">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-black uppercase tracking-wider text-textMuted">
                Daily Word · Phản xạ IT
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNextRandomWord}
                className="rounded p-1 text-textMuted hover:bg-white/10 hover:text-textPrimary transition"
                title="Đổi từ vựng khác"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleToggleMastered}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
                  isMastered
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : "bg-white/5 border-white/10 text-textMuted hover:text-textPrimary"
                }`}
                title={isMastered ? "Đã thuộc từ này" : "Đánh dấu đã thuộc"}
              >
                {isMastered ? "✓ Đã thuộc" : "+ Ghi nhớ"}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-background/50 border border-[var(--brse-panel-border)]/50 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                {dailyTerm.kana && (
                  <p className="text-[10px] font-medium text-accent leading-none mb-0.5">
                    {dailyTerm.kana}
                  </p>
                )}
                <h4 className="text-base font-black text-textPrimary leading-tight flex items-center gap-2">
                  {dailyTerm.japanese}
                  <button
                    type="button"
                    onClick={() => handleSpeak(dailyTerm.japanese)}
                    className="p-1 rounded text-textMuted hover:text-accent transition"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </h4>
              </div>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary shrink-0">
                {dailyTerm.category}
              </span>
            </div>

            {/* Answer / Explanation (Revealable Flashcard) */}
            {isFlipped ? (
              <div className="border-t border-[var(--brse-panel-border)]/40 pt-2 space-y-1.5 animate-in fade-in-50">
                <div>
                  <p className="text-xs font-bold text-textPrimary">
                    {dailyTerm.english}
                  </p>
                  <p className="text-xs font-semibold text-emerald-400">
                    {dailyTerm.vietnamese}
                  </p>
                </div>
                {dailyTerm.note && (
                  <p className="text-[11px] leading-relaxed text-textMuted">
                    {dailyTerm.note}
                  </p>
                )}
                {dailyTerm.example && (
                  <div className="rounded bg-accent/5 border border-accent/15 p-2 text-[11px] font-medium text-textPrimary italic">
                    💡 &ldquo;{dailyTerm.example}&rdquo;
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  className="w-full text-center text-[10px] font-bold text-textMuted hover:text-textPrimary pt-1 flex items-center justify-center gap-1"
                >
                  <ChevronUp className="h-3 w-3" /> Thu gọn
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className="w-full rounded-md bg-white/5 border border-dashed border-[var(--brse-panel-border)] py-2 text-center text-xs font-bold text-accent hover:bg-accent/10 transition flex items-center justify-center gap-1.5"
              >
                <BookOpen className="h-3.5 w-3.5" /> Lật thẻ xem nghĩa & ví dụ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
