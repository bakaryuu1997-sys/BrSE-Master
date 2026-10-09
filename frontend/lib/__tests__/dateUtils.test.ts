import { describe, expect, it } from "vitest";
import { formatAppDate, formatAppDateTime, getLocaleString } from "@/lib/dateUtils";

describe("getLocaleString", () => {
  it("maps internal language codes to BCP 47 locales", () => {
    expect(getLocaleString("vi")).toBe("vi-VN");
    expect(getLocaleString("ja")).toBe("ja-JP");
    expect(getLocaleString("en")).toBe("en-US");
    // unknown falls back to Vietnamese
    expect(getLocaleString("xx" as never)).toBe("vi-VN");
  });
});

describe("formatAppDate", () => {
  it("returns an empty string for invalid input", () => {
    expect(formatAppDate("not-a-date", "en")).toBe("");
    expect(formatAppDate(NaN, "vi")).toBe("");
  });

  it("formats a valid date and includes the year", () => {
    const out = formatAppDate("2026-06-14T00:00:00Z", "en");
    expect(out).toContain("2026");
  });

  it("includes hour and minute in the datetime variant", () => {
    const out = formatAppDateTime("2026-06-14T08:30:00Z", "en");
    expect(out).toContain("2026");
    // 24h formatting should contain a colon-separated time
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });
});
