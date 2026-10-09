"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { useOperationsQuery } from "@/lib/operations-hooks";
import { useReportsQuery, useSaveReportMutation, useDeleteReportMutation } from "@/lib/reports-hooks";
import { useConfirm } from "@/components/ConfirmProvider";
import { formatAppDate, getLocaleString } from "@/lib/dateUtils";
import {
  buildHoresoReport,
  buildOperationsDeltaReportDraft,
  buildReportRefinerSeed,
  buildWeeklySummary,
  exportReportsCsv,
  type ReportRecord,
  type ReportRecordInput,
} from "@/lib/reports";
import { getBrseTodoCommandSummary } from "@/lib/brseTodo";
import { apiBaseUrl } from "@/lib/config";
import { type OperationRecord } from "@/lib/operations";
import {
  ACTIVE_PROJECT_CHANGED_EVENT,
  getActiveProject,
  getProjectMemorySummary,
  type ProjectSetting,
} from "@/lib/projectSettings";
import { buildProjectExecutionWarnings } from "@/lib/projectExecutionWarnings";

export type ReportLanguage = "vi" | "en" | "ja" | "jp-business";

const EMPTY_REPORT_RECORDS: ReportRecord[] = [];
const EMPTY_OPERATION_RECORDS: OperationRecord[] = [];

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function getWeekRange(date: Date) {
  const day = date.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  const mon = new Date(date);
  mon.setDate(date.getDate() + diff);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  return {
    start: mon.toISOString().slice(0, 10),
    end: fri.toISOString().slice(0, 10),
  };
}

export function formatDateLabel(iso: string, lang: any) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(getLocaleString(lang), {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export function daysInReportMonth(records: ReportRecord[]) {
  const today = new Date();
  const latest = records
    .map((record) => record.reportDate)
    .filter(Boolean)
    .sort()
    .at(-1);
  const anchor = latest ? new Date(`${latest}T12:00:00`) : today;
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  return {
    label: anchor.toLocaleDateString("ja-JP", { year: "numeric", month: "long" }),
    days: [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const date = new Date(year, month, index + 1);
        return date.toISOString().slice(0, 10);
      }),
    ],
  };
}

export const emptyInput: ReportRecordInput = {
  reportDate: todayIso(),
  projectName: "",
  owner: "",
  tasksDone: "[]",
  tasksInProgress: "",
  tasksTomorrow: "",
  blockers: "",
  progressPercent: "",
  generatedJp: "",
};

export const reportLanguageNames: Record<ReportLanguage, string> = {
  vi: "VI",
  en: "EN",
  ja: "JA",
  "jp-business": "JP Business",
};

export function parseTasksDone(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value ? [value] : [];
  }
}

export function bulletLines(items: string[], emptyText: string) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

export function buildLocalizedDailyReport(input: {
  language: ReportLanguage;
  reportDate: string;
  projectName: string;
  owner: string;
  tasksDone: string[];
  tasksInProgress: string;
  tasksTomorrow: string;
  blockers: string;
  progressPercent: string;
  customerMemoryNote?: string;
}) {
  const memoryNote = input.customerMemoryNote?.trim();
  const enMemory = memoryNote ? `\n\nCustomer-specific report rules\n${memoryNote}` : "";
  const viMemory = memoryNote ? `\n\nQuy tac bao cao theo khach hang\n${memoryNote}` : "";

  if (input.language === "ja" || input.language === "jp-business") {
    const base = buildHoresoReport(input);
    return memoryNote ? `${base}\n\nCustomer rules\n${memoryNote}` : base;
  }

  if (input.language === "en") {
    return `Daily Report - ${input.reportDate}\n\nProject: ${input.projectName || "-"}\nOwner: ${input.owner || "-"}\nProgress: ${input.progressPercent || "-"}\n\nCompleted today\n${bulletLines(input.tasksDone, "None")}\n\nIn progress\n${input.tasksInProgress || "-"}\n\nTomorrow plan\n${input.tasksTomorrow || "-"}\n\nBlockers / decisions needed\n${input.blockers || "None"}\n\nPriority will be handled in order of Todo, Q&A waiting customer, and pending CR impact.${enMemory}`;
  }

  return `Bao cao ngay - ${input.reportDate}\n\nDu an: ${input.projectName || "-"}\nNguoi phu trach: ${input.owner || "-"}\nTien do: ${input.progressPercent || "-"}\n\nDa hoan thanh hom nay\n${bulletLines(input.tasksDone, "Khong co")}\n\nDang thuc hien\n${input.tasksInProgress || "-"}\n\nKe hoach ngay mai\n${input.tasksTomorrow || "-"}\n\nVan de / can xac nhan\n${input.blockers || "Khong co"}\n\nUu tien tiep theo se theo thu tu Todo, Q&A dang cho khach va CR pending.${viMemory}`;
}

export function buildLocalizedWeeklyReport(records: ReportRecord[], start: string, end: string, language: ReportLanguage) {
  if (language === "ja" || language === "jp-business") {
    const base = buildWeeklySummary(records, start, end);
    return language === "jp-business"
      ? `${base}\n\nNext week, prioritize unanswered Q&A, pending CR decisions, and deadline risks.`
      : base;
  }

  const done = records.flatMap((record) => parseTasksDone(record.tasksDone));
  const blockers = records.map((record) => record.blockers).filter(Boolean);

  if (language === "en") {
    return `Weekly Summary - ${start} to ${end}\n\nDaily reports included: ${records.length}\n\nCompleted work\n${bulletLines(done, "No completed items recorded")}\n\nRisks / blockers\n${bulletLines(blockers, "No blockers")}\n\nNext week focus\n- Continue open Todo items by priority.\n- Follow up Q&A waiting customer response.\n- Confirm pending CR impact and approval.`;
  }

  return `Bao cao tuan - ${start} den ${end}\n\nSo daily report da tong hop: ${records.length}\n\nViec da hoan thanh\n${bulletLines(done, "Chua co item hoan thanh")}\n\nRui ro / blocker\n${bulletLines(blockers, "Khong co blocker")}\n\nUu tien tuan sau\n- Tiep tuc Todo dang mo theo do uu tien.\n- Follow Q&A dang cho khach tra loi.\n- Xac nhan impact va quyet dinh cho CR pending.`;
}

export function useReportsState() {
  const { t, language } = useUiLanguage();
  const { confirm } = useConfirm();
  const { data: recordsData, isLoading: isQueryLoading } = useReportsQuery();
  const records = recordsData ?? EMPTY_REPORT_RECORDS;
  const { data: operationsData, isLoading: isOperationsLoading } = useOperationsQuery();
  const operations = operationsData ?? EMPTY_OPERATION_RECORDS;
  const saveReportMutation = useSaveReportMutation();
  const deleteReportMutation = useDeleteReportMutation();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [reportLanguage, setReportLanguage] = useState<ReportLanguage>("jp-business");
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  // AI State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiBulletPoints, setAiBulletPoints] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Form state
  const [form, setForm] = useState<ReportRecordInput>({ ...emptyInput });
  // Tasks Done as array in UI
  const [taskInput, setTaskInput] = useState("");
  const [tasksDoneArr, setTasksDoneArr] = useState<string[]>([]);

  // Preview
  const [preview, setPreview] = useState("");
  const [activeProject, setActiveProject] = useState<ProjectSetting | null>(null);
  const [analytics, setAnalytics] = useState({
    todoProgress: 0,
    todoDone: 0,
    todoTotal: 0,
    waitingQna: 0,
    pendingCr: 0,
    openBugs: 0,
    overdueOps: 0,
  });

  const loadData = useCallback((cancelled = false) => {
    setIsLoading(true);
    // records and operations fetches are handled automatically by TanStack Query
    const proj = getActiveProject();
    if (cancelled) return;
    setActiveProject(proj);
    setForm((f) => ({
      ...f,
      projectName: proj?.name ?? "",
      owner: proj?.brse_name ?? "",
    }));
    try {
      const todoSummary = getBrseTodoCommandSummary();
      const today = todayIso();
      if (!cancelled) setAnalytics({
        todoProgress: todoSummary.total ? Math.round((todoSummary.done / todoSummary.total) * 100) : 0,
        todoDone: todoSummary.done,
        todoTotal: todoSummary.total,
        waitingQna: operations.filter((record) => record.type === "qna" && ["Sent", "Waiting Customer", "Open"].includes(record.status)).length,
        pendingCr: operations.filter((record) => record.type === "cr" && !["Approved", "Rejected", "Implemented", "Closed"].includes(record.status)).length,
        openBugs: operations.filter((record) => record.type === "bug" && !["Closed", "Done", "Resolved"].includes(record.status)).length,
        overdueOps: operations.filter((record) => record.dueDate && record.dueDate < today && !["Closed", "Done", "Resolved", "Approved", "Rejected"].includes(record.status)).length,
      });
    } catch {
      if (!cancelled) setAnalytics((current) => current);
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  }, [operations]);

  useEffect(() => {
    let cancelled = false;
    const handleActiveProjectChanged = () => loadData(cancelled);
    loadData(cancelled);
    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleActiveProjectChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleActiveProjectChanged);
    };
  }, [loadData]);

  const { start: weekStart, end: weekEnd } = getWeekRange(new Date());
  const projectMemory = useMemo(() => getProjectMemorySummary(activeProject), [activeProject]);
  const projectExecutionWarnings = useMemo(() => buildProjectExecutionWarnings(activeProject), [activeProject]);
  const customerMemoryNote = useMemo(() => [
    projectMemory.customerStyle ? `Style: ${projectMemory.customerStyle}` : "",
    projectMemory.reportRule ? `Report rule: ${projectMemory.reportRule}` : "",
    projectMemory.communicationNotes ? `Communication: ${projectMemory.communicationNotes}` : "",
  ].filter(Boolean).join("\n"), [projectMemory.communicationNotes, projectMemory.customerStyle, projectMemory.reportRule]);

  const weekRecords = useMemo(
    () => records.filter((r) => r.reportDate >= weekStart && r.reportDate <= weekEnd),
    [records, weekStart, weekEnd]
  );
  const reportCalendar = useMemo(() => daysInReportMonth(records), [records]);
  const reportsByDate = useMemo(() => new Map(records.map((record) => [record.reportDate, record])), [records]);
  const liveDailyPreview = useMemo(() => buildLocalizedDailyReport({
    language: reportLanguage,
    reportDate: form.reportDate,
    projectName: form.projectName ?? "",
    owner: form.owner ?? "",
    tasksDone: tasksDoneArr,
    tasksInProgress: form.tasksInProgress ?? "",
    tasksTomorrow: form.tasksTomorrow ?? "",
    blockers: form.blockers ?? "",
    progressPercent: form.progressPercent ?? "",
    customerMemoryNote,
  }), [
    customerMemoryNote,
    form.blockers,
    form.owner,
    form.progressPercent,
    form.projectName,
    form.reportDate,
    form.tasksInProgress,
    form.tasksTomorrow,
    reportLanguage,
    tasksDoneArr,
  ]);

  const weeklyText = useMemo(
    () => buildLocalizedWeeklyReport(weekRecords, weekStart, weekEnd, reportLanguage),
    [reportLanguage, weekRecords, weekStart, weekEnd]
  );

  useEffect(() => {
    if (activeTab !== "daily") return;
    setPreview(liveDailyPreview);
    setForm((current) => current.generatedJp === liveDailyPreview ? current : { ...current, generatedJp: liveDailyPreview });
  }, [activeTab, liveDailyPreview]);

  function addTask() {
    if (!taskInput.trim()) return;
    const next = [...tasksDoneArr, taskInput.trim()];
    setTasksDoneArr(next);
    setTaskInput("");
    setForm((f) => ({ ...f, tasksDone: JSON.stringify(next) }));
  }

  function removeTask(idx: number) {
    const next = tasksDoneArr.filter((_, i) => i !== idx);
    setTasksDoneArr(next);
    setForm((f) => ({ ...f, tasksDone: JSON.stringify(next) }));
  }

  function updateField<K extends keyof ReportRecordInput>(
    key: K,
    value: ReportRecordInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("");
  }

  function fillFromLiveData() {
    const todoSummary = getBrseTodoCommandSummary();
    const operationsDraft = buildOperationsDeltaReportDraft(operations, form.reportDate || todayIso());
    const doneTasks = todoSummary.doneToday.length
      ? [...todoSummary.doneToday.map((item) => item.title), ...operationsDraft.tasksDone]
      : operationsDraft.tasksDone.length
        ? operationsDraft.tasksDone
        : todoSummary.nextFocus.slice(0, 2).map((item) => `確認中: ${item.title}`);
    const inProgress = [
      ...todoSummary.nextFocus.slice(0, 4).map((item) => `- ${item.title}`),
      ...operationsDraft.tasksInProgress.slice(0, 6).map((item) => `- ${item}`),
    ].join("\n");
    const blockers = [
      ...todoSummary.deadlineRisk.slice(0, 3).map((item) => `Deadline risk: ${item.title}${item.deadline ? ` (${item.deadline})` : ""}`),
      ...operationsDraft.blockers,
    ].join("\n");
    const progressPercent = todoSummary.total ? `${Math.round((todoSummary.done / todoSummary.total) * 100)}%` : form.progressPercent || "";
    const tasksInProgress = inProgress || form.tasksInProgress || "";
    const tasksTomorrow = [
      ...todoSummary.nextFocus.slice(0, 3).map((item) => `- ${item.title}`),
      ...operationsDraft.tasksTomorrow.map((item) => `- ${item}`),
    ].join("\n") || form.tasksTomorrow || "";
    const nextBlockers = blockers || form.blockers || "";
    const customerMemoryNoteStr = [
      projectMemory.customerStyle ? `Style: ${projectMemory.customerStyle}` : "",
      projectMemory.reportRule ? `Report rule: ${projectMemory.reportRule}` : "",
      projectMemory.communicationNotes ? `Communication: ${projectMemory.communicationNotes}` : "",
    ].filter(Boolean).join("\n");
    const text = buildLocalizedDailyReport({
      language: reportLanguage,
      reportDate: form.reportDate,
      projectName: form.projectName ?? "",
      owner: form.owner ?? "",
      tasksDone: doneTasks,
      tasksInProgress,
      tasksTomorrow,
      blockers: nextBlockers,
      progressPercent,
      customerMemoryNote: customerMemoryNoteStr,
    });

    setTasksDoneArr(doneTasks);
    setForm((current) => ({
      ...current,
      tasksDone: JSON.stringify(doneTasks),
      tasksInProgress,
      tasksTomorrow,
      blockers: nextBlockers,
      progressPercent,
      generatedJp: text,
    }));
    setPreview(text);
    setStatus(`${t("reports.liveFilled")} Operations delta: Q&A ${operationsDraft.sourceCounts.newQna}/${operationsDraft.sourceCounts.answeredQna}, CR ${operationsDraft.sourceCounts.crDecisions}, blockers ${operationsDraft.sourceCounts.openBlockers}.`);
  }

  async function generateWithAI() {
    if (!aiBulletPoints.trim()) return;
    setIsGeneratingAi(true);
    setStatus(t("reports.aiGeneratingStatus"));
    try {
      const res = await fetch(`${apiBaseUrl}/ai/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: form.projectName || "",
          owner: form.owner || "",
          progress: form.progressPercent || "0",
          tasks_done: tasksDoneArr,
          tasks_wip: form.tasksInProgress || "",
          tasks_tomorrow: form.tasksTomorrow || "",
          blockers: form.blockers || "",
          bullet_points: aiBulletPoints,
          customer_style: projectMemory.customerStyle,
          report_rule: projectMemory.reportRule,
          timezone_rule: projectMemory.timezoneRule,
          communication_notes: projectMemory.communicationNotes,
        }),
      });
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();

      setForm((f) => ({
        ...f,
        tasksInProgress: (data.tasks_wip_jp || []).join("\n"),
        tasksTomorrow: (data.tasks_tomorrow_jp || []).join("\n"),
        blockers: data.blockers_jp || "",
        generatedJp: data.horenso_text || "",
      }));
      setTasksDoneArr(data.tasks_done_jp || []);
      setPreview(data.horenso_text || "");
      setStatus(t("reports.aiDoneStatus"));
      setIsAiModalOpen(false);
      setAiBulletPoints("");
    } catch (err) {
      console.error(err);
      setStatus(t("reports.aiErrorStatus"));
    } finally {
      setIsGeneratingAi(false);
    }
  }

  function openAiReportRefiner() {
    const todoSummary = getBrseTodoCommandSummary();
    const operationsDraft = buildOperationsDeltaReportDraft(operations, form.reportDate || todayIso());
    setAiBulletPoints(buildReportRefinerSeed({
      currentDraft: preview || liveDailyPreview,
      tasksDone: tasksDoneArr,
      todoOpen: todoSummary.nextFocus.slice(0, 6).map((item) => item.title),
      todoRisks: todoSummary.deadlineRisk.slice(0, 6).map((item) => `${item.title}${item.deadline ? ` (${item.deadline})` : ""}`),
      operationsDraft,
      projectMemoryNote: customerMemoryNote,
    }));
    setIsAiModalOpen(true);
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus(t("reports.copyError"));
    }
  }

  function openEmailDraft(subject: string, body: string) {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: activeProject?.customer_email ?? "",
      su: subject,
      body,
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener,noreferrer");
    setStatus("Đã mở Gmail draft.");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = liveDailyPreview;
    const toSave: ReportRecordInput = { ...form, generatedJp: text, tasksDone: JSON.stringify(tasksDoneArr) };
    setIsLoading(true);
    try {
      const saved = await saveReportMutation.mutateAsync({ record: toSave, existingId: editingId || undefined });
      if (saved) {
        setPreview(text);
        setStatus(editingId ? t("reports.updatedStatus") : t("reports.savedStatus"));
        resetForm();
      } else {
        setStatus(t("reports.saveError"));
      }
    } catch {
      setStatus(t("reports.saveError"));
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    const proj = getActiveProject();
    setActiveProject(proj);
    setEditingId("");
    setTasksDoneArr([]);
    setTaskInput("");
    setForm({
      ...emptyInput,
      reportDate: todayIso(),
      projectName: proj?.name ?? "",
      owner: proj?.brse_name ?? "",
    });
  }

  function startEdit(record: ReportRecord) {
    setEditingId(record.id);
    let done: string[] = [];
    try {
      done = JSON.parse(record.tasksDone || "[]");
    } catch {
      done = record.tasksDone ? [record.tasksDone] : [];
    }
    setTasksDoneArr(done);
    setForm({
      reportDate: record.reportDate,
      projectName: record.projectName,
      owner: record.owner,
      tasksDone: record.tasksDone,
      tasksInProgress: record.tasksInProgress,
      tasksTomorrow: record.tasksTomorrow,
      blockers: record.blockers,
      progressPercent: record.progressPercent,
      generatedJp: record.generatedJp,
    });
    setPreview(record.generatedJp || "");
    setStatus("");
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ type: "danger", message: t("reports.deleteConfirm") });
    if (!ok) return;
    setIsLoading(true);
    try {
      await deleteReportMutation.mutateAsync(id);
      setStatus(t("reports.deletedStatus"));
    } catch {
      setStatus("Error deleting report.");
    } finally {
      setIsLoading(false);
    }
  }

  return {
    t,
    language,
    confirm,
    records,
    isLoading: isLoading || isQueryLoading || isOperationsLoading,
    setIsLoading,
    activeTab,
    setActiveTab,
    reportLanguage,
    setReportLanguage,
    editingId,
    setEditingId,
    status,
    setStatus,
    copied,
    setCopied,
    isAiModalOpen,
    setIsAiModalOpen,
    aiBulletPoints,
    setAiBulletPoints,
    isGeneratingAi,
    setIsGeneratingAi,
    form,
    setForm,
    taskInput,
    setTaskInput,
    tasksDoneArr,
    setTasksDoneArr,
    preview,
    setPreview,
    activeProject,
    analytics,
    weekStart,
    weekEnd,
    projectMemory,
    projectExecutionWarnings,
    customerMemoryNote,
    weekRecords,
    reportCalendar,
    reportsByDate,
    liveDailyPreview,
    weeklyText,
    addTask,
    removeTask,
    updateField,
    fillFromLiveData,
    generateWithAI,
    openAiReportRefiner,
    copyToClipboard,
    openEmailDraft,
    handleSubmit,
    resetForm,
    startEdit,
    handleDelete,
  };
}
