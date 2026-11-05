import { describe, expect, it } from "vitest";
import { hasMinutesDraftChanged } from "@/hooks/useMeetingMinutesState";

const base = { form: { projectName: "", meetingDate: "2026-11-05" }, agendaItems: [], actionItems: [], createdDate: "2026-11-05" };

describe("hasMinutesDraftChanged (B-015)", () => {
  it("is false when nothing was edited (first snapshot becomes the baseline)", () => {
    expect(hasMinutesDraftChanged(null, base)).toBe(false);
    expect(hasMinutesDraftChanged(JSON.stringify(base), { ...base })).toBe(false);
  });

  it("is true when the user changes the form or lists", () => {
    const baseline = JSON.stringify(base);
    expect(hasMinutesDraftChanged(baseline, { ...base, form: { ...base.form, projectName: "ST-TEST" } })).toBe(true);
    expect(hasMinutesDraftChanged(baseline, { ...base, actionItems: [{ task: "x" }] })).toBe(true);
  });
});
