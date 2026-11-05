"use client";

import { FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { type ReleaseDateCheckResponse } from "./useCalendarState";

interface CalendarReleaseCheckProps {
  t: any;
  releaseDate: string;
  setReleaseDate: (val: string) => void;
  isCheckingRelease: boolean;
  releaseError: string;
  releaseResult: ReleaseDateCheckResponse | null;
  checkReleaseDate: (event: FormEvent<HTMLFormElement>) => void;
}

export function CalendarReleaseCheck({
  t,
  releaseDate,
  setReleaseDate,
  isCheckingRelease,
  releaseError,
  releaseResult,
  checkReleaseDate,
}: CalendarReleaseCheckProps) {
  return (
    <form onSubmit={checkReleaseDate} className="rounded-xl border border-[var(--brse-panel-border)] bg-surface/40 p-4">
      <div className="flex items-center gap-2 border-b border-[var(--brse-hairline-border)] pb-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />
        <div>
          <h2 className="text-xs font-bold text-ink">
            {t("calendar.releaseCheckTitle") ?? "リリース日の確認"}
          </h2>
          <p className="text-[10px] text-textMuted">Cảnh báo ngày phát hành rơi vào cuối tuần hoặc ngày lễ Nhật/Việt</p>
        </div>
      </div>

      <div className="mt-3.5 space-y-2.5">
        <div className="flex items-center gap-2">
          <input
            type="date"
            required
            value={releaseDate}
            onChange={(event) => setReleaseDate(event.target.value)}
            className="field-control flex-1 px-2.5 py-1.5 text-xs font-mono"
          />
          <button
            type="submit"
            disabled={isCheckingRelease}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:bg-primaryHover disabled:opacity-60 transition shrink-0"
          >
            {isCheckingRelease ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{t("calendar.check") ?? "Kiểm tra"}</span>
          </button>
        </div>
      </div>
      {releaseError ? (
        <p className="mt-3 rounded-lg border border-vermilion/20 bg-vermilion/10 p-2.5 text-xs text-vermilion">
          {releaseError}
        </p>
      ) : null}
      {releaseResult ? (
        <div
          className={`mt-3 rounded-xl border p-3 text-xs ${
            releaseResult.has_warning
              ? "border-vermilion/20 bg-vermilion/10 text-vermilion"
              : "border-matcha/20 bg-matcha/10 text-matcha"
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {releaseResult.has_warning ? (
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{releaseResult.release_date}</span>
          </div>
          {releaseResult.has_warning ? (
            <ul className="mt-2 space-y-1 text-[11px] opacity-90">
              {releaseResult.warnings.map((warning) => (
                <li key={warning}>⚠️ {warning}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">{t("calendar.noReleaseWarning")}</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
