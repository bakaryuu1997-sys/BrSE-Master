"use client";

import { TrendingUp, Clipboard, CheckSquare, Calendar } from "lucide-react";
import { type ReportRecord } from "@/lib/reports";
import { formatDateLabel, parseTasksDone, bulletLines } from "./useReportsState";

interface ReportsWeeklyBuilderProps {
  t: any;
  language: string;
  activeTab: "weekly" | "monthly";
  setActiveTab: (tab: "daily" | "weekly" | "monthly") => void;
  weekStart: string;
  weekEnd: string;
  weekRecords: ReportRecord[];
  weeklyText: string;
  copied: boolean;
  copyToClipboard: (text: string) => void;
  openEmailDraft: (subject: string, body: string) => void;
  records: ReportRecord[];
  form: any;
  resetForm: () => void;
}

export function ReportsWeeklyBuilder({
  t,
  language,
  activeTab,
  setActiveTab,
  weekStart,
  weekEnd,
  weekRecords,
  weeklyText,
  copied,
  copyToClipboard,
  openEmailDraft,
  records,
  form,
  resetForm,
}: ReportsWeeklyBuilderProps) {
  if (activeTab === "weekly") {
    return (
      <div className="max-w-6xl space-y-6">
        <div className="rounded-xl border border-[var(--brse-panel-border)]/55 bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-semibold text-ink">{t("reports.thisWeek")}</h2>
                <p className="text-xs text-textMuted">
                  {weekStart} ~ {weekEnd} ({weekRecords.length} {t("reports.daysAggregated")})
                </p>
              </div>
            </div>
            <button
              id="copy-weekly-btn"
              onClick={() => copyToClipboard(weeklyText)}
              className="flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] px-3 py-2 text-sm font-semibold text-textMuted hover:text-ink hover:border-primary transition-colors"
            >
              <Clipboard className="h-4 w-4" />
              {copied ? t("reports.copied") : t("reports.oneClickCopy")}
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-md bg-background/60 p-4 text-xs text-ink leading-relaxed font-mono border border-[var(--brse-panel-border)]">
            {weeklyText}
          </pre>
        </div>

        {/* This week daily list */}
        {weekRecords.length > 0 && (
          <div className="rounded-xl border border-[var(--brse-panel-border)]/55 bg-surface overflow-hidden">
            <div className="border-b border-[var(--brse-panel-border)]/45 px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">{t("reports.weekDailyList")}</h3>
            </div>
            <ul className="divide-y divide-border">
              {weekRecords.map((r) => {
                let doneTasks: string[] = [];
                try {
                  doneTasks = JSON.parse(r.tasksDone || "[]");
                } catch {
                  doneTasks = [];
                }
                return (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-ink">
                        {formatDateLabel(r.reportDate, language)}
                      </p>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                        {r.progressPercent || "-"}
                      </span>
                    </div>
                    {doneTasks.length > 0 && (
                      <ul className="space-y-0.5">
                        {doneTasks.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-textMuted">
                            <CheckSquare className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Monthly logic
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = now.toISOString().slice(0, 10);
  const monthRecords = records.filter((r) => r.reportDate >= monthStart && r.reportDate <= monthEnd);
  const allDoneTasks = monthRecords.flatMap((r) => parseTasksDone(r.tasksDone));
  const allBlockers = monthRecords.map((r) => r.blockers).filter(Boolean);
  const avgProgress = monthRecords.length
    ? Math.round(monthRecords.reduce((s, r) => s + Number(r.progressPercent?.replace("%", "") || 0), 0) / monthRecords.length)
    : 0;
  const monthlyJpText = [
    `Monthly Report - ${monthStart.slice(0, 7)}`,
    "",
    `Project: ${form.projectName || "-"}`,
    `Owner: ${form.owner || "-"}`,
    `Period: ${monthStart} - ${monthEnd}`,
    "",
    "Summary",
    `- Daily reports: ${monthRecords.length}`,
    `- Tasks done: ${allDoneTasks.length}`,
    `- Average progress: ${avgProgress}%`,
    "",
    "Completed work",
    ...(allDoneTasks.slice(0, 10).map((task) => `- ${task}`)),
    allDoneTasks.length ? "" : "- No completed tasks recorded",
    "",
    "Blockers",
    ...(allBlockers.slice(0, 5).map((blocker) => `- ${blocker}`)),
    allBlockers.length ? "" : "- No blockers recorded",
    "",
    "Next month focus",
    "- Follow unanswered Q&A and pending CR decisions first.",
    "- Reduce deadline risk and keep customer communication proactive.",
  ].filter(Boolean).join("\n");

  return (
    <div className="max-w-5xl space-y-6">
      {/* Monthly Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Daily Reports", value: monthRecords.length, icon: "DR" },
          { label: "Tasks Done", value: allDoneTasks.length, icon: "OK" },
          { label: "Avg Progress", value: `${avgProgress}%`, icon: "%" },
          { label: "Blockers", value: allBlockers.length, icon: "BL" },
        ].map((stat) => (
          <div key={stat.label} className="brse-card p-5 text-center">
            <p className="text-2xl">{stat.icon}</p>
            <p className="mt-2 text-xl font-black text-textPrimary">{stat.value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-textMuted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly JP Report */}
      <div className="brse-section p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Monthly Report</p>
            <h2 className="mt-1 text-lg font-black text-textPrimary">
              {t("reports.monthlyReportTitle")} {now.getMonth() + 1}/{now.getFullYear()}
            </h2>
            <p className="mt-1 text-sm text-textMuted">{monthStart} - {monthEnd} / {monthRecords.length} {t("reports.reportDays")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => copyToClipboard(monthlyJpText)}
              className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/20"
            >
              <Clipboard className="h-4 w-4" />
              {copied ? t("keigo.copied") : t("reports.copyJpReport")}
            </button>
            <button
              type="button"
              onClick={() => openEmailDraft(`【月次報告】${form.projectName || ""} ${monthStart.slice(0, 7)}`, monthlyJpText)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primaryHover"
            >
              Gmail
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/40 p-4">
          <pre className="whitespace-pre-wrap text-sm leading-7 text-textPrimary font-sans">{monthlyJpText}</pre>
        </div>
      </div>

      {/* Done Tasks List */}
      {allDoneTasks.length > 0 && (
        <div className="brse-section p-5">
          <h3 className="mb-4 text-sm font-black text-textPrimary">
            {t("reports.allDoneTasksMonthly")} ({allDoneTasks.length})
          </h3>
          <ul className="grid gap-1.5 md:grid-cols-2">
            {allDoneTasks.map((task, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] px-3 py-2 text-xs text-textMuted">
                <CheckSquare className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                {task}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No data state */}
      {monthRecords.length === 0 && (
        <div className="brse-card brse-card-muted flex flex-col items-center gap-4 py-16 text-center">
          <Calendar className="h-12 w-12 text-textMuted/30" />
          <div>
            <p className="text-base font-bold text-textPrimary">{t("reports.noMonthlyReports")}</p>
            <p className="mt-1 text-sm text-textMuted">{t("reports.noMonthlyReportsHint")}</p>
          </div>
          <button onClick={() => setActiveTab("daily")} className="brse-button brse-button-primary px-5 py-2 text-sm">
            {t("reports.createDailyReport")}
          </button>
        </div>
      )}
    </div>
  );
}
