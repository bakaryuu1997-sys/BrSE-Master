import { describe, expect, it } from "vitest";
import type { MeetingRecord } from "@/lib/meetings";
import {
  detectMemoLanguage,
  formatMemoLanguageWarning,
  formatQualityWarnings,
  formatSttInfo,
  getMeetingProgress,
  getMemoLanguageWarning,
  getPipelineStageIndex,
} from "@/lib/meetingUIUtils";

function rec(overrides: Partial<MeetingRecord>): MeetingRecord {
  return {
    id: "m1",
    title: "T",
    status: "completed",
    language: "vi",
    template: "meeting",
    created_at: "2026-06-12T00:00:00Z",
    ...overrides,
  };
}

describe("formatSttInfo", () => {
  it("composes engine/model/device/realtime/confidence", () => {
    const text = formatSttInfo(
      rec({
        transcript_engine: "local",
        transcript_model: "small",
        transcript_device: "cpu",
        detected_language: "vi",
        transcript_confidence: 0.872,
        transcript_benchmark: {
          engine: "local",
          model: "small",
          device: "cpu",
          transcribe_seconds: 60,
          audio_seconds: 120,
          realtime_factor: 2,
        },
      }),
    );
    expect(text).toBe("local small · cpu · lang vi · 2× realtime · conf 87%");
  });

  it("returns an empty string when there is no telemetry", () => {
    expect(formatSttInfo(rec({}))).toBe("");
  });
});

describe("formatQualityWarnings", () => {
  it("maps known codes to labels and passes unknown codes through", () => {
    expect(
      formatQualityWarnings(rec({ transcript_quality_warnings: ["repeated_segments", "weird_code"] })),
    ).toEqual(["Đoạn lặp (nghi hallucination)", "weird_code"]);
  });

  it("handles a missing warnings array", () => {
    expect(formatQualityWarnings(rec({}))).toEqual([]);
  });
});

describe("getMeetingProgress", () => {
  it("uses the backend-reported percent when present", () => {
    expect(getMeetingProgress(rec({ status: "summarizing", progress_percent: 63 }))).toBe(63);
  });

  it("returns 100 for completed and failed", () => {
    expect(getMeetingProgress(rec({ status: "completed" }))).toBe(100);
    expect(getMeetingProgress(rec({ status: "failed" }))).toBe(100);
  });

  it("interpolates the summarize band from real chunk completion", () => {
    // 55 + (5/10)*27 = 68.5 -> 69
    expect(
      getMeetingProgress(rec({ status: "summarizing", summary_chunks_done: 5, summary_chunks_total: 10 })),
    ).toBe(69);
    // start of summarize map
    expect(
      getMeetingProgress(rec({ status: "summarizing", summary_chunks_done: 0, summary_chunks_total: 10 })),
    ).toBe(55);
  });

  it("falls back to 72 while summarizing without chunk counts", () => {
    expect(getMeetingProgress(rec({ status: "summarizing" }))).toBe(72);
  });

  it("interpolates the reduce band and reports analyze near the end", () => {
    // 82 + (1/2)*11 = 87.5 -> 88
    expect(
      getMeetingProgress(rec({ status: "processing", current_step: "reducing", reduce_batches_done: 1, reduce_batches_total: 2 })),
    ).toBe(88);
    expect(getMeetingProgress(rec({ status: "processing", current_step: "analyzing" }))).toBe(93);
  });

  it("keeps coarse values for earlier stages", () => {
    expect(getMeetingProgress(rec({ status: "transcribing" }))).toBe(35);
    expect(getMeetingProgress(rec({ status: "processing" }))).toBe(15);
    expect(getMeetingProgress(rec({ status: "recording" }))).toBe(5);
  });
});

describe("detectMemoLanguage", () => {
  it("detects Vietnamese, English and Japanese memos", () => {
    expect(detectMemoLanguage("Cuộc họp đã thống nhất các yêu cầu và rủi ro chính.")).toBe("vi");
    expect(detectMemoLanguage("The meeting agreed on the main requirements and risks.")).toBe("en");
    expect(detectMemoLanguage("会議では主要な要件とリスクについて合意しました。")).toBe("ja");
  });

  it("treats scattered JP glossary terms inside a VN memo as Vietnamese", () => {
    expect(
      detectMemoLanguage("Khách hàng yêu cầu sửa màn hình 設定 và xác nhận lại 要件 trước thứ Sáu."),
    ).toBe("vi");
  });

  it("returns unknown for too-little signal", () => {
    expect(detectMemoLanguage("ok")).toBe("unknown");
    expect(detectMemoLanguage("")).toBe("unknown");
  });
});

describe("getMemoLanguageWarning", () => {
  it("warns when a VN-requested memo comes back in Japanese", () => {
    expect(getMemoLanguageWarning("vi", "会議では主要な要件について合意しました。")).toEqual({
      requested: "vi",
      detected: "ja",
    });
  });

  it("warns when a VN-requested memo comes back in English", () => {
    expect(
      getMemoLanguageWarning("vi", "The meeting agreed on the requirements and the release plan."),
    ).toEqual({ requested: "vi", detected: "en" });
  });

  it("does not warn when the memo matches the requested language", () => {
    expect(getMemoLanguageWarning("vi", "Cuộc họp đã thống nhất yêu cầu và rủi ro.")).toBeNull();
  });

  it("does not warn for the normal JA-transcript → VI-memo case", () => {
    // requested VI, memo is Vietnamese with a few JP glossary terms — fine.
    expect(
      getMemoLanguageWarning("vi", "Khách hàng yêu cầu sửa 設定 và xác nhận 要件 trước thứ Sáu."),
    ).toBeNull();
  });

  it("formats a localized warning label", () => {
    const w = { requested: "vi", detected: "ja" } as const;
    expect(formatMemoLanguageWarning(w, "vi")).toContain("Tiếng Nhật");
    expect(formatMemoLanguageWarning(w, "en")).toContain("Japanese");
  });
});

describe("getPipelineStageIndex", () => {
  it("maps each step to its pipeline stage", () => {
    expect(getPipelineStageIndex(rec({ status: "pending", current_step: "queued" }))).toBe(0);
    expect(getPipelineStageIndex(rec({ status: "transcribing", current_step: "transcribing" }))).toBe(1);
    expect(getPipelineStageIndex(rec({ status: "summarizing", current_step: "summarizing" }))).toBe(2);
    expect(getPipelineStageIndex(rec({ status: "processing", current_step: "analyzing" }))).toBe(3);
    expect(getPipelineStageIndex(rec({ status: "completed" }))).toBe(4);
  });
});
