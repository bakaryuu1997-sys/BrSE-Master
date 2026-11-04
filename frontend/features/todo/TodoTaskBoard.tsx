"use client";

import { useState, useRef } from "react";
import { Search, ChevronRight, CheckCircle2, Link2, ExternalLink, FileText, FileSpreadsheet, Eye, AlertTriangle, Bell, Plus, Trash2, Upload, ClipboardPaste, Loader2, X } from "lucide-react";
import { WorkflowItem, FilterMode, Priority, isOverdue, isDeadlineSoon, isStaleDone, parseNoteChecklist } from "./useTodoProjectSync";
import { type OperationRecord } from "@/lib/operations";
import { TodoPhaseSidebar } from "./TodoPhaseSidebar";
import { TodoTaskFilters } from "./TodoTaskFilters";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { useNotify } from "@/components/ToastProvider";

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
  addNewItem?: (title: string, priority?: Priority, phase?: string) => void;
  deleteItem?: (id: string) => void;
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
  addNewItem,
  deleteItem,
  toggleSubtask,
  addSubtask,
  attachEvidenceImageFromClipboard,
  setActivePhase,
}: TodoTaskBoardProps) {
  const { notify } = useNotify();
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("P1");
  const [dockTab, setDockTab] = useState<"focus" | "report">("focus");
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [targetUploadItemId, setTargetUploadItemId] = useState<string | null>(null);
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function getItemEvidences(item: WorkflowItem): Array<{ type: string; url: string; quote?: string }> {
    const list = item.evidences && Array.isArray(item.evidences) ? [...item.evidences] : [];
    if (item.evidenceUrl && !list.some((ev) => ev.url === item.evidenceUrl)) {
      const isImg = item.evidenceUrl.match(/\.(png|jpg|jpeg|webp|gif|svg)($|\?)/i) !== null;
      list.unshift({ type: isImg ? "image" : "link", url: item.evidenceUrl, quote: item.evidenceUrl });
    }
    return list;
  }

  function handleAddLink(item: WorkflowItem) {
    const raw = (linkInputs[item.id] || "").trim();
    if (!raw) return;
    const current = getItemEvidences(item);
    if (current.some((ev) => ev.url === raw)) {
      setLinkInputs((prev) => ({ ...prev, [item.id]: "" }));
      return;
    }
    const isImg = raw.match(/\.(png|jpg|jpeg|webp|gif)($|\?)/i);
    const next = [...current, { type: isImg ? "image" : "link", url: raw, quote: raw }];
    updateItem(item.id, { evidences: next, evidenceUrl: raw });
    setLinkInputs((prev) => ({ ...prev, [item.id]: "" }));
  }

  function handleRemoveEvidence(item: WorkflowItem, index: number) {
    const current = getItemEvidences(item);
    current.splice(index, 1);
    const lastUrl = current.length ? current[current.length - 1].url : "";
    updateItem(item.id, { evidences: current, evidenceUrl: lastUrl });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !targetUploadItemId) return;
    setUploadingItemId(targetUploadItemId);
    try {
      await attachEvidenceImageFromClipboard(targetUploadItemId, file);
    } finally {
      setUploadingItemId(null);
      setTargetUploadItemId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handlePasteImage(itemId: string) {
    try {
      if (!navigator.clipboard?.read) {
        notify("Trình duyệt không hỗ trợ đọc clipboard tự động. Bạn hãy bấm vào ô Evidence rồi nhấn tổ hợp phím Ctrl + V để dán ảnh trực tiếp.", "info");
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const clipItem of clipboardItems) {
        const imageType = clipItem.types.find((typeStr) => typeStr.startsWith("image/"));
        if (imageType) {
          setUploadingItemId(itemId);
          try {
            const blob = await clipItem.getType(imageType);
            const file = new File([blob], `evidence-${Date.now()}.png`, { type: imageType });
            await attachEvidenceImageFromClipboard(itemId, file);
            return;
          } finally {
            setUploadingItemId(null);
          }
        }
      }
      notify("Không tìm thấy ảnh trong Clipboard. Vui lòng chụp màn hình hoặc copy ảnh trước khi dán!", "info");
    } catch {
      notify("Quyền truy cập Clipboard bị hạn chế. Hãy bấm vào ô 'Evidence / tài liệu' và nhấn Ctrl + V để dán ảnh.", "error");
    }
  }

  return (
    <section className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)_240px] 2xl:grid-cols-[220px_minmax(0,1fr)_260px]">
      {/* Hidden File Input for Evidence attachment: Images, PDF, Excel, Word, CSV, ZIP */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.xlsx,.xls,.docx,.doc,.pptx,.csv,.txt,.md,.html,.htm,.zip"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <TodoPhaseSidebar
        t={t}
        activePhase={activePhase}
        phaseListRef={phaseListRef}
        phaseButtonRefs={phaseButtonRefs}
        phaseStats={phaseStats}
        selectPhase={selectPhase}
      />

      {/* Main Task List Panel */}
      <section className="brse-section min-w-0 p-3 sm:p-4 lg:flex lg:flex-col">
        {/* Header: Phase Title & Prev/Next */}
        <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-[var(--brse-panel-border)]/50 pb-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="text-base font-bold text-ink truncate">{selectedPhaseStat?.phase ?? activePhase}</h2>
            <span className="text-xs text-textMuted shrink-0">
              ({selectedPhaseStat?.done ?? 0}/{selectedPhaseStat?.total ?? 0} {t("todo.completedInPhase")})
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {previousPhase ? (
              <button
                type="button"
                onClick={() => selectPhase(previousPhase)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--brse-panel-border)] bg-background/50 px-2 text-[11px] font-semibold text-textMuted hover:border-primary/40 hover:text-ink transition"
              >
                <ChevronRight className="h-3 w-3 rotate-180" />
                <span className="hidden sm:inline">{t("todo.previousPhase")}</span>
              </button>
            ) : null}
            {nextPhaseName ? (
              <button
                type="button"
                onClick={() => selectPhase(nextPhaseName)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--brse-panel-border)] bg-background/50 px-2 text-[11px] font-semibold text-textMuted hover:border-primary/40 hover:text-ink transition"
              >
                <span className="hidden sm:inline">{t("todo.nextPhase")}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Quick Inline Add Task */}
        {addNewItem ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (quickTitle.trim()) {
                addNewItem(quickTitle.trim(), quickPriority, selectedPhaseStat?.phase ?? activePhase);
                setQuickTitle("");
              }
            }}
            className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 p-1.5 shadow-sm"
          >
            <input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder={`+ Thêm việc mới cho ${selectedPhaseStat?.phase ?? activePhase}... (Enter)`}
              className="field-control flex-1 h-7.5 text-xs bg-background/70 text-ink placeholder:text-textMuted/70 border-[var(--brse-panel-border)]"
            />
            <button
              type="button"
              onClick={() => setQuickPriority((p) => (p === "P0" ? "P1" : p === "P1" ? "P2" : "P0"))}
              className={`h-7.5 rounded px-2 text-[10px] font-black transition ${
                quickPriority === "P0"
                  ? "bg-danger text-white shadow-sm"
                  : quickPriority === "P1"
                    ? "bg-amber-400 text-black font-extrabold"
                    : "bg-primary text-white"
              }`}
              title="Đổi mức độ ưu tiên (P0 / P1 / P2)"
            >
              {quickPriority}
            </button>
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="inline-flex h-7.5 items-center gap-1 rounded bg-primary px-3 text-xs font-bold text-white hover:bg-primaryHover disabled:opacity-50 transition shadow"
            >
              <Plus className="h-3 w-3" />
              <span>{t("todo.add") ?? "Thêm"}</span>
            </button>
          </form>
        ) : null}

        {/* Search Input & Task Filters in 1 Row */}
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textMuted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("todo.searchPlaceholder")}
              className="field-control w-full py-1 pl-8 pr-2.5 text-xs bg-background/50 text-ink placeholder:text-textMuted/70"
            />
          </div>
          <TodoTaskFilters t={t} filter={filter} setFilter={setFilter} />
        </div>

        {/* Task Items List */}
        <div ref={itemListRef} className="grid gap-2 lg:pr-1">
          {filteredItems.map((item) => {
            const linkedOperation = operations.find((operation) => operation.id === item.operationId);
            const isExpanded = expandedItemId === item.id;
            const checklistItems = parseNoteChecklist(item.note);
            const itemEvidences = getItemEvidences(item);
            return (
              <article
                key={item.id}
                className={`brse-card transition-all duration-200 ${
                  item.done
                    ? "border-success/20 bg-success/5 opacity-70"
                    : isOverdue(item)
                      ? "border-danger/30 bg-danger/10 shadow-[0_0_12px_rgba(239,68,68,0.1)]"
                      : isDeadlineSoon(item)
                        ? "border-amber-400/30 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.1)]"
                        : "bg-surface/40 hover:bg-surface/60"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3 p-2.5 sm:p-3">
                  <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--brse-panel-border)] bg-background/60 shadow-sm transition hover:border-primary/50">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleItem(item.id)}
                      className="h-4.5 w-4.5 rounded border-[var(--brse-panel-border)] bg-background accent-primary cursor-pointer"
                      aria-label={`${t("todo.markDone")} ${(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}`}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setExpandedItemId(isExpanded ? "" : item.id)}
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className={`min-w-0 truncate text-sm font-bold tracking-tight ${item.done ? "text-muted line-through" : "text-ink"}`}>
                        {(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          item.priority === "P0"
                            ? "bg-danger text-white shadow-sm"
                            : item.priority === "P1"
                              ? "bg-amber-400 text-black font-extrabold"
                              : "bg-primary text-white"
                        }`}
                      >
                        {item.priority}
                      </span>
                      {item.done ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-green-400/10 px-1.5 py-0.2 text-[10px] font-semibold text-green-300">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {t("todo.done")}
                        </span>
                      ) : null}
                      {isOverdue(item) ? (
                        <span className="rounded bg-vermilion/15 px-1.5 py-0.2 text-[10px] font-semibold text-vermilion">
                          {t("todo.overdue")}
                        </span>
                      ) : isDeadlineSoon(item) ? (
                        <span className="rounded bg-amber-400/15 px-1.5 py-0.2 text-[10px] font-semibold text-amber-300">
                          {t("todo.dueSoon")}
                        </span>
                      ) : null}
                      {item.deadline ? <span className="rounded bg-background/60 px-1.5 py-0.2 text-[10px] text-textMuted">Due {item.deadline}</span> : null}
                      {itemEvidences.length > 0 ? (
                        <a
                          href={itemEvidences[0].url.startsWith("http") || itemEvidences[0].url.startsWith("/") ? itemEvidences[0].url : `https://${itemEvidences[0].url}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded bg-cyan/15 px-1.5 py-0.2 text-[10px] font-semibold text-cyan hover:underline"
                          title={itemEvidences.map((e) => e.quote || e.url).join("\n")}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          {itemEvidences.length === 1 ? "Link" : `${itemEvidences.length} tệp/link`}
                        </a>
                      ) : null}
                      {linkedOperation ? (
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary font-mono">
                          <Link2 className="h-2.5 w-2.5" />
                          {linkedOperation.type.toUpperCase()}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-textMuted">
                      {(t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) !== `todo.workflow.${item.id}.detail` ? (t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) : item.detail}
                    </span>
                  </button>

                  {item.id.startsWith("custom-") && deleteItem ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                      className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg border border-vermilion/30 bg-vermilion/10 text-vermilion hover:bg-vermilion/20 transition"
                      title="Xóa công việc tự tạo này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setExpandedItemId(isExpanded ? "" : item.id)}
                    className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg border border-[var(--brse-panel-border)] bg-background/70 text-textMuted hover:border-primary/35 hover:text-primary transition"
                    aria-label={isExpanded ? t("todo.closeTodo") : t("todo.openTodo")}
                  >
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                </div>

                {isExpanded ? (
                  <div className="grid gap-3 border-t border-[var(--brse-panel-border)] p-3">
                    <p className="text-xs leading-5 text-textMuted">
                      {(t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) !== `todo.workflow.${item.id}.detail` ? (t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) : item.detail}
                    </p>

                    <div className="rounded-lg border border-[var(--brse-panel-border)] bg-background/35 p-2.5">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-primary">Sub-task checklist</p>
                        </div>
                        {checklistItems.length ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {checklistItems.filter((entry) => entry.done).length}/{checklistItems.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="grid gap-1.5">
                        {checklistItems.map((entry, index) => (
                          <label key={`${item.id}-sub-${index}`} className="flex items-center gap-2 rounded border border-[var(--brse-panel-border)] bg-background/60 px-2.5 py-1 text-xs text-ink hover:border-primary/35">
                            <input
                              type="checkbox"
                              checked={entry.done}
                              onChange={() => toggleSubtask(item, index)}
                              className="h-3.5 w-3.5 rounded border-[var(--brse-panel-border)] bg-background accent-primary"
                            />
                            <span className={entry.done ? "text-textMuted line-through" : ""}>{entry.text}</span>
                          </label>
                        ))}
                      </div>

                      <div className="mt-2 flex gap-1.5">
                        <input
                          value={subtaskDrafts[item.id] || ""}
                          onChange={(event) =>
                            setSubtaskDrafts((prev: Record<string, string>) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addSubtask(item);
                            }
                          }}
                          placeholder={t("todo.subtaskPlaceholder") !== "todo.subtaskPlaceholder" ? t("todo.subtaskPlaceholder") : "Nhập việc con..."}
                          className="field-control flex-1 py-1 px-2.5 text-xs bg-background/50 text-ink placeholder:text-textMuted/70"
                        />
                        <button
                          type="button"
                          onClick={() => addSubtask(item)}
                          className="rounded-md border border-primary/35 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/25 transition"
                        >
                          {t("todo.add")}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1 text-[11px] font-semibold text-textMuted">
                        {t("todo.deadline")}
                        <input
                          type="date"
                          value={item.deadline}
                          onChange={(event) => updateItem(item.id, { deadline: event.target.value })}
                          className="field-control py-1 px-2 text-xs bg-background/50 text-ink"
                        />
                      </label>
                      <label className="grid gap-1 text-[11px] font-semibold text-textMuted">
                        Độ ưu tiên
                        <select
                          value={item.priority}
                          onChange={(event) => updateItem(item.id, { priority: event.target.value as Priority })}
                          className="field-control py-1 px-2 text-xs bg-background/50 text-ink"
                        >
                          <option value="P0">P0</option>
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                        </select>
                      </label>
                    </div>

                    {/* Evidence & Note */}
                    <div className="grid gap-2">
                      <div className="grid gap-1.5 text-[11px] font-semibold text-textMuted">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            {t("todo.evidenceLabel")}
                          </span>
                          {itemEvidences.length > 0 ? (
                            <span className="text-[10px] text-primary font-bold">
                              {itemEvidences.length} tệp/link đính kèm
                            </span>
                          ) : null}
                        </div>

                        {/* Input toolbar: Add Link | Upload file | Paste image */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <input
                            value={linkInputs[item.id] || ""}
                            onChange={(event) =>
                              setLinkInputs((prev) => ({ ...prev, [item.id]: event.target.value }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleAddLink(item);
                              }
                            }}
                            onPaste={async (event) => {
                              const files = event.clipboardData?.files;
                              if (files && files.length > 0 && (files[0].type.startsWith("image/") || files[0].type === "application/pdf")) {
                                event.preventDefault();
                                setUploadingItemId(item.id);
                                try {
                                  await attachEvidenceImageFromClipboard(item.id, files[0]);
                                } finally {
                                  setUploadingItemId(null);
                                }
                              }
                            }}
                            placeholder="Dán link (Google Docs, Figma, Jira, URL...)"
                            className="field-control flex-1 py-1 px-2 text-xs bg-background/50 text-ink min-w-[200px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddLink(item)}
                            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[var(--brse-panel-border)] bg-background/60 px-2 text-xs font-semibold text-ink hover:border-primary/40 hover:text-primary transition cursor-pointer"
                            title="Thêm liên kết này vào danh sách"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Thêm link</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetUploadItemId(item.id);
                              fileInputRef.current?.click();
                            }}
                            disabled={uploadingItemId === item.id}
                            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-primary/35 bg-primary/15 px-2 text-xs font-semibold text-primary hover:bg-primary/25 transition disabled:opacity-50 cursor-pointer"
                            title="Tải tệp từ máy tính (Excel, Word, PDF, Ảnh, CSV, ZIP...)"
                          >
                            {uploadingItemId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                            <span>Tải tệp/ảnh</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePasteImage(item.id)}
                            disabled={uploadingItemId === item.id}
                            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[var(--brse-panel-border)] bg-background/60 px-2 text-xs font-semibold text-ink hover:border-primary/40 hover:text-primary transition cursor-pointer"
                            title="Dán ảnh chụp màn hình từ Clipboard"
                          >
                            <ClipboardPaste className="h-3 w-3" />
                            <span>Dán ảnh</span>
                          </button>
                        </div>

                        {/* List of Attached Evidences & Files */}
                        {itemEvidences.length > 0 ? (
                          <div className="mt-1.5 grid gap-1.5">
                            {itemEvidences.map((ev, evIndex) => {
                              const isImg = ev.type === "image" || /\.(png|jpg|jpeg|webp|gif|svg)($|\?)/i.test(ev.url);
                              const isPdf = /\.pdf($|\?)/i.test(ev.url);
                              const isExcel = /\.(xlsx|xls|csv)($|\?)/i.test(ev.url);
                              const isWord = /\.(docx|doc)($|\?)/i.test(ev.url);
                              const displayName = ev.quote || ev.url.split("/").pop() || ev.url;
                              return (
                                <div
                                  key={`${item.id}-ev-${evIndex}`}
                                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--brse-panel-border)] bg-background/60 p-1.5 px-2 text-xs text-ink hover:border-primary/40 transition"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isImg ? (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewDoc({ url: ev.url, title: displayName })}
                                        className="shrink-0 group relative block h-8 w-12 overflow-hidden rounded border border-white/10 cursor-pointer"
                                        title="Xem ảnh phóng to"
                                      >
                                        <img
                                          src={ev.url}
                                          alt={displayName}
                                          className="h-full w-full object-cover group-hover:scale-110 transition"
                                        />
                                      </button>
                                    ) : isPdf ? (
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-vermilion/15 text-vermilion">
                                        <FileText className="h-3.5 w-3.5" />
                                      </div>
                                    ) : isExcel ? (
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-500/15 text-emerald-400">
                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                      </div>
                                    ) : isWord ? (
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-cyan-400/15 text-cyan-400">
                                        <FileText className="h-3.5 w-3.5" />
                                      </div>
                                    ) : (
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/15 text-primary">
                                        <Link2 className="h-3.5 w-3.5" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-semibold text-ink max-w-[200px] sm:max-w-[280px]" title={displayName}>
                                        {displayName}
                                      </p>
                                      <p className="truncate text-[10px] text-textMuted max-w-[200px] sm:max-w-[280px]" title={ev.url}>
                                        {ev.url}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewDoc({ url: ev.url, title: displayName })}
                                      className="inline-flex h-6 items-center gap-1 rounded border border-emerald-500/35 bg-emerald-500/15 px-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 transition cursor-pointer"
                                      title="Xem trực tiếp tài liệu ngay trong ứng dụng"
                                    >
                                      <Eye className="h-2.5 w-2.5" />
                                      <span>Xem</span>
                                    </button>
                                    <a
                                      href={ev.url.startsWith("http") || ev.url.startsWith("/") ? ev.url : `https://${ev.url}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex h-6 items-center gap-1 rounded border border-cyan/35 bg-cyan/15 px-2 text-[11px] font-semibold text-cyan hover:bg-cyan/25 transition"
                                      title="Mở trong tab mới"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5" />
                                      <span>Mở</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEvidence(item, evIndex)}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-danger/30 bg-danger/10 text-vermilion hover:bg-danger/20 transition cursor-pointer"
                                      title="Gỡ bỏ tài liệu này"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] italic text-textMuted/80 mt-0.5">
                            Chưa có tệp/link đính kèm. Bạn có thể dán nhiều link (SRS, Figma) hoặc tải nhiều ảnh nghiệm thu cho task này.
                          </p>
                        )}
                      </div>
                      <label className="grid gap-1 text-[11px] font-semibold text-textMuted">
                        {t("todo.note")}
                        <textarea
                          rows={2}
                          value={item.note}
                          onChange={(event) => updateItem(item.id, { note: event.target.value })}
                          placeholder={t("todo.notePlaceholder")}
                          className="field-control py-1 px-2 text-xs bg-background/50 text-ink"
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
            <details className="rounded-lg border border-[var(--brse-panel-border)] bg-background/40 p-2 text-xs">
              <summary className="cursor-pointer font-semibold text-textMuted">
                {t("todo.archiveDoneOver7Days")} ({staleDoneItems.length})
              </summary>
              <ul className="mt-2 grid gap-1 text-[11px] text-textMuted">
                {staleDoneItems.slice(0, 40).map((item) => (
                  <li key={item.id} className="flex justify-between gap-2 rounded border border-[var(--brse-panel-border)] px-2 py-0.5">
                    <span className="truncate">{(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}</span>
                    <span className="shrink-0 text-[10px]">{item.updatedAt?.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </section>

      {/* Right Dock */}
      <aside className="space-y-2.5 lg:sticky lg:top-3 lg:w-full lg:self-start lg:justify-self-end">
        {/* Dock Tab Switcher */}
        <div className="flex rounded-lg border border-[var(--brse-panel-border)] bg-background/60 p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setDockTab("focus")}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded-md transition ${
              dockTab === "focus"
                ? "bg-primary/20 text-primary font-bold shadow-sm"
                : "text-textMuted hover:text-ink"
            }`}
          >
            <AlertTriangle className="h-3 w-3 text-amber-300" />
            <span>Tiêu điểm</span>
            {(nextFocus.length > 0 || deadlineRiskItems.length > 0) && (
              <span className="rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[9px] text-amber-300 font-bold">
                {nextFocus.length + deadlineRiskItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDockTab("report")}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded-md transition ${
              dockTab === "report"
                ? "bg-primary/20 text-primary font-bold shadow-sm"
                : "text-textMuted hover:text-ink"
            }`}
          >
            <FileText className="h-3 w-3 text-primary" />
            <span>Báo cáo ngày</span>
          </button>
        </div>

        {dockTab === "report" ? (
          /* Daily Report Section */
          <div className="brse-section p-3">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{t("todo.dailyReport")}</h2>
            </div>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--brse-panel-border)] bg-background p-2 text-[10px] leading-4 text-textMuted font-mono">
              {dailyReport}
            </pre>
            <div className="mt-2.5 flex flex-col gap-1.5">
              <button
                onClick={copyDailyReport}
                className="w-full rounded-md border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25 transition text-center"
              >
                {reportCopied ? t("todo.copied") : t("todo.copyDailyReport")}
              </button>
              <a
                href="/app/reports"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("brse.reports.importedTodoDaily", dailyReport);
                  }
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-matcha/30 bg-matcha/15 px-3 py-1.5 text-xs font-semibold text-matcha hover:bg-matcha/25 transition text-center"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Đẩy sang Báo cáo ngày</span>
              </a>
            </div>
          </div>
        ) : (
          /* Focus & Deadline Tab */
          <>
            {/* Next Focus */}
            <div className="brse-section p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{t("todo.nextPriority")}</h2>
                </div>
                <span className="rounded bg-amber-400/10 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                  {nextFocus.length} việc
                </span>
              </div>
              <div className="grid gap-1.5">
                {nextFocus.length ? (
                  nextFocus.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePhase(item.phase);
                        setFilter("todo");
                        setExpandedItemId(item.id);
                      }}
                      className="rounded-md border border-[var(--brse-panel-border)] bg-surface/50 p-2 text-left shadow-sm hover:border-primary/30 hover:bg-surfaceHover/80 transition-all text-xs"
                    >
                      <p className="font-semibold text-ink truncate">
                        <span className="text-amber-300 font-black mr-1">{item.priority}</span>
                        {(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}
                      </p>
                      <p className="text-[10px] text-textMuted truncate mt-0.5">{item.phase}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-md border border-green-400/30 bg-green-400/10 p-2 text-xs text-green-300">
                    {t("todo.allDone")}
                  </div>
                )}
              </div>
            </div>

            {/* Deadline Alerts */}
            <div className="brse-section p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{t("todo.deadlineNotification")}</h2>
                </div>
                {deadlineRiskItems.length > 0 && (
                  <span className="rounded bg-vermilion/10 px-1.5 py-0.2 text-[9px] font-bold text-vermilion">
                    {deadlineRiskItems.length}
                  </span>
                )}
              </div>
              <div className="grid gap-1.5">
                {deadlineRiskItems.length ? (
                  deadlineRiskItems.slice(0, 4).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActivePhase(item.phase);
                        setFilter("deadline");
                        setExpandedItemId(item.id);
                      }}
                      className={`rounded-md border p-2 text-left transition-all text-xs ${
                        isOverdue(item)
                          ? "border-vermilion/20 bg-vermilion/10 text-vermilion"
                          : "border-amber-300/20 bg-amber-300/10 text-amber-300"
                      }`}
                    >
                      <p className="font-semibold truncate">
                        {(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}
                      </p>
                      <p className="text-[10px] mt-0.5">{item.deadline || item.phase}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-md border border-[var(--brse-panel-border)] bg-surface/20 p-2 text-xs text-textMuted">
                    {t("todo.noDeadlineRisk")}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Interactive Document & Evidence Viewer Modal */}
      <DocumentViewerModal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        url={previewDoc?.url || ""}
        title={previewDoc?.title}
      />
    </section>
  );
}
