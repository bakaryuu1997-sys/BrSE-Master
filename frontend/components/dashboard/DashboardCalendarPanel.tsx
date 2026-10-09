"use client";

import type { PersonalSchedule } from "@/lib/personalCalendar";
import { type UiLanguage } from "@/lib/uiLanguage";
import { getLocaleString } from "@/lib/dateUtils";

export type DashboardHoliday = {
  date: string;
  name: string;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getIsoWeek(date: Date) {
  const target = new Date(date.valueOf());
  const dayNumber = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNumber = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNumber + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
}

function buildMonthRows(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 6 }, (_, rowIndex) => {
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + rowIndex * 7 + dayIndex);
      return {
        date,
        day: date.getDate(),
        iso: toIsoDate(date),
        inMonth: date.getMonth() === month
      };
    });
  });
}

function formatMonthTitle(date: Date, lang: UiLanguage) {
  return new Intl.DateTimeFormat(getLocaleString(lang), { month: "long", year: "numeric" }).format(date).toUpperCase();
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function timezoneShortName(timezone: string) {
  if (timezone === "Asia/Tokyo") return "JST";
  if (timezone === "Asia/Ho_Chi_Minh") return "ICT";
  return timezone;
}

export function formatScheduleTimeRange(schedule: PersonalSchedule, t: (key: any) => string) {
  if (schedule.startTime && schedule.endTime) return `${schedule.startTime}-${schedule.endTime}`;
  if (schedule.startTime) return `${t("calendar.from")} ${schedule.startTime}`;
  if (schedule.endTime) return `${t("calendar.to")} ${schedule.endTime}`;
  return t("calendar.noTimeSet");
}

export function formatTime(date: Date, timeZone: string, lang: UiLanguage) {
  return new Intl.DateTimeFormat(getLocaleString(lang), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone
  }).format(date);
}

export function formatDateLabel(date: Date, timeZone: string, lang: UiLanguage) {
  return new Intl.DateTimeFormat(getLocaleString(lang), {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone
  }).format(date);
}

export function getAvailability(timeZone: string, now: Date, t: (key: any) => string, lang: UiLanguage) {
  const hour = Number(
    new Intl.DateTimeFormat(getLocaleString(lang), {
      hour: "2-digit",
      hour12: false,
      timeZone
    }).format(now)
  );

  if (hour >= 9 && hour < 18) return { label: t("dashboard.available"), tone: "matcha", bar: "w-11/12" };
  if (hour >= 8 && hour < 20) return { label: t("dashboard.nearOffice"), tone: "warning", bar: "w-7/12" };
  return { label: t("dashboard.offline"), tone: "textMuted", bar: "w-3/12" };
}

export function DashboardCalendarPanel({
  title,
  subtitle,
  timezone,
  holidays,
  schedulesByDate,
  monthDate,
  todayIso,
  selectedDate,
  onSelectDate,
  lang,
  t
}: {
  title: string;
  subtitle: string;
  timezone: string;
  holidays: DashboardHoliday[];
  schedulesByDate: Record<string, PersonalSchedule[]>;
  monthDate: Date;
  todayIso: string;
  selectedDate: string;
  onSelectDate: (date: string, timezone: string) => void;
  lang: UiLanguage;
  t: (key: any) => string;
}) {
  const rows = buildMonthRows(monthDate);
  const holidayMap = new Map(holidays.map((holiday) => [holiday.date, holiday]));

  return (
    <article className="rounded-2xl border border-[var(--brse-panel-border)] bg-background/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-ink">{formatMonthTitle(monthDate, lang)}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-textMuted">{subtitle}</p>
        </div>
        <span className="rounded-sm border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
          {title}
        </span>
      </div>

      <div className="calendar-grid-shell mt-4 grid grid-cols-[26px_repeat(7,minmax(0,1fr))] border-l border-t text-center text-xs">
        <div className="calendar-grid-line-soft border-b border-r px-1 py-2 text-[10px] text-textMuted">Wk</div>
        {weekdays.map((day) => (
          <div
            key={day}
            className={`calendar-grid-line-soft border-b border-r px-1 py-2 text-[10px] ${
              day === "Sat" ? "font-semibold text-cyan" : "text-textMuted"
            }`}
          >
            {day}
          </div>
        ))}

        {rows.map((row) => (
          <div key={row[0].iso} className="contents">
            <div className="calendar-grid-line-soft border-b border-r px-1 py-4 text-[10px] text-textMuted">
              {getIsoWeek(row[0].date)}
            </div>
            {row.map((cell) => {
              const holiday = holidayMap.get(cell.iso);
              const isToday = cell.iso === todayIso;
              const daySchedules = schedulesByDate[cell.iso] ?? [];
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => onSelectDate(cell.iso, timezone)}
                  className={`calendar-grid-line-soft relative min-h-[58px] border-b border-r p-1 text-left transition hover:bg-surfaceHover/80 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    cell.inMonth ? "bg-surface/45 text-ink" : "bg-background/35 text-textMuted/45"
                  } ${holiday ? "ring-1 ring-cyan/80" : ""} ${isToday ? "bg-primary/10" : ""} ${selectedDate === cell.iso ? "z-10 bg-primary/15 ring-1 ring-primary/80" : ""}`}
                >
                  <span className="text-xs">{cell.day}</span>
                  {holiday ? (
                    <p className="mt-1 line-clamp-2 rounded border border-cyan/40 bg-cyan/10 px-1 py-0.5 text-[9px] leading-tight text-cyan">
                      {holiday.name}
                    </p>
                  ) : null}
                  {daySchedules.slice(0, 1).map((schedule) => (
                    <p key={schedule.id} className="mt-1 line-clamp-1 rounded border border-matcha/40 bg-matcha/10 px-1 py-0.5 text-[9px] leading-tight text-matcha">
                      {schedule.startTime ? `${schedule.startTime} ` : ""}{schedule.title}
                    </p>
                  ))}
                  {daySchedules.length > 1 ? (
                    <p className="mt-0.5 text-[9px] font-semibold text-textMuted">
                      {lang === "vi" ? `+${daySchedules.length - 1} lịch` : lang === "ja" ? `+${daySchedules.length - 1}件` : `+${daySchedules.length - 1} events`}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </article>
  );
}

