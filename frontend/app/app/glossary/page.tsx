"use client";

import { BookOpenText, CheckCheck, EyeOff, Filter, Search, Sparkles, Volume2, Layers, List, ChevronLeft, ChevronRight, RotateCw, Upload, Trash2, Loader2, Shuffle, Keyboard } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { glossaryCategories, glossaryRoles, type GlossaryRole } from "@/lib/glossary";
import { useGlossaryState } from "@/hooks/useGlossaryState";

const allRoles = "All Roles"; // key: glossary.allRoles
const allCategories = "All Categories"; // key: glossary.allCategories

export default function GlossaryPage() {
  const { t } = useUiLanguage();
  const {
    query,
    setQuery,
    role,
    setRole,
    category,
    setCategory,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    isLoading,
    studyMode,
    setStudyMode,
    flashcardIndex,
    setFlashcardIndex,
    isFlipped,
    setIsFlipped,
    isShuffled,
    speakingKey,
    customTerms,
    setCustomTerms,
    importStatus,
    importStatusKind,
    notifyImport,
    hideMastered,
    setHideMastered,
    displayedTerms,
    flashcardTerms,
    masteredSet,
    masteredIds,
    activeProject,
    toggleMastered,
    handleShuffle,
    speakTerm,
    handleCsvImport,
    exportCsv,
    exportAnkiCsv,
  } = useGlossaryState();

  return (
    <main className="brse-page">
      <header className="brse-hero overflow-hidden">
        <div className="scene-art hidden lg:block">
          <div className="scene-card-stack right-14 top-8 h-36 w-48 rotate-[12deg] opacity-70" />
          <div className="scene-card-stack right-28 top-12 h-36 w-48 -rotate-[8deg] opacity-85" />
          <div className="scene-panel right-10 bottom-8 flex h-32 w-32 items-center justify-center">
            <span className="font-display text-5xl font-black text-cyan">語</span>
          </div>
        </div>
        <div className="grid gap-5 border-b border-[var(--brse-panel-border)]/28 p-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{t("glossary.badge")}</p>
            <h1 className="text-h1 mt-2">{t("glossary.title")}</h1>
            <p className="mt-3 max-w-5xl text-sm leading-6 text-textMuted">
              {t("glossary.body")}
            </p>
          </div>
          <div className="scene-panel relative rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("glossary.studyMode")}
            </div>
            <p className="mt-2 text-sm leading-6 text-textMuted">
              {totalItems + customTerms.length} {t("glossary.termsTotal")} · {masteredIds.length} {t("glossary.masteredTotal")}
              {customTerms.length > 0 ? ` · ${customTerms.length} custom` : ""}
            </p>
            <p className="mt-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary">
              Project: {activeProject?.name || "Global glossary"}
            </p>
          </div>
        </div>

        <section className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_180px_200px_220px_160px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("glossary.searchPlaceholder")}
              className="field-control w-full py-2 pl-10 pr-3 text-sm placeholder:text-textMuted/70"
            />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" aria-hidden="true" />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as GlossaryRole | typeof allRoles)}
              className="field-control w-full py-2 pl-10 pr-3 text-sm"
            >
              <option value={allRoles}>{t("glossary.allRoles")}</option>
              {glossaryRoles.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof glossaryCategories)[number] | typeof allCategories)}
            className="field-control px-3 py-2 text-sm"
          >
            <option value={allCategories}>{t("glossary.allCategories")}</option>
            {glossaryCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setHideMastered((current) => !current)}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
              hideMastered
                ? "border-primary/45 bg-primary/15 text-primary"
                : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-primary/30"
            }`}
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            {hideMastered ? t("glossary.showingNew") : t("glossary.hideRemembered")}
          </button>
          <button
            type="button"
            onClick={() => setStudyMode((current) => (current === "list" ? "flashcard" : "list"))}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
              studyMode === "flashcard"
                ? "border-primary/45 bg-primary/15 text-primary"
                : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-primary/30"
            }`}
          >
            {studyMode === "flashcard" ? <List className="h-4 w-4" aria-hidden="true" /> : <Layers className="h-4 w-4" aria-hidden="true" />}
            {studyMode === "flashcard" ? "List View" : "Flashcards"}
          </button>
        </section>

        <section className="grid gap-3 border-t border-[var(--brse-panel-border)] px-5 pb-5 pt-0 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] lg:items-center">
          <p className="rounded-lg border border-cyan/20 bg-cyan/10 px-3 py-2 text-sm leading-6 text-cyan">
            {t("glossary.importHint")} <span className="font-semibold">english,japanese,vietnamese,kana,category,roles,note,example</span>.
          </p>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-primary/35 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary transition hover:border-cyan/40 hover:text-cyan">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t("glossary.importCsv")}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                void handleCsvImport(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm font-semibold text-cyan transition hover:border-cyan/45"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportAnkiCsv}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-matcha/30 bg-matcha/10 px-3 py-2 text-sm font-semibold text-matcha transition hover:border-matcha/45"
          >
            Export Anki
          </button>
          {customTerms.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setCustomTerms([]);
                notifyImport(t("glossary.customCleared"), "info");
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-vermilion/30 bg-vermilion/10 px-3 py-2 text-sm font-semibold text-vermilion transition hover:border-vermilion/50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t("glossary.deleteCustom")}
            </button>
          ) : null}
          {importStatus ? (
            <p
              className={`text-sm font-semibold lg:col-span-3 ${
                importStatusKind === "error"
                  ? "text-vermilion"
                  : importStatusKind === "success"
                    ? "text-matcha"
                    : "text-gold"
              }`}
            >
              {importStatus}
            </p>
          ) : null}
        </section>
      </header>

      <section className="cinema-grid mt-6 grid gap-4 p-4 lg:grid-cols-[1.05fr_0.95fr] lg:p-5">
        <div className="relative z-10 rounded-[22px] border border-primary/15 bg-background/45 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Language cockpit</p>
          <h2 className="mt-2 text-lg font-semibold text-ink">{t("glossary.studyModeText")}</h2>
          <p className="mt-2 text-sm leading-6 text-textMuted">
            {t("glossary.intro")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="scene-chip">{studyMode === "flashcard" ? "Flashcard mode" : "Library mode"}</span>
            <span className="scene-chip">{displayedTerms.length} on page</span>
            <span className="scene-chip">{customTerms.length} {t("glossary.custom") || "custom"}</span>
          </div>
        </div>
        <div className="relative z-10 grid gap-3 sm:grid-cols-3">
          <div className="scene-stat-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Database</p>
            <p className="mt-3 text-3xl font-black text-ink">{totalItems}</p>
            <span className="scene-bar mt-4 w-4/5" />
          </div>
          <div className="scene-stat-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-matcha">Remembered</p>
            <p className="mt-3 text-3xl font-black text-ink">{masteredIds.length}</p>
            <span className="scene-bar mt-4 w-2/3" />
          </div>
          <div className="scene-stat-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Custom</p>
            <p className="mt-3 text-3xl font-black text-ink">{customTerms.length}</p>
            <span className="scene-bar mt-4 w-1/2" />
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="mt-8 flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
        </div>
      )}

      {!isLoading && studyMode === "flashcard" && flashcardTerms.length > 0 ? (
        <section className="mt-8 flex flex-col items-center w-full max-w-2xl mx-auto animate-[page-in_0.3s_ease-out]">
          <div className="mb-2 flex items-center justify-between w-full">
            <span className="text-sm font-semibold text-textMuted">
              Card {flashcardIndex + 1} of {flashcardTerms.length} {isShuffled && "(Shuffled 🔀)"}
            </span>
            <button
              onClick={handleShuffle}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] px-3 py-1.5 text-xs font-bold text-textMuted transition hover:text-primary hover:border-primary/20 cursor-pointer"
              title={t("glossary.shuffleTooltip")}
            >
              <Shuffle className="h-3.5 w-3.5 text-primary" />
              Shuffle
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-matcha transition-all duration-300"
              style={{ width: `${Math.round(((flashcardIndex + 1) / flashcardTerms.length) * 100)}%` }}
            />
          </div>

          <div 
            className="group relative h-[400px] w-full cursor-pointer perspective-1000"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}>
              {/* Front */}
              <div className="absolute inset-0 backface-hidden glass-panel rounded-2xl border border-primary/20 p-8 flex flex-col items-center justify-center text-center shadow-2xl hover:border-primary/50 transition-colors">
                <p className="absolute top-6 left-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {flashcardTerms[flashcardIndex].category}
                </p>
                <div className="absolute top-6 right-6">
                  <RotateCw className="h-5 w-5 text-textMuted/50" />
                </div>
                <h2 className="text-4xl font-bold text-ink mb-4">{flashcardTerms[flashcardIndex].english}</h2>
                <div className="mt-8 flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => speakTerm(flashcardTerms[flashcardIndex].id, flashcardTerms[flashcardIndex].english, "en-US")}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--brse-panel-border)] bg-background/55 px-4 py-2 text-sm font-semibold text-ink transition hover:border-cyan/35 hover:text-cyan cursor-pointer"
                  >
                    <Volume2 className="h-4 w-4" />
                    En
                  </button>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 glass-panel rounded-2xl border border-matcha/30 p-8 flex flex-col items-center justify-center text-center shadow-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                <p className="text-3xl font-bold text-ink">{flashcardTerms[flashcardIndex].japanese}</p>
                {flashcardTerms[flashcardIndex].kana && (
                  <p className="mt-2 text-lg text-textMuted">{flashcardTerms[flashcardIndex].kana}</p>
                )}
                <p className="mt-6 text-2xl font-semibold text-matcha">{flashcardTerms[flashcardIndex].vietnamese}</p>
                
                {flashcardTerms[flashcardIndex].example && (
                  <p className="mt-6 text-sm text-textMuted max-w-md italic">&quot;{flashcardTerms[flashcardIndex].example}&quot;</p>
                )}

                <div className="absolute bottom-6 flex flex-wrap justify-center gap-3 w-full px-6" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => speakTerm(flashcardTerms[flashcardIndex].id, flashcardTerms[flashcardIndex].japanese, "ja-JP")}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--brse-panel-border)] bg-background/55 px-4 py-2 text-sm font-semibold text-ink transition hover:border-cyan/35 hover:text-cyan cursor-pointer"
                  >
                    <Volume2 className="h-4 w-4" />
                    Jp
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMastered(flashcardTerms[flashcardIndex].id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      masteredSet.has(flashcardTerms[flashcardIndex].id)
                        ? "border-matcha/40 bg-matcha/15 text-matcha shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                        : "border-[var(--brse-panel-border)] bg-background/55 text-ink hover:border-matcha/35 hover:text-matcha"
                    } cursor-pointer`}
                  >
                    <CheckCheck className="h-4 w-4" />
                    {masteredSet.has(flashcardTerms[flashcardIndex].id) ? "Remembered" : "Mark as Remembered"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 w-full">
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setFlashcardIndex((curr) => Math.max(0, curr - 1));
                }}
                disabled={flashcardIndex === 0}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brse-panel-border)] bg-background/70 text-ink transition hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setFlashcardIndex((curr) => Math.min(flashcardTerms.length - 1, curr + 1));
                }}
                disabled={flashcardIndex === flashcardTerms.length - 1}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brse-panel-border)] bg-background/70 text-ink transition hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Keyboard shortcuts help */}
            <div className="flex items-center gap-1.5 text-[10px] text-textMuted bg-white/[0.02] border border-[var(--brse-panel-border)] px-4 py-2.5 rounded-xl mt-2 select-none">
              <Keyboard className="h-3.5 w-3.5 text-primary" />
              <span>{t("glossary.shortcutsPrefix")}</span>
              <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 font-bold">Space</kbd>{t("glossary.shortcutsFlip")}
              <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 font-bold">← / →</kbd>{t("glossary.shortcutsPrevNext")}
              <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 font-bold">R / M</kbd>{t("glossary.shortcutsMastered")}
              <kbd className="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 font-bold">S</kbd>{t("glossary.shortcutsSpeakJa")}
            </div>
          </div>
        </section>
      ) : null}
      
      {!isLoading && studyMode === "list" && displayedTerms.length > 0 ? (
        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayedTerms.map((term) => {
          const isMastered = masteredSet.has(term.id);
          return (
            <article key={term.id} className={`brse-section p-5 transition hover:border-primary/30 hover:bg-surfaceHover/45 ${isMastered ? "border-matcha/30" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                      Source: Glossary
                    </span>
                    <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan">
                      {term.category}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-ink">{term.english}</h2>
                </div>
                <BookOpenText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              </div>

              <div className="mt-4 rounded-lg border border-[var(--brse-panel-border)] bg-background/55 p-3">
                <p className="text-lg font-semibold text-ink">{term.japanese}</p>
                {term.kana ? <p className="mt-1 text-xs text-textMuted">{term.kana}</p> : null}
                <p className="mt-2 text-sm font-semibold text-matcha">{term.vietnamese}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => speakTerm(term.id, term.english, "en-US")}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    speakingKey === `${term.id}:en-US`
                      ? "border-cyan/50 bg-cyan/15 text-cyan"
                      : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-cyan/35 hover:text-cyan"
                  }`}
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  {t("glossary.enVoice")}
                </button>
                <button
                  type="button"
                  onClick={() => speakTerm(term.id, term.japanese, "ja-JP")}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    speakingKey === `${term.id}:ja-JP`
                      ? "border-cyan/50 bg-cyan/15 text-cyan"
                      : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-cyan/35 hover:text-cyan"
                  }`}
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  {t("glossary.jpVoice")}
                </button>
                <button
                  type="button"
                  onClick={() => toggleMastered(term.id)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    isMastered
                      ? "border-matcha/40 bg-matcha/15 text-matcha"
                      : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-matcha/35 hover:text-matcha"
                  }`}
                >
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  {isMastered ? t("glossary.remembered") : t("glossary.markRemembered")}
                </button>
              </div>

              <p className="mt-4 text-sm leading-6 text-textMuted">{term.note}</p>
              {term.example ? (
                <p className="mt-3 rounded-md border border-cyan/20 bg-cyan/10 p-3 text-sm leading-6 text-cyan">{term.example}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {term.roles.map((item) => (
                  <span key={item} className="rounded-full border border-[var(--brse-panel-border)] bg-background/60 px-2.5 py-1 text-xs font-semibold text-textMuted">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </section>
      ) : null}

      {!isLoading && displayedTerms.length === 0 ? (
        <section className="mt-5 rounded-xl border border-[var(--brse-panel-border)] bg-surface/60 p-8 text-center">
          <p className="text-lg font-semibold text-ink">{t("glossary.empty")}</p>
          <p className="mt-2 text-sm text-textMuted">{t("glossary.emptyHint")}</p>
        </section>
      ) : null}

      {/* Pagination Controls */}
      {totalPages > 1 && !isLoading && (
        <section className="mt-8 mb-8 flex justify-center gap-4 items-center">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="brse-button px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm font-bold text-primary px-4 py-2 rounded-md border border-primary/20 bg-primary/10">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="brse-button px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      )}
    </main>
  );
}
