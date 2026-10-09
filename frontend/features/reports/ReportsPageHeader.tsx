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
      badge="Operations"
      title={t("reports.title")}
      description={t("reports.body")}
      stats={[
        { label: "Todo", value: `${analytics.todoProgress}%` },
        { label: "Q&A waiting", value: analytics.waitingQna, variant: "warning" },
        { label: "CR pending", value: analytics.pendingCr, variant: "primary" },
        { label: "Risk", value: analytics.overdueOps + analytics.openBugs, variant: "danger" },
      ]}
      toolbar={
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map((tab) => (
              <button
                key={tab}
                id={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`brse-tab px-4 py-2 text-sm font-semibold ${activeTab === tab ? "brse-tab-active" : ""}`}
              >
                {tab === "daily" ? t("reports.daily") : tab === "weekly" ? t("reports.weekly") : "Monthly"}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fillFromLiveData}
                className="brse-button brse-button-primary px-4 py-2 text-sm"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {t("reports.fillLive")}
              </button>
              <label className="brse-chip gap-2 rounded-md px-3 py-2 text-sm">
                {t("reports.previewLanguage")}
                <select
                  value={reportLanguage}
                  onChange={(event) => setReportLanguage(event.target.value as ReportLanguage)}
                  className="field-control min-h-0 px-2 py-1 text-xs"
                >
                  {(Object.keys(reportLanguageNames) as ReportLanguage[]).map((language) => (
                    <option key={language} value={language}>{reportLanguageNames[language]}</option>
                  ))}
                </select>
              </label>
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
        </div>
      }
    >
      <div className="scene-art hidden lg:block">
        <div className="scene-panel right-8 top-8 w-60 p-4">
          <span className="scene-kicker">Report forge</span>
          <div className="mt-4 grid grid-cols-5 items-end gap-2">
            {[24, 40, 34, 58, 46].map((height) => (
              <span
                key={height}
                className="rounded-t-full bg-[linear-gradient(180deg,rgba(255,138,125,0.92),rgba(255,180,84,0.34))]"
                style={{ height }}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">
            <span>Daily</span>
            <span>Weekly</span>
          </div>
        </div>
        <div className="scene-card-stack right-56 top-24 h-28 w-44 -rotate-6 opacity-75" />
        <div className="scene-card-stack right-48 top-16 h-28 w-44 rotate-6 opacity-90" />
      </div>
    </PageHeader>
  );
}
