"use client";

import { ChangeEvent } from "react";
import { Cloud, CloudDownload, DatabaseBackup, Download, ShieldAlert, Upload } from "lucide-react";
import { type TranslationKey } from "@/lib/uiLanguage";

interface DataSafetyPanelProps {
  t: (key: TranslationKey) => string;
  isSyncing: boolean;
  onSyncLocalToPostgres: () => void;
  onRestoreFromPostgres: () => void;
  onExportLocal: () => void;
  onRestoreLocal: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function DataSafetyPanel({
  t,
  isSyncing,
  onSyncLocalToPostgres,
  onRestoreFromPostgres,
  onExportLocal,
  onRestoreLocal,
}: DataSafetyPanelProps) {
  return (
    <section className="mb-6 rounded-2xl bg-amber-300/10 p-4 ring-1 ring-amber-300/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300/30 bg-background/60 text-amber-300">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Data Safety</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{t("settings.backupTitle")}</h2>
            <p className="mt-1 max-w-5xl text-sm leading-6 text-textMuted">
              {t("settings.backupBody")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSyncLocalToPostgres}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-md border border-matcha/35 bg-matcha/10 px-4 py-2 text-sm font-semibold text-matcha transition hover:bg-matcha/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Cloud className="h-4 w-4" aria-hidden="true" />
            Sync PostgreSQL
          </button>
          <button
            type="button"
            onClick={onRestoreFromPostgres}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-md border border-cyan/35 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CloudDownload className="h-4 w-4" aria-hidden="true" />
            Restore DB
          </button>
          <button
            type="button"
            onClick={onExportLocal}
            className="inline-flex items-center gap-2 rounded-md border border-amber-300/35 bg-background/70 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/10"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export backup
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary/35 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Restore backup
            <input type="file" accept="application/json,.json" onChange={onRestoreLocal} className="hidden" />
          </label>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-background/45 px-3 py-2 text-xs text-textMuted ring-1 ring-border/35">
        <DatabaseBackup className="h-4 w-4 text-primary" aria-hidden="true" />
        {t("settings.syncPostgresDesc")}
      </div>
    </section>
  );
}
