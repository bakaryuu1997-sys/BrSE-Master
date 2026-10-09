"use client";

import Link from "next/link";
import { formatScheduleTimeRange, timezoneShortName } from "./DashboardCalendarPanel";
import { type PersonalSchedule } from "@/lib/personalCalendar";

interface TodayTimelineProps {
  todaySchedules: PersonalSchedule[];
  t: (key: any) => string;
}

export function TodayTimeline({ todaySchedules, t }: TodayTimelineProps) {
  return (
    <section className="brse-section p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{t("dashboard.timeline")}</p>
          <h3 className="mt-1 text-lg font-black text-textPrimary">{t("dashboard.todaySchedule")}</h3>
        </div>
        <Link href="/app/calendar" className="w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary transition hover:border-primary/35">
          {t("dashboard.openCalendar")}
        </Link>
      </div>
      <div className="space-y-3">
        {todaySchedules.length ? todaySchedules.map((schedule) => (
          <div key={schedule.id} className="brse-card grid gap-3 p-4 transition-all duration-200 hover:border-primary/20 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
            <div>
              <p className="text-sm font-black text-primary">{formatScheduleTimeRange(schedule, t)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-textMuted">{timezoneShortName(schedule.timezone)}</p>
            </div>
            <div>
              <p className="text-sm font-black text-textPrimary">{schedule.title}</p>
              {schedule.note ? <p className="mt-1 text-sm text-textMuted">{schedule.note}</p> : null}
            </div>
          </div>
        )) : (
          <div className="brse-card brse-card-muted p-5">
            <p className="text-sm font-bold text-textPrimary">{t("dashboard.noFixedSchedule")}</p>
            <p className="mt-2 text-sm text-textMuted">{t("dashboard.openDedicatedCalendar")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
