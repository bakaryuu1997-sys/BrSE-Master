import { describe, expect, it } from "vitest";
import { buildProjectExecutionWarnings, isReleaseControlPhase } from "@/lib/projectExecutionWarnings";
import type { ProjectSetting } from "@/lib/projectSettings";

function project(overrides: Partial<ProjectSetting>): ProjectSetting {
  return {
    id: "project-1",
    name: "Bridge OS",
    customer_name: "Unicorn",
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

describe("project execution warnings", () => {
  it("detects release-control phases", () => {
    expect(isReleaseControlPhase("UAT")).toBe(true);
    expect(isReleaseControlPhase("Release")).toBe(true);
    expect(isReleaseControlPhase("Implementation")).toBe(false);
  });

  it("builds health and release warnings from project settings", () => {
    expect(buildProjectExecutionWarnings(project({ health_status: "Red", current_phase: "UAT" }))).toEqual([
      expect.objectContaining({ id: "project-health-red", tone: "danger" }),
      expect.objectContaining({ id: "project-phase-release", tone: "warning" }),
    ]);
  });
});
