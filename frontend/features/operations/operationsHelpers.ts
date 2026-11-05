import type { OperationRecord, OperationRecordInput } from "@/lib/operations";

export const KANBAN_STATUSES = ["Draft", "Sent", "Answered", "Closed"] as const;

/** Next/previous Kanban column for a status, or null at the edges / unknown status. */
export function nextKanbanStatus(status: string, direction: "prev" | "next"): string | null {
  const index = (KANBAN_STATUSES as readonly string[]).indexOf(status);
  if (index === -1) return null;
  const target = KANBAN_STATUSES[direction === "next" ? index + 1 : index - 1];
  return target ?? null;
}

/** Save payload for a status change: same record, new status, no id/timestamps. */
export function buildStatusChangeInput(record: OperationRecord, status: string): OperationRecordInput {
  return {
    type: record.type,
    title: record.title,
    status,
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
  };
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function daysSince(iso: string) {
  const start = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const now = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.max(0, Math.floor((now - start) / 86400000));
}

export function subjectFor(record: OperationRecord) {
  if (record.type === "qna") return `【ご確認】${record.title}`;
  if (record.type === "bug") return `【不具合報告】${record.title}`;
  return `【変更依頼】${record.title}`;
}
