"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";
import { glossaryTerms } from "@/lib/glossary";
import type { TranslationKey } from "@/lib/uiLanguage";

export function LiveGlossarySearch({ t }: { t: (key: TranslationKey) => string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<typeof glossaryTerms>([]);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
    <div className="relative">
      <div className="relative flex items-center gap-2">
        <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-textMuted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
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
  );
}
