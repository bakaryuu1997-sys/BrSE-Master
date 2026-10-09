"use client";

import { AlertTriangle, CheckSquare, Edit3, Trash2 } from "lucide-react";
import {
  isDueToday,
  isOverdue,
  type OperationRecord,
  type OperationType,
} from "@/lib/operations";
import { todayIso } from "./operationsHelpers";

type Translate = (key: any) => string;

interface OperationsListViewProps {
  t: Translate;
  filteredRecords: OperationRecord[];
  selectedRecords: Set<string>;
  selectedRecord: OperationRecord | null;
  activeType: OperationType;
  linkedOperationIds: Set<string>;
  toggleRecordSelection: (id: string) => void;
  setSelectedId: (id: string) => void;
  startEdit: (record: OperationRecord) => void;
  removeRecord: (recordId: string) => void | Promise<void>;
}

export function OperationsListView({
  t,
  filteredRecords,
  selectedRecords,
  selectedRecord,
  activeType,
  linkedOperationIds,
  toggleRecordSelection,
  setSelectedId,
  startEdit,
  removeRecord,
}: OperationsListViewProps) {
  return (
    <div className="space-y-3">
      {filteredRecords.map((record) => {
        const overdue = isOverdue(record, todayIso());
        const dueToday = isDueToday(record, todayIso());
        const isSelected = selectedRecords.has(record.id);

        return (
          <article
            key={record.id}
            onClick={() => setSelectedId(record.id)}
            className={`brse-card cursor-pointer p-4 transition-all duration-300 hover:-translate-y-0.5 ${
              selectedRecord?.id === record.id
                ? "border-primary/40 bg-primary/5 shadow-glow-sm"
                : ""
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                {activeType === "qna" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRecordSelection(record.id);
                    }}
                    className={`mt-1 rounded transition ${
                      isSelected ? "text-primary" : "text-textMuted hover:text-primary/70"
                    }`}
                  >
                    <CheckSquare className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {overdue ? (
                      <AlertTriangle className="h-4 w-4 text-vermilion" aria-hidden="true" />
                    ) : null}
                    <h3 className="font-semibold text-ink">{record.title}</h3>
                  </div>
                  <p className="mt-2 text-xs text-textMuted">
                    {record.projectName || t("operations.noProject")} / {t("operations.owner")}:{" "}
                    {record.owner || "-"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 text-xs font-semibold">
                <span className="rounded border border-primary/25 bg-primary/10 px-2 py-1 text-primary">
                  {record.status}
                </span>
                <span className="rounded border border-[var(--brse-panel-border)] bg-background/60 px-2 py-1 text-textMuted">
                  {record.priority}
                </span>
                {record.dueDate ? (
                  <span
                    className={`rounded border px-2 py-1 ${
                      overdue
                        ? "border-vermilion/35 bg-vermilion/10 text-vermilion"
                        : dueToday
                        ? "border-amber-300/35 bg-amber-300/10 text-amber-300"
                        : "border-[var(--brse-panel-border)] bg-background/60 text-textMuted"
                    }`}
                  >
                    {record.dueDate}
                  </span>
                ) : null}
                {linkedOperationIds.has(record.id) ? (
                  <span className="rounded border border-matcha/30 bg-matcha/10 px-2 py-1 text-matcha">
                    Todo linked
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-textMuted pl-8">
              {record.fieldA || record.fieldB || "No detail"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 pl-8">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  startEdit(record);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-primary/40"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" /> {t("operations.edit")}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeRecord(record.id);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-vermilion/25 bg-background/70 px-3 py-1.5 text-xs font-semibold text-vermilion transition hover:bg-vermilion/10"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("operations.delete")}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
