import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractMinutesFromTranscript, rewriteSlides, summarizeMinutesToSlides } from "@/lib/meetingMinutes";

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

  it("sends project context to slide summarize and rewrite requests", async () => {
    await summarizeMinutesToSlides("# Minutes", 5, {
      projectId: "project-1",
      projectContext: "Report rule: short",
    });
    await rewriteSlides("# Slide", "executive", {
      projectId: "project-1",
      projectContext: "Report rule: short",
    });

    const summarizeBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    const rewriteBody = JSON.parse((global.fetch as any).mock.calls[1][1].body);
    expect(summarizeBody).toMatchObject({
      markdown: "# Minutes",
      max_slides: 5,
      project_id: "project-1",
      project_context: "Report rule: short",
    });
    expect(rewriteBody).toMatchObject({
      markdown: "# Slide",
      tone: "executive",
      project_id: "project-1",
      project_context: "Report rule: short",
    });
  });
});
