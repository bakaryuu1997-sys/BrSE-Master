"use client";

import type { OperationRecord } from "@/lib/operations";
import type { PersonalSchedule } from "@/lib/personalCalendar";
import { type UiLanguage } from "@/lib/uiLanguage";
import { getLocaleString } from "@/lib/dateUtils";

type CountryCode = "VN" | "JP";

export type Holiday = {
  date: string;
  name: string;
};

export type HolidayWithCountry = Holiday & {
  country: CountryCode;
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthTitle(date: Date, lang: UiLanguage) {
  return new Intl.DateTimeFormat(getLocaleString(lang), { month: "long", year: "numeric" }).format(date).toUpperCase();
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

  return Array.from({ length: 6 }, (_, rowIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + rowIndex * 7 + dayIndex);
      return {
        date,
        day: date.getDate(),
        iso: toIsoDate(date),
        inMonth: date.getMonth() === month,
        weekend: date.getDay() === 0 || date.getDay() === 6,
      };
    })
  );
}

function getWeekDates(selectedDate: string, lang: UiLanguage) {
  const base = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
  const day = base.getDay();
  const offset = (day === 0 ? -6 : 1) - day;
  const first = new Date(base);
  first.setDate(base.getDate() + offset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return {
      date,
      iso: toIsoDate(date),
      label: new Intl.DateTimeFormat(getLocaleString(lang), { weekday: "short", day: "2-digit", month: "2-digit" }).format(date),
    };
  });
}

export function holidayTone(country: CountryCode) {
  return country === "JP"
    ? "border-cyan/45 bg-cyan/10 text-cyan"
    : "border-vermilion/45 bg-vermilion/10 text-vermilion";
}

function eventTone(type: "schedule" | "deadline") {
  return type === "deadline"
    ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
    : "border-matcha/25 bg-matcha/10 text-matcha";
}

const fullDayHours = Array.from({ length: 24 }, (_, index) => `${`${index}`.padStart(2, "0")}:00`);

function timeToMinutes(value: string | undefined) {
  const match = value?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function slotStartMinutes(hour: string) {
  return Number(hour.slice(0, 2)) * 60;
}

function scheduleWindow(schedule: PersonalSchedule) {
  const start = timeToMinutes(schedule.startTime) ?? 0;
  const rawEnd = timeToMinutes(schedule.endTime);
  const end = rawEnd === null || rawEnd <= start ? Math.min(start + 60, 24 * 60) : rawEnd;
  return { start, end };
}

function scheduleOverlapsHour(schedule: PersonalSchedule, hour: string) {
  const slotStart = slotStartMinutes(hour);
  const slotEnd = slotStart + 60;
  const { start, end } = scheduleWindow(schedule);
  return start < slotEnd && end > slotStart;
}

function scheduleStartsInHour(schedule: PersonalSchedule, hour: string) {
  const slotStart = slotStartMinutes(hour);
  const slotEnd = slotStart + 60;
  const { start } = scheduleWindow(schedule);
  return start >= slotStart && start < slotEnd;
}

export function MonthPanel({
  monthDate,
  holidaysByDate,
  schedulesByDate,
  operationDeadlinesByDate,
  selectedDate,
  todayIso,
  onSelectDate,
  lang,
  t,
}: {
  monthDate: Date;
  holidaysByDate: Record<string, HolidayWithCountry[]>;
  schedulesByDate: Record<string, PersonalSchedule[]>;
  operationDeadlinesByDate: Record<string, OperationRecord[]>;
  selectedDate: string;
  todayIso: string;
  onSelectDate: (date: string) => void;
  lang: UiLanguage;
  t: (key: any) => string;
}) {
  const rows = buildMonthRows(monthDate);

  return (
    <article className="brse-card tone-card-primary h-fit rounded-2xl p-4 shadow-glow-sm hover:scale-[1.002] transition-all duration-300">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink 2xl:text-lg">{formatMonthTitle(monthDate, lang)}</h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-textMuted">{t("calendar.monthPanelSubtitle")}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1 text-[9px] font-semibold">
          <span className="rounded-sm border border-vermilion/30 bg-vermilion/10 px-1.5 py-0.5 text-vermilion">VN</span>
          <span className="rounded-sm border border-cyan/30 bg-cyan/10 px-1.5 py-0.5 text-cyan">JP</span>
          <span className="rounded-sm border border-matcha/30 bg-matcha/10 px-1.5 py-0.5 text-matcha">MY</span>
        </div>
      </div>

      <div className="calendar-grid-shell mt-2 grid grid-cols-[24px_repeat(7,minmax(0,1fr))] border-l border-t text-center text-xs">
        <div className="calendar-grid-line-soft border-b border-r px-1 py-1 text-[9px] text-textMuted">{t("calendar.weekShort")}</div>
        {weekdays.map((day) => (
          <div
            key={day}
            className={`calendar-grid-line-soft border-b border-r px-1 py-1 text-[9px] ${
              day === "Sat" ? "font-semibold text-cyan" : day === "Sun" ? "font-semibold text-vermilion" : "text-textMuted"
            }`}
          >
            {day}
          </div>
        ))}

        {rows.map((row) => (
          <div key={row[0].iso} className="contents">
            <div className="calendar-grid-line-soft border-b border-r px-1 py-2 text-[9px] text-textMuted">
              {getIsoWeek(row[0].date)}
            </div>
            {row.map((cell) => {
              const holidays = holidaysByDate[cell.iso] ?? [];
              const schedules = schedulesByDate[cell.iso] ?? [];
              const operationDeadlines = operationDeadlinesByDate[cell.iso] ?? [];
              const isToday = cell.iso === todayIso;
              const isSelected = cell.iso === selectedDate;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => onSelectDate(cell.iso)}
                  className={`calendar-grid-line-soft group relative min-h-[38px] border-b border-r p-1 text-left transition hover:bg-surfaceHover/80 focus:outline-none focus:ring-2 focus:ring-primary/40 2xl:min-h-[44px] ${cell.inMonth ? "bg-surface/20 text-ink" : "bg-background/15 text-textMuted/45"} ${cell.weekend && cell.inMonth ? "bg-background/25" : ""} ${isToday ? "ring-1 ring-cyan/70 bg-cyan/[0.08]" : ""} ${isSelected ? "z-10 border-primary/55 bg-primary/[0.18] shadow-[0_0_24px_rgba(255,107,94,0.18)]" : ""}`}
                  aria-label={`${t("calendar.selectDate")} ${cell.iso}`}
                >
                  <span className={`text-[10px] 2xl:text-xs ${isToday ? "font-bold text-primary" : ""}`}>{cell.day}</span>
                  <div className="mt-0.5 grid gap-0.5">
                    {holidays.slice(0, 1).map((holiday) => (
                      <span
                        key={`${holiday.country}-${holiday.name}`}
                        className={`line-clamp-1 rounded border px-1 py-0.5 text-[8px] leading-none ${holidayTone(holiday.country)}`}
                      >
                        {holiday.country} {holiday.name}
                      </span>
                    ))}
                    {schedules.slice(0, 1).map((schedule) => (
                      <span
                        key={schedule.id}
                        className="line-clamp-1 rounded border border-matcha/45 bg-matcha/10 px-1 py-0.5 text-[8px] leading-none text-matcha"
                      >
                        {schedule.startTime ? `${schedule.startTime} ` : ""}
                        {schedule.title}
                      </span>
                    ))}
                    {operationDeadlines.slice(0, 1).map((record) => (
                      <span
                        key={record.id}
                        className="line-clamp-1 rounded border border-amber-300/45 bg-amber-300/10 px-1 py-0.5 text-[8px] leading-none text-amber-300"
                      >
                        {record.type.toUpperCase()} {record.title}
                      </span>
                    ))}
                    {holidays.length + schedules.length + operationDeadlines.length > 3 ? (
                      <span className="text-[8px] leading-none text-textMuted">+{holidays.length + schedules.length + operationDeadlines.length - 3}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </article>
  );
}

export function WeekPlannerPanel({
  selectedDate,
  todayIso,
  schedulesByDate,
  operationDeadlinesByDate,
  onSelectDate,
  onSelectSlot,
  onRescheduleSchedule,
  lang,
  t,
}: {
  selectedDate: string;
  todayIso: string;
  schedulesByDate: Record<string, PersonalSchedule[]>;
  operationDeadlinesByDate: Record<string, OperationRecord[]>;
  onSelectDate: (date: string) => void;
  onSelectSlot: (date: string, hour: string) => void;
  onRescheduleSchedule: (scheduleId: string, date: string, hour: string) => void;
  lang: UiLanguage;
  t: (key: any) => string;
}) {
  const weekDates = getWeekDates(selectedDate, lang);
  const hours = fullDayHours;

  return (
    <section className="spectral-panel overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-[var(--brse-panel-border)]/12 bg-background/55">
        <div className="p-3 text-[10px] font-bold uppercase tracking-[0.18em] text-textMuted">{t("calendar.time")}</div>
        {weekDates.map((day) => (
          <button
            key={day.iso}
            type="button"
            onClick={() => onSelectDate(day.iso)}
            className={`border-l border-[var(--brse-panel-border)]/12 px-2 py-3 text-left transition hover:bg-primary/10 ${
              day.iso === selectedDate ? "bg-primary/[0.16] shadow-[inset_0_-2px_0_rgba(255,107,94,0.75)]" : ""
            } ${
              day.iso === todayIso ? "bg-cyan/[0.08] ring-1 ring-inset ring-cyan/35" : ""
            }`}
          >
            <p className={`text-xs font-bold ${day.iso === todayIso ? "text-cyan" : "text-ink"}`}>
              {day.iso === todayIso ? `${t("calendar.today")} ・ ` : ""}{day.label}
            </p>
            <p className="mt-1 text-[10px] text-textMuted">
              {(schedulesByDate[day.iso]?.length ?? 0) + (operationDeadlinesByDate[day.iso]?.length ?? 0)} {t("calendar.itemsCount")}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-[var(--brse-panel-border)]/12 px-3 py-4 text-xs font-semibold text-textMuted">{hour}</div>
            {weekDates.map((day) => {
              const matchingSchedules = (schedulesByDate[day.iso] ?? []).filter((schedule) => scheduleOverlapsHour(schedule, hour));
              const matchingDeadlines = hour === "08:00" ? operationDeadlinesByDate[day.iso] ?? [] : [];
              return (
                <button
                  key={`${day.iso}-${hour}`}
                  type="button"
                  onClick={() => onSelectSlot(day.iso, hour)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const scheduleId = event.dataTransfer.getData("text/brse-schedule-id");
                    if (scheduleId) onRescheduleSchedule(scheduleId, day.iso, hour);
                  }}
                  className={`min-h-[64px] border-b border-l border-[var(--brse-panel-border)]/12 p-2 text-left transition hover:bg-surfaceHover/60 ${
                    day.iso === selectedDate ? "bg-primary/[0.055]" : day.iso === todayIso ? "bg-cyan/[0.035]" : "bg-background/20"
                  }`}
                >
                  <div className="grid gap-1">
                    {matchingSchedules.map((schedule) => {
                      const startsHere = scheduleStartsInHour(schedule, hour);
                      return (
                        <div
                          key={schedule.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/brse-schedule-id", schedule.id);
                          }}
                          className={`cursor-grab rounded-lg border px-2 py-1 text-[10px] font-semibold active:cursor-grabbing ${
                            startsHere
                            ? "border-matcha/35 bg-matcha/[0.16] text-matcha shadow-[0_0_18px_rgba(16,185,129,0.12)]"
                              : "border-matcha/18 bg-matcha/[0.07] text-matcha/80"
                          }`}
                        >
                          {startsHere ? `${schedule.startTime} - ${schedule.endTime} ${schedule.title}` : `↳ ${schedule.title}`}
                        </div>
                      );
                    })}
                    {matchingDeadlines.map((record) => (
                      <div key={record.id} className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] font-semibold text-amber-200">
                        {record.type.toUpperCase()} {record.title}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DayPlannerPanel({
  selectedDate,
  holidays,
  schedules,
  operationDeadlines,
  onSelectSlot,
  onRescheduleSchedule,
  t,
  lang,
}: {
  selectedDate: string;
  holidays: HolidayWithCountry[];
  schedules: PersonalSchedule[];
  operationDeadlines: OperationRecord[];
  onSelectSlot: (date: string, hour: string) => void;
  onRescheduleSchedule: (scheduleId: string, date: string, hour: string) => void;
  t: (key: any) => string;
  lang: UiLanguage;
}) {
  const hours = fullDayHours;

  return (
    <section className="spectral-panel overflow-hidden rounded-2xl">
      <div className="grid gap-4 border-b border-[var(--brse-panel-border)]/12 bg-background/55 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <span className="data-ribbon">{t("calendar.outlookDayView")}</span>
          <h2 className="mt-3 text-xl font-semibold text-ink">{selectedDate}</h2>
          <p className="mt-1 text-sm text-textMuted">
            {schedules.length} {t("calendar.schedulesCount")} ・ {operationDeadlines.length} {t("calendar.deadlinesCount")} ・ {holidays.length} {t("calendar.holidaysCount")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {holidays.map((holiday) => (
            <span key={`${holiday.country}-${holiday.name}`} className={`rounded-full border px-3 py-1 text-xs font-semibold ${holidayTone(holiday.country)}`}>
              {holiday.country} {holiday.name}
            </span>
          ))}
          {operationDeadlines.map((record) => (
            <span key={record.id} className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
              {record.type.toUpperCase()} ・ {record.title}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[88px_minmax(0,1fr)]">
        {hours.map((hour) => {
          const slotSchedules = schedules.filter((schedule) => scheduleOverlapsHour(schedule, hour));
          return (
            <div key={hour} className="contents">
              <div className="border-b border-[var(--brse-panel-border)]/12 px-4 py-5 text-sm font-semibold text-textMuted">{hour}</div>
              <button
                type="button"
                onClick={() => onSelectSlot(selectedDate, hour)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const scheduleId = event.dataTransfer.getData("text/brse-schedule-id");
                  if (scheduleId) onRescheduleSchedule(scheduleId, selectedDate, hour);
                }}
                className="min-h-[72px] border-b border-l border-[var(--brse-panel-border)]/12 bg-background/20 p-3 text-left transition hover:bg-primary/[0.06]"
              >
                <div className="grid gap-2">
                  {slotSchedules.length ? (
                    slotSchedules.map((schedule) => {
                      const startsHere = scheduleStartsInHour(schedule, hour);
                      return (
                        <article
                          key={schedule.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/brse-schedule-id", schedule.id);
                          }}
                          className={`cursor-grab rounded-2xl border px-3 py-2.5 active:cursor-grabbing ${
                            startsHere ? eventTone("schedule") : "border-matcha/18 bg-matcha/[0.07] text-matcha/80"
                          }`}
                        >
                          <p className="text-sm font-semibold text-ink">{startsHere ? schedule.title : `↳ ${schedule.title}`}</p>
                          <p className="mt-1 text-xs text-textMuted">
                            {schedule.startTime || "--:--"} - {schedule.endTime || "--:--"} ・ {schedule.timezone}
                          </p>
                          {startsHere && schedule.note ? <p className="mt-2 text-xs leading-5 text-textMuted">{schedule.note}</p> : null}
                        </article>
                      );
                    })
                  ) : (
                    <div className="h-full rounded-xl border border-dashed border-[var(--brse-panel-border)]/32 bg-background/20" />
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
