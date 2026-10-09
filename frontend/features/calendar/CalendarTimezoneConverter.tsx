"use client";

import { FormEvent } from "react";
import { Clock3, Loader2 } from "lucide-react";
import {
  type TimezoneConvertForm,
  type TimezoneConvertResponse,
  timezoneOptions,
  timezoneShortName,
  formatApiDateTime,
} from "./useCalendarState";

interface CalendarTimezoneConverterProps {
  t: any;
  convertForm: TimezoneConvertForm;
  setConvertForm: React.Dispatch<React.SetStateAction<TimezoneConvertForm>>;
  isConverting: boolean;
  convertError: string;
  convertResult: TimezoneConvertResponse | null;
  convertTimezone: (event: FormEvent<HTMLFormElement>) => void;
  swapTimezones: () => void;
}

export function CalendarTimezoneConverter({
  t,
  convertForm,
  setConvertForm,
  isConverting,
  convertError,
  convertResult,
  convertTimezone,
  swapTimezones,
}: CalendarTimezoneConverterProps) {
  return (
    <form onSubmit={convertTimezone} className="brse-section p-5">
      <div className="flex items-center gap-2">
        <Clock3 className="h-5 w-5 text-matcha" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-ink">
          {t("calendar.converterTitle")}
        </h2>
      </div>
      <p className="mt-2 text-sm text-textMuted">{t("calendar.converterDesc")}</p>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">
              {t("calendar.date")}
            </span>
            <input
              type="date"
              required
              value={convertForm.date}
              onChange={(event) =>
                setConvertForm((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">
              {t("calendar.time")}
            </span>
            <input
              type="time"
              required
              value={convertForm.time}
              onChange={(event) =>
                setConvertForm((current) => ({
                  ...current,
                  time: event.target.value,
                }))
              }
              className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">
              {t("calendar.fromTimezone")}
            </span>
            <select
              value={convertForm.source_timezone}
              onChange={(event) =>
                setConvertForm((current) => ({
                  ...current,
                  source_timezone: event.target.value,
                }))
              }
              className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={swapTimezones}
            className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40"
          >
            {t("calendar.swap")}
          </button>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">
              {t("calendar.toTimezone")}
            </span>
            <select
              value={convertForm.target_timezone}
              onChange={(event) =>
                setConvertForm((current) => ({
                  ...current,
                  target_timezone: event.target.value,
                }))
              }
              className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={isConverting}
          className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConverting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {t("calendar.convert")}
        </button>
      </div>

      {convertError ? (
        <p className="mt-4 rounded-md border border-vermilion/20 bg-vermilion/10 p-3 text-sm text-vermilion">
          {convertError}
        </p>
      ) : null}
      {convertResult ? (
        <div className="mt-4 grid gap-3 rounded-md border border-matcha/20 bg-matcha/10 p-4 text-sm text-ink sm:grid-cols-2">
          <div>
            <p className="font-semibold text-matcha">
              {t("calendar.source")} ({timezoneShortName(convertResult.source_timezone)})
            </p>
            <p className="mt-1">
              {formatApiDateTime(convertResult.source_datetime)}
            </p>
          </div>
          <div>
            <p className="font-semibold text-matcha">
              {t("calendar.target")} ({timezoneShortName(convertResult.target_timezone)})
            </p>
            <p className="mt-1">
              {formatApiDateTime(convertResult.target_datetime)}
            </p>
          </div>
        </div>
      ) : null}
    </form>
  );
}
