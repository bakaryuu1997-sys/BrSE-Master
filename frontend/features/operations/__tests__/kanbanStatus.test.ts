import { describe, expect, it } from "vitest";
import { buildStatusChangeInput, nextKanbanStatus } from "@/features/operations/operationsHelpers";
import type { OperationRecord } from "@/lib/operations";

const record = {
  id: "op-1",
  type: "qna",
  title: "ST-TEST",
  status: "Draft",
  priority: "Medium",
  owner: "A",
  dueDate: "2026-11-10",
  customerOwner: "B",
  projectName: "P",
  fieldA: "a",
  fieldB: "b",
  fieldC: "c",
  fieldD: "d",
  fieldE: "e",
  createdAt: "2026-11-05T00:00:00",
  updatedAt: "2026-11-05T00:00:00",
} as unknown as OperationRecord;

describe("kanban status helpers (B-010)", () => {
  it("builds an input that only changes status and drops id/timestamps", () => {
    const input = buildStatusChangeInput(record, "Sent");
    expect(input.status).toBe("Sent");
    expect(input.title).toBe("ST-TEST");
    expect(input.fieldE).toBe("e");
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("createdAt");
  });

  it("moves to the next/prev column and stops at the edges", () => {
    expect(nextKanbanStatus("Draft", "next")).toBe("Sent");
    expect(nextKanbanStatus("Sent", "prev")).toBe("Draft");
    expect(nextKanbanStatus("Draft", "prev")).toBeNull();
    expect(nextKanbanStatus("Closed", "next")).toBeNull();
    expect(nextKanbanStatus("Unknown", "next")).toBeNull();
  });
});
