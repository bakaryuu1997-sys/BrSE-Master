import { describe, expect, it } from "vitest";
import { buildDashboardMorningBriefPrompt, buildFallbackMorningBrief } from "@/components/dashboard/dashboardMorningBrief";

const input = {
  projectName: "Bridge OS",
  projectContext: [
    "Project: Bridge OS",
    "Report rule: Done / Doing / Blocker",
    "Timezone rule: Use JST",
    "Communication notes: Impact first",
  ].join("\n"),
  focus: { kind: "deadline", title: "Fix login bug", helper: "Deadline 2026-05-24" },
  priorityItems: [{ kind: "qna", title: "Confirm API spec", helper: "Customer" }],
  todaySchedules: [{ title: "UAT sync", time: "10:00-10:30" }],
  counts: { todoRisks: 1, waitingQna: 2, pendingCr: 1, overdueOperations: 0, meetingFollowUps: 3 },
};

describe("dashboard morning brief helpers", () => {
  it("includes active project rules in the AI prompt", () => {
    const prompt = buildDashboardMorningBriefPrompt(input);

    expect(prompt).toContain("Report rule: Done / Doing / Blocker");
    expect(prompt).toContain("Timezone rule: Use JST");
    expect(prompt).toContain("Communication notes: Impact first");
    expect(prompt).toContain("[deadline] Fix login bug");
    expect(prompt).toContain("Meeting follow-ups not synced: 3");
  });

  it("builds a stable local fallback brief", () => {
    const fallbackLabels = {
      todoRisk: "Todo risk",
      qnaWaiting: "Q&A waiting",
      crPending: "CR pending",
      overdueOperation: "operation overdue",
      meetingFollowUp: "meeting follow-up",
      focusLabel: "Focus",
      riskLabel: "Risk",
      calendarLabel: "Calendar",
      noHotspot: "No hotspot",
      noVisibleRisk: "No visible risk",
      noFixedSchedule: "No fixed schedule",
    };

    expect(buildFallbackMorningBrief(input, fallbackLabels)).toContain("Focus: Fix login bug");
    expect(buildFallbackMorningBrief(input, fallbackLabels)).toContain("1 Todo risk");
    expect(buildFallbackMorningBrief(input, fallbackLabels)).toContain("3 meeting follow-up");
    expect(buildFallbackMorningBrief(input, fallbackLabels)).toContain("10:00-10:30 UAT sync");
  });
});
