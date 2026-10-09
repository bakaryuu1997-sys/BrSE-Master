import {
  buildBatchQnaEmail,
  buildOperationEmail,
  type OperationRecord,
  type OperationRecordInput,
  type SlaEscalation,
} from "@/lib/operations";
import { daysSince, subjectFor, todayIso } from "./operationsHelpers";

type EmailPreviewInput = {
  records: OperationRecord[];
  selectedRecord: OperationRecord | null;
  selectedRecordIds: Set<string>;
  projectName?: string;
};

export type OperationsBriefingItem = {
  id: string;
  label: "SLA" | "Q&A" | "CR";
  title: string;
  helper: string;
  tone: "danger" | "warning" | "primary";
  record: OperationRecord;
};

export function toOperationInput(record: OperationRecord, patch: Partial<OperationRecord> = {}): OperationRecordInput {
  const next = { ...record, ...patch };
  return {
    type: next.type,
    title: next.title,
    status: next.status,
    priority: next.priority,
    owner: next.owner,
    dueDate: next.dueDate,
    customerOwner: next.customerOwner,
    projectName: next.projectName,
    fieldA: next.fieldA,
    fieldB: next.fieldB,
    fieldC: next.fieldC,
    fieldD: next.fieldD,
    fieldE: next.fieldE,
  };
}

export function buildOperationsEmailPreviewState({
  records,
  selectedRecord,
  selectedRecordIds,
  projectName,
}: EmailPreviewInput) {
  const isBatchMode = selectedRecordIds.size > 1;
  if (isBatchMode) {
    return {
      isBatchMode,
      emailPreview: buildBatchQnaEmail(records.filter((record) => selectedRecordIds.has(record.id)), projectName),
      emailSubject: `【ご確認】Q&Aについて (${selectedRecordIds.size}件)`,
    };
  }

  return {
    isBatchMode,
    emailPreview: selectedRecord ? buildOperationEmail(selectedRecord) : "",
    emailSubject: selectedRecord ? subjectFor(selectedRecord) : "",
  };
}

export function buildOperationsBriefingItems({
  slaEscalations,
  projectRecords,
  today = todayIso(),
}: {
  slaEscalations: SlaEscalation[];
  projectRecords: OperationRecord[];
  today?: string;
}): OperationsBriefingItem[] {
  return [
    ...slaEscalations.slice(0, 2).map((item) => ({
      id: `sla-${item.record.id}`,
      label: "SLA" as const,
      title: item.record.title,
      helper: item.reason,
      tone: "danger" as const,
      record: item.record,
    })),
    ...projectRecords
      .filter((record) => record.type === "qna" && !["Answered", "Closed"].includes(record.status))
      .sort((first, second) => {
        const firstDue = first.dueDate || "9999-12-31";
        const secondDue = second.dueDate || "9999-12-31";
        return firstDue.localeCompare(secondDue) || daysSince(second.createdAt || second.updatedAt || today) - daysSince(first.createdAt || first.updatedAt || today);
      })
      .slice(0, 3)
      .map((record) => ({
        id: `qna-${record.id}`,
        label: "Q&A" as const,
        title: record.title,
        helper: record.dueDate ? `Due ${record.dueDate}` : `${daysSince(record.createdAt || record.updatedAt || today)} ngày chưa xử lý`,
        tone: "warning" as const,
        record,
      })),
    ...projectRecords
      .filter((record) => record.type === "cr" && !["Approved", "Rejected", "Implemented", "Closed"].includes(record.status))
      .slice(0, 2)
      .map((record) => ({
        id: `cr-${record.id}`,
        label: "CR" as const,
        title: record.title,
        helper: record.status || "Pending review",
        tone: "primary" as const,
        record,
      })),
  ].slice(0, 5);
}
