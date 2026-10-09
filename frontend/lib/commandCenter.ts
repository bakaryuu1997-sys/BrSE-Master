import { apiBaseUrl } from "@/lib/config";

export type CommandCenterAction = {
  kind: "open_overdue" | "copy_qna_reminder" | "sync_meeting_actions" | "review_cr" | "copy_daily_summary" | string;
  title: string;
  body: string;
  href: string;
  severity: number;
  data?: Record<string, unknown>;
};

export type CommandCenterTodoItem = {
  id: string;
  project_id: string;
  project_name: string;
  phase: string;
  title: string;
  priority: string;
  deadline: string;
  operation_id: string;
  meeting_id: string;
};

export type CommandCenterOperation = {
  id: string;
  type: "qna" | "bug" | "cr";
  title: string;
  status: string;
  priority: string;
  owner: string;
  customer_owner: string;
  project_name: string;
  due_date: string;
  field_a: string;
  field_b: string;
};

export type MeetingTodoDraft = {
  id: string;
  project_id: string;
  project_name: string;
  meeting_id: string;
  meeting_title: string;
  action_index: number | null;
  task: string;
  owner: string;
  deadline: string;
  action_status: string;
  source_quote: string;
  evidence_url: string;
  priority: string;
  phase: string;
  review_status: "pending" | "approved" | "rejected" | string;
  todo_item_id: string;
  created_at: string;
  updated_at: string;
};

export type CommandCenterData = {
  generated_at: string;
  today: string;
  active_project?: { id: string; name: string; preset: string; active_phase: string } | null;
  metrics: {
    todo_total: number;
    todo_done: number;
    done_today: number;
    deadline_risk: number;
    waiting_qna: number;
    qna_due: number;
    pending_cr: number;
    power_tool_high_risks?: number;
    overdue_operations: number;
    unsynced_meeting_actions: number;
    upcoming_schedules: number;
  };
  actions: CommandCenterAction[];
  next_focus: CommandCenterTodoItem[];
  deadline_risk: CommandCenterTodoItem[];
  waiting_qna: CommandCenterOperation[];
  pending_cr: CommandCenterOperation[];
  power_tool_high_risks?: Array<{
    project_id: string;
    title: string;
    impact: string;
    probability: string;
    mitigation: string;
    status: string;
    score: number;
  }>;
  overdue_operations: CommandCenterOperation[];
  unsynced_meeting_actions: MeetingTodoDraft[];
  upcoming_schedules: Array<{
    id: string;
    date: string;
    title: string;
    start_time: string;
    end_time: string;
    timezone: string;
  }>;
};

export async function getCommandCenter(): Promise<CommandCenterData> {
  const response = await fetch(`${apiBaseUrl}/command-center`, { cache: "no-store" });
  if (!response.ok) throw new Error("Không tải được Command Center.");
  return response.json() as Promise<CommandCenterData>;
}

export async function syncMeetingActionsToTodo(): Promise<{ created: number; project_id: string; project_name: string }> {
  const response = await fetch(`${apiBaseUrl}/command-center/sync-meeting-actions`, { method: "POST" });
  if (!response.ok) throw new Error("Không sync được Meeting action vào BrSE Todo.");
  return response.json() as Promise<{ created: number; project_id: string; project_name: string }>;
}

export async function getMeetingTodoDrafts(): Promise<MeetingTodoDraft[]> {
  const response = await fetch(`${apiBaseUrl}/command-center/meeting-action-drafts`, { cache: "no-store" });
  if (!response.ok) throw new Error("Không tải được Meeting Todo draft queue.");
  const data = (await response.json()) as { drafts?: MeetingTodoDraft[] };
  return Array.isArray(data.drafts) ? data.drafts : [];
}

export async function approveMeetingTodoDraft(draftId: string): Promise<{ todo_item_id: string; project_id: string }> {
  const response = await fetch(`${apiBaseUrl}/command-center/meeting-action-drafts/${encodeURIComponent(draftId)}/approve`, { method: "POST" });
  if (!response.ok) throw new Error("Không approve được Meeting Todo draft.");
  return response.json() as Promise<{ todo_item_id: string; project_id: string }>;
}

export async function rejectMeetingTodoDraft(draftId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/command-center/meeting-action-drafts/${encodeURIComponent(draftId)}/reject`, { method: "POST" });
  if (!response.ok) throw new Error("Không reject được Meeting Todo draft.");
}

export function todoHref(item: CommandCenterTodoItem) {
  return `/app/brse-todo?projectId=${encodeURIComponent(item.project_id)}&phase=${encodeURIComponent(item.phase)}&itemId=${encodeURIComponent(item.id)}`;
}

export function operationHref(record: CommandCenterOperation) {
  return `/app/operations?type=${record.type}&id=${encodeURIComponent(record.id)}`;
}

export function buildCommandCenterDailySummary(data: CommandCenterData) {
  const lines = [
    "BrSE Daily Focus",
    `Project: ${data.active_project?.name || "-"}`,
    `Todo: ${data.metrics.todo_done}/${data.metrics.todo_total}`,
    `Deadline risk: ${data.metrics.deadline_risk}`,
    `Q&A waiting: ${data.metrics.waiting_qna}`,
    `CR pending: ${data.metrics.pending_cr}`,
    `Power Tool high risks: ${data.metrics.power_tool_high_risks ?? 0}`,
    `Meeting actions not in Todo: ${data.metrics.unsynced_meeting_actions}`,
    "",
    "Priority:",
    ...(data.actions.length ? data.actions.map((action, index) => `${index + 1}. ${action.title} - ${action.body}`) : ["- No urgent action"]),
    "",
    "Next focus:",
    ...(data.next_focus.length ? data.next_focus.slice(0, 5).map((item) => `- [${item.priority}] ${item.title}${item.deadline ? ` (${item.deadline})` : ""}`) : ["- None"]),
  ];
  return lines.join("\n");
}

export function buildQnaReminderDraft(records: CommandCenterOperation[], projectName?: string) {
  const subject = `【ご確認】未回答Q&Aのリマインド${records.length ? ` (${records.length}件)` : ""}`;
  const body = [
    "お世話になっております。",
    "",
    `${projectName ? `${projectName}に関して、` : ""}未回答のQ&Aについて、念のためリマインドいたします。`,
    "",
    "【確認事項】",
    ...(records.length
      ? records.map((record, index) => `${index + 1}. ${record.title}${record.due_date ? ` / 希望期限: ${record.due_date}` : ""}`)
      : ["1. 未回答Q&Aをご確認ください。"]),
    "",
    "お忙しいところ恐れ入りますが、ご確認のほどよろしくお願いいたします。",
  ];
  return `Subject: ${subject}\n\n${body.join("\n")}`;
}
