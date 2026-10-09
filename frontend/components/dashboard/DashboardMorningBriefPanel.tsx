"use client";

import { useMemo, useState } from "react";
import { Bot, Copy, Loader2, Sparkles } from "lucide-react";
import { apiBaseUrl } from "@/lib/config";
import type { ProjectSetting } from "@/lib/projectSettings";
import { buildProjectAiContext } from "@/lib/projectAiContext";
import type { TranslationKey } from "@/lib/uiLanguage";
import {
  buildDashboardMorningBriefPrompt,
  buildFallbackMorningBrief,
  type DashboardMorningBriefFallbackLabels,
  type DashboardMorningBriefInput,
  type MorningBriefItem,
  type MorningBriefSchedule,
} from "@/components/dashboard/dashboardMorningBrief";

type DashboardMorningBriefPanelProps = {
  activeProject: ProjectSetting | null;
  focus: MorningBriefItem | null;
  priorityItems: MorningBriefItem[];
  todaySchedules: MorningBriefSchedule[];
  counts: DashboardMorningBriefInput["counts"];
  t: (key: TranslationKey) => string;
  onNotify?: (message: string, tone?: "success" | "warning" | "error") => void;
};

export function DashboardMorningBriefPanel({
  activeProject,
  focus,
  priorityItems,
  todaySchedules,
  counts,
  t,
  onNotify,
}: DashboardMorningBriefPanelProps) {
  const [brief, setBrief] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const input = useMemo<DashboardMorningBriefInput>(() => ({
    projectName: activeProject?.name,
    projectContext: buildProjectAiContext(activeProject),
    focus,
    priorityItems,
    todaySchedules,
    counts,
  }), [activeProject, counts, focus, priorityItems, todaySchedules]);

  const fallbackLabels = useMemo<DashboardMorningBriefFallbackLabels>(() => ({
    todoRisk: t("dashboard.fallbackTodoRisk"),
    qnaWaiting: t("dashboard.fallbackQnaWaiting"),
    crPending: t("dashboard.fallbackCrPending"),
    overdueOperation: t("dashboard.fallbackOverdueOperation"),
    meetingFollowUp: t("dashboard.fallbackMeetingFollowUp"),
    focusLabel: t("dashboard.fallbackFocusLabel"),
    riskLabel: t("dashboard.fallbackRiskLabel"),
    calendarLabel: t("dashboard.fallbackCalendarLabel"),
    noHotspot: t("dashboard.fallbackNoHotspot"),
    noVisibleRisk: t("dashboard.fallbackNoVisibleRisk"),
    noFixedSchedule: t("dashboard.fallbackNoFixedSchedule"),
  }), [t]);

  async function generateBrief() {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: buildDashboardMorningBriefPrompt(input) }),
      });
      if (!response.ok) throw new Error("AI brief failed");
      const data = (await response.json()) as { reply?: string };
      setBrief(data.reply?.trim() || buildFallbackMorningBrief(input, fallbackLabels));
      onNotify?.(t("dashboard.morningBriefGenerated"), "success");
    } catch {
      setBrief(buildFallbackMorningBrief(input, fallbackLabels));
      onNotify?.(t("dashboard.morningBriefFallbackNotice"), "warning");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyBrief() {
    if (!brief) return;
    await navigator.clipboard.writeText(brief);
    onNotify?.(t("dashboard.morningBriefCopied"), "success");
  }

  return (
    <section className="brse-section p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{t("dashboard.morningBrief")}</p>
          <h3 className="mt-1 text-sm font-black text-textPrimary">{t("dashboard.aiCockpitSummary")}</h3>
        </div>
        <Bot className="h-4 w-4 text-primary" />
      </div>

      <div className="space-y-3">
        <button onClick={generateBrief} disabled={isLoading} className="brse-button brse-button-primary w-full justify-center px-4 py-2 text-sm">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isLoading ? t("dashboard.generating") : t("dashboard.generateMorningBrief")}
        </button>

        {brief ? (
          <div className="brse-card-muted p-3">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-5 text-text">{brief}</pre>
            <button onClick={copyBrief} className="mt-3 flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-textMuted transition hover:text-textPrimary">
              <Copy className="h-3.5 w-3.5" />
              {t("dashboard.copy")}
            </button>
          </div>
        ) : (
          <p className="text-xs leading-5 text-textMuted">
            {t("dashboard.morningBriefHint")}
          </p>
        )}
      </div>
    </section>
  );
}
