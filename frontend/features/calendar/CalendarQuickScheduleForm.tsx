"use client";

import { FormEvent } from "react";
import { AlertTriangle, Plus, Save, X } from "lucide-react";
import { type PersonalSchedule } from "@/lib/personalCalendar";
import { type OperationRecord } from "@/lib/operations";
import { holidayTone, type HolidayWithCountry } from "../../app/app/calendar/calendarPanels";
import {
  defaultScheduleTime,
  formatDateLong,
  timezoneOptions,
} from "./useCalendarState";

interface CalendarQuickScheduleFormProps {
  t: any;
  language: string;
  selectedDate: string;
  scheduleForm: typeof defaultScheduleTime & { title: string; note: string };
  setScheduleForm: React.Dispatch<
    React.SetStateAction<
      typeof defaultScheduleTime & { title: string; note: string }
    >
  >;
  editingId: string | null;
  preferenceWarnings: string[];
  submitSchedule: (event: FormEvent<HTMLFormElement>) => void;
  resetScheduleForm: () => void;
  selectedSchedules: PersonalSchedule[];
  selectedOperationDeadlines: OperationRecord[];
  holidays: HolidayWithCountry[];
}

export function CalendarQuickScheduleForm({
  t,
  language,
  selectedDate,
  scheduleForm,
  setScheduleForm,
  editingId,
  preferenceWarnings,
  submitSchedule,
  resetScheduleForm,
  selectedSchedules,
  selectedOperationDeadlines,
  holidays,
}: CalendarQuickScheduleFormProps) {
  return (
    <section className="brse-section p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.8fr)] xl:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("calendar.quickSchedule")}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            {selectedDate
              ? formatDateLong(selectedDate, language)
              : t("calendar.pickDate")}
          </h2>
          <p className="mt-2 text-sm text-textMuted">
            {t("calendar.quickScheduleHint")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {holidays.map((holiday) => (
              <span
                key={`${holiday.country}-${holiday.name}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${holidayTone(
                  holiday.country
                )}`}
              >
                {holiday.country} {holiday.name}
              </span>
            ))}
            <span className="rounded-full border border-matcha/25 bg-matcha/10 px-3 py-1 text-xs font-semibold text-matcha">
              {selectedSchedules.length} {t("calendar.schedulesCount")}
            </span>
            {selectedOperationDeadlines.length ? (
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
                {selectedOperationDeadlines.length} {t("calendar.deadlinesCount")}
              </span>
            ) : null}
          </div>
        </div>

        <form onSubmit={submitSchedule} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-[132px_132px_170px_minmax(220px,1fr)]">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">
                {t("calendar.startTime")}
              </span>
              <input
                type="time"
                value={scheduleForm.startTime}
                onChange={(event) =>
                  setScheduleForm((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                className="field-control px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">
                {t("calendar.endTime")}
              </span>
              <input
                type="time"
                value={scheduleForm.endTime}
                onChange={(event) =>
                  setScheduleForm((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
                className="field-control px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">
                {t("calendar.timezone")}
              </span>
              <select
                value={scheduleForm.timezone}
                onChange={(event) =>
                  setScheduleForm((current) => ({
                    ...current,
                    timezone: event.target.value,
                  }))
                }
                className="field-control px-3 py-2 text-sm"
              >
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">
                {t("calendar.title")}
              </span>
              <input
                value={scheduleForm.title}
                onChange={(event) =>
                  setScheduleForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={t("calendar.titlePlaceholder")}
                className="field-control px-3 py-2 text-sm placeholder:text-textMuted/70"
              />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-textMuted">
              {t("calendar.content")}
            </span>
            <textarea
              value={scheduleForm.note}
              onChange={(event) =>
                setScheduleForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              rows={2}
              placeholder={t("calendar.contentPlaceholder")}
              className="field-control px-3 py-2 text-sm leading-6 placeholder:text-textMuted/70"
            />
          </label>
          {preferenceWarnings.length ? (
            <div className="flex gap-2 rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="grid gap-1">
                {preferenceWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!scheduleForm.title.trim()}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingId ? (
                <Save className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {editingId ? t("calendar.updateSchedule") : t("calendar.addSchedule")}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetScheduleForm}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--brse-panel-border)]/35 bg-background/55 px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/40"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t("calendar.cancelEdit")}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
