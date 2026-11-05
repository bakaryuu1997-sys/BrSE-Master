"use client";

import Link from "next/link";
import { FolderKanban, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrseTodoProjectStat } from "@/lib/brseTodo";
import type { ProjectSetting } from "@/lib/projectSettings";
import type { TranslationKey } from "@/lib/uiLanguage";

interface PortfolioProgressStripProps {
  projectStats: BrseTodoProjectStat[];
  projects: ProjectSetting[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  t: (key: TranslationKey) => string;
}

export function PortfolioProgressStrip({
  projectStats,
  projects,
  selectedProjectId,
  onSelectProject,
  t,
}: PortfolioProgressStripProps) {
  if (!projectStats.length) return null;

  return (
    <section className="brse-section p-3.5 sm:p-4">
      {/* Header & Filter Pills */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderKanban className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-textPrimary">
            {t("dashboard.portfolioProgress")}
          </span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-textMuted">
            {projectStats.length} {t("dashboard.activeProjects")}
          </span>
        </div>

        {/* Project Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onSelectProject("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-black transition-all",
              selectedProjectId === "all"
                ? "bg-primary text-white shadow-glow-sm"
                : "border border-[var(--brse-panel-border)] bg-white/[0.02] text-textMuted hover:border-primary/30 hover:text-textPrimary"
            )}
          >
            🌐 {t("dashboard.allProjects")}
          </button>
          {projectStats.map((p) => {
            const isSelected = selectedProjectId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-black transition-all",
                  isSelected
                    ? "bg-primary text-white shadow-glow-sm"
                    : "border border-[var(--brse-panel-border)] bg-white/[0.02] text-textMuted hover:border-primary/30 hover:text-textPrimary"
                )}
              >
                {p.name}
                <span className="ml-1.5 text-[10px] opacity-75">{p.percent}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parallel Projects Progress Grid */}
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projectStats.map((stat) => {
          const isSelected = selectedProjectId === stat.id;
          const matchingSetting = projects.find((p) => p.id === stat.id);
          const health = matchingSetting?.health_status?.toLowerCase() || "green";

          return (
            <div
              key={stat.id}
              onClick={() => onSelectProject(isSelected ? "all" : stat.id)}
              className={cn(
                "group relative cursor-pointer rounded-xl border p-3 transition-all duration-200",
                isSelected
                  ? "border-primary/50 bg-primary/[0.08] ring-1 ring-primary/40 shadow-glow-sm"
                  : stat.percent === 100
                    ? "border-emerald-500/30 bg-emerald-500/[0.04] shadow-[0_0_15px_rgba(16,185,129,0.08)] hover:border-emerald-500/50"
                    : "border-[var(--brse-panel-border)] bg-background/40 hover:border-primary/30 hover:bg-white/[0.03]"
              )}
            >
              {/* Top Row: Health & Title & Jump to Todo */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      stat.percent === 100
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                        : health === "red"
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                          : health === "yellow"
                            ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                            : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    )}
                    title={`Health: ${health}`}
                  />
                  <h4 className="truncate text-xs font-black text-textPrimary group-hover:text-primary transition-colors">
                    {stat.name}
                  </h4>
                  {stat.percent === 100 && (
                    <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-0.2 text-[8px] font-black uppercase text-emerald-300 border border-emerald-500/30">
                      100% Done
                    </span>
                  )}
                </div>
                <Link
                  href={`/app/brse-todo?projectId=${encodeURIComponent(stat.id)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded p-1 text-textMuted hover:bg-white/[0.08] hover:text-primary transition-colors"
                  title="Mở BrSE Todo List"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Phase Badge */}
              <div className="mb-2.5">
                <span className={cn(
                  "inline-block truncate max-w-full rounded px-1.5 py-0.5 text-[10px] font-bold",
                  stat.percent === 100
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    : "bg-white/[0.04] text-textMuted"
                )}>
                  {stat.percent === 100 ? "7. Closure & Handover (Hoàn tất)" : stat.activePhase}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    stat.percent === 100
                      ? "bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                      : "bg-gradient-to-r from-cyan via-primary to-primary"
                  )}
                  style={{ width: `${Math.min(100, stat.percent)}%` }}
                />
              </div>

              {/* Stats & Risk Footer */}
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-textPrimary">
                  {stat.percent}%{" "}
                  <span className="text-textMuted font-normal">
                    ({stat.done}/{stat.total})
                  </span>
                </span>
                {stat.deadlineRiskCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5 rounded border border-rose-500/25 bg-rose-500/10 px-1 py-0.2 text-[9px] font-black text-rose-300">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {stat.deadlineRiskCount} {t("dashboard.deadlineRiskBadge")}
                  </span>
                ) : stat.percent === 100 ? (
                  <span className="text-emerald-300 font-bold text-[9px] bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/25">
                    🎉 Go-Live Ready
                  </span>
                ) : (
                  <span className="text-emerald-400/80 font-medium text-[9px]">
                    ✓ On track
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
