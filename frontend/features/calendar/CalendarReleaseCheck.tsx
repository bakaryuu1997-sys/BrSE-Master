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
    <form onSubmit={checkReleaseDate} className="brse-section p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-vermilion" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-ink">
          {t("calendar.releaseCheckTitle")}
        </h2>
      </div>
      <p className="mt-2 text-sm text-textMuted">
        {t("calendar.releaseCheckDesc")}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="date"
          required
          value={releaseDate}
          onChange={(event) => setReleaseDate(event.target.value)}
          className="field-control flex-1 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isCheckingRelease}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCheckingRelease ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {t("calendar.check")}
        </button>
      </div>
      {releaseError ? (
        <p className="mt-4 rounded-md border border-vermilion/20 bg-vermilion/10 p-3 text-sm text-vermilion">
          {releaseError}
        </p>
      ) : null}
      {releaseResult ? (
        <div
          className={`mt-4 rounded-md border p-4 text-sm ${
            releaseResult.has_warning
              ? "border-vermilion/20 bg-vermilion/10 text-vermilion"
              : "border-matcha/20 bg-matcha/10 text-matcha"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {releaseResult.has_warning ? (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            {releaseResult.release_date}
          </div>
          {releaseResult.has_warning ? (
            <ul className="mt-3 grid gap-1">
              {releaseResult.warnings.map((warning) => (
                <li key={warning}>- {warning}</li>
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
