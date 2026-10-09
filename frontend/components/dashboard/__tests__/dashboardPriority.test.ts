import { describe, expect, it } from "vitest";
import type { BrseTodoItem } from "@/lib/brseTodo";
import type { MeetingTodoDraft } from "@/lib/commandCenter";
import type { OperationRecord, OperationType } from "@/lib/operations";
import type { TranslationKey } from "@/lib/uiLanguage";
import { buildDashboardPriorityBoard } from "../useDashboardPriority";

const t = (key: TranslationKey): string => key;
const href = () => "#";

function todo(overrides: Partial<BrseTodoItem> = {}): BrseTodoItem {
  return {
    id: "todo",
    phase: "Dev",
    title: "Todo",
    detail: "",
    priority: "P1",
    done: false,
    note: "",
    deadline: "",
    evidenceUrl: "",
    operationId: "",
    ...overrides,
  };
}

function op(overrides: Partial<OperationRecord> & { type?: OperationType } = {}): OperationRecord {
  return {
    id: "op",
    type: "qna",
    title: "Op",
    status: "open",
    priority: "medium",
    owner: "",
    dueDate: "",
    customerOwner: "",
    projectName: "",
    fieldA: "",
    fieldB: "",
    fieldC: "",
    fieldD: "",
    fieldE: "",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function baseInput() {
  return {
    activeProject: null,
    deadlineRisk: [] as BrseTodoItem[],
    nextFocus: [] as BrseTodoItem[],
    overdueOperations: [] as OperationRecord[],
    pendingCr: [] as OperationRecord[],
    t,
    todoActionHref: href,
    unsyncedMeetingActions: [] as MeetingTodoDraft[],
    waitingQna: [] as OperationRecord[],
  };
}

describe("buildDashboardPriorityBoard", () => {
  it("ranks deadline risks above overdue operations and next-focus todos", () => {
    const board = buildDashboardPriorityBoard({
      ...baseInput(),
      deadlineRisk: [todo({ id: "d1", title: "Deadline 1" })],
      overdueOperations: [op({ id: "ov1", title: "Overdue 1", type: "cr" })],
      nextFocus: [todo({ id: "n1", title: "Next 1" })],
    });

    expect(board.map((item) => item.id)).toEqual(["deadline-d1", "overdue-op-ov1", "todo-n1"]);
    expect(board[0].kind).toBe("deadline");
  });

  it("caps the board at six items, keeping the most urgent", () => {
    const board = buildDashboardPriorityBoard({
      ...baseInput(),
      deadlineRisk: [todo({ id: "d1" }), todo({ id: "d2" }), todo({ id: "d3" })],
      overdueOperations: [
        op({ id: "ov1", type: "cr" }),
        op({ id: "ov2", type: "cr" }),
        op({ id: "ov3", type: "cr" }),
      ],
      pendingCr: [op({ id: "cr1", type: "cr", status: "Pending" })],
      waitingQna: [op({ id: "q1", type: "qna" }), op({ id: "q2", type: "qna" })],
      nextFocus: [todo({ id: "n1" }), todo({ id: "n2" }), todo({ id: "n3" })],
    });

    expect(board).toHaveLength(6);
    expect(board.slice(0, 3).every((item) => item.kind === "deadline")).toBe(true);
  });

  it("surfaces an unsynced meeting action draft", () => {
    const draft = {
      id: "m1",
      task: "Follow up",
      meeting_title: "Kickoff",
      owner: "Aki",
    } as MeetingTodoDraft;

    const board = buildDashboardPriorityBoard({
      ...baseInput(),
      unsyncedMeetingActions: [draft],
    });

    expect(board.map((item) => item.id)).toContain("meeting-m1");
    expect(board[0].kind).toBe("meeting");
  });
});
