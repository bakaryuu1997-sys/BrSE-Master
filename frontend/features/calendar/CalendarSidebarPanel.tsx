"use client";

import { Clock3, Edit3, RefreshCw, Trash2 } from "lucide-react";
import { type PersonalSchedule } from "@/lib/personalCalendar";
import { type OperationRecord } from "@/lib/operations";
import { holidayTone, type HolidayWithCountry } from "../../app/app/calendar/calendarPanels";
import {
  formatDateLong,
  formatScheduleTimeRange,
  timezoneShortName,
} from "./useCalendarState";

interface CalendarSidebarPanelProps {
  t: any;
  language: string;
  selectedDate: string;
  selectedSchedules: PersonalSchedule[];
  selectedOperationDeadlines: OperationRecord[];
  holidays: HolidayWithCountry[];
  weekAgendaRange: { start: string; end: string };
  weekAgendaItems: any[];
  upcomingHolidays: HolidayWithCountry[];
  visibleYears: string[];
  loadHolidaysForVisibleYears: (years: string[]) => Promise<void>;
  startEdit: (schedule: PersonalSchedule) => void;
  removeSchedule: (scheduleId: string) => void;
}

export function CalendarSidebarPanel({
  t,
  language,
  selectedDate,
  selectedSchedules,
  selectedOperationDeadlines,
  holidays,
  weekAgendaRange,
  weekAgendaItems,
  upcomingHolidays,
  visibleYears,
  loadHolidaysForVisibleYears,
  startEdit,
  removeSchedule,
}: CalendarSidebarPanelProps) {
  return (
    <aside className="grid gap-3 self-start xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="brse-section p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("calendar.selectedDay")}
            </p>
            <h2 className="mt-1 text-base font-semibold text-ink">
              {selectedDate
                ? formatDateLong(selectedDate, language)
                : t("calendar.pickDate")}
            </h2>
          </div>
          <span className="rounded-md border border-matcha/30 bg-matcha/10 px-2 py-1 text-xs font-semibold text-matcha">
            {selectedSchedules.length} {t("calendar.schedulesCount")}
          </span>
        </div>

        <div className="mt-3 grid gap-2">
          {holidays.map((holiday) => (
            <div
              key={`${holiday.country}-${holiday.name}`}
              className={`rounded-md border px-3 py-2 text-sm ${holidayTone(
                holiday.country
              )}`}
            >
              <p className="text-xs font-semibold">
                {holiday.country} {t("calendar.holiday")}
              </p>
              <p className="mt-1 font-semibold">{holiday.name}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-[var(--brse-panel-border)] pt-3">
          <h3 className="text-sm font-semibold text-ink">
            {t("calendar.operationsDeadlines")}
          </h3>
          {selectedOperationDeadlines.length === 0 ? (
            <p className="mt-3 rounded-md border border-[var(--brse-panel-border)] bg-background/50 p-3 text-sm text-textMuted">
              {t("calendar.noDeadlines")}
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {selectedOperationDeadlines.map((record) => (
                <a
                  key={record.id}
                  href={`/app/operations?type=${
                    record.type
                  }&id=${encodeURIComponent(record.id)}`}
                  className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 transition hover:bg-amber-300/15"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
                    {record.type} deadline
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {record.title}
                  </p>
                  <p className="mt-1 text-xs text-textMuted">
                    {record.status} · {record.priority} ·{" "}
                    {record.owner || record.customerOwner || "No owner"}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-[var(--brse-panel-border)] pt-3">
          <h3 className="text-sm font-semibold text-ink">
            {t("calendar.personalSchedules")}
          </h3>
          {selectedSchedules.length === 0 ? (
            <p className="mt-3 rounded-md border border-[var(--brse-panel-border)] bg-background/50 p-3 text-sm text-textMuted">
              {t("calendar.noPersonalSchedules")}
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {selectedSchedules.map((schedule) => (
                <article
                  key={schedule.id}
                  className="rounded-md border border-[var(--brse-panel-border)] bg-background/55 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{schedule.title}</p>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatScheduleTimeRange(
                          schedule.startTime,
                          schedule.endTime,
                          t
                        )}
                        {" · "}
                        {timezoneShortName(schedule.timezone)}
                      </div>
                      {schedule.note ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-textMuted">
                          {schedule.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(schedule)}
                        className="rounded-md border border-[var(--brse-panel-border)] bg-surface/70 p-2 text-textMuted transition hover:border-primary/40 hover:text-primary"
                        aria-label={t("calendar.editSchedule")}
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSchedule(schedule.id)}
                        className="rounded-md border border-[var(--brse-panel-border)] bg-surface/70 p-2 text-textMuted transition hover:border-vermilion/40 hover:text-vermilion"
                        aria-label={t("calendar.deleteSchedule")}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="brse-section p-4">
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 p-3">
          <h2 className="text-base font-semibold text-ink">
            {t("calendar.weekAgenda")}
          </h2>
          <p className="mt-1 text-xs text-textMuted">
            {weekAgendaRange.start} - {weekAgendaRange.end}
          </p>
          <div className="mt-3 grid max-h-60 gap-2 overflow-y-auto pr-1">
            {weekAgendaItems.length ? (
              weekAgendaItems.map((item) => (
                <div
                  key={`${item.tone}-${item.id}`}
                  className={`rounded-md border p-2.5 text-xs ${
                    item.tone === "operation"
                      ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                      : "border-matcha/30 bg-matcha/10 text-matcha"
                  }`}
                >
                  <p className="font-semibold text-ink">
                    {item.date} · {item.title}
                  </p>
                  <p className="mt-1 text-textMuted">{item.helper}</p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-[var(--brse-panel-border)] bg-background/50 p-3 text-xs text-textMuted">
                {t("calendar.noWeekAgenda")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">
            {t("calendar.upcomingHolidays")}
          </h2>
          <button
            type="button"
            onClick={() => void loadHolidaysForVisibleYears(visibleYears)}
            className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 p-2 text-textMuted transition hover:border-primary/40 hover:text-primary"
            aria-label={t("calendar.reloadHolidays")}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {upcomingHolidays.length === 0 ? (
            <p className="rounded-md border border-[var(--brse-panel-border)] bg-background/50 p-3 text-sm text-textMuted">
              {t("calendar.noUpcomingHolidays")}
            </p>
          ) : (
            upcomingHolidays.map((holiday) => (
              <div
                key={`${holiday.country}-${holiday.date}-${holiday.name}`}
                className="rounded-md border border-[var(--brse-panel-border)] bg-background/50 p-3"
              >
                <p className="text-xs font-semibold text-primary">
                  {holiday.country} {t("calendar.upcoming")}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {holiday.date}
                </p>
                <p className="mt-1 text-sm text-textMuted">{holiday.name}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
