import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendChecklistLine,
  createWorkflowItem,
  defaultPhase,
  isDeadlineSoon,
  isOverdue,
  isStaleDone,
  mergeProjectSettingsIntoTodoProjects,
  mergeSavedItems,
  parseNoteChecklist,
  percentage,
  phaseOrder,
  phaseRank,
  presetLabels,
  priorityRank,
  readProjectState,
  sortWorkflowItems,
  storageKey,
  toggleChecklistLine,
  workflowTemplate,
  writeProjectState,
  type WorkflowItem,
} from "@/features/todo/useTodoProjectSync";
import type { ProjectSetting } from "@/lib/projectSettings";

// Characterization tests: they pin the current behaviour so the file can be split safely.

describe("workflow template data", () => {
  it("is unchanged (count, ids, content hash)", () => {
    expect(workflowTemplate).toHaveLength(EXPECTED_TEMPLATE_COUNT);
    expect(new Set(workflowTemplate.map((item) => item.id)).size).toBe(EXPECTED_TEMPLATE_COUNT);
    expect(createHash("sha256").update(JSON.stringify(workflowTemplate)).digest("hex")).toBe(EXPECTED_TEMPLATE_HASH);
  });

  it("only uses known phases and presets", () => {
    for (const item of workflowTemplate) {
      expect(phaseOrder).toContain(item.phase);
      for (const preset of item.presets) expect(Object.keys(presetLabels)).toContain(preset);
    }
    expect(defaultPhase).toBe(phaseOrder[0]);
  });
});

describe("ranking and sorting", () => {
  it("computes percentage safely", () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 3)).toBe(67);
    expect(percentage(0, 0)).toBe(0);
  });

  it("ranks phases and priorities", () => {
    expect(phaseRank(phaseOrder[0])).toBe(0);
    expect(phaseRank("unknown")).toBe(phaseOrder.length);
    expect([priorityRank("P0"), priorityRank("P1"), priorityRank("P2")]).toEqual([0, 1, 2]);
  });

  it("sorts by phase, then priority, then title", () => {
    const mk = (id: string, phase: string, priority: WorkflowItem["priority"], title: string) =>
      createWorkflowItem({ id, phase, title, detail: "", priority, presets: ["standard"] });
    const sorted = sortWorkflowItems([
      mk("c", phaseOrder[1], "P0", "A"),
      mk("b", phaseOrder[0], "P1", "B"),
      mk("a", phaseOrder[0], "P0", "Z"),
      mk("d", phaseOrder[0], "P0", "C"),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["d", "a", "b", "c"]);
  });
});

describe("mergeSavedItems", () => {
  it("returns only the template items of the preset when nothing is saved", () => {
    const standard = mergeSavedItems([], "standard");
    expect(standard.length).toBe(workflowTemplate.filter((item) => item.presets.includes("standard")).length);
    expect(standard.every((item) => item.done === false && item.note === "")).toBe(true);
  });

  it("restores saved state on template items and keeps custom items", () => {
    const first = workflowTemplate[0];
    const merged = mergeSavedItems(
      [
        { id: first.id, done: true, note: "kept", deadline: "2026-12-01" },
        { id: "custom-1", title: "My task", phase: phaseOrder[2], priority: "P0" },
      ],
      "standard"
    );
    const restored = merged.find((item) => item.id === first.id)!;
    expect(restored).toMatchObject({ done: true, note: "kept", deadline: "2026-12-01" });
    expect(merged.find((item) => item.id === "custom-1")).toMatchObject({ title: "My task", phase: phaseOrder[2], priority: "P0" });
  });

  it("fills defaults for a custom item without title when a translator is passed", () => {
    // t() returns the key for unknown ids, which makes the code fall back to the default title.
    const merged = mergeSavedItems([{ id: "custom-2" }], "standard", (key: string) => key);
    expect(merged.find((item) => item.id === "custom-2")).toMatchObject({
      title: "Linked operation todo",
      phase: "5. Q&A & Change",
      priority: "P1",
    });
  });
});

describe("project state storage", () => {
  beforeEach(() => localStorage.clear());

  it("falls back to defaults and the first phase when nothing is stored", () => {
    const state = readProjectState("p1");
    expect(state.preset).toBe("standard");
    expect(state.items.length).toBeGreaterThan(0);
    expect(state.activePhase).toBe(state.items[0].phase);
  });

  it("round-trips through localStorage under storageKey()", () => {
    const state = readProjectState("p1");
    writeProjectState("p1", { ...state, preset: "web" });
    expect(localStorage.getItem(storageKey("p1"))).not.toBeNull();
    expect(readProjectState("p1").preset).toBe("web");
  });

  it("ignores an active phase that does not exist in the items", () => {
    localStorage.setItem(storageKey("p2"), JSON.stringify({ preset: "standard", activePhase: "nope", items: [] }));
    const state = readProjectState("p2");
    expect(state.activePhase).toBe(state.items[0].phase);
  });
});

describe("mergeProjectSettingsIntoTodoProjects", () => {
  const setting = (id: string, name: string): ProjectSetting => ({ id, name, createdAt: "2026-01-01T00:00:00.000Z" } as ProjectSetting);

  it("puts settings projects first (in settings order) and keeps archivedAt of existing ones", () => {
    const merged = mergeProjectSettingsIntoTodoProjects(
      [
        { id: "only-todo", name: "Only Todo", createdAt: "2026-02-01T00:00:00.000Z" },
        { id: "b", name: "Old B", createdAt: "2026-02-02T00:00:00.000Z", archivedAt: "2026-03-01T00:00:00.000Z" },
      ],
      [setting("a", "A"), setting("b", "New B")]
    );
    expect(merged.map((project) => project.id)).toEqual(["a", "b", "only-todo"]);
    expect(merged[1]).toMatchObject({ name: "New B", createdAt: "2026-02-02T00:00:00.000Z", archivedAt: "2026-03-01T00:00:00.000Z" });
  });

  it("names unnamed settings projects 'Untitled project'", () => {
    expect(mergeProjectSettingsIntoTodoProjects([], [setting("x", "")])[0].name).toBe("Untitled project");
  });
});

describe("deadline helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T12:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  const item = (overrides: Partial<WorkflowItem>): WorkflowItem => ({
    ...createWorkflowItem({ id: "t", phase: phaseOrder[0], title: "T", detail: "", priority: "P1", presets: ["standard"] }),
    ...overrides,
  });

  it("detects overdue and soon deadlines but not for done items", () => {
    expect(isOverdue(item({ deadline: "2026-11-04" }))).toBe(true);
    expect(isOverdue(item({ deadline: "2026-11-05" }))).toBe(false);
    expect(isOverdue(item({ deadline: "2026-11-04", done: true }))).toBe(false);
    expect(isDeadlineSoon(item({ deadline: "2026-11-05" }))).toBe(true);
    expect(isDeadlineSoon(item({ deadline: "2026-11-07" }))).toBe(true);
    expect(isDeadlineSoon(item({ deadline: "2026-11-08" }))).toBe(false);
    expect(isDeadlineSoon(item({ deadline: "" }))).toBe(false);
  });

  it("flags done items older than 7 days as stale", () => {
    expect(isStaleDone(item({ done: true, updatedAt: "2026-10-20T00:00:00.000Z" }))).toBe(true);
    expect(isStaleDone(item({ done: true, updatedAt: "2026-11-04T00:00:00.000Z" }))).toBe(false);
    expect(isStaleDone(item({ done: false, updatedAt: "2026-10-20T00:00:00.000Z" }))).toBe(false);
    expect(isStaleDone(item({ done: true, updatedAt: "not a date" }))).toBe(false);
  });
});

describe("note checklist helpers", () => {
  const note = "intro\n- [ ] one\n  - [x] two\nnot a task";

  it("parses checklist lines with their line index", () => {
    expect(parseNoteChecklist(note)).toEqual([
      { lineIndex: 1, done: false, text: "one" },
      { lineIndex: 2, done: true, text: "two" },
    ]);
  });

  it("appends a new unchecked line and ignores blank text", () => {
    expect(appendChecklistLine("a", "  b ")).toBe("a\n- [ ] b");
    expect(appendChecklistLine("", "b")).toBe("- [ ] b");
    expect(appendChecklistLine("a", "   ")).toBe("a");
  });

  it("toggles only the requested checklist line", () => {
    expect(toggleChecklistLine(note, 1)).toBe("intro\n- [x] one\n  - [x] two\nnot a task");
    expect(toggleChecklistLine(note, 2)).toBe("intro\n- [ ] one\n  - [ ] two\nnot a task");
    expect(toggleChecklistLine(note, 3)).toBe(note);
  });
});

// Filled in from the unchanged file before the split (see the commit message).
const EXPECTED_TEMPLATE_COUNT = 29;
const EXPECTED_TEMPLATE_HASH = "846cab3ae6e4ae4303fe7820e0b5cdf53572a75acbb5764eda461191c99b68c5";
