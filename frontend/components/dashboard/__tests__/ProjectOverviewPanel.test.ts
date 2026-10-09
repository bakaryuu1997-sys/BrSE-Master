import { describe, expect, it } from "vitest";
import type { ProjectSetting } from "@/lib/projectSettings";
import { buildProjectOverviewItems } from "../ProjectOverviewPanel";

function project(overrides: Partial<ProjectSetting>): ProjectSetting {
  return {
    id: "project-1",
    name: "Bridge",
    customer_name: "Acme",
    customer_email: "",
    brse_name: "",
    pm_name: "",
    timezone: "Asia/Tokyo",
    language: "vi",
    customer_style: "",
    report_rule: "",
    timezone_rule: "",
    communication_notes: "",
    current_phase: "",
    health_status: "Green",
    next_milestone_date: "",
    stakeholders_json: "[]",
    integrations_json: "{}",
    createdAt: "2026-05-24T00:00:00Z",
    updatedAt: "2026-05-24T00:00:00Z",
    ...overrides,
  };
}

describe("ProjectOverviewPanel helpers", () => {
  it("sorts red and yellow projects before green projects", () => {
    const items = buildProjectOverviewItems([
      project({ id: "green", name: "Green", health_status: "Green" }),
      project({ id: "red", name: "Red", health_status: "Red" }),
      project({ id: "yellow", name: "Yellow", health_status: "Yellow" }),
    ]);

    expect(items.map((item) => item.project.id)).toEqual(["red", "yellow", "green"]);
  });

  it("keeps active project first within the same health band", () => {
    const items = buildProjectOverviewItems(
      [
        project({ id: "alpha", name: "Alpha", health_status: "Yellow" }),
        project({ id: "beta", name: "Beta", health_status: "Yellow" }),
      ],
      "beta",
    );

    expect(items.map((item) => item.project.id)).toEqual(["beta", "alpha"]);
    expect(items[0].isActive).toBe(true);
  });
});
