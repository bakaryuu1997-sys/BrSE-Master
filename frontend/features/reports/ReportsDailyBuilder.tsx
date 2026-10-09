"use client";

import { CheckSquare, Plus, X, Sparkles, Loader2, Clipboard, Download, Calendar, FileText, Trash2, History } from "lucide-react";
import { type ReportRecord, type ReportRecordInput, exportReportsCsv } from "@/lib/reports";
import { formatDateLabel } from "./useReportsState";
import { Drawer } from "@/components/Drawer";

interface ReportsDailyBuilderProps {
  t: any;
  language: string;
  handleSubmit: (e: React.FormEvent) => void;
  form: ReportRecordInput;
  updateField: (key: keyof ReportRecordInput, value: string) => void;
  tasksDoneArr: string[];
  taskInput: string;
  setTaskInput: (val: string) => void;
  addTask: () => void;
  removeTask: (idx: number) => void;
  openAiReportRefiner: () => void;
  isLoading: boolean;
  editingId: string;
  resetForm: () => void;
  preview: string;
  liveDailyPreview: string;
  copyToClipboard: (text: string) => void;
  copied: boolean;
  openEmailDraft: (subject: string, body: string) => void;
  reportCalendar: { label: string; days: (string | null)[] };
  reportsByDate: Map<string, ReportRecord>;
  startEdit: (record: ReportRecord) => void;
  setEditingId: (id: string) => void;
  setForm: any;
  setTasksDoneArr: (arr: string[]) => void;
  setPreview: (prev: string) => void;
  setStatus: (status: string) => void;
  records: ReportRecord[];
  handleDelete: (id: string) => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (val: boolean) => void;
}

export function ReportsDailyBuilder({
  t,
  language,
  handleSubmit,
  form,
  updateField,
  tasksDoneArr,
  taskInput,
  setTaskInput,
  addTask,
  removeTask,
  openAiReportRefiner,
  isLoading,
  editingId,
  resetForm,
  preview,
  liveDailyPreview,
  copyToClipboard,
  copied,
  openEmailDraft,
  reportCalendar,
  reportsByDate,
  startEdit,
  setEditingId,
  setForm,
  setTasksDoneArr,
  setPreview,
  setStatus,
  records,
  handleDelete,
  isHistoryOpen,
  setIsHistoryOpen,
}: ReportsDailyBuilderProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      {/* Left: Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Meta row */}
        <div className="brse-section p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
            {t("reports.basicInfo")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-textMuted">
                {t("reports.date")} *
              </label>
              <input
                id="report-date"
                type="date"
                required
                value={form.reportDate}
                onChange={(e) => updateField("reportDate", e.target.value)}
                className="field-control w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-textMuted">
                {t("reports.progress")}
              </label>
              <input
                id="progress-percent"
                type="text"
                placeholder="Ex: 70%"
                value={form.progressPercent ?? ""}
                onChange={(e) => updateField("progressPercent", e.target.value)}
                className="field-control w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-textMuted">
                {t("reports.project")}
              </label>
              <input
                id="project-name"
                type="text"
                placeholder={t("reports.project")}
                value={form.projectName ?? ""}
                onChange={(e) => updateField("projectName", e.target.value)}
                className="field-control w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-textMuted">
                {t("reports.owner")}
              </label>
              <input
                id="owner"
                type="text"
                placeholder={t("reports.owner")}
                value={form.owner ?? ""}
                onChange={(e) => updateField("owner", e.target.value)}
                className="field-control w-full px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Tasks done */}
        <div className="brse-section p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            {t("reports.tasksDone")}
          </h2>
          <div className="flex gap-2">
            <input
              id="task-input"
              type="text"
              placeholder={t("reports.taskPlaceholder")}
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
                }
              }}
              className="flex-1 rounded-md border border-[var(--brse-panel-border)] bg-background px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              id="add-task-btn"
              onClick={addTask}
              className="flex items-center gap-1.5 rounded-md bg-primary/20 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {tasksDoneArr.length === 0 && (
            <p className="text-xs text-textMuted italic">{t("reports.addTaskHint")}</p>
          )}
          <ul className="space-y-1.5">
            {tasksDoneArr.map((task, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/60 px-3 py-2 text-sm text-ink"
              >
                <CheckSquare className="h-4 w-4 text-green-400 shrink-0" />
                <span className="flex-1">{task}</span>
                <button
                  type="button"
                  onClick={() => removeTask(idx)}
                  className="text-textMuted hover:text-red-400 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* In-progress, Tomorrow, Blockers */}
        <div className="brse-section p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
            {t("reports.progressPlanIssue")}
          </h2>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-textMuted">
              {t("reports.inProgress")}
            </label>
            <textarea
              id="tasks-in-progress"
              rows={2}
              placeholder={t("reports.inProgressPlaceholder")}
              value={form.tasksInProgress ?? ""}
              onChange={(e) => updateField("tasksInProgress", e.target.value)}
              className="w-full rounded-md border border-[var(--brse-panel-border)] bg-background px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-textMuted">
              {t("reports.tomorrow")}
            </label>
            <textarea
              id="tasks-tomorrow"
              rows={2}
              placeholder={t("reports.tomorrowPlaceholder")}
              value={form.tasksTomorrow ?? ""}
              onChange={(e) => updateField("tasksTomorrow", e.target.value)}
              className="w-full rounded-md border border-[var(--brse-panel-border)] bg-background px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-textMuted">
              {t("reports.blockers")}
            </label>
            <textarea
              id="blockers"
              rows={2}
              placeholder={t("reports.blockersPlaceholder")}
              value={form.blockers ?? ""}
              onChange={(e) => updateField("blockers", e.target.value)}
              className="w-full rounded-md border border-[var(--brse-panel-border)] bg-background px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openAiReportRefiner}
            className="flex items-center gap-2 rounded-md border border-orange-500/30 bg-orange-500/15 px-4 py-2.5 text-sm font-semibold text-orange-400 hover:bg-orange-500/25 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            {t("reports.aiGenerate")}
          </button>
          <button
            type="submit"
            id="save-report-btn"
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editingId ? t("reports.update") : t("reports.save")}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] px-4 py-2.5 text-sm font-semibold text-textMuted hover:text-ink transition-colors"
            >
              {t("reports.cancel")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/35 px-4 py-2.5 text-sm font-semibold text-textMuted hover:border-primary/40 hover:text-ink transition active:scale-95 ml-auto"
          >
            <History className="h-4 w-4 text-primary" />
            {t("reports.savedReports")}
          </button>
        </div>
      </form>

      {/* Right: Preview (History moved to Drawer) */}
      <div className="space-y-6">
        {/* Preview box */}
        <div className="rounded-xl border border-[var(--brse-panel-border)]/55 bg-surface overflow-hidden shadow-glow-sm">
          <div className="flex items-center justify-between border-b border-[var(--brse-panel-border)]/45 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">Preview {t("reports.preview")}</h3>
              <p className="mt-1 text-[11px] text-textMuted">{t("reports.autoUpdateNote")}</p>
            </div>
            <div className="flex gap-2">
              <button
                id="copy-preview-btn"
                onClick={() => copyToClipboard(preview || t("reports.previewFirst"))}
                className="flex items-center gap-1.5 rounded-md border border-[var(--brse-panel-border)] px-3 py-1.5 text-xs font-semibold text-textMuted hover:text-ink hover:border-primary transition-colors"
              >
                <Clipboard className="h-3.5 w-3.5" />
                {copied ? t("reports.copied") : t("reports.copy")}
              </button>
              <button
                type="button"
                onClick={() => openEmailDraft(`【日次報告】${form.projectName || ""} ${form.reportDate}`, preview || liveDailyPreview)}
                className="flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                Gmail
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap p-4 text-xs text-ink leading-relaxed min-h-[350px] font-mono bg-slate-950/40">
            {preview || t("reports.previewEmpty")}
          </pre>
        </div>
      </div>

      {/* Premium History Drawer */}
      <Drawer
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={t("reports.savedReports")}
        subtitle={t("reports.drawerSubtitle")}
        width="md"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--brse-panel-border)]/45 pb-3">
            <span className="text-xs font-bold text-textMuted">{reportCalendar.label}</span>
            <button
              id="export-reports-btn"
              onClick={() => exportReportsCsv(records)}
              className="flex items-center gap-1.5 rounded-md border border-[var(--brse-panel-border)] px-3 py-1.5 text-xs font-semibold text-textMuted hover:text-ink hover:border-primary transition"
            >
              <Download className="h-3.5 w-3.5" />
              {t("reports.exportExcel")}
            </button>
          </div>

          {/* Monthly mini calendar in drawer */}
          <div className="rounded-xl border border-[var(--brse-panel-border)]/45 bg-surface/30 p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-textMuted">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {reportCalendar.days.map((day, index) => {
                if (!day) return <span key={`blank-${index}`} className="aspect-square" />;
                const record = reportsByDate.get(day);
                const isSelected = form.reportDate === day;
                const dayNumber = Number(day.slice(-2));
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (record) {
                        startEdit(record);
                        setIsHistoryOpen(false);
                        return;
                      }
                      setEditingId("");
                      setForm((current: any) => ({ ...current, reportDate: day, generatedJp: "" }));
                      setTasksDoneArr([]);
                      setPreview("");
                      setStatus(t("reports.createdDailyFor").replace("{day}", day));
                      setIsHistoryOpen(false);
                    }}
                    className={[
                      "relative aspect-square rounded-lg border text-[11px] font-bold transition",
                      record ? "border-primary/30 bg-primary/15 text-primary shadow-glow-sm" : "border-[var(--brse-panel-border)] bg-background/45 text-textMuted hover:border-primary/25 hover:text-ink",
                      isSelected ? "ring-2 ring-primary/45" : "",
                    ].join(" ")}
                    title={record ? `Edit report ${day}` : `Create report ${day}`}
                  >
                    {dayNumber}
                    {record ? <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List view */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <p className="py-6 text-center text-sm text-textMuted">
              {t("reports.noReports")}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--brse-panel-border)]/45">
              {records.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3 hover:bg-surfaceHover transition-colors">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {formatDateLabel(r.reportDate, language)}
                    </p>
                    <p className="text-xs text-textMuted truncate">
                      {r.projectName || "-"} / {r.progressPercent || "-"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setPreview(r.generatedJp || "");
                        copyToClipboard(r.generatedJp || "");
                        setIsHistoryOpen(false);
                      }}
                      title={t("reports.copy")}
                      className="rounded p-1.5 text-textMuted hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        startEdit(r);
                        setIsHistoryOpen(false);
                      }}
                      title={t("reports.edit")}
                      className="rounded p-1.5 text-textMuted hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      title={t("reports.delete")}
                      className="rounded p-1.5 text-textMuted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Drawer>
    </div>
  );
}
