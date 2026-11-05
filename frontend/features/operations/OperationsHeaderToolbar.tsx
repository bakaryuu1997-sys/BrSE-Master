"use client";

import { ChangeEvent } from "react";
import { Plus, Download, Clipboard, FileSpreadsheet, Upload } from "lucide-react";
import { configs } from "./operationsConfig";
import type { OperationType } from "@/lib/operations";
import type { useUiLanguage } from "@/components/LanguageProvider";

type Translate = ReturnType<typeof useUiLanguage>["t"];

interface OperationsHeaderToolbarProps {
  t: Translate;
  activeType: OperationType;
  switchType: (type: OperationType) => void;
  startCreate: () => void;
  compactMode: boolean;
  setCompactMode: (updater: (curr: boolean) => boolean) => void;
  filteredRecordsCount: number;
  handleExportCsv: () => void;
  handleImportCsv: (event: ChangeEvent<HTMLInputElement>) => void;
  downloadImportTemplate: (type: OperationType) => void;
}

export function OperationsHeaderToolbar({
  t,
  activeType,
  switchType,
  startCreate,
  compactMode,
  setCompactMode,
  filteredRecordsCount,
  handleExportCsv,
  handleImportCsv,
  downloadImportTemplate,
}: OperationsHeaderToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 my-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(configs) as OperationType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => switchType(type)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
              activeType === type
                ? "border-primary/40 bg-primary/20 text-primary shadow-sm shadow-primary/20"
                : "border-[var(--brse-panel-border)] bg-surface text-textMuted hover:border-primary/30 hover:text-ink"
            }`}
          >
            {type === "qna" ? t("operations.qnaTitle") : type === "bug" ? t("operations.bugTitle") : t("operations.crTitle")}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-primary/20 transition hover:bg-primaryHover active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t("operations.create")}
        </button>
        <button
          type="button"
          onClick={() => setCompactMode((current) => !current)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition print:hidden ${
            compactMode
              ? "border-matcha/35 bg-matcha/10 text-matcha"
              : "border-[var(--brse-panel-border)] bg-surface text-textMuted hover:text-ink hover:border-primary/30"
          }`}
        >
          {compactMode ? t("operations.compactOn") : t("operations.compactOff")}
        </button>
        <details className="relative print:hidden">
          <summary className="field-control inline-flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-ink">
            <Download className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {t("operations.importExport")}
          </summary>
          <div className="absolute right-0 z-20 mt-1.5 grid w-52 gap-1.5 rounded-xl border border-[var(--brse-panel-border)] bg-surface p-2 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <button
              type="button"
              onClick={() => window.print()}
              className="field-control inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-ink"
            >
              <Clipboard className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {t("operations.exportPdf")}
            </button>
            <button
              id="export-excel-jp-btn"
              type="button"
              onClick={handleExportCsv}
              className="field-control inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-ink"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
              CSV JP ({filteredRecordsCount}件)
            </button>
            <label className="field-control inline-flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-ink">
              <Upload className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Import CSV
              <input type="file" accept=".csv,text/csv" onChange={handleImportCsv} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => downloadImportTemplate(activeType)}
              className="field-control inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-ink"
            >
              <Download className="h-3.5 w-3.5 text-textMuted" aria-hidden="true" /> Template ({activeType.toUpperCase()})
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
