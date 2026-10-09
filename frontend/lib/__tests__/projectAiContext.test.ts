import { describe, expect, it } from "vitest";
import { buildProjectAiContext, buildProjectAiPayload } from "@/lib/projectAiContext";
import type { ProjectSetting } from "@/lib/projectSettings";

function project(overrides: Partial<ProjectSetting> = {}): ProjectSetting {
  return {
    id: "project-1",
    name: "Bridge OS",
    customer_name: "Unicorn",
    customer_email: "",
    brse_name: "Nguyen",
    pm_name: "",
    timezone: "Asia/Tokyo",
    language: "vi",
    customer_style: "Short and polite",
    report_rule: "Always include blockers and next action",
    timezone_rule: "Use JST for customer-facing dates",
    communication_notes: "Mention impact before details",
    current_phase: "UAT",
    health_status: "Yellow",
    next_milestone_date: "2026-05-31",
    stakeholders_json: "[]",
    integrations_json: "{}",
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T10:00:00.000Z",
    ...overrides,
  };
}

describe("project AI context", () => {
  it("builds compact context from active project rules", () => {
    expect(buildProjectAiContext(project())).toContain("Report rule: Always include blockers and next action");
    expect(buildProjectAiContext(project())).toContain("Timezone rule: Use JST for customer-facing dates");
    expect(buildProjectAiContext(project())).toContain("Communication notes: Mention impact before details");
  });

  it("omits empty fields from API payloads", () => {
    expect(buildProjectAiPayload(project({ report_rule: "", timezone_rule: "" }))).toMatchObject({
      project_id: "project-1",
      customer_style: "Short and polite",
      report_rule: undefined,
      timezone_rule: undefined,
      communication_notes: "Mention impact before details",
    });
  });
});
