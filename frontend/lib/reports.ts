import { apiBaseUrl } from "@/lib/config";
import { downloadCsv } from "@/lib/csv";
import type { OperationRecord } from "@/lib/operations";

const API_BASE = `${apiBaseUrl}/reports`;

export type ReportRecord = {
  id: string;
  reportDate: string;        // YYYY-MM-DD
  projectName: string;
  owner: string;
  tasksDone: string;         // JSON string: string[]
  tasksInProgress: string;
  tasksTomorrow: string;
  blockers: string;
  progressPercent: string;   // "70%"
  generatedJp: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportRecordInput = {
  reportDate: string;
  projectName?: string;
  owner?: string;
  tasksDone?: string;
  tasksInProgress?: string;
  tasksTomorrow?: string;
  blockers?: string;
  progressPercent?: string;
  generatedJp?: string;
};

export type OperationsDeltaReportDraft = {
  tasksDone: string[];
  tasksInProgress: string[];
  tasksTomorrow: string[];
  blockers: string[];
  sourceCounts: {
    newQna: number;
    answeredQna: number;
    crDecisions: number;
    openBlockers: number;
  };
};

export function buildReportRefinerSeed(input: {
  currentDraft: string;
  tasksDone: string[];
  todoOpen: string[];
  todoRisks: string[];
  operationsDraft: OperationsDeltaReportDraft;
  projectMemoryNote?: string;
}): string {
  const lines = [
    "Refine this into a customer-facing BrSE daily report. Keep it concise, factual, and action-oriented.",
    "",
    "Current draft:",
    input.currentDraft || "-",
    "",
    "Todo done today:",
    ...formatSeedLines(input.tasksDone),
    "",
    "Open Todo focus:",
    ...formatSeedLines(input.todoOpen),
    "",
    "Todo risks:",
    ...formatSeedLines(input.todoRisks),
    "",
    "Operations done / decisions:",
    ...formatSeedLines(input.operationsDraft.tasksDone),
    "",
    "Operations in progress:",
    ...formatSeedLines(input.operationsDraft.tasksInProgress),
    "",
    "Operations blockers:",
    ...formatSeedLines(input.operationsDraft.blockers),
  ];

  if (input.projectMemoryNote?.trim()) {
    lines.push("", "Project/customer style rules:", input.projectMemoryNote.trim());
  }

  return lines.join("\n");
}

function formatSeedLines(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`) : ["- None"];
}

// -------------------------------------------------------
// API helpers
// -------------------------------------------------------
export async function getReportRecords(): Promise<ReportRecord[]> {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Failed to fetch reports");
    const raw = await res.json();
    // snake_case → camelCase mapping
    return raw.map(mapToCamel);
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function saveReportRecord(
  input: ReportRecordInput,
  existingId?: string
): Promise<ReportRecord | null> {
  try {
    const method = existingId ? "PUT" : "POST";
    const url = existingId ? `${API_BASE}/${existingId}` : API_BASE;
    const body = mapToSnake(input);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to save report");
    return mapToCamel(await res.json());
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function deleteReportRecord(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export function buildOperationsDeltaReportDraft(
  operations: OperationRecord[],
  reportDate: string
): OperationsDeltaReportDraft {
  const openStatuses = new Set(["Open", "Sent", "Waiting Customer", "In Progress", "Pending", "Blocked"]);
  const answeredStatuses = new Set(["Answered", "Closed", "Done", "Resolved"]);
  const crDecisionStatuses = new Set(["Approved", "Rejected", "Implemented"]);
  const isSameReportDate = (value: string) => Boolean(value && value.slice(0, 10) === reportDate);
  const isOpen = (record: OperationRecord) => openStatuses.has(record.status);
  const isOverdue = (record: OperationRecord) => Boolean(record.dueDate && record.dueDate < reportDate && isOpen(record));
  const isDueSoon = (record: OperationRecord) => Boolean(record.dueDate && record.dueDate >= reportDate && isOpen(record));
  const label = (record: OperationRecord) => {
    const prefix = record.type.toUpperCase();
    const owner = record.owner ? ` / ${record.owner}` : "";
    const due = record.dueDate ? ` / due ${record.dueDate}` : "";
    return `[${prefix}] ${record.title}${owner}${due}`;
  };

  const newQna = operations.filter((record) =>
    record.type === "qna" && isSameReportDate(record.createdAt) && isOpen(record)
  );
  const answeredQna = operations.filter((record) =>
    record.type === "qna" && isSameReportDate(record.updatedAt) && answeredStatuses.has(record.status)
  );
  const crDecisions = operations.filter((record) =>
    record.type === "cr" && isSameReportDate(record.updatedAt) && crDecisionStatuses.has(record.status)
  );
  const closedBugs = operations.filter((record) =>
    record.type === "bug" && isSameReportDate(record.updatedAt) && answeredStatuses.has(record.status)
  );
  const pendingWork = operations.filter((record) =>
    (record.type === "qna" || record.type === "cr" || record.type === "bug") && isOpen(record)
  );
  const blockers = pendingWork.filter((record) =>
    isOverdue(record) || record.priority.toUpperCase() === "P0" || record.status === "Blocked"
  );

  return {
    tasksDone: [
      ...answeredQna.map((record) => `Answered customer Q&A: ${label(record)}`),
      ...crDecisions.map((record) => `CR decision updated: ${label(record)} (${record.status})`),
      ...closedBugs.map((record) => `Bug resolved: ${label(record)}`),
    ],
    tasksInProgress: [
      ...newQna.map((record) => `New Q&A opened: ${label(record)}`),
      ...pendingWork.slice(0, 8).map((record) => `Tracking: ${label(record)} (${record.status})`),
    ],
    tasksTomorrow: pendingWork.filter(isDueSoon).slice(0, 5).map((record) => `Follow up: ${label(record)}`),
    blockers: blockers.slice(0, 8).map((record) => `Needs attention: ${label(record)} (${record.status})`),
    sourceCounts: {
      newQna: newQna.length,
      answeredQna: answeredQna.length,
      crDecisions: crDecisions.length,
      openBlockers: blockers.length,
    },
  };
}

// -------------------------------------------------------
// Mapping helpers
// -------------------------------------------------------
function mapToCamel(raw: any): ReportRecord {
  return {
    id: raw.id,
    reportDate: raw.report_date ?? "",
    projectName: raw.project_name ?? "",
    owner: raw.owner ?? "",
    tasksDone: raw.tasks_done ?? "[]",
    tasksInProgress: raw.tasks_in_progress ?? "",
    tasksTomorrow: raw.tasks_tomorrow ?? "",
    blockers: raw.blockers ?? "",
    progressPercent: raw.progress_percent ?? "",
    generatedJp: raw.generated_jp ?? "",
    createdAt: raw.created_at ?? "",
    updatedAt: raw.updated_at ?? "",
  };
}

function mapToSnake(input: ReportRecordInput) {
  return {
    report_date: input.reportDate,
    project_name: input.projectName ?? "",
    owner: input.owner ?? "",
    tasks_done: input.tasksDone ?? "[]",
    tasks_in_progress: input.tasksInProgress ?? "",
    tasks_tomorrow: input.tasksTomorrow ?? "",
    blockers: input.blockers ?? "",
    progress_percent: input.progressPercent ?? "",
    generated_jp: input.generatedJp ?? "",
  };
}

// -------------------------------------------------------
// HORENSO Report Builder
// -------------------------------------------------------
export function buildHoresoReport(params: {
  reportDate: string;
  projectName: string;
  owner: string;
  tasksDone: string[];
  tasksInProgress: string;
  tasksTomorrow: string;
  blockers: string;
  progressPercent: string;
}): string {
  const dateObj = new Date(params.reportDate + "T12:00:00");
  const jpDate = dateObj.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const doneLine =
    params.tasksDone.length > 0
      ? params.tasksDone.map((t) => `  ・${t}`).join("\n")
      : "  ・特になし";

  const blockerLine = params.blockers?.trim()
    ? `\n【問題・リスク】\n  ${params.blockers.trim()}`
    : "";

  return `【日次報告】${jpDate}
プロジェクト：${params.projectName || "〇〇プロジェクト"}
担当：${params.owner || "担当者"}
進捗率：${params.progressPercent || "-"}

【本日完了したタスク】
${doneLine}

【現在進行中のタスク】
  ${params.tasksInProgress || "特になし"}

【明日の予定】
  ${params.tasksTomorrow || "特になし"}${blockerLine}

以上、ご確認よろしくお願いいたします。`;
}

// -------------------------------------------------------
// Weekly summary builder — aggregate 5 daily records
// -------------------------------------------------------
export function buildWeeklySummary(
  records: ReportRecord[],
  weekStart: string,
  weekEnd: string
): string {
  if (records.length === 0) return "（今週の日次報告なし）";

  const allDone: string[] = [];
  records.forEach((r) => {
    try {
      const tasks = JSON.parse(r.tasksDone || "[]") as string[];
      allDone.push(...tasks);
    } catch {
      if (r.tasksDone) allDone.push(r.tasksDone);
    }
  });

  const projectName = records[0].projectName || "〇〇プロジェクト";
  const owner = records[0].owner || "担当者";
  const latestProgress = records[0].progressPercent || "-";

  return `【週次報告】${weekStart}〜${weekEnd}
プロジェクト：${projectName}
担当：${owner}
進捗率（週末時点）：${latestProgress}

【今週の主な完了タスク】
${allDone.length > 0 ? allDone.map((t) => `  ・${t}`).join("\n") : "  ・特になし"}

【来週の予定】
  ${records[0].tasksTomorrow || "特になし"}

以上、よろしくお願いいたします。`;
}

// -------------------------------------------------------
// Excel export for report history
// -------------------------------------------------------
export function exportReportsCsv(records: ReportRecord[]) {
  const rows = records.map((r) => {
    let doneTasks: string[] = [];
    try {
      doneTasks = JSON.parse(r.tasksDone || "[]");
    } catch {
      doneTasks = r.tasksDone ? [r.tasksDone] : [];
    }
    return {
      日付: r.reportDate,
      プロジェクト: r.projectName,
      担当者: r.owner,
      "完了タスク": doneTasks.join(" / "),
      "進行中": r.tasksInProgress,
      "明日の予定": r.tasksTomorrow,
      "問題・ブロッカー": r.blockers,
      進捗率: r.progressPercent,
    };
  });
  downloadCsv("brse-reports.csv", rows);
}
