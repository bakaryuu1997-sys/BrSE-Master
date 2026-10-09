import { describe, expect, it } from "vitest";
import { buildCalendarPreferenceWarnings, extractMeetingCutoffHour } from "@/lib/communicationPreferences";

describe("communication preference calendar warnings", () => {
  it("extracts a customer meeting cutoff from timezone rules", () => {
    expect(extractMeetingCutoffHour("", "Tránh họp sau 16:00 JST nếu cần khách approve trong ngày.")).toBe(16);
  });

  it("warns when a schedule starts after the project cutoff in JST", () => {
    expect(
      buildCalendarPreferenceWarnings({
        meetingDate: "2026-05-24",
        startTime: "16:30",
        endTime: "17:00",
        scheduleTimezone: "Asia/Tokyo",
        notes: "",
        timezoneRule: "Avoid meetings after 16:00 JST.",
      }),
    ).toHaveLength(1);
  });

  it("warns when an ICT meeting maps past the JST cutoff", () => {
    expect(
      buildCalendarPreferenceWarnings({
        meetingDate: "2026-05-24",
        startTime: "15:30",
        endTime: "16:00",
        scheduleTimezone: "Asia/Ho_Chi_Minh",
        notes: "",
        timezoneRule: "No meetings after 17:00 JST.",
      })[0],
    ).toContain("17:00 JST");
  });
});
