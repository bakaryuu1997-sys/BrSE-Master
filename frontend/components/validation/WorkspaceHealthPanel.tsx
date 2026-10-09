"use client";

import { AlertTriangle, CheckCircle2, Database, Globe } from "lucide-react";
import type { DeepHealth } from "@/lib/validationHelpers";
import { useUiLanguage } from "@/components/LanguageProvider";

interface WorkspaceHealthPanelProps {
  deepHealth: DeepHealth | null;
  deepHealthError: string;
}

export function WorkspaceHealthPanel({ deepHealth, deepHealthError }: WorkspaceHealthPanelProps) {
  const { t } = useUiLanguage();
  const deepWarnings = deepHealth?.warnings ?? [];
  const jobs = deepHealth?.meeting_jobs;
  const glossary = deepHealth?.glossary_health;
  const tableCounts = deepHealth?.database?.table_counts ?? {};

  return (
    <section className="mt-5 brse-section p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="brse-label">{t("health.workspaceAndDb")}</p>
          <h2 className="mt-1 text-xl font-black text-ink">{t("health.workspaceDbTitle")}</h2>
          <p className="mt-1 max-w-3xl text-sm text-textMuted">
            {t("health.workspaceDbDesc")}
          </p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
          deepHealth?.status === "ok"
            ? "border-[var(--brse-hairline-border)] bg-matcha/10 text-matcha"
            : deepHealth
            ? "border-[var(--brse-hairline-border)] bg-gold/10 text-gold"
            : "border-[var(--brse-hairline-border)] bg-vermilion/10 text-vermilion"
        }`}>
          {deepHealth ? deepHealth.status : "Unavailable"}
        </div>
      </div>

      {deepHealthError ? (
        <div className="mt-4 rounded-xl border border-[var(--brse-hairline-border)] bg-vermilion/10 p-4 text-sm text-vermilion">
          {t("health.deepHealthUnresponsive")}{deepHealthError}
        </div>
      ) : null}

      {deepWarnings.length ? (
        <div className="mt-4 grid gap-2">
          {deepWarnings.map((warning) => (
            <div key={warning} className="flex items-center gap-2 rounded-xl border border-[var(--brse-hairline-border)] bg-gold/10 px-3 py-2 text-sm text-gold">
              <AlertTriangle className="h-4 w-4" />
              {warning}
            </div>
          ))}
        </div>
      ) : deepHealth ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--brse-hairline-border)] bg-matcha/10 px-3 py-2 text-sm text-matcha">
          <CheckCircle2 className="h-4 w-4" />
          {t("health.deepHealthNoWarnings")}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* DB table counts */}
        <div className="rounded-2xl border border-[var(--brse-hairline-border)] bg-background/35 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-bold text-ink">{t("health.dbRecords")}</p>
              <span className="rounded-full bg-cyan/10 px-2 py-1 text-[10px] font-black uppercase text-cyan">{deepHealth?.database?.dialect ?? "unknown"}</span>
            </div>
            <div className="grid gap-2 grid-cols-2">
              {Object.entries(tableCounts).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2 transition-transform duration-300 hover:scale-[1.02]">
                  <p className="text-[9px] font-black uppercase tracking-[0.08em] text-textMuted">{key.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-lg font-black text-ink">{value ?? "N/A"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meeting queue phases */}
        <div className="rounded-2xl border border-[var(--brse-hairline-border)] bg-background/35 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-bold text-ink">{t("health.meetingQueueProgress")}</p>
              <Database className="h-4 w-4 text-gold" />
            </div>
            <div className="grid gap-2">
              {Object.entries(jobs?.by_phase ?? {}).length ? Object.entries(jobs?.by_phase ?? {}).map(([phase, count]) => (
                <div key={phase} className="flex items-center justify-between rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2">
                  <span className="text-xs font-bold text-textMuted">{phase}</span>
                  <span className="text-sm font-black text-ink">{count}</span>
                </div>
              )) : (
                <p className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-4 text-center text-xs text-textMuted italic">
                  {t("health.noMeetingJobs")}
                </p>
              )}
            </div>
          </div>
          {jobs?.active_count !== undefined && (
            <div className="mt-3 pt-2 border-t border-[var(--brse-hairline-border)] flex items-center justify-between text-xs text-textMuted">
              <span>{t("health.processing")}<b>{jobs.active_count}</b></span>
              <span>{t("health.failed")}<b>{jobs.failed_with_error ?? 0}</b></span>
            </div>
          )}
        </div>

        {/* Glossary Analytics */}
        <div className="rounded-2xl border border-[var(--brse-hairline-border)] bg-background/35 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-bold text-ink">{t("health.glossaryMetrics")}</p>
              <Globe className="h-4 w-4 text-cyan" />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2">
                <span className="text-xs font-bold text-textMuted">{t("health.totalTerms")}</span>
                <span className="text-sm font-black text-ink">{glossary?.total_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2">
                <span className="text-xs font-bold text-textMuted">{t("health.pendingAuto")}</span>
                <span className={`text-sm font-black ${glossary?.auto_extracted_count ? 'text-gold' : 'text-ink'}`}>
                  {glossary?.auto_extracted_count ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2">
                <span className="text-xs font-bold text-textMuted">{t("health.potentialDuplicates")}</span>
                <span className={`text-sm font-black ${glossary?.potential_duplicates ? 'text-vermilion' : 'text-ink'}`}>
                  {glossary?.potential_duplicates ?? 0}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-textMuted italic leading-tight pt-2 border-t border-[var(--brse-hairline-border)]">
            {t("health.glossaryReviewHint")}
          </div>
        </div>
      </div>
    </section>
  );
}
