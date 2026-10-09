"use client";

import { Search, ChevronRight, CheckCircle2, Link2, ExternalLink, FileText, AlertTriangle, Bell } from "lucide-react";
import { WorkflowItem, FilterMode, Priority, isOverdue, isDeadlineSoon, isStaleDone, parseNoteChecklist } from "./useTodoProjectSync";
import { type OperationRecord } from "@/lib/operations";
import { TodoPhaseSidebar } from "./TodoPhaseSidebar";
import { TodoTaskFilters } from "./TodoTaskFilters";

interface TodoTaskBoardProps {
  t: any;
  items: WorkflowItem[];
  operations: OperationRecord[];
  activePhase: string;
  filter: FilterMode;
  setFilter: (filter: FilterMode) => void;
  query: string;
  setQuery: (query: string) => void;
  expandedItemId: string;
  setExpandedItemId: (id: string) => void;
  subtaskDrafts: Record<string, string>;
  setSubtaskDrafts: any;
  itemListRef: any;
  phaseListRef: any;
  phaseButtonRefs: any;
  phaseStats: any[];
  selectPhase: (phase: string) => void;
  previousPhase: string;
  nextPhaseName: string;
  selectedPhaseStat: any;
  filteredItems: WorkflowItem[];
  staleDoneItems: WorkflowItem[];
  dailyReport: string;
  copyDailyReport: () => void;
  reportCopied: boolean;
  nextFocus: WorkflowItem[];
  deadlineRiskItems: WorkflowItem[];
  toggleItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<WorkflowItem>) => void;
  toggleSubtask: (item: WorkflowItem, index: number) => void;
  addSubtask: (item: WorkflowItem) => void;
  attachEvidenceImageFromClipboard: (id: string, file: File) => void;
  setActivePhase: (phase: string) => void;
}

export function TodoTaskBoard({
  t,
  items,
  operations,
  activePhase,
  filter,
  setFilter,
  query,
  setQuery,
  expandedItemId,
  setExpandedItemId,
  subtaskDrafts,
  setSubtaskDrafts,
  itemListRef,
  phaseListRef,
  phaseButtonRefs,
  phaseStats,
  selectPhase,
  previousPhase,
  nextPhaseName,
  selectedPhaseStat,
  filteredItems,
  staleDoneItems,
  dailyReport,
  copyDailyReport,
  reportCopied,
  nextFocus,
  deadlineRiskItems,
  toggleItem,
  updateItem,
  toggleSubtask,
  addSubtask,
  attachEvidenceImageFromClipboard,
  setActivePhase,
}: TodoTaskBoardProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)_230px] 2xl:grid-cols-[240px_minmax(0,1fr)_250px]">
      <TodoPhaseSidebar
        t={t}
        activePhase={activePhase}
        phaseListRef={phaseListRef}
        phaseButtonRefs={phaseButtonRefs}
        phaseStats={phaseStats}
        selectPhase={selectPhase}
      />

      {/* Main Task List Panel */}
      <section className="brse-section min-w-0 p-5 xl:flex xl:flex-col">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">{selectedPhaseStat?.phase ?? activePhase}</h2>
            <p className="mt-1 text-sm text-textMuted">
              {selectedPhaseStat?.done ?? 0}/{selectedPhaseStat?.total ?? 0} {t("todo.completedInPhase")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {previousPhase ? (
              <button
                type="button"
                onClick={() => selectPhase(previousPhase)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 py-2 text-sm font-semibold text-textMuted hover:border-primary/35 hover:text-ink"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                {t("todo.previousPhase")}
              </button>
            ) : null}
            {nextPhaseName ? (
              <button
                type="button"
                onClick={() => selectPhase(nextPhaseName)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 py-2 text-sm font-semibold text-textMuted hover:border-primary/35 hover:text-ink"
              >
                {t("todo.nextPhase")}
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <TodoTaskFilters t={t} filter={filter} setFilter={setFilter} />

        {/* Search Input */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("todo.searchPlaceholder")}
            className="h-11 w-full rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-10 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        {/* Task Items List */}
        <div ref={itemListRef} className="grid gap-4 xl:pr-1">
          {filteredItems.map((item) => {
            const linkedOperation = operations.find((operation) => operation.id === item.operationId);
            const isExpanded = expandedItemId === item.id;
            const checklistItems = parseNoteChecklist(item.note);
            return (
              <article
                key={item.id}
                className={`brse-card transition-all duration-300 ${
                  item.done
                    ? "border-success/20 bg-success/5 opacity-70"
                    : isOverdue(item)
                      ? "border-danger/30 bg-danger/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                      : isDeadlineSoon(item)
                        ? "border-amber-400/30 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                        : "bg-surface/40 hover:bg-surface/60"
                }`}
              >
                <div className="flex min-w-0 items-center gap-4 p-4">
                  <label className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--brse-panel-border)] bg-background/60 shadow-sm transition hover:border-primary/50">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleItem(item.id)}
                      className="h-6 w-6 rounded border-[var(--brse-panel-border)] bg-background accent-primary"
                      aria-label={`${t("todo.markDone")} ${(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}`}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setExpandedItemId(isExpanded ? "" : item.id)}
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-3">
                      <span className={`min-w-0 truncate text-base font-display font-extrabold tracking-tight ${item.done ? "text-muted line-through" : "text-textPrimary"}`}>
                        {(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          item.priority === "P0"
                            ? "bg-danger text-white shadow-glow-sm shadow-danger/40"
                            : item.priority === "P1"
                              ? "bg-amber-400 text-black"
                              : "bg-primary text-white"
                        }`}
                      >
                        {item.priority}
                      </span>
                      {item.done ? (
                        <span className="inline-flex items-center gap-1 rounded bg-green-400/10 px-2 py-0.5 text-xs font-semibold text-green-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("todo.done")}
                        </span>
                      ) : null}
                      {isOverdue(item) ? (
                        <span className="rounded bg-vermilion/15 px-2 py-0.5 text-xs font-semibold text-vermilion">
                          {t("todo.overdue")}
                        </span>
                      ) : isDeadlineSoon(item) ? (
                        <span className="rounded bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                          {t("todo.dueSoon")}
                        </span>
                      ) : null}
                      {item.deadline ? <span className="rounded bg-background px-2 py-0.5 text-xs text-textMuted">Due {item.deadline}</span> : null}
                      {linkedOperation ? (
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          <Link2 className="h-3 w-3" />
                          {linkedOperation.type.toUpperCase()}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-xs text-textMuted">{(t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) !== `todo.workflow.${item.id}.detail` ? (t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) : item.detail}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedItemId(isExpanded ? "" : item.id)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--brse-panel-border)] bg-background/70 text-textMuted hover:border-primary/35 hover:text-primary"
                    aria-label={isExpanded ? t("todo.closeTodo") : t("todo.openTodo")}
                  >
                    <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                </div>

                {isExpanded ? (
                  <div className="grid gap-4 border-t border-[var(--brse-panel-border)] p-4">
                    <p className="text-sm leading-6 text-textMuted">{(t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) !== `todo.workflow.${item.id}.detail` ? (t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) : item.detail}</p>

                    <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/35 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Sub-task checklist</p>
                          <p className="mt-1 text-[11px] text-textMuted">Lưu trong note bằng markdown checklist để không cần migration DB.</p>
                        </div>
                        {checklistItems.length ? (
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                            {checklistItems.filter((task) => task.done).length}/{checklistItems.length}
                          </span>
                        ) : null}
                      </div>

                      {checklistItems.length ? (
                        <div className="mb-3 grid gap-2">
                          {checklistItems.map((task) => (
                            <label
                              key={`${item.id}-${task.lineIndex}`}
                              className="flex items-start gap-2 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] px-3 py-2 text-sm text-textPrimary"
                            >
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => toggleSubtask(item, task.lineIndex)}
                                className="mt-1 h-4 w-4 rounded border-[var(--brse-panel-border)] bg-background accent-primary"
                              />
                              <span className={task.done ? "text-textMuted line-through" : ""}>{task.text}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="mb-3 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] px-3 py-2 text-xs text-textMuted">
                          Chưa có sub-task. Thêm checklist nhỏ để chia task thành bước xử lý.
                        </p>
                      )}

                      <div className="flex gap-2">
                        <input
                          value={subtaskDrafts[item.id] || ""}
                          onChange={(event) => setSubtaskDrafts((current: any) => ({ ...current, [item.id]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addSubtask(item);
                            }
                          }}
                          placeholder="Thêm sub-task, ví dụ: xác nhận spec với khách"
                          className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-sm text-ink outline-none placeholder:text-textMuted focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => addSubtask(item)}
                          className="rounded-lg bg-primary px-4 text-xs font-black text-white transition hover:bg-primaryHover"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                      <label className="grid gap-1 text-xs font-semibold text-textMuted">
                        {t("todo.deadline")}
                        <input
                          type="date"
                          value={item.deadline}
                          onChange={(event) => updateItem(item.id, { deadline: event.target.value })}
                          className="h-10 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-sm text-ink outline-none focus:border-primary"
                        />
                      </label>
                      <div className="grid gap-1 text-xs font-semibold text-textMuted lg:col-span-2">
                        <span>{t("todo.evidenceLabel") || "Evidence (Bằng chứng)"}</span>
                        <span className="text-[10px] font-normal text-textMuted">{t("todo.archiveNote") || "Đính kèm Jira/Chatwork/Meeting quote làm bằng chứng hoàn thành."}</span>
                        
                        {/* Evidences list */}
                        <div className="mt-2 space-y-2">
                          {item.evidences && item.evidences.length > 0 ? (
                            <div className="grid gap-2">
                              {item.evidences.map((ev, index) => (
                                <div key={index} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--brse-panel-border)] bg-background/60 p-2.5 text-xs text-textPrimary">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                      ev.type === "jira" ? "bg-orange-600/20 text-orange-300" :
                                      ev.type === "chatwork" ? "bg-red-600/20 text-red-300" :
                                      ev.type === "meeting" ? "bg-orange-600/20 text-orange-300" :
                                      ev.type === "minutes" ? "bg-teal-600/20 text-teal-300" :
                                      ev.type === "image" ? "bg-emerald-600/20 text-emerald-300" : "bg-primary/20 text-primary"
                                    }`}>
                                      {ev.type}
                                    </span>
                                    <span className="truncate max-w-[200px]" title={ev.url}>
                                      {ev.url}
                                    </span>
                                    {ev.quote ? (
                                      <span className="text-[11px] text-textMuted italic truncate max-w-[180px]">
                                        &ldquo;{ev.quote}&rdquo;
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    {ev.url.startsWith("http") ? (
                                      <a href={ev.url} target="_blank" rel="noreferrer" className="text-primary hover:text-primaryHover">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (item.evidences || []).filter((_, idx) => idx !== index);
                                        updateItem(item.id, { evidences: updated });
                                      }}
                                      className="text-rose-400 hover:text-rose-500 font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-textMuted italic">{t("todo.noEvidences")}</p>
                          )}
                        </div>

                        {/* Add evidence form */}
                        <div className="mt-3 flex flex-wrap gap-2 items-center">
                          <select
                            id={`new-evidence-type-${item.id}`}
                            className="h-9 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-2 text-xs text-ink outline-none focus:border-primary"
                          >
                            <option value="jira">Jira Link</option>
                            <option value="chatwork">Chatwork Excerpt</option>
                            <option value="meeting">Meeting Quote</option>
                            <option value="minutes">Minutes Link</option>
                            <option value="image">Image URL</option>
                            <option value="other">Other</option>
                          </select>
                          <input
                            id={`new-evidence-url-${item.id}`}
                            placeholder="URL / Link"
                            onPaste={(event) => {
                              const file = event.clipboardData.files?.[0];
                              if (file && file.type.startsWith("image/")) {
                                event.preventDefault();
                                attachEvidenceImageFromClipboard(item.id, file);
                              }
                            }}
                            className="h-9 min-w-[120px] flex-1 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-xs text-ink outline-none focus:border-primary"
                          />
                          <input
                            id={`new-evidence-quote-${item.id}`}
                            placeholder={t("todo.quotePlaceholder")}
                            className="h-9 min-w-[120px] flex-1 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-xs text-ink outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const typeEl = document.getElementById(`new-evidence-type-${item.id}`) as HTMLSelectElement;
                              const urlEl = document.getElementById(`new-evidence-url-${item.id}`) as HTMLInputElement;
                              const quoteEl = document.getElementById(`new-evidence-quote-${item.id}`) as HTMLInputElement;
                              if (urlEl && urlEl.value.trim()) {
                                const type = typeEl.value;
                                const url = urlEl.value.trim();
                                const quote = quoteEl.value.trim() || undefined;
                                const newEv = { type, url, quote };
                                const updated = [...(item.evidences || []), newEv];
                                updateItem(item.id, { evidences: updated, evidenceUrl: url });
                                urlEl.value = "";
                                quoteEl.value = "";
                              }
                            }}
                            className="h-9 rounded-lg bg-primary px-3 text-xs font-black text-white hover:bg-primaryHover"
                          >
                            {t("todo.add")}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                      <label className="grid gap-1 text-xs font-semibold text-textMuted">
                        {t("todo.operationLink")}
                        <select
                          value={item.operationId}
                          onChange={(event) => updateItem(item.id, { operationId: event.target.value })}
                          className="h-10 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-sm text-ink outline-none focus:border-primary"
                        >
                          <option value="">{t("todo.noLink")}</option>
                          {operations.map((operation) => (
                            <option key={operation.id} value={operation.id}>
                              {operation.type.toUpperCase()} · {operation.title}
                            </option>
                          ))}
                        </select>
                        {linkedOperation ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                            <Link2 className="h-3 w-3" />
                            {linkedOperation.status} · {linkedOperation.priority}
                          </span>
                        ) : null}
                      </label>
                      <label className="grid gap-1 text-xs font-semibold text-textMuted">
                        {t("todo.note")}
                        <textarea
                          value={item.note}
                          onChange={(event) => updateItem(item.id, { note: event.target.value })}
                          placeholder={t("todo.notePlaceholder")}
                          className="min-h-20 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-textMuted focus:border-primary"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
          {!filteredItems.length ? (
            <div className="brse-card brse-card-muted p-6 text-center text-sm text-textMuted">
              {t("todo.noMatch")}
            </div>
          ) : null}

          {staleDoneItems.length ? (
            <details className="rounded-lg border border-[var(--brse-panel-border)] bg-background/40 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-textMuted">
                {t("todo.archiveDoneOver7Days")} ({staleDoneItems.length})
              </summary>
              <ul className="mt-2 grid gap-2 text-xs text-textMuted">
                {staleDoneItems.slice(0, 40).map((item) => (
                  <li key={item.id} className="flex justify-between gap-2 rounded border border-[var(--brse-panel-border)] px-2 py-1">
                    <span className="truncate">{(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}</span>
                    <span className="shrink-0 text-[10px]">{item.updatedAt?.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </section>

      {/* Right Sidebar */}
      <aside className="space-y-3 xl:sticky xl:top-6 xl:w-full xl:self-start xl:justify-self-end">
        {/* Daily Report */}
        <div className="brse-section p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-ink">{t("todo.dailyReport")}</h2>
          </div>
          <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--brse-panel-border)] bg-background p-2.5 text-[11px] leading-5 text-textMuted">
            {dailyReport}
          </pre>
          <button
            onClick={copyDailyReport}
            className="mt-3 w-full rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/25"
          >
            {reportCopied ? t("todo.copied") : t("todo.copyDailyReport")}
          </button>
        </div>

        {/* Next Focus */}
        <div className="brse-section p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h2 className="text-base font-semibold text-ink">{t("todo.nextPriority")}</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {nextFocus.length ? (
              nextFocus.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePhase(item.phase);
                    setFilter("todo");
                    setExpandedItemId(item.id);
                  }}
                  className="rounded-lg border border-[var(--brse-panel-border)] bg-surface/50 p-2.5 text-left shadow-sm hover:border-primary/30 hover:bg-surfaceHover/80 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <p className="text-xs font-semibold leading-5 text-ink">
                    {item.priority} · {(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-textMuted">{item.phase}</p>
                  {item.deadline ? <p className="mt-2 text-[11px] font-semibold text-amber-300">Due {item.deadline}</p> : null}
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-green-400/30 bg-green-400/10 p-3 text-xs text-green-300">
                {t("todo.allDone")}
              </div>
            )}
          </div>
        </div>

        {/* Deadline Alerts */}
        <div className="brse-section p-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-ink">{t("todo.deadlineNotification")}</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {deadlineRiskItems.length ? (
              deadlineRiskItems.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActivePhase(item.phase);
                    setFilter("deadline");
                    setExpandedItemId(item.id);
                  }}
                  className={`rounded-lg border p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                    isOverdue(item)
                      ? "border-vermilion/20 bg-vermilion/10 text-vermilion shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:bg-vermilion/15"
                      : "border-amber-300/20 bg-amber-300/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:bg-amber-300/15"
                  }`}
                >
                  <p className="text-xs font-semibold leading-5">{(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}</p>
                  <p className="mt-1 text-[11px]">{item.deadline || item.phase}</p>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-[var(--brse-panel-border)] bg-surface/20 p-3 text-xs text-textMuted shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]">
                {t("todo.noDeadlineRisk")}
              </div>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
