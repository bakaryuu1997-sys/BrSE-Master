"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import type { ProjectSetting } from "@/lib/projectSettings";
import type { TranslationKey } from "@/lib/uiLanguage";

type ProjectOverviewItem = {
  project: ProjectSetting;
  health: string;
  healthRank: number;
  phase: string;
  milestone: string;
  isActive: boolean;
};

function healthRank(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "red") return 0;
  if (normalized === "yellow") return 1;
  if (normalized === "green") return 2;
  return 3;
}

export function buildProjectOverviewItems(projects: ProjectSetting[], activeProjectId?: string): ProjectOverviewItem[] {
  return projects
    .map((project) => {
      const health = project.health_status || "Green";
      return {
        project,
        health,
        healthRank: healthRank(health),
        phase: project.current_phase || "No phase",
        milestone: project.next_milestone_date || "No milestone",
        isActive: Boolean(activeProjectId && project.id === activeProjectId),
      };
    })
    .sort((first, second) => {
      if (first.healthRank !== second.healthRank) return first.healthRank - second.healthRank;
      if (first.isActive !== second.isActive) return first.isActive ? -1 : 1;
      return first.project.name.localeCompare(second.project.name);
    });
}

function healthTone(health: string) {
  const normalized = health.trim().toLowerCase();
  if (normalized === "red") {
    return {
      icon: AlertTriangle,
      labelClass: "border-rose-500/30 bg-rose-500/10 text-rose-200",
      cardClass: "border-rose-500/25 bg-rose-500/[0.06]",
    };
  }
  if (normalized === "yellow") {
    return {
      icon: Circle,
      labelClass: "border-amber-400/30 bg-amber-400/10 text-amber-100",
      cardClass: "border-amber-400/25 bg-amber-400/[0.06]",
    };
  }
  return {
    icon: CheckCircle2,
    labelClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    cardClass: "border-[var(--brse-panel-border)] bg-background/45",
  };
}

export function ProjectOverviewPanel({
  projects,
  activeProjectId,
  t,
}: {
  projects: ProjectSetting[];
  activeProjectId?: string;
  t: (key: TranslationKey) => string;
}) {
  const items = buildProjectOverviewItems(projects, activeProjectId).slice(0, 6);

  if (!items.length) {
    return null;
  }

  const redCount = items.filter((item) => item.health.trim().toLowerCase() === "red").length;
  const yellowCount = items.filter((item) => item.health.trim().toLowerCase() === "yellow").length;

  return (
    <section className="brse-section p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">{t("dashboard.multiProjectOverview")}</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">{t("dashboard.projectHealthCockpit")}</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-rose-200">{t("dashboard.red")} {redCount}</span>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-amber-100">{t("dashboard.yellow")} {yellowCount}</span>
          <Link href="/app/settings/projects" className="brse-button h-8 px-3 text-xs">
            {t("dashboard.settings")}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const tone = healthTone(item.health);
          const Icon = tone.icon;
          return (
            <article key={item.project.id} className={`brse-card p-4 ${tone.cardClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-black text-ink">{item.project.name || item.project.customer_name || t("dashboard.untitledProject")}</h3>
                    {item.isActive ? (
                      <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">{t("dashboard.active")}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-textMuted">{item.project.customer_name || t("dashboard.noCustomer")}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${tone.labelClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.health}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-[var(--brse-panel-border)] bg-background/45 px-3 py-2">
                  <p className="text-textMuted">{t("dashboard.phase")}</p>
                  <p className="mt-1 truncate font-semibold text-ink">{item.phase === "No phase" ? t("dashboard.noPhase") : item.phase}</p>
                </div>
                <div className="rounded-md border border-[var(--brse-panel-border)] bg-background/45 px-3 py-2">
                  <p className="text-textMuted">{t("dashboard.milestone")}</p>
                  <p className="mt-1 truncate font-semibold text-ink">{item.milestone === "No milestone" ? t("dashboard.noMilestone") : item.milestone}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
