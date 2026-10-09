"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Mail,
  ShieldCheck,
  Clipboard,
  CheckSquare,
} from "lucide-react";
import { SkeletonCard } from "@/components/PageHeader";
import {
  type OperationRecord,
  type OperationType,
  type SlaEscalation,
} from "@/lib/operations";
import { type BrseTodoOperationLink } from "@/lib/brseTodo";
import { useUiLanguage } from "@/components/LanguageProvider";
import { OperationsListView } from "./OperationsListView";
import { OperationsKanbanView } from "./OperationsKanbanView";
import { todayIso } from "./operationsHelpers";

type Translate = ReturnType<typeof useUiLanguage>["t"];

type QnaAgingItem = {
  record: OperationRecord;
  age: number;
  overdue: boolean;
};

type OperationsWorkSurfaceProps = {
  t: Translate;
  compactMode: boolean;
  isLoading: boolean;
  query: string;
  setQuery: (value: string) => void;
  filteredRecords: OperationRecord[];
  selectedRecords: Set<string>;
  activeType: OperationType;
  toggleRecordSelection: (id: string) => void;
  selectedRecord: OperationRecord | null;
  setSelectedId: (id: string) => void;
  setActiveType: (type: OperationType) => void;
  startEdit: (record: OperationRecord) => void;
  removeRecord: (recordId: string) => void | Promise<void>;
  linkedOperationIds: Set<string>;
  qnaAging: QnaAgingItem[];
  slaEscalations: SlaEscalation[];
  applySlaEscalation: (record: OperationRecord, reason: string, suggestedAction: string) => void | Promise<void>;
  isBatchMode: boolean;
  selectedTodoLinks: BrseTodoOperationLink[];
  syncSelectedOperationToTodo: () => void;
  emailPreview: string;
  emailSubject: string;
  copyEmail: () => void | Promise<void>;
  openGmail: () => void;
};

export function OperationsWorkSurface({
  t,
  compactMode,
  isLoading,
  query,
  setQuery,
  filteredRecords,
  selectedRecords,
  activeType,
  toggleRecordSelection,
  selectedRecord,
  setSelectedId,
  setActiveType,
  startEdit,
  removeRecord,
  linkedOperationIds,
  qnaAging,
  slaEscalations,
  applySlaEscalation,
  isBatchMode,
  selectedTodoLinks,
  syncSelectedOperationToTodo,
  emailPreview,
  emailSubject,
  copyEmail,
  openGmail,
}: OperationsWorkSurfaceProps) {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  return (
          <div className={`mt-5 grid gap-5 ${compactMode ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_420px]"}`}>
            <section className={`grid gap-3 self-start ${isLoading ? "opacity-50" : ""}`}>
              {/* View Mode Switcher */}
              <div className="mb-2 flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                      viewMode === "list"
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "text-textMuted border-transparent hover:text-textPrimary hover:bg-white/[0.02]"
                    }`}
                  >
                    {t("operations.listView")}
                  </button>
                  <button
                    onClick={() => setViewMode("kanban")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                      viewMode === "kanban"
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "text-textMuted border-transparent hover:text-textPrimary hover:bg-white/[0.02]"
                    }`}
                  >
                    {t("operations.kanbanView")}
                  </button>
                </div>
              </div>

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("operations.search")}
                className="field-control px-3 py-2 text-sm placeholder:text-textMuted/70"
              />
              {isLoading ? (
                <div className="grid gap-3">
                  <SkeletonCard rows={4} />
                  <SkeletonCard rows={4} />
                  <SkeletonCard rows={3} />
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="brse-card brse-card-muted p-8 text-center text-sm text-textMuted">{t("operations.noItems")}</div>
              ) : viewMode === "list" ? (
                <OperationsListView
                  t={t}
                  filteredRecords={filteredRecords}
                  selectedRecords={selectedRecords}
                  selectedRecord={selectedRecord}
                  activeType={activeType}
                  linkedOperationIds={linkedOperationIds}
                  toggleRecordSelection={toggleRecordSelection}
                  setSelectedId={setSelectedId}
                  startEdit={startEdit}
                  removeRecord={removeRecord}
                />
              ) : (
                <OperationsKanbanView
                  filteredRecords={filteredRecords}
                  selectedRecords={selectedRecords}
                  selectedRecord={selectedRecord}
                  activeType={activeType}
                  toggleRecordSelection={toggleRecordSelection}
                  setSelectedId={setSelectedId}
                  startEdit={startEdit}
                />
              )}
            </section>
    
            <aside className={`brse-section p-5 ${compactMode ? "" : "xl:sticky xl:top-5 xl:self-start"}`}>
              {/* Aging Monitor */}
              <div className="mb-4 rounded-md border border-amber-300/25 bg-amber-300/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">{t("operations.agingMonitor")}</p>
                    <p className="mt-1 text-xs text-textMuted">{t("operations.agingBody")}</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden="true" />
                </div>
                <div className="mt-3 grid gap-2">
                  {qnaAging.length ? qnaAging.map(({ record, age, overdue }) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setActiveType("qna");
                        setSelectedId(record.id);
                      }}
                      className="rounded border border-[var(--brse-panel-border)] bg-background/55 px-3 py-2 text-left text-xs transition hover:border-amber-300/45"
                    >
                      <span className="line-clamp-1 font-semibold text-ink">{record.title}</span>
                      <span className={`mt-1 block ${overdue ? "text-vermilion" : "text-textMuted"}`}>
                        {age} {t("operations.ageDays")} · {record.customerOwner || record.owner || "-"} · {record.dueDate || t("operations.noDueDate")}
                      </span>
                    </button>
                  )) : (
                    <p className="rounded border border-[var(--brse-panel-border)] bg-background/55 p-3 text-xs text-textMuted">{t("operations.noSlaRisk")}</p>
                  )}
                </div>
              </div>

              {/* SLA Auto Escalation */}
              <div className="mb-4 rounded-md border border-vermilion/25 bg-vermilion/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-vermilion">SLA Auto Escalation</p>
                    <p className="mt-1 text-xs text-textMuted">{t("operations.autoEscalationDesc")}</p>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-vermilion" aria-hidden="true" />
                </div>
                <div className="mt-3 grid gap-2">
                  {slaEscalations.length ? slaEscalations.map((item) => (
                    <div key={item.record.id} className="rounded border border-[var(--brse-panel-border)] bg-background/55 p-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveType("qna");
                          setSelectedId(item.record.id);
                        }}
                        className="line-clamp-1 text-left font-semibold text-ink transition hover:text-primary"
                      >
                        {item.record.title}
                      </button>
                      <p className={`mt-1 ${item.level === "critical" ? "text-vermilion" : "text-amber-300"}`}>
                        {item.reason} · Age {item.ageDays} {t("operations.ageDays")}
                      </p>
                      <p className="mt-1 leading-5 text-textMuted">{item.suggestedAction}</p>
                      <button
                        type="button"
                        onClick={() => applySlaEscalation(item.record, item.reason, item.suggestedAction)}
                        className="mt-2 inline-flex items-center gap-2 rounded-md border border-vermilion/30 bg-vermilion/10 px-3 py-1.5 text-xs font-semibold text-vermilion transition hover:bg-vermilion/15"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("operations.applyEscalation")}
                      </button>
                    </div>
                  )) : (
                    <p className="rounded border border-[var(--brse-panel-border)] bg-background/55 p-3 text-xs text-textMuted">{t("operations.noAutoEscalation")}</p>
                  )}
                </div>
              </div>
    
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    {isBatchMode ? `Batch Email (${selectedRecords.size} items)` : t("operations.emailDraft")}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-textMuted">{t("operations.copyOrGmail")}</p>
                </div>
                <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              {emailPreview ? (
                <>
                  {selectedRecord ? (
                    <div className="mt-4 rounded-md border border-[var(--brse-panel-border)] bg-background/55 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("operations.todoSync")}</p>
                          <p className="mt-1 text-sm text-textMuted">
                            {selectedTodoLinks.length
                              ? `${selectedTodoLinks.length} ${t("operations.todoLinked")}`
                              : t("operations.todoNotLinked")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={syncSelectedOperationToTodo}
                          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25"
                        >
                          <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("operations.syncTodo")}
                        </button>
                      </div>
                      {selectedTodoLinks.length ? (
                        <div className="mt-3 grid gap-2">
                          {selectedTodoLinks.map((link) => (
                            <div key={`${link.projectId}-${link.item.id}`} className="brse-card brse-card-muted px-3 py-2 text-xs">
                              <p className="font-semibold text-ink">{link.item.title}</p>
                              <p className="mt-1 text-textMuted">
                                {link.projectName} · {link.item.done ? "Done" : "Todo"} · {link.item.deadline || "No deadline"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-4 rounded-md border border-[var(--brse-panel-border)] bg-background/55 p-3 text-sm">
                    <p className="text-xs font-semibold text-textMuted">{t("operations.subject")}</p>
                    <p className="mt-1 font-semibold text-ink">{emailSubject}</p>
                  </div>
                  <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md border border-[var(--brse-panel-border)] bg-background/60 p-4 text-sm leading-7 text-ink">{emailPreview}</pre>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={copyEmail} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover">
                      <Clipboard className="h-4 w-4" aria-hidden="true" /> Copy
                    </button>
                    <button type="button" onClick={openGmail} className="inline-flex items-center gap-2 rounded-md border border-matcha/30 bg-matcha/10 px-4 py-2 text-sm font-semibold text-matcha transition hover:border-matcha/60">
                      <Mail className="h-4 w-4" aria-hidden="true" /> {t("operations.openGmail")}
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-4 rounded-md border border-[var(--brse-panel-border)] bg-background/55 p-4 text-sm text-textMuted">{t("operations.pickItem")}</p>
              )}
            </aside>
          </div>

  );
}
