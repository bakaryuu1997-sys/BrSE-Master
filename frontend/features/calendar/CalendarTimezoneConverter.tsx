"use client";

import { FormEvent } from "react";
import { ArrowDownUp, Clock3, Loader2 } from "lucide-react";
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

const COMMON_24H_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

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
    <form onSubmit={convertTimezone} className="rounded-xl border border-[var(--brse-panel-border)] bg-surface/40 p-4">
      <div className="flex items-center gap-2 border-b border-[var(--brse-hairline-border)] pb-2.5">
        <Clock3 className="h-4 w-4 text-cyan" aria-hidden="true" />
        <div>
          <h2 className="text-xs font-bold text-ink">
            {t("calendar.converterTitle") ?? "JST / ICT 変換"}
          </h2>
          <p className="text-[10px] text-textMuted">Chuyển đổi giờ họp Việt - Nhật (24h)</p>
        </div>
      </div>

      <div className="mt-3.5 space-y-3">
        {/* Date & Time Row */}
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold text-textMuted uppercase">
              {t("calendar.date") ?? "Ngày"}
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
              className="field-control px-2.5 py-1.5 text-xs"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold text-textMuted uppercase">
              {t("calendar.time") ?? "Giờ (24h)"}
            </span>
            <input
              type="time"
              lang="en-GB"
              step="60"
              required
              value={convertForm.time}
              onChange={(event) =>
                setConvertForm((current) => ({
                  ...current,
                  time: event.target.value,
                }))
              }
              className="field-control font-mono px-2.5 py-1.5 text-xs"
            />
          </label>
        </div>

        {/* Quick 24h Time Pills */}
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] text-textMuted mr-1">24h:</span>
          {COMMON_24H_TIMES.slice(0, 5).map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => setConvertForm((c) => ({ ...c, time }))}
              className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition ${
                convertForm.time === time
                  ? "bg-primary text-white font-bold"
                  : "bg-surface hover:bg-surface/80 text-textMuted hover:text-ink border border-[var(--brse-hairline-border)]"
              }`}
            >
              {time}
            </button>
          ))}
        </div>

        {/* Timezone Switcher */}
        <div className="space-y-1.5 rounded-lg border border-[var(--brse-hairline-border)] bg-background/50 p-2.5">
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold text-textMuted uppercase">
              {t("calendar.fromTimezone") ?? "Múi giờ gốc"}
            </span>
            <select
              value={convertForm.source_timezone}
              onChange={(event) =>
                setConvertForm((current) => ({
                  ...current,
                  source_timezone: event.target.value,
                }))
              }
              className="field-control px-2 py-1.5 text-xs"
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-center py-1">
            <button
              type="button"
              onClick={swapTimezones}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brse-hairline-border)] bg-surface px-3 py-1 text-[11px] font-bold text-textMuted hover:text-cyan hover:border-cyan/40 transition"
              title="Đổi chiều chuyển đổi"
            >
              <ArrowDownUp className="h-3 w-3" />
              <span>{t("calendar.swap") ?? "Đổi chiều"}</span>
            </button>
          </div>

          <label className="grid gap-1">
            <span className="text-[10px] font-semibold text-textMuted uppercase">
              {t("calendar.toTimezone") ?? "Múi giờ đích"}
            </span>
            <select
              value={convertForm.target_timezone}
              onChange={(event) =>
                setConvertForm((current) => ({
                  ...current,
                  target_timezone: event.target.value,
                }))
              }
              className="field-control px-2 py-1.5 text-xs"
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
          className="w-full inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white hover:bg-primaryHover disabled:opacity-60 transition"
        >
          {isConverting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          <span>{t("calendar.convert") ?? "Chuyển đổi ngay"}</span>
        </button>
      </div>

      {convertError ? (
        <p className="mt-3 rounded-lg border border-vermilion/20 bg-vermilion/10 p-2.5 text-xs text-vermilion">
          {convertError}
        </p>
      ) : null}

      {convertResult ? (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-cyan/30 bg-cyan/10 p-3 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan">
              {t("calendar.source")} ({timezoneShortName(convertResult.source_timezone)})
            </p>
            <p className="mt-1 font-mono font-bold text-ink">
              {formatApiDateTime(convertResult.source_datetime)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              {t("calendar.target")} ({timezoneShortName(convertResult.target_timezone)})
            </p>
            <p className="mt-1 font-mono font-bold text-ink">
              {formatApiDateTime(convertResult.target_datetime)}
            </p>
          </div>
        </div>
      ) : null}
    </form>
  );
}
