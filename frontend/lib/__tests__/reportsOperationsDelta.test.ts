import { describe, expect, it } from "vitest";
import { buildOperationsDeltaReportDraft, buildReportRefinerSeed } from "@/lib/reports";
import type { OperationRecord } from "@/lib/operations";

function operation(input: Partial<OperationRecord> & Pick<OperationRecord, "id" | "type" | "title" | "status">): OperationRecord {
  return {
    priority: "P2",
    owner: "",
    dueDate: "",
    customerOwner: "",
    projectName: "BrSE OS",
    fieldA: "",
    fieldB: "",
    fieldC: "",
    fieldD: "",
    fieldE: "",
    createdAt: "2026-05-25T08:00:00",
    updatedAt: "2026-05-25T08:00:00",
    ...input,
  };
}

describe("buildOperationsDeltaReportDraft", () => {
  it("builds a daily report draft from Operations Q&A, CR, bug, and blocker deltas", () => {
    const draft = buildOperationsDeltaReportDraft([
      operation({ id: "qna-new", type: "qna", title: "Confirm API timeout", status: "Open", owner: "BrSE" }),
      operation({ id: "qna-answered", type: "qna", title: "Customer answered timezone", status: "Answered" }),
      operation({ id: "cr-approved", type: "cr", title: "Add export field", status: "Approved" }),
      operation({ id: "bug-done", type: "bug", title: "Fix import crash", status: "Resolved" }),
      operation({ id: "bug-blocked", type: "bug", title: "Payment callback fails", status: "Blocked", priority: "P0", dueDate: "2026-05-24" }),
    ], "2026-05-25");

    expect(draft.tasksDone).toEqual(expect.arrayContaining([
      expect.stringContaining("Answered customer Q&A"),
      expect.stringContaining("CR decision updated"),
      expect.stringContaining("Bug resolved"),
    ]));
    expect(draft.tasksInProgress).toEqual(expect.arrayContaining([
      expect.stringContaining("New Q&A opened"),
      expect.stringContaining("Payment callback fails"),
    ]));
    expect(draft.blockers).toEqual([expect.stringContaining("Payment callback fails")]);
    expect(draft.sourceCounts).toEqual({
      newQna: 1,
      answeredQna: 1,
      crDecisions: 1,
      openBlockers: 1,
    });
  });

  it("builds an AI report refiner seed from Todo, Operations, and customer style", () => {
    const operationsDraft = buildOperationsDeltaReportDraft([
      operation({ id: "qna-answered", type: "qna", title: "Customer answered timezone", status: "Answered" }),
      operation({ id: "bug-blocked", type: "bug", title: "Payment callback fails", status: "Blocked", priority: "P0", dueDate: "2026-05-24" }),
    ], "2026-05-25");

    const seed = buildReportRefinerSeed({
      currentDraft: "Current report draft",
      tasksDone: ["Implemented CSV export"],
      todoOpen: ["Review release checklist"],
      todoRisks: ["UAT evidence missing"],
      operationsDraft,
      projectMemoryNote: "Use concise Keigo and mention blockers first.",
    });

    expect(seed).toContain("Current report draft");
    expect(seed).toContain("Implemented CSV export");
    expect(seed).toContain("Payment callback fails");
    expect(seed).toContain("Use concise Keigo");
  });
});
