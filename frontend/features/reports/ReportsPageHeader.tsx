"use client";

import { Sparkles, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ReportLanguage, reportLanguageNames } from "./useReportsState";
import { type ProjectSetting } from "@/lib/projectSettings";

interface ReportsPageHeaderProps {
  t: any;
  analytics: any;
  activeTab: "daily" | "weekly" | "monthly";
  setActiveTab: (tab: "daily" | "weekly" | "monthly") => void;
  fillFromLiveData: () => void;
  reportLanguage: ReportLanguage;
  setReportLanguage: (language: ReportLanguage) => void;
  projectMemory: any;
  projectExecutionWarnings: any[];
}

export function ReportsPageHeader({
  t,
  analytics,
  activeTab,
  setActiveTab,
  fillFromLiveData,
  reportLanguage,
  setReportLanguage,
  projectMemory,
  projectExecutionWarnings,
}: ReportsPageHeaderProps) {
  return (
    <PageHeader
      compact
      badge="Operations"
      title={t("reports.title")}
      className="mb-2.5"
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-lg border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            Todo {analytics.todoProgress}%
          </span>
          <span className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-xs font-bold text-amber-300">
            Q&A {analytics.waitingQna}
          </span>
          <span className="rounded-lg border border-cyan/25 bg-cyan/10 px-2 py-0.5 text-xs font-bold text-cyan">
            CR {analytics.pendingCr}
          </span>
          <span className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-300">
            Risk {analytics.overdueOps + analytics.openBugs}
          </span>
        </div>
      }
      toolbar={
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(["daily", "weekly", "monthly"] as const).map((tab) => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === tab
                      ? "border-primary/40 bg-primary/20 text-primary shadow-sm shadow-primary/20"
                      : "border-[var(--brse-panel-border)] bg-surface text-textMuted hover:text-ink hover:border-primary/30"
                  }`}
                >
                  {tab === "daily" ? t("reports.daily") : tab === "weekly" ? t("reports.weekly") : "Monthly"}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fillFromLiveData}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-primary/20 transition hover:bg-primaryHover active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t("reports.fillLive")}
              </button>
              <label className="field-control inline-flex items-center gap-1.5 py-1 px-2.5 text-xs">
                <span className="text-textMuted">{t("reports.previewLanguage")}:</span>
                <select
                  value={reportLanguage}
                  onChange={(event) => setReportLanguage(event.target.value as ReportLanguage)}
                  className="bg-transparent text-xs font-bold text-textPrimary focus:outline-none cursor-pointer"
                >
                  {(Object.keys(reportLanguageNames) as ReportLanguage[]).map((language) => (
                    <option key={language} value={language} className="bg-surface text-ink">{reportLanguageNames[language]}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
            {projectMemory.hasMemory ? (
              <div className="mt-3 rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Customer memory</p>
                <div className="mt-2 grid gap-1 text-ink/80">
                  {projectMemory.customerStyle ? <p><span className="font-semibold text-ink">Style:</span> {projectMemory.customerStyle}</p> : null}
                  {projectMemory.reportRule ? <p><span className="font-semibold text-ink">Report rule:</span> {projectMemory.reportRule}</p> : null}
                  {projectMemory.timezoneRule ? <p><span className="font-semibold text-ink">Timezone rule:</span> {projectMemory.timezoneRule}</p> : null}
                  {projectMemory.communicationNotes ? <p><span className="font-semibold text-ink">Notes:</span> {projectMemory.communicationNotes}</p> : null}
                </div>
              </div>
            ) : null}
            {projectExecutionWarnings.length ? (
              <div className="mt-3 grid gap-2">
                {projectExecutionWarnings.map((warning) => (
                  <div
                    key={warning.id}
                    className={`flex gap-2 rounded-md border px-4 py-3 text-sm ${
                      warning.tone === "danger"
                        ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
                        : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                    }`}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">{warning.title}</p>
                      <p className="mt-1 text-xs leading-5 opacity-90">{warning.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
      }
    />
  );
}
