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
    scopeMode,
    setScopeMode,
    hasProject,
    toggleMastered,
    handleShuffle,
    speakTerm,
    handleCsvImport,
    exportCsv,
    exportAnkiCsv,
  } = useGlossaryState();

  return (
    <main className="brse-page">
      <header className="brse-hero overflow-hidden mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--brse-panel-border)]/28 px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{t("glossary.badge")}</span>
            <span className="text-textMuted/40">·</span>
            <h1 className="text-base font-extrabold tracking-tight text-textPrimary truncate">{t("glossary.title")}</h1>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-1.5 sm:shrink-0">
            <span className="rounded-lg border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {totalItems + customTerms.length} {t("glossary.termsTotal")}
            </span>
            <span className="rounded-lg border border-matcha/25 bg-matcha/10 px-2 py-0.5 text-xs font-bold text-matcha">
              {masteredIds.length} {t("glossary.masteredTotal")}
            </span>
            {customTerms.length > 0 && (
              <span className="rounded-lg border border-gold/25 bg-gold/10 px-2 py-0.5 text-xs font-bold text-gold">
                {customTerms.length} custom
              </span>
            )}
            <div role="group" aria-label="Glossary scope" className="inline-flex overflow-hidden rounded-lg border border-[var(--brse-panel-border)] text-xs font-semibold">
              <button
                type="button"
                disabled={!hasProject}
                onClick={() => setScopeMode("project")}
                aria-pressed={scopeMode === "project" && hasProject}
                title={hasProject ? "Thuật ngữ theo dự án đang chọn ở sidebar" : "Chưa có dự án"}
                className={`px-2 py-0.5 transition ${scopeMode === "project" && hasProject ? "bg-primary/20 text-primary" : "bg-surface text-textMuted hover:text-ink"} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {activeProject?.name || "Dự án"}
              </button>
              <button
                type="button"
                onClick={() => setScopeMode("global")}
                aria-pressed={scopeMode === "global" || !hasProject}
                title="Thuật ngữ chung, không đổi theo dự án"
                className={`border-l border-[var(--brse-panel-border)] px-2 py-0.5 transition ${scopeMode === "global" || !hasProject ? "bg-primary/20 text-primary" : "bg-surface text-textMuted hover:text-ink"}`}
              >
                Toàn cục
              </button>
            </div>
          </div>
        </div>

        <section className="flex flex-wrap items-center justify-between gap-2 p-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <label className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textMuted" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("glossary.searchPlaceholder")}
                className="field-control w-full py-1.5 pl-8 pr-2.5 text-xs placeholder:text-textMuted/70"
              />
            </label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as GlossaryRole | typeof allRoles)}
              className="field-control py-1.5 px-2.5 text-xs"
            >
              <option value={allRoles}>{t("glossary.allRoles")}</option>
              {glossaryRoles.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as (typeof glossaryCategories)[number] | typeof allCategories)}
              className="field-control py-1.5 px-2.5 text-xs"
            >
              <option value={allCategories}>{t("glossary.allCategories")}</option>
              {glossaryCategories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="flex max-w-full flex-wrap items-center gap-1.5 sm:shrink-0">
            <button
              type="button"
              onClick={() => setHideMastered((current) => !current)}
              className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
                hideMastered
                  ? "border-primary/45 bg-primary/15 text-primary"
                  : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-primary/30"
              }`}
            >
              <EyeOff className="h-3 w-3" aria-hidden="true" />
              {hideMastered ? t("glossary.showingNew") : t("glossary.hideRemembered")}
            </button>
            <button
              type="button"
              onClick={() => setStudyMode((current) => (current === "list" ? "flashcard" : "list"))}
              className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition ${
                studyMode === "flashcard"
                  ? "border-primary/45 bg-primary/15 text-primary shadow-sm shadow-primary/20"
                  : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-primary/30"
              }`}
            >
              {studyMode === "flashcard" ? <List className="h-3 w-3" aria-hidden="true" /> : <Layers className="h-3 w-3" aria-hidden="true" />}
              {studyMode === "flashcard" ? "List View" : "Flashcards"}
            </button>
            <label className="inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-2.5 text-xs font-semibold text-primary transition hover:bg-primary/20">
              <Upload className="h-3 w-3" aria-hidden="true" />
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
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-2 text-xs font-semibold text-cyan transition hover:bg-cyan/20"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={exportAnkiCsv}
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-matcha/30 bg-matcha/10 px-2 text-xs font-semibold text-matcha transition hover:bg-matcha/20"
            >
              Anki
            </button>
            {customTerms.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCustomTerms([]);
                  notifyImport(t("glossary.customCleared"), "info");
                }}
                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-vermilion/30 bg-vermilion/10 px-2 text-xs font-semibold text-vermilion transition hover:bg-vermilion/20"
                title={t("glossary.deleteCustom")}
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
          {importStatus && (
            <p
              className={`text-[11px] font-semibold ${
                importStatusKind === "error"
                  ? "text-vermilion"
                  : importStatusKind === "success"
                    ? "text-matcha"
                    : "text-gold"
              }`}
            >
              {importStatus}
            </p>
          )}
        </section>
      </header>

      {isLoading && (
        <div className="mt-8 flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
        </div>
      )}

      {!isLoading && studyMode === "flashcard" && flashcardTerms.length > 0 ? (
        <section className="mt-6 flex flex-col items-center w-full max-w-2xl mx-auto animate-[page-in_0.3s_ease-out]">
          <div className="mb-2 flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-textMuted">
              Thẻ {flashcardIndex + 1} / {flashcardTerms.length} {isShuffled && "(Đã xáo trộn 🔀)"}
            </span>
            <button
              onClick={handleShuffle}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] px-2.5 py-1 text-xs font-bold text-textMuted transition hover:text-primary hover:border-primary/20 cursor-pointer"
              title={t("glossary.shuffleTooltip")}
            >
              <Shuffle className="h-3 w-3 text-primary" />
              Xáo trộn
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-matcha transition-all duration-300"
              style={{ width: `${Math.round(((flashcardIndex + 1) / flashcardTerms.length) * 100)}%` }}
            />
          </div>

          <div 
            className="group relative h-[360px] w-full cursor-pointer perspective-1000"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}>
              {/* Front */}
              <div className="absolute inset-0 backface-hidden glass-panel rounded-2xl border border-primary/20 p-6 flex flex-col items-center justify-center text-center shadow-2xl hover:border-primary/50 transition-colors">
                <p className="absolute top-5 left-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {flashcardTerms[flashcardIndex].category}
                </p>
                <div className="absolute top-5 right-5">
                  <RotateCw className="h-4 w-4 text-textMuted/50" />
                </div>
                <h2 className="text-3xl font-extrabold text-ink mb-3">{flashcardTerms[flashcardIndex].english}</h2>
                <div className="mt-4 flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => speakTerm(flashcardTerms[flashcardIndex].id, flashcardTerms[flashcardIndex].english, "en-US")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brse-panel-border)] bg-background/55 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-cyan/35 hover:text-cyan cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    En
                  </button>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 glass-panel rounded-2xl border border-matcha/30 p-6 flex flex-col items-center justify-center text-center shadow-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                <p className="text-2xl font-bold text-ink">{flashcardTerms[flashcardIndex].japanese}</p>
                {flashcardTerms[flashcardIndex].kana && (
                  <p className="mt-1 text-sm text-textMuted">{flashcardTerms[flashcardIndex].kana}</p>
                )}
                <p className="mt-4 text-xl font-semibold text-matcha">{flashcardTerms[flashcardIndex].vietnamese}</p>
                
                {flashcardTerms[flashcardIndex].example && (
                  <p className="mt-4 text-xs text-textMuted max-w-md italic">&quot;{flashcardTerms[flashcardIndex].example}&quot;</p>
                )}

                <div className="absolute bottom-5 flex flex-wrap justify-center gap-2.5 w-full px-5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => speakTerm(flashcardTerms[flashcardIndex].id, flashcardTerms[flashcardIndex].japanese, "ja-JP")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brse-panel-border)] bg-background/55 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-cyan/35 hover:text-cyan cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Jp
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMastered(flashcardTerms[flashcardIndex].id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      masteredSet.has(flashcardTerms[flashcardIndex].id)
                        ? "border-matcha/40 bg-matcha/15 text-matcha shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                        : "border-[var(--brse-panel-border)] bg-background/55 text-ink hover:border-matcha/35 hover:text-matcha"
                    } cursor-pointer`}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {masteredSet.has(flashcardTerms[flashcardIndex].id) ? "Đã thuộc" : "Đánh dấu đã thuộc"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 w-full">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setFlashcardIndex((curr) => Math.max(0, curr - 1));
                }}
                disabled={flashcardIndex === 0}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--brse-panel-border)] bg-background/70 text-ink transition hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setFlashcardIndex((curr) => Math.min(flashcardTerms.length - 1, curr + 1));
                }}
                disabled={flashcardIndex === flashcardTerms.length - 1}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--brse-panel-border)] bg-background/70 text-ink transition hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Keyboard shortcuts help */}
            <div className="flex items-center gap-1.5 text-[10px] text-textMuted bg-white/[0.02] border border-[var(--brse-panel-border)] px-3 py-1.5 rounded-lg mt-1 select-none">
              <Keyboard className="h-3 w-3 text-primary" />
              <span>Phím tắt:</span>
              <kbd className="bg-white/10 px-1 py-0.5 rounded border border-white/10 font-bold">Space</kbd> Lật
              <kbd className="bg-white/10 px-1 py-0.5 rounded border border-white/10 font-bold">← / →</kbd> Trước/Sau
              <kbd className="bg-white/10 px-1 py-0.5 rounded border border-white/10 font-bold">R</kbd> Đã thuộc
              <kbd className="bg-white/10 px-1 py-0.5 rounded border border-white/10 font-bold">S</kbd> Phát âm
            </div>
          </div>
        </section>
      ) : null}
      
      {!isLoading && studyMode === "list" && displayedTerms.length > 0 ? (
        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {displayedTerms.map((term) => {
          const isMastered = masteredSet.has(term.id);
          return (
            <article key={term.id} className={`brse-section p-3.5 sm:p-4 transition hover:border-primary/30 hover:bg-surfaceHover/45 ${isMastered ? "border-matcha/30" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan">
                      {term.category}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-base font-bold text-ink truncate">{term.english}</h2>
                </div>
                <BookOpenText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              </div>

              <div className="mt-3 rounded-lg border border-[var(--brse-hairline-border)] bg-background/55 p-2.5">
                <p className="text-base font-bold text-ink">{term.japanese}</p>
                {term.kana ? <p className="mt-0.5 text-[11px] text-textMuted">{term.kana}</p> : null}
                <p className="mt-1.5 text-xs font-semibold text-matcha">{term.vietnamese}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => speakTerm(term.id, term.english, "en-US")}
                  className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${
                    speakingKey === `${term.id}:en-US`
                      ? "border-cyan/50 bg-cyan/15 text-cyan"
                      : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-cyan/35 hover:text-cyan"
                  }`}
                >
                  <Volume2 className="h-3 w-3" aria-hidden="true" />
                  {t("glossary.enVoice")}
                </button>
                <button
                  type="button"
                  onClick={() => speakTerm(term.id, term.japanese, "ja-JP")}
                  className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${
                    speakingKey === `${term.id}:ja-JP`
                      ? "border-cyan/50 bg-cyan/15 text-cyan"
                      : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-cyan/35 hover:text-cyan"
                  }`}
                >
                  <Volume2 className="h-3 w-3" aria-hidden="true" />
                  {t("glossary.jpVoice")}
                </button>
                <button
                  type="button"
                  onClick={() => toggleMastered(term.id)}
                  className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${
                    isMastered
                      ? "border-matcha/40 bg-matcha/15 text-matcha"
                      : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-matcha/35 hover:text-matcha"
                  }`}
                >
                  <CheckCheck className="h-3 w-3" aria-hidden="true" />
                  {isMastered ? t("glossary.remembered") : t("glossary.markRemembered")}
                </button>
              </div>

              {term.note && <p className="mt-2.5 text-xs leading-relaxed text-textMuted">{term.note}</p>}
              {term.example && (
                <p className="mt-2 rounded-md border border-cyan/20 bg-cyan/10 p-2 text-xs leading-relaxed text-cyan">{term.example}</p>
              )}

              <div className="mt-2.5 flex flex-wrap gap-1">
                {term.roles.map((item) => (
                  <span key={item} className="rounded border border-[var(--brse-hairline-border)] bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-textMuted">
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
