import { beforeEach, describe, expect, it } from "vitest";
import { ensureProjectSettingsForTodoProjects, getProjectSettings } from "@/lib/projectSettings";

describe("ensureProjectSettingsForTodoProjects", () => {
  beforeEach(() => window.localStorage.clear());

  it("creates a Project Setting for each Todo-only project and keeps existing ones", () => {
    window.localStorage.setItem(
      "brse.projectSettings.v1",
      JSON.stringify([{ id: "keep", name: "Sensei Hub", createdAt: "", updatedAt: "" }])
    );

    const created = ensureProjectSettingsForTodoProjects([
      { id: "keep", name: "renamed-in-todo" },
      { id: "t1", name: "snapdoc" },
      { id: "t2", name: "abc" },
    ]);

    expect(created).toBe(2);
    expect(getProjectSettings().map((p) => p.name)).toEqual(["Sensei Hub", "snapdoc", "abc"]);
  });

  it("is idempotent and skips the default personal placeholder", () => {
    const entries = [{ id: "personal", name: "Personal project" }, { id: "t1", name: "snapdoc" }];
    expect(ensureProjectSettingsForTodoProjects(entries)).toBe(1);
    expect(ensureProjectSettingsForTodoProjects(entries)).toBe(0);
    expect(getProjectSettings()).toHaveLength(1);
  });
});
