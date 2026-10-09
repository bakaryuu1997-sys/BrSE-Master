import { describe, expect, it } from "vitest";
import type {
  DecisionLogEntry,
  OperationDependencyLink,
  OperationRecord,
  OperationTestMatrixItem,
  ReleaseGateChecklist,
} from "@/lib/operations";
import { buildOperationsReleaseModel } from "../operationsReleaseModel";

function operation(overrides: Partial<OperationRecord> = {}): OperationRecord {
  return {
    id: "op-1",
    type: "qna",
    title: "Confirm API scope",
    status: "Open",
    priority: "High",
    owner: "BrSE",
    dueDate: "",
    customerOwner: "Customer",
    projectName: "Bridge",
    fieldA: "",
    fieldB: "",
    fieldC: "",
    fieldD: "",
    fieldE: "",
    createdAt: "2026-05-24T00:00:00Z",
    updatedAt: "2026-05-24T00:00:00Z",
    ...overrides,
  };
}

const releaseGate: ReleaseGateChecklist = {
  projectName: "Bridge",
  releaseDate: "",
  uatStart: "",
  uatEnd: "",
  qnaClosed: false,
  criticalBugClosed: true,
  crReviewed: false,
  uatPassed: false,
  evidenceReady: false,
  customerApproved: false,
  deployNoteReady: false,
  note: "",
  updatedAt: "2026-05-24T00:00:00Z",
};

describe("operations release model", () => {
  it("builds project-scoped release, dependency, and test matrix model", () => {
    const records = [
      operation({ id: "qna-open", type: "qna", status: "Open" }),
      operation({ id: "bug-high", type: "bug", status: "Open", priority: "High" }),
      operation({ id: "cr-review", type: "cr", status: "Review" }),
      operation({ id: "other", projectName: "Other" }),
    ];
    const decisionLogs = [
      { id: "decision-1", title: "Go", decision: "Ship", owner: "PM", decisionDate: "", impact: "", evidenceUrl: "", relatedRecordId: "", projectName: "Bridge", createdAt: "", updatedAt: "" },
      { id: "decision-other", title: "Other", decision: "", owner: "", decisionDate: "", impact: "", evidenceUrl: "", relatedRecordId: "", projectName: "Other", createdAt: "", updatedAt: "" },
    ] satisfies DecisionLogEntry[];
    const dependencyLinks = [
      { id: "dep-1", projectName: "Bridge", sourceId: "qna-open", targetId: "bug-high", relation: "blocks", note: "", createdAt: "", updatedAt: "" },
      { id: "dep-other", projectName: "Other", sourceId: "other", targetId: "missing", relation: "related", note: "", createdAt: "", updatedAt: "" },
    ] satisfies OperationDependencyLink[];
    const testMatrixItems = [
      { id: "test-1", projectName: "Bridge", requirement: "Req", operationId: "qna-open", testCase: "Case", expectedResult: "", owner: "", uatStatus: "Passed", evidenceUrl: "", lastRunDate: "", note: "", createdAt: "", updatedAt: "" },
      { id: "test-2", projectName: "Bridge", requirement: "Req", operationId: "bug-high", testCase: "Case", expectedResult: "", owner: "", uatStatus: "Blocked", evidenceUrl: "", lastRunDate: "", note: "", createdAt: "", updatedAt: "" },
    ] satisfies OperationTestMatrixItem[];

    const model = buildOperationsReleaseModel({
      records,
      currentProjectName: "Bridge",
      decisionLogs,
      releaseGate,
      dependencyLinks,
      testMatrixItems,
    });

    expect(model.projectRecords).toHaveLength(3);
    expect(model.projectDecisionLogs.map((item) => item.id)).toEqual(["decision-1"]);
    expect(model.projectOpenQna).toBe(1);
    expect(model.projectCriticalBugs).toBe(1);
    expect(model.projectPendingCr).toBe(1);
    expect(model.dependencyRows.map((row) => row.link.id)).toEqual(["dep-1"]);
    expect(model.testMatrixStats).toEqual({ total: 2, passed: 1, failed: 0, blocked: 1 });
    expect(model.testMatrixPercent).toBe(50);
  });
});
