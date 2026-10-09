"use client";

import { ChangeEvent } from "react";
import { Plus, Download, Clipboard, FileSpreadsheet, Upload } from "lucide-react";
import { configs } from "./operationsConfig";
import type { OperationType } from "@/lib/operations";


interface OperationsHeaderToolbarProps {
  t: (key: string) => string;
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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(configs) as OperationType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => switchType(type)}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              activeType === type
                ? "border-primary/40 bg-primary/15 text-white"
                : "border-[var(--brse-panel-border)] bg-background/70 text-textMuted hover:border-primary/35 hover:text-ink"
            }`}
          >
            {type === "qna" ? t("operations.qnaTitle") : type === "bug" ? t("operations.bugTitle") : t("operations.crTitle")}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo item
        </button>
        <button
          type="button"
          onClick={() => setCompactMode((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition print:hidden ${
            compactMode
              ? "border-matcha/35 bg-matcha/10 text-matcha"
              : "border-[var(--brse-panel-border)] bg-background/70 text-ink hover:border-primary/40"
          }`}
        >
          {compactMode ? t("operations.compactOn") : t("operations.compactOff")}
        </button>
        <details className="relative print:hidden">
          <summary className="field-control inline-flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold text-ink">
            <Download className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("operations.importExport")}
          </summary>
          <div className="absolute right-0 z-20 mt-2 grid w-56 gap-2 rounded-xl border border-[var(--brse-panel-border)] bg-surface p-2 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <button
              type="button"
              onClick={() => window.print()}
              className="field-control inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-ink"
            >
              <Clipboard className="h-4 w-4 text-primary" aria-hidden="true" /> {t("operations.exportPdf")}
            </button>
            <button
              id="export-excel-jp-btn"
              type="button"
              onClick={handleExportCsv}
              className="field-control inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-ink"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-400" aria-hidden="true" />
              CSV JP ({filteredRecordsCount}件)
            </button>
            <label className="field-control inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold text-ink">
              <Upload className="h-4 w-4 text-primary" aria-hidden="true" /> Import CSV
              <input type="file" accept=".csv,text/csv" onChange={handleImportCsv} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => downloadImportTemplate(activeType)}
              className="field-control inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-ink"
            >
              <Download className="h-4 w-4 text-textMuted" aria-hidden="true" /> Template
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
