import { beforeEach, describe, expect, it } from "vitest";
import {
  BRSE_TODO_PROJECTS_KEY,
  brseTodoStorageKey,
  getBrseTodoCommandSummary,
} from "@/lib/brseTodo";

function seed() {
  window.localStorage.setItem(
    BRSE_TODO_PROJECTS_KEY,
    JSON.stringify([
      { id: "p-abc", name: "abc", createdAt: "2026-01-01T00:00:00Z" },
      { id: "p-two", name: "two", createdAt: "2026-01-01T00:00:00Z" },
    ])
  );
  const item = (id: string, title: string) => ({
    id,
    title,
    phase: "1. Kick-off & Requirement",
    priority: "P0",
    done: false,
  });
  window.localStorage.setItem(
    brseTodoStorageKey("p-abc"),
    JSON.stringify({ preset: "standard", activePhase: "1. Kick-off & Requirement", items: [item("a1", "ABC task")] })
  );
  window.localStorage.setItem(
    brseTodoStorageKey("p-two"),
    JSON.stringify({ preset: "standard", activePhase: "1. Kick-off & Requirement", items: [item("b1", "TWO task")] })
  );
}

describe("getBrseTodoCommandSummary project scope", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seed();
  });

  it("returns only the selected project's items", () => {
    const summary = getBrseTodoCommandSummary("p-two");
    expect(summary.nextFocus.map((i) => i.title)).toEqual(["TWO task"]);
    expect(summary.nextFocus[0].projectName).toBe("two");
  });

  it("does not fall back to the first project when the selected id has no todo list", () => {
    const summary = getBrseTodoCommandSummary("p-unknown");
    expect(summary.nextFocus).toEqual([]);
    expect(summary.total).toBe(0);
  });

  it("merges every project for the 'all' scope", () => {
    const summary = getBrseTodoCommandSummary("all");
    expect(summary.nextFocus.map((i) => i.title).sort()).toEqual(["ABC task", "TWO task"]);
  });
});
