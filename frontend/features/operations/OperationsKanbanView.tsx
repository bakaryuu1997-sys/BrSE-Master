"use client";

import React from "react";
import { Clock, CheckSquare, ArrowLeft, ArrowRight } from "lucide-react";
import {
  isDueToday,
  isOverdue,
  saveOperationRecord,
  type OperationRecord,
  type OperationType,
} from "@/lib/operations";
import { todayIso } from "./operationsHelpers";
import { useUiLanguage } from "@/components/LanguageProvider";
import { useNotify } from "@/components/ToastProvider";

interface OperationsKanbanViewProps {
  filteredRecords: OperationRecord[];
  selectedRecords: Set<string>;
  selectedRecord: OperationRecord | null;
  activeType: OperationType;
  toggleRecordSelection: (id: string) => void;
  setSelectedId: (id: string) => void;
  startEdit: (record: OperationRecord) => void;
}

export function OperationsKanbanView({
  filteredRecords,
  selectedRecords,
  selectedRecord,
  activeType,
  toggleRecordSelection,
  setSelectedId,
  startEdit,
}: OperationsKanbanViewProps) {
  const { t } = useUiLanguage();
  const { notify } = useNotify();

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const recordId = e.dataTransfer.getData("text/plain");
    const record = filteredRecords.find((r) => r.id === recordId);
    if (!record || record.status === targetStatus) return;

    try {
      await saveOperationRecord(
        {
          type: record.type,
          title: record.title,
          status: targetStatus,
          priority: record.priority,
          owner: record.owner,
          dueDate: record.dueDate,
          customerOwner: record.customerOwner,
          projectName: record.projectName,
          fieldA: record.fieldA,
          fieldB: record.fieldB,
          fieldC: record.fieldC,
          fieldD: record.fieldD,
          fieldE: record.fieldE,
        },
        record.id
      );
      window.location.reload();
    } catch {
      notify(t("operations.updateStatusError"), "error");
    }
  };

  const moveStatus = async (record: OperationRecord, direction: "prev" | "next") => {
    const statuses = ["Draft", "Sent", "Answered", "Closed"];
    const currentIdx = statuses.indexOf(record.status);
    if (currentIdx === -1) return;

    const nextIdx = direction === "next" ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx < 0 || nextIdx >= statuses.length) return;
    const targetStatus = statuses[nextIdx];

    try {
      await saveOperationRecord(
        {
          type: record.type,
          title: record.title,
          status: targetStatus,
          priority: record.priority,
          owner: record.owner,
          dueDate: record.dueDate,
          customerOwner: record.customerOwner,
          projectName: record.projectName,
          fieldA: record.fieldA,
          fieldB: record.fieldB,
          fieldC: record.fieldC,
          fieldD: record.fieldD,
          fieldE: record.fieldE,
        },
        record.id
      );
      window.location.reload();
    } catch {
      notify(t("operations.updateStatusError"), "error");
    }
  };

  const calculateSlaDays = (dueDateStr: string): number => {
    const due = new Date(dueDateStr);
    const today = new Date(todayIso());
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderKanbanCard = (record: OperationRecord) => {
    const isSelected = selectedRecords.has(record.id);

    // SLA Countdown Timer
    let slaBadge = null;
    if (
      record.dueDate &&
      !["Closed", "Implemented", "Approved", "Rejected", "Done"].includes(record.status)
    ) {
      const slaDays = calculateSlaDays(record.dueDate);
      if (slaDays < 0) {
        slaBadge = (
          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 animate-pulse">
            <Clock className="h-3 w-3" />
            <span>{t("operations.overdueDays").replace("{days}", String(-slaDays))}</span>
          </div>
        );
      } else if (slaDays <= 2) {
        slaBadge = (
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 animate-pulse">
            <Clock className="h-3 w-3" />
            <span>{slaDays === 0 ? t("operations.deadlineToday") : t("operations.deadlineRemaining").replace("{days}", String(slaDays))}</span>
          </div>
        );
      } else {
        slaBadge = (
          <div className="flex items-center gap-1 text-[10px] font-bold text-matcha">
            <Clock className="h-3 w-3" />
            <span>{t("operations.daysRemaining").replace("{days}", String(slaDays))}</span>
          </div>
        );
      }
    }

    return (
      <article
        key={record.id}
        draggable
        onDragStart={(e) => handleDragStart(e, record.id)}
        onClick={() => setSelectedId(record.id)}
        className={`brse-card cursor-grab p-3 space-y-2 border transition-all duration-300 hover:border-primary/30 hover:shadow-md ${
          selectedRecord?.id === record.id ? "border-primary/40 bg-primary/5 shadow-glow-sm" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-1.5">
          <h4 className="text-xs font-bold text-textPrimary leading-snug line-clamp-2">
            {record.title}
          </h4>
          {activeType === "qna" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleRecordSelection(record.id);
              }}
              className={`rounded transition shrink-0 ${
                isSelected ? "text-primary" : "text-textMuted hover:text-primary/70"
              }`}
            >
              <CheckSquare className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="text-[10px] text-textMuted flex items-center justify-between">
          <span className="truncate max-w-[100px]">{record.projectName || "General"}</span>
          <span>{record.owner || "-"}</span>
        </div>

        <div className="flex flex-wrap gap-1 items-center justify-between pt-1 border-t border-[var(--brse-panel-border)]">
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              record.priority === "Urgent" || record.priority === "High"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-white/5 text-textMuted border border-[var(--brse-panel-border)]"
            }`}
          >
            {record.priority}
          </span>
          {slaBadge}
        </div>

        {/* Transition Quick controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1">
            <button
              type="button"
              disabled={record.status === "Draft"}
              onClick={(e) => {
                e.stopPropagation();
                moveStatus(record, "prev");
              }}
              className="rounded-md border border-[var(--brse-panel-border)] bg-background/50 p-1 text-textMuted hover:text-textPrimary disabled:opacity-20 cursor-pointer"
              title={t("operations.prevStatus")}
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={record.status === "Closed"}
              onClick={(e) => {
                e.stopPropagation();
                moveStatus(record, "next");
              }}
              className="rounded-md border border-[var(--brse-panel-border)] bg-background/50 p-1 text-textMuted hover:text-textPrimary disabled:opacity-20 cursor-pointer"
              title={t("operations.nextStatus")}
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              startEdit(record);
            }}
            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
          >
            {t("operations.edit")}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-2">
      {/* Column 1: Draft */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, "Draft")}
        className="rounded-2xl border border-[var(--brse-panel-border)] bg-white/[0.015] p-3 flex flex-col min-h-[500px]"
      >
        <div className="mb-3 flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-2 px-1">
          <span className="text-xs font-black text-textPrimary uppercase">Draft / Open</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-textMuted">
            {filteredRecords.filter((r) => ["Draft", "Open"].includes(r.status)).length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[70vh]">
          {filteredRecords
            .filter((r) => ["Draft", "Open"].includes(r.status))
            .map((record) => renderKanbanCard(record))}
        </div>
      </div>

      {/* Column 2: Waiting Customer */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, "Sent")}
        className="rounded-2xl border border-[var(--brse-panel-border)] bg-white/[0.015] p-3 flex flex-col min-h-[500px]"
      >
        <div className="mb-3 flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-2 px-1">
          <span className="text-xs font-black text-cyan uppercase">Sent / Waiting</span>
          <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] text-cyan">
            {filteredRecords.filter((r) => ["Sent", "Waiting Customer"].includes(r.status)).length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[70vh]">
          {filteredRecords
            .filter((r) => ["Sent", "Waiting Customer"].includes(r.status))
            .map((record) => renderKanbanCard(record))}
        </div>
      </div>

      {/* Column 3: Answered */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, "Answered")}
        className="rounded-2xl border border-[var(--brse-panel-border)] bg-white/[0.015] p-3 flex flex-col min-h-[500px]"
      >
        <div className="mb-3 flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-2 px-1">
          <span className="text-xs font-black text-amber-300 uppercase">Answered</span>
          <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400">
            {filteredRecords.filter((r) => ["Answered", "Confirming"].includes(r.status)).length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[70vh]">
          {filteredRecords
            .filter((r) => ["Answered", "Confirming"].includes(r.status))
            .map((record) => renderKanbanCard(record))}
        </div>
      </div>

      {/* Column 4: Closed */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, "Closed")}
        className="rounded-2xl border border-[var(--brse-panel-border)] bg-white/[0.015] p-3 flex flex-col min-h-[500px]"
      >
        <div className="mb-3 flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-2 px-1">
          <span className="text-xs font-black text-emerald-400 uppercase">Closed</span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            {
              filteredRecords.filter((r) =>
                ["Closed", "Implemented", "Approved", "Rejected", "Done"].includes(r.status)
              ).length
            }
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[70vh]">
          {filteredRecords
            .filter((r) => ["Closed", "Implemented", "Approved", "Rejected", "Done"].includes(r.status))
            .map((record) => renderKanbanCard(record))}
        </div>
      </div>
    </div>
  );
}
