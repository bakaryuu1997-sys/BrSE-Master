"use client";

import { FileSpreadsheet } from "lucide-react";
import type { OperationRecord, OperationType, SlaEscalation } from "@/lib/operations";
import type { OperationsBriefingItem } from "./operationsWorkflow";
import { useUiLanguage } from "@/components/LanguageProvider";

type OperationsMorningBriefingProps = {
  isLoading: boolean;
  slaEscalations: SlaEscalation[];
  projectOpenQna: number;
  projectPendingCr: number;
  operationsBriefingItems: OperationsBriefingItem[];
  switchType: (type: OperationType) => void;
  setSelectedId: (id: string) => void;
};

function openRecord(record: OperationRecord, switchType: (type: OperationType) => void, setSelectedId: (id: string) => void) {
  switchType(record.type);
  setSelectedId(record.id);
}

export function OperationsMorningBriefing({
  isLoading,
  slaEscalations,
  projectOpenQna,
  projectPendingCr,
  operationsBriefingItems,
  switchType,
  setSelectedId,
}: OperationsMorningBriefingProps) {
  const { t } = useUiLanguage();

  if (isLoading || (slaEscalations.length === 0 && projectOpenQna === 0 && projectPendingCr === 0)) {
    return null;
  }

  return (
    <section className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
          <FileSpreadsheet className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/80">Morning Briefing</p>
          <p className="text-sm font-black text-textPrimary">{t("operations.briefingTitle")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {projectOpenQna > 0 ? (
          <button
            type="button"
            onClick={() => switchType("qna")}
            className="flex items-center gap-3 rounded-xl border border-amber-400/20 bg-background/40 p-3 text-left transition hover:border-amber-400/40 hover:bg-amber-400/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-xl">Q</span>
            <div>
              <p className="text-xs font-black text-textPrimary">
                {t("operations.qnaWaiting").replace("{count}", String(projectOpenQna))}
              </p>
              <p className="text-[10px] text-textMuted">{t("operations.briefingWaiting")}</p>
            </div>
          </button>
        ) : null}

        {projectPendingCr > 0 ? (
          <button
            type="button"
            onClick={() => switchType("cr")}
            className="flex items-center gap-3 rounded-xl border border-primary/20 bg-background/40 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xl">CR</span>
            <div>
              <p className="text-xs font-black text-textPrimary">
                {t("operations.crPendingCount").replace("{count}", String(projectPendingCr))}
              </p>
              <p className="text-[10px] text-textMuted">{t("operations.briefingApprove")}</p>
            </div>
          </button>
        ) : null}

        {slaEscalations.length > 0 ? (
          <button
            type="button"
            onClick={() => openRecord(slaEscalations[0].record, switchType, setSelectedId)}
            className="flex items-center gap-3 rounded-xl border border-rose-500/25 bg-background/40 p-3 text-left transition hover:border-rose-500/40 hover:bg-rose-500/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-xl">!</span>
            <div>
              <p className="text-xs font-black text-textPrimary">
                {t("operations.slaBreachedCount").replace("{count}", String(slaEscalations.length))}
              </p>
              <p className="text-[10px] text-textMuted">{t("operations.briefingEscalate")}</p>
            </div>
          </button>
        ) : null}
      </div>

      {operationsBriefingItems.length > 0 ? (
        <div className="mt-4 grid gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted/70">{t("operations.topUrgentRecords")}</p>
          {operationsBriefingItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openRecord(item.record, switchType, setSelectedId)}
              className={`flex items-start justify-between gap-3 rounded-xl border bg-background/45 p-3 text-left transition hover:-translate-y-0.5 ${
                item.tone === "danger"
                  ? "border-rose-500/25 hover:border-rose-500/45"
                  : item.tone === "warning"
                    ? "border-amber-400/25 hover:border-amber-400/45"
                    : "border-primary/25 hover:border-primary/45"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                      item.tone === "danger"
                        ? "bg-rose-500/15 text-rose-300"
                        : item.tone === "warning"
                          ? "bg-amber-400/15 text-amber-200"
                          : "bg-primary/15 text-primary"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="truncate text-xs font-black text-textPrimary">{item.title}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-textMuted">{item.helper}</p>
              </div>
              <span className="shrink-0 text-[10px] font-bold text-primary">Open</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
