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
    <aside className="lg:sticky lg:top-3 lg:self-start">
      <div className="brse-section flex flex-col p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--brse-panel-border)]/50 mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{t("todo.phaseProgress")}</h2>
          <span className="rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
            {phaseStats.length} phase
          </span>
        </div>
        <div ref={phaseListRef} className="grid content-start gap-1">
          {phaseStats.map((stat) => {
            const isActive = activePhase === stat.phase;
            const isCompleted = stat.progress === 100;
            return (
              <button
                key={stat.phase}
                ref={(node) => {
                  if (phaseButtonRefs.current) {
                    phaseButtonRefs.current[stat.phase] = node;
                  }
                }}
                onClick={() => selectPhase(stat.phase)}
                className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/35 shadow-sm font-semibold"
                    : "bg-surface/20 text-ink/80 border border-transparent hover:bg-surface/50 hover:text-ink hover:border-[var(--brse-panel-border)]"
                }`}
              >
                <span className="truncate text-xs mr-2">{stat.phase}</span>
                <span className="shrink-0 flex items-center gap-1.5 text-[11px]">
                  <span className="text-[10px] text-textMuted font-normal">
                    {stat.done}/{stat.total}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      isCompleted ? "text-success" : isActive ? "text-primary" : "text-textMuted"
                    }`}
                  >
                    {stat.progress}%
                  </span>
                </span>
                {/* 2px bottom micro progress bar */}
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-border/40 overflow-hidden">
                  <span
                    className={`block h-full transition-all duration-300 ${isCompleted ? "bg-success" : "bg-primary"}`}
                    style={{ width: `${stat.progress}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
