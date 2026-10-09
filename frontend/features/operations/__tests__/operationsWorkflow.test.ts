import { describe, expect, it } from "vitest";
import type { OperationRecord } from "@/lib/operations";
import { buildOperationsBriefingItems, buildOperationsEmailPreviewState, toOperationInput } from "../operationsWorkflow";

function operation(overrides: Partial<OperationRecord> = {}): OperationRecord {
  return {
    id: "op-1",
    type: "qna",
    title: "Confirm API scope",
    status: "Open",
    priority: "High",
    owner: "BrSE",
    dueDate: "2026-05-30",
    customerOwner: "Customer",
    projectName: "Bridge",
    fieldA: "Question",
    fieldB: "Answer",
    fieldC: "",
    fieldD: "",
    fieldE: "",
    createdAt: "2026-05-24T00:00:00Z",
    updatedAt: "2026-05-24T00:00:00Z",
    ...overrides,
  };
}

describe("operations workflow helpers", () => {
  it("converts a record and patch into a save input without ids or timestamps", () => {
    const value = toOperationInput(operation(), { status: "Answered" });

    expect(value.status).toBe("Answered");
    expect(value.title).toBe("Confirm API scope");
    expect(value).not.toHaveProperty("id");
    expect(value).not.toHaveProperty("createdAt");
    expect(value).not.toHaveProperty("updatedAt");
  });

  it("builds a single-record email preview state", () => {
    const selected = operation({ id: "single", title: "Need UAT date" });
    const value = buildOperationsEmailPreviewState({
      records: [selected],
      selectedRecord: selected,
      selectedRecordIds: new Set(),
      projectName: "Bridge",
    });

    expect(value.isBatchMode).toBe(false);
    expect(value.emailPreview).toContain("Question");
    expect(value.emailSubject).toContain("Need UAT date");
  });

  it("builds a batch email preview from selected records", () => {
    const first = operation({ id: "one", title: "Confirm API scope" });
    const second = operation({ id: "two", title: "Confirm release date" });
    const value = buildOperationsEmailPreviewState({
      records: [first, second, operation({ id: "three", title: "Unselected" })],
      selectedRecord: first,
      selectedRecordIds: new Set(["one", "two"]),
      projectName: "Bridge",
    });

    expect(value.isBatchMode).toBe(true);
    expect(value.emailSubject).toBe("【ご確認】Q&Aについて (2件)");
    expect(value.emailPreview).toContain("Confirm API scope");
    expect(value.emailPreview).toContain("Confirm release date");
    expect(value.emailPreview).not.toContain("Unselected");
  });

  it("builds urgent briefing items from SLA, Q&A, and CR records", () => {
    const slaRecord = operation({ id: "sla", title: "Overdue answer" });
    const qnaRecord = operation({ id: "qna", title: "Due answer", dueDate: "2026-05-25" });
    const crRecord = operation({ id: "cr", type: "cr", title: "Pending change", status: "Review" });

    const value = buildOperationsBriefingItems({
      slaEscalations: [{ record: slaRecord, level: "critical", reason: "Overdue", suggestedAction: "Escalate", ageDays: 5, daysUntilDue: -1 }],
      projectRecords: [qnaRecord, crRecord],
      today: "2026-05-24",
    });

    expect(value.map((item) => item.id)).toEqual(["sla-sla", "qna-qna", "cr-cr"]);
    expect(value[0].tone).toBe("danger");
    expect(value[1].helper).toBe("Due 2026-05-25");
    expect(value[2].label).toBe("CR");
  });
});
