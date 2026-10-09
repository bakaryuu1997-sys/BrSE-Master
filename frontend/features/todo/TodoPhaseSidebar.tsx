"use client";

type PhaseStat = {
  phase: string;
  progress: number;
  done: number;
  total: number;
};

interface TodoPhaseSidebarProps {
  t: any;
  activePhase: string;
  phaseListRef: any;
  phaseButtonRefs: any;
  phaseStats: PhaseStat[];
  selectPhase: (phase: string) => void;
}

export function TodoPhaseSidebar({
  t,
  activePhase,
  phaseListRef,
  phaseButtonRefs,
  phaseStats,
  selectPhase,
}: TodoPhaseSidebarProps) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:self-start">
      <div className="brse-section flex h-full flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{t("todo.phaseProgress")}</h2>
          <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            {phaseStats.length} phase
          </span>
        </div>
        <div ref={phaseListRef} className="mt-4 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
          {phaseStats.map((stat) => (
            <button
              key={stat.phase}
              ref={(node) => {
                if (phaseButtonRefs.current) {
                  phaseButtonRefs.current[stat.phase] = node;
                }
              }}
              onClick={() => selectPhase(stat.phase)}
              className={`grid gap-2 rounded-lg border p-2.5 text-left transition ${
                activePhase === stat.phase
                  ? "border-primary/45 bg-primary/10"
                  : "border-[var(--brse-panel-border)] bg-background/60 hover:border-primary/35"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink">{stat.phase}</span>
                <span className="text-sm font-semibold text-primary">{stat.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary" style={{ width: `${stat.progress}%` }} />
              </div>
              <p className="text-xs text-textMuted">
                {stat.done}/{stat.total} {t("todo.doneItems")}
              </p>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
