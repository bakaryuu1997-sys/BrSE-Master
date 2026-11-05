import { describe, expect, it } from "vitest";
import { mergeTodoItemsByRecency, type BrseTodoItem } from "@/lib/brseTodo";

function item(partial: Partial<BrseTodoItem> & { id: string }): BrseTodoItem {
  return {
    phase: "1. Kick-off & Requirement",
    title: partial.id,
    detail: "",
    priority: "P1",
    done: false,
    note: "",
    deadline: "",
    evidenceUrl: "",
    operationId: "",
    ...partial,
  };
}

describe("mergeTodoItemsByRecency", () => {
  it("keeps local-only custom tasks when the server copy is empty", () => {
    const merged = mergeTodoItemsByRecency([item({ id: "custom-1", title: "My task" })], []);
    expect(merged.map((i) => i.id)).toEqual(["custom-1"]);
  });

  it("adds server-only tasks", () => {
    const merged = mergeTodoItemsByRecency([], [item({ id: "s1" })]);
    expect(merged.map((i) => i.id)).toEqual(["s1"]);
  });

  it("the more recently updated copy wins", () => {
    const local = item({ id: "a", done: true, updatedAt: "2026-11-04T10:00:00Z" });
    const serverNewer = item({ id: "a", done: false, updatedAt: "2026-11-04T11:00:00Z" });
    const serverOlder = item({ id: "a", done: false, updatedAt: "2026-11-04T09:00:00Z" });
    expect(mergeTodoItemsByRecency([local], [serverNewer])[0].done).toBe(false);
    expect(mergeTodoItemsByRecency([local], [serverOlder])[0].done).toBe(true);
  });

  it("on a tie the server wins unless only the local copy has progress", () => {
    const localDone = item({ id: "a", done: true });
    const serverBlank = item({ id: "a" });
    expect(mergeTodoItemsByRecency([localDone], [serverBlank])[0].done).toBe(true);

    const localBlank = item({ id: "b", title: "local title" });
    const serverTitle = item({ id: "b", title: "server title" });
    expect(mergeTodoItemsByRecency([localBlank], [serverTitle])[0].title).toBe("server title");
  });
});
