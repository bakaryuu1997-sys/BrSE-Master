import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchProjectSettings,
  getProjectSettingConflicts,
  getProjectSettings,
  keepLocalProjectSetting,
  acceptServerProjectSetting,
  type ProjectSetting,
} from "@/lib/projectSettings";

const PROJECTS_KEY = "brse.projectSettings.v1";
const PROJECT_DIRTY_KEY = "brse.projectSettings.localDirty.v1";

function project(overrides: Partial<ProjectSetting>): ProjectSetting {
  return {
    id: "project-1",
    name: "Local Project",
    customer_name: "Customer",
    customer_email: "",
    brse_name: "",
    pm_name: "",
    timezone: "Asia/Tokyo",
    language: "vi",
    customer_style: "",
    report_rule: "",
    timezone_rule: "",
    communication_notes: "",
    current_phase: "Implementation",
    health_status: "Green",
    next_milestone_date: "",
    stakeholders_json: "[]",
    integrations_json: "{}",
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T10:00:00.000Z",
    ...overrides,
  };
}

function apiProject(overrides: Partial<ProjectSetting> & { created_at?: string; updated_at?: string }) {
  return {
    ...project(overrides),
    created_at: overrides.created_at ?? overrides.createdAt ?? "2026-05-23T00:00:00.000Z",
    updated_at: overrides.updated_at ?? overrides.updatedAt ?? "2026-05-23T10:00:00.000Z",
  };
}

describe("projectSettings conflict detection", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("keeps dirty local data and records a conflict when the server is newer", async () => {
    const local = project({ name: "Local draft", updatedAt: "2026-05-23T10:00:00.000Z" });
    const server = apiProject({ name: "Server update", updated_at: "2026-05-24T10:00:00.000Z" });
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([local]));
    localStorage.setItem(PROJECT_DIRTY_KEY, JSON.stringify([local.id]));
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [server],
    });

    const merged = await fetchProjectSettings();

    expect(merged[0].name).toBe("Local draft");
    expect(getProjectSettingConflicts()).toHaveLength(1);
    expect(getProjectSettingConflicts()[0].serverProject.name).toBe("Server update");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("can resolve a conflict by using the newer server copy", async () => {
    const local = project({ name: "Local draft", updatedAt: "2026-05-23T10:00:00.000Z" });
    const server = apiProject({ name: "Server update", updated_at: "2026-05-24T10:00:00.000Z" });
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([local]));
    localStorage.setItem(PROJECT_DIRTY_KEY, JSON.stringify([local.id]));
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [server],
    });
    await fetchProjectSettings();

    const resolved = acceptServerProjectSetting(local.id);

    expect(resolved.name).toBe("Server update");
    expect(getProjectSettings()[0].name).toBe("Server update");
    expect(getProjectSettingConflicts()).toHaveLength(0);
  });

  it("can resolve a conflict by pushing the local copy to PostgreSQL", async () => {
    const local = project({ name: "Local draft", updatedAt: "2026-05-23T10:00:00.000Z" });
    const server = apiProject({ name: "Server update", updated_at: "2026-05-24T10:00:00.000Z" });
    const saved = apiProject({ name: "Local draft", updated_at: "2026-05-24T11:00:00.000Z" });
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([local]));
    localStorage.setItem(PROJECT_DIRTY_KEY, JSON.stringify([local.id]));
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [server],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => saved,
      });
    await fetchProjectSettings();

    const resolved = await keepLocalProjectSetting(local.id);

    expect(resolved.name).toBe("Local draft");
    expect(getProjectSettingConflicts()).toHaveLength(0);
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/projects/project-1"),
      expect.objectContaining({ method: "PUT" })
    );
  });
});
