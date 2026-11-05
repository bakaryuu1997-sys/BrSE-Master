"use client";

import Link from "next/link";
import { Zap, Send, AlertTriangle, ZapOff, Activity, Check, Clock, X, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrseTodoItem } from "@/lib/brseTodo";
import type { MeetingTodoDraft } from "@/lib/commandCenter";
import type { OperationRecord } from "@/lib/operations";
import type { TranslationKey } from "@/lib/uiLanguage";
import { ProjectHealthChart } from "./ProjectHealthChart";

export type DashboardPriorityItem =
  | DashboardPriorityBaseItem<"todo" | "deadline", BrseTodoItem>
  | DashboardPriorityBaseItem<"qna" | "cr", OperationRecord>
  | DashboardPriorityBaseItem<"meeting", MeetingTodoDraft>
  | DashboardPriorityBaseItem<"project" | "release">;

interface DashboardPriorityBaseItem<Kind extends string, OriginalItem = undefined> {
  id: string;
  title: string;
  helper: string;
  href: string;
  kind: Kind;
  severity: number;
  originalItem: OriginalItem;
  projectName?: string;
}

interface CommandIntelligenceBoardProps {
  priorityFocus: DashboardPriorityItem | null;
  priorityStack: DashboardPriorityItem[];
  todoPercent: number;
  qnaCount: number;
  crCount: number;
  overdueCount: number;
  t: (key: TranslationKey) => string;
  onCopyHorenso: () => void;
  onMarkTodoDone?: (item: BrseTodoItem) => void;
  onSnoozeTodo?: (item: BrseTodoItem) => void;
  onApproveMeetingDraft?: (id: string) => void;
  onRejectMeetingDraft?: (id: string) => void;
  onMarkQnaReplied?: (record: OperationRecord) => void;
}

export function CommandIntelligenceBoard({
  priorityFocus,
  priorityStack,
  todoPercent,
  qnaCount,
  crCount,
  overdueCount,
  t,
  onCopyHorenso,
  onMarkTodoDone,
  onSnoozeTodo,
  onApproveMeetingDraft,
  onRejectMeetingDraft,
  onMarkQnaReplied,
}: CommandIntelligenceBoardProps) {
  return (
    <section className="brse-section overflow-hidden p-0 shadow-lg">
      <div className="flex flex-col md:flex-row">
        {/* Left Side: Priority Focus */}
        <div className="flex-1 p-5 lg:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-glow-sm">
                <Zap className="h-3.5 w-3.5 fill-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                {t("dashboard.commandIntelligence")}
              </span>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase text-primary">
                Priority Focus
              </span>
            </div>
            {priorityFocus?.projectName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-black text-sky-300 shadow-sm">
                <Briefcase className="h-3 w-3 text-sky-400" />
                <span>{priorityFocus.projectName}</span>
              </span>
            )}
          </div>

          {priorityFocus ? (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                      priorityFocus.kind === "deadline"
                        ? "bg-rose/10 text-rose border-rose/30"
                        : priorityFocus.kind === "qna"
                          ? "bg-amber/10 text-amber border-amber/30"
                          : priorityFocus.kind === "meeting"
                            ? "bg-purple/10 text-purple border-purple/30"
                            : "bg-primary/10 text-primary border-primary/30"
                    )}
                  >
                    {priorityFocus.kind}
                  </span>
                  <h2 className="line-clamp-3 break-words text-lg font-black text-textPrimary leading-snug tracking-tight sm:text-xl lg:text-2xl">
                    {priorityFocus.title}
                  </h2>
                </div>
                <p className="text-xs text-textMuted font-bold flex items-center gap-2 mt-1">
                  <Activity className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>{priorityFocus.helper}</span>
                </p>
              </div>

              {/* Compact, Sleek Action Bar */}
              <div className="flex flex-wrap gap-2.5 items-center pt-2">
                {priorityFocus.kind === "deadline" && priorityFocus.originalItem && (
                  <>
                    <button
                      onClick={() => onMarkTodoDone?.(priorityFocus.originalItem)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-500 transition active:scale-95 shadow-sm"
                      title={t("dashboard.completeTaskTitle")}
                    >
                      <Check className="h-4 w-4" />
                      <span>{t("dashboard.doneNow")}</span>
                    </button>
                    <button
                      onClick={() => onSnoozeTodo?.(priorityFocus.originalItem)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--brse-panel-border)] bg-slate-900/60 px-3.5 text-xs font-bold text-textPrimary hover:bg-slate-800 transition active:scale-95"
                      title={t("dashboard.snoozeOneDay")}
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-300" />
                      <span>{t("dashboard.snoozeOneDay")}</span>
                    </button>
                  </>
                )}

                {priorityFocus.kind === "meeting" && priorityFocus.originalItem && (
                  <>
                    <button
                      onClick={() => onApproveMeetingDraft?.(priorityFocus.originalItem.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-500 transition active:scale-95 shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>{t("dashboard.approveTodo")}</span>
                    </button>
                    <button
                      onClick={() => onRejectMeetingDraft?.(priorityFocus.originalItem.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition active:scale-95"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>{t("dashboard.reject")}</span>
                    </button>
                  </>
                )}

                {priorityFocus.kind === "qna" && priorityFocus.originalItem && (
                  <button
                    onClick={() => onMarkQnaReplied?.(priorityFocus.originalItem)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-orange-600 px-4 text-xs font-black text-white hover:bg-orange-500 transition active:scale-95 shadow-sm"
                  >
                    <Check className="h-4 w-4" />
                    <span>{t("dashboard.markReplied")}</span>
                  </button>
                )}

                <button
                  onClick={onCopyHorenso}
                  className="group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl bg-primary px-4 text-xs font-black text-white transition-all hover:bg-primary/90 active:scale-95 shadow-glow-indigo"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{t("dashboard.copyHorenso")}</span>
                </button>

                <Link
                  href={priorityFocus.href}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-danger px-4 text-xs font-black text-white transition-all hover:bg-danger/90 active:scale-95 shadow-sm"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-white" />
                  <span>{t("dashboard.handleRisk")}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-background/35 p-5 ring-1 ring-border/25">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ZapOff className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-bold text-textPrimary">{t("dashboard.noHotspots")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-textMuted">{t("dashboard.prepareGoodTime")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/app/minutes/new" className="brse-button brse-button-primary h-8 px-3 text-xs">
                      {t("dashboard.createMinutes")}
                    </Link>
                    <Link href="/app/brse-todo" className="brse-button h-8 px-3 text-xs">
                      {t("dashboard.viewBacklog")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Priority Stack with Project Badges & Health Chart */}
        <div className="w-full border-t border-[var(--brse-panel-border)] bg-[var(--brse-panel-bg)] p-5 md:w-80 md:border-l md:border-t-0 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted/70">
              {t("dashboard.priorityStack")}
            </h4>
            <span className="text-[9px] font-bold text-textMuted/50">Top {priorityStack.length}</span>
          </div>

          {/* Mini Project Health Chart */}
          <div className="mb-4 rounded-xl border border-[var(--brse-panel-border)] bg-background/30 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-textMuted">
              {t("dashboard.projectHealth")}
            </p>
            <ProjectHealthChart
              todoPercent={todoPercent}
              qnaCount={qnaCount}
              crCount={crCount}
              overdueCount={overdueCount}
            />
          </div>

          <div className="space-y-3">
            {priorityStack.map((item) => (
              <Link key={item.id} href={item.href} className="group block rounded-lg p-1.5 transition-colors hover:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={cn(
                      "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      item.kind === "deadline"
                        ? "bg-rose/10 text-rose border-rose/30"
                        : item.kind === "qna"
                          ? "bg-amber/10 text-amber border-amber/30"
                          : item.kind === "meeting"
                            ? "bg-purple/10 text-purple border-purple/30"
                            : "bg-primary/10 text-primary border-primary/30"
                    )}
                  >
                    {item.kind}
                  </span>
                  {item.projectName && (
                    <span className="truncate max-w-[140px] text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                      {item.projectName}
                    </span>
                  )}
                </div>
                <p className="text-xs font-black text-textPrimary group-hover:text-primary transition-all truncate leading-tight group-hover:translate-x-0.5">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[10px] text-textMuted truncate">
                  {item.helper}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
