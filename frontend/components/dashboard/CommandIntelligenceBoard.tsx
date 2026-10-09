"use client";

import Link from "next/link";
import { Zap, Send, AlertTriangle, ZapOff, Activity, Check, Clock, X } from "lucide-react";
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
  onMarkQnaReplied
}: CommandIntelligenceBoardProps) {
  return (
    <section className="brse-section overflow-hidden p-0">
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 p-8 lg:p-10">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-primary">{t("dashboard.commandIntelligence")}</h3>
          </div>

          {priorityFocus ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-black text-textPrimary leading-tight tracking-tight lg:text-4xl">{priorityFocus.title}</h2>
                <p className="mt-3 text-base text-textMuted font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" />
                  {priorityFocus.helper}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                {priorityFocus.kind === "deadline" && priorityFocus.originalItem && (
                  <>
                    <button
                      onClick={() => onMarkTodoDone?.(priorityFocus.originalItem)}
                      className="inline-flex h-14 items-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white hover:bg-emerald-500 transition active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                            title={t("dashboard.completeTaskTitle")}
                    >
                      <Check className="h-5 w-5" />
                            <span>{t("dashboard.doneNow")}</span>
                    </button>
                    <button
                      onClick={() => onSnoozeTodo?.(priorityFocus.originalItem)}
                      className="inline-flex h-14 items-center gap-2 rounded-2xl border border-[var(--brse-panel-border)] bg-slate-900/50 px-6 text-sm font-black text-textPrimary hover:bg-slate-800 transition active:scale-95"
                            title={t("dashboard.snoozeOneDay")}
                    >
                      <Clock className="h-5 w-5 text-amber-300" />
                            <span>{t("dashboard.snoozeOneDay")}</span>
                    </button>
                  </>
                )}

                {priorityFocus.kind === "meeting" && priorityFocus.originalItem && (
                  <>
                    <button
                      onClick={() => onApproveMeetingDraft?.(priorityFocus.originalItem.id)}
                      className="inline-flex h-14 items-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white hover:bg-emerald-500 transition active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    >
                      <Check className="h-5 w-5" />
                            <span>{t("dashboard.approveTodo")}</span>
                    </button>
                    <button
                      onClick={() => onRejectMeetingDraft?.(priorityFocus.originalItem.id)}
                      className="inline-flex h-14 items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-6 text-sm font-black text-rose-300 hover:bg-rose-500/20 transition active:scale-95"
                    >
                      <X className="h-5 w-5" />
                            <span>{t("dashboard.reject")}</span>
                    </button>
                  </>
                )}

                {priorityFocus.kind === "qna" && priorityFocus.originalItem && (
                  <button
                    onClick={() => onMarkQnaReplied?.(priorityFocus.originalItem)}
                    className="inline-flex h-14 items-center gap-2 rounded-2xl bg-orange-600 px-6 text-sm font-black text-white hover:bg-orange-500 transition active:scale-95 shadow-[0_0_20px_rgba(255,107,94,0.2)]"
                  >
                    <Check className="h-5 w-5" />
                            <span>{t("dashboard.markReplied")}</span>
                  </button>
                )}

                <button onClick={onCopyHorenso} className="group relative flex h-14 items-center gap-3 overflow-hidden rounded-2xl bg-primary px-8 text-sm font-black text-white transition-all hover:scale-105 active:scale-95 shadow-glow-indigo">
                  <Send className="h-5 w-5" />
                          <span>{t("dashboard.copyHorenso")}</span>
                </button>
                
                <Link href={priorityFocus.href} className="flex h-14 items-center gap-3 rounded-2xl bg-danger px-8 text-sm font-black text-white transition-all hover:bg-danger/90 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                  <AlertTriangle className="h-5 w-5 text-white fill-white/20" />
                  {t("dashboard.handleRisk")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] bg-background/35 p-6 ring-1 ring-border/25">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ZapOff className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-textPrimary">{t("dashboard.noHotspots")}</p>
                  <p className="mt-2 text-sm leading-6 text-textMuted">{t("dashboard.prepareGoodTime")}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/app/minutes/new" className="brse-button brse-button-primary px-4 py-2 text-sm">{t("dashboard.createMinutes")}</Link>
                    <Link href="/app/brse-todo" className="brse-button px-4 py-2 text-sm">{t("dashboard.viewBacklog")}</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full border-t border-[var(--brse-panel-border)] bg-[var(--brse-panel-bg)] p-8 md:w-80 md:border-l md:border-t-0">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted/60 mb-6">{t("dashboard.priorityStack")}</h4>

          {/* Mini Project Health Chart */}
          <div className="mb-6 rounded-xl border border-[var(--brse-panel-border)] bg-background/30 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-textMuted">{t("dashboard.projectHealth")}</p>
            <ProjectHealthChart
              todoPercent={todoPercent}
              qnaCount={qnaCount}
              crCount={crCount}
              overdueCount={overdueCount}
            />
          </div>

          <div className="space-y-4">
            {priorityStack.map((item) => (
              <Link key={item.id} href={item.href} className="group block">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border",
                    item.kind === "deadline" ? "bg-rose/10 text-rose border-rose/30" :
                    item.kind === "qna" ? "bg-amber/10 text-amber border-amber/30" :
                    item.kind === "meeting" ? "bg-purple/10 text-purple border-purple/30" :
                    "bg-primary/10 text-primary border-primary/30"
                  )}>{item.kind}</span>
                </div>
                <p className="text-sm font-black text-textPrimary group-hover:text-primary transition-all truncate leading-tight group-hover:translate-x-1">{item.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
