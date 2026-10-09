import { useUiLanguage } from "@/components/LanguageProvider";

type KnowledgeInsightRailProps = {
  itemCount: number;
  categoryCount: number;
  backlinkCount: number;
  visibleItemCount: number;
  searchQuery: string;
  t: ReturnType<typeof useUiLanguage>["t"];
};

export function KnowledgeInsightRail({
  itemCount,
  categoryCount,
  backlinkCount,
  visibleItemCount,
  searchQuery,
  t,
}: KnowledgeInsightRailProps) {
  const trimmedSearchQuery = searchQuery.trim();

  return (
    <>
      <section className="scene-rail mt-6 grid gap-3 rounded-[24px] p-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--brse-panel-border)]/55 bg-background/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("knowledge.libDepth")}</p>
          <p className="mt-2 text-2xl font-black text-ink">{itemCount}</p>
          <p className="mt-1 text-xs text-textMuted">{t("knowledge.docsActive")}</p>
        </div>
        <div className="rounded-2xl border border-[var(--brse-panel-border)]/55 bg-background/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">{t("knowledge.clusters")}</p>
          <p className="mt-2 text-2xl font-black text-ink">{categoryCount}</p>
          <p className="mt-1 text-xs text-textMuted">{t("knowledge.existingClusters")}</p>
        </div>
        <div className="rounded-2xl border border-[var(--brse-panel-border)]/55 bg-background/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-matcha">{t("knowledge.linkedContext")}</p>
          <p className="mt-2 text-2xl font-black text-ink">{backlinkCount}</p>
          <p className="mt-1 text-xs text-textMuted">{t("knowledge.refsCaught")}</p>
        </div>
      </section>

      <section className="cinema-grid mt-4 grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr] lg:p-5">
        <div className="relative z-10 rounded-[22px] border border-cyan/15 bg-background/45 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">{t("knowledge.lens")}</p>
          <h2 className="mt-2 text-lg font-semibold text-ink">
            {trimmedSearchQuery ? t("knowledge.lensSearching").replace("{query}", trimmedSearchQuery) : t("knowledge.lensDefault")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-textMuted">
            {t("knowledge.lensDesc")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="scene-chip">{visibleItemCount} visible</span>
            <span className="scene-chip">{categoryCount} clusters</span>
            <span className="scene-chip">{backlinkCount} refs</span>
          </div>
        </div>
        <div className="relative z-10 grid gap-3 sm:grid-cols-2">
          <div className="scene-stat-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("knowledge.searchFocus")}</p>
            <p className="mt-3 text-3xl font-black text-ink">{trimmedSearchQuery ? "ON" : "OFF"}</p>
            <span className="scene-bar mt-4 w-4/5" />
          </div>
          <div className="scene-stat-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-matcha">{t("knowledge.refMesh")}</p>
            <p className="mt-3 text-3xl font-black text-ink">{backlinkCount}</p>
            <span className="scene-bar mt-4 w-2/3" />
          </div>
        </div>
      </section>
    </>
  );
}