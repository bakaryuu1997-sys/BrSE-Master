import { describe, expect, it } from "vitest";
import { buildLocalLiveAssist, buildLocalLiveMemo, condenseLiveLines } from "@/lib/liveAssist";

describe("condenseLiveLines", () => {
  it("drops short filler and de-duplicates", () => {
    const text = [
      "ok",
      "Đây là một câu đủ dài về phạm vi dự án",
      "Đây là một câu đủ dài về phạm vi dự án",
      "vâng",
    ].join("\n");
    expect(condenseLiveLines(text)).toEqual(["Đây là một câu đủ dài về phạm vi dự án"]);
  });

  it("caps very long sentences with an ellipsis", () => {
    const out = condenseLiveLines("x".repeat(200), 140);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(141); // 140 chars + "…"
    expect(out[0].endsWith("…")).toBe(true);
  });
});

describe("buildLocalLiveMemo", () => {
  it("prefers decision/action/question lines and caps at 5", () => {
    const text = [
      "Một câu chào hỏi bình thường không quan trọng lắm ở đây",
      "Chúng ta cần xác nhận lại scope với khách hàng trước",
      "Deadline cho phần này là thứ sáu tuần sau nhé mọi người",
      "Ai sẽ phụ trách phần migration database lần này nhỉ?",
    ].join("\n");
    const memo = buildLocalLiveMemo(text);
    expect(memo.length).toBeLessThanOrEqual(5);
    expect(memo.some((line) => /xác nhận/.test(line))).toBe(true);
    // the plain greeting (no key signal) is dropped in favour of key lines
    expect(memo.some((line) => /chào hỏi/.test(line))).toBe(false);
  });

  it("returns an empty memo for empty input", () => {
    expect(buildLocalLiveMemo("")).toEqual([]);
  });
});

describe("buildLocalLiveAssist", () => {
  it("produces a concise memo and detects questions", () => {
    const data = buildLocalLiveAssist("Khách hàng hỏi khi nào có thể bàn giao bản demo?");
    expect(data.memo.length).toBeGreaterThanOrEqual(1);
    expect(data.questions.length).toBeGreaterThanOrEqual(1);
  });
});
