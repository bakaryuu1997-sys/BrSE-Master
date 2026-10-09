"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatScheduleTimeRange } from "./DashboardCalendarPanel";

interface WeekDate {
  iso: string;
  weekday: string;
  dayMonth: string;
}

interface WeekPlannerProps {
  weekDates: WeekDate[];
  todayIso: string;
  calendarSchedulesByDate: Record<string, any[]>;
  weeklyScheduleCount: number;
  getDayRisk: (iso: string) => "danger" | "warning" | "normal";
  t: (key: any) => string;
  onSaveQuickSchedule?: (date: string, title: string) => Promise<void>;
}

export function WeekPlanner({
  weekDates,
  todayIso,
  calendarSchedulesByDate,
  weeklyScheduleCount,
  getDayRisk,
  t,
  onSaveQuickSchedule
}: WeekPlannerProps) {
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDate || !quickTitle.trim()) return;
    if (onSaveQuickSchedule) {
      await onSaveQuickSchedule(activeDate, quickTitle.trim());
    }
    setQuickTitle("");
    setActiveDate(null);
  };

  return (
    <section className="brse-section p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{t("dashboard.weekPlanner")}</p>
          <h3 className="mt-1 text-lg font-black text-textPrimary">{t("dashboard.weekSchedule")}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-background/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-textMuted ring-1 ring-border/20">
            {weeklyScheduleCount} {t("dashboard.schedules")}
          </span>
          <Link href="/app/calendar" className="w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary transition hover:border-primary/35">
            {t("dashboard.openWeekPlanner")}
          </Link>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {weekDates.map((day) => {
          const schedules = calendarSchedulesByDate[day.iso] ?? [];
          const firstSchedule = schedules[0];
          const isToday = day.iso === todayIso;
          const risk = getDayRisk(day.iso);

          return (
            <div
              key={day.iso}
              className={cn(
                "brse-card block p-3 transition-all duration-300 relative group/card",
                isToday
                  ? "border-primary bg-primary/15 shadow-glow-sm scale-[1.02] z-10"
                  : risk === "danger"
                    ? "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50"
                    : risk === "warning"
                      ? "border-amber-400/30 bg-amber-400/5 hover:border-amber-400/50"
                      : "brse-card-muted hover:border-primary/20"
              )}
            >
              <div className="flex items-start justify-between gap-2 lg:block">
                <div>
                  <p className={cn("text-[10px] font-black uppercase tracking-[0.18em] text-textMuted", isToday && "text-primary", risk === "danger" && !isToday && "text-rose-400", risk === "warning" && !isToday && "text-amber-400")}>
                    {day.weekday}
                  </p>
                  <p className="mt-1 text-sm font-black text-textPrimary">{day.dayMonth}</p>
                </div>
                <div className="flex items-center gap-1.5 lg:mt-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold",
                    risk === "danger" ? "bg-rose-500/15 text-rose-400" :
                    risk === "warning" ? "bg-amber-400/15 text-amber-400" :
                    "bg-surface/70 text-textMuted"
                  )}>
                    {schedules.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveDate(day.iso);
                    }}
                    className="p-1 rounded bg-white/5 hover:bg-primary/25 hover:text-primary transition text-textMuted text-[10px] font-bold leading-none hidden group-hover/card:inline-block"
                    title={t("dashboard.quickSchedule")}
                  >
                    ＋
                  </button>
                </div>
              </div>
              <Link href={`/app/calendar?date=${day.iso}`} className="mt-3 block">
                {firstSchedule ? (
                  <>
                    <p className="truncate text-xs font-black text-textPrimary">{firstSchedule.title}</p>
                    <p className="mt-1 text-[10px] font-semibold text-primary">{formatScheduleTimeRange(firstSchedule, t)}</p>
                  </>
                ) : (
                  <p className="text-xs text-textMuted">{t("dashboard.empty")}</p>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {activeDate ? (
        <form onSubmit={handleFormSubmit} className="mt-4 flex gap-2 items-end rounded-2xl border border-[var(--brse-panel-border)] bg-background/50 p-4 shadow-sm animate-fadeIn">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-textMuted mb-1.5">
              {t("dashboard.quickScheduleFor")} {activeDate}
            </p>
            <input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder={t("dashboard.quickSchedulePlaceholder")}
              className="h-10 w-full rounded-lg border border-[var(--brse-panel-border)] bg-background px-3 text-xs text-ink outline-none focus:border-primary"
              autoFocus
              required
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveDate(null);
                setQuickTitle("");
              }}
              className="h-10 rounded-lg border border-[var(--brse-panel-border)] bg-background px-4 text-xs font-semibold text-textMuted hover:text-textPrimary"
            >
              {t("dashboard.cancel")}
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-5 text-xs font-black text-white hover:bg-primaryHover"
            >
              {t("dashboard.saveSchedule")}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
