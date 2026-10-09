import { describe, expect, it } from "vitest";
import { formatBytes, formatPercent, formatTemp, metricWidth } from "@/lib/validationHelpers";

describe("formatBytes", () => {
  it("returns N/A for missing or non-positive values", () => {
    expect(formatBytes(undefined)).toBe("N/A");
    expect(formatBytes(null)).toBe("N/A");
    expect(formatBytes(0)).toBe("N/A");
  });

  it("formats bytes without decimals", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("scales up to KB/MB/GB with one decimal below 10", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });

  it("drops decimals once the value is at least 10", () => {
    expect(formatBytes(15360)).toBe("15 KB");
  });
});

describe("formatPercent / formatTemp", () => {
  it("formats numbers and falls back to N/A", () => {
    expect(formatPercent(42)).toBe("42%");
    expect(formatPercent(undefined)).toBe("N/A");
    expect(formatTemp(55)).toBe("55°C");
    expect(formatTemp(null)).toBe("N/A");
  });
});

describe("metricWidth", () => {
  it("clamps to the 0-100 range", () => {
    expect(metricWidth(33)).toBe("33%");
    expect(metricWidth(150)).toBe("100%");
    expect(metricWidth(-5)).toBe("0%");
    expect(metricWidth(undefined)).toBe("0%");
  });
});
