import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractMinutesFromTranscript } from "@/lib/meetingMinutes";

describe("meeting minutes AI API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));
  });

  it("sends active project rules to AI minutes extraction", async () => {
    await extractMinutesFromTranscript("transcript", {
      projectId: "project-1",
      customerStyle: "polite",
      reportRule: "include blockers",
      timezoneRule: "JST",
      communicationNotes: "impact first",
    });

    const [, init] = (global.fetch as any).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      transcript: "transcript",
      project_id: "project-1",
      customer_style: "polite",
      report_rule: "include blockers",
      timezone_rule: "JST",
      communication_notes: "impact first",
    });
  });
});
