import { describe, expect, it } from "vitest";
import { resolveReportTextToSave } from "@/features/reports/useReportsState";

describe("resolveReportTextToSave (B-011)", () => {
  it("keeps the hand-edited preview when it differs from the generated text", () => {
    expect(resolveReportTextToSave("【日次報告】手動で編集", "【日次報告】自動生成")).toBe("【日次報告】手動で編集");
  });

  it("falls back to the generated text when the preview is empty or whitespace", () => {
    expect(resolveReportTextToSave("", "generated")).toBe("generated");
    expect(resolveReportTextToSave("   \n", "generated")).toBe("generated");
  });

  it("returns the generated text when preview equals it", () => {
    expect(resolveReportTextToSave("same", "same")).toBe("same");
  });
});
