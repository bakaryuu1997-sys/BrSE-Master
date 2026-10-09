import { MeetingRecord } from "./meetings";
import { getLocaleString } from "./dateUtils";
import { UiLanguage } from "./uiLanguage";

export type MeetingLanguage = "vi" | "en" | "ja";

export function getMeetingProgress(item: MeetingRecord) {
  // Backend-reported percent is authoritative when present.
  if (typeof item.progress_percent === "number") return item.progress_percent;
  if (item.status === "completed" || item.status === "failed") return 100;

  const step = item.current_step ?? item.status;
  const ratio = (done?: number, total?: number) =>
    typeof done === "number" && typeof total === "number" && total > 0
      ? Math.min(1, Math.max(0, done / total))
      : null;

  // Reduce / analyze run after the map step (82–95% band).
  if (step === "analyzing") return 93;
  if (step === "reducing") {
    const r = ratio(item.reduce_batches_done, item.reduce_batches_total);
    return r === null ? 85 : Math.round(82 + r * 11);
  }
  // Summarize map step: interpolate 55–82% from real chunk completion instead
  // of a frozen 72%. Falls back to 72 when chunk counts are unknown.
  if (item.status === "summarizing" || step === "summarizing") {
    const r = ratio(item.summary_chunks_done, item.summary_chunks_total);
    return r === null ? 72 : Math.round(55 + r * 27);
  }
  if (item.status === "transcribing") return 35;
  if (item.status === "processing") return 15;
  if (item.status === "recording") return 5;
  return 0;
}

export function formatJstDateTime(value: string | undefined, lang: UiLanguage) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(getLocaleString(lang), {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDuration(seconds?: number) {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (hours) return `${hours}h ${minutes}m ${remainingSeconds}s`;
  if (minutes) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export function getRetryTitle(item: MeetingRecord) {
  if (item.current_step === "uploading") return `Upload chưa xong. Chọn lại đúng file "${item.filename || item.title}" để resume từ chunk cuối.`;
  if (item.transcript_available) return "Rebuild memo từ transcript đã có, không chạy Whisper lại từ đầu.";
  if (item.source_available) return "Transcript chưa có hoặc bị mất. Retry sẽ chạy lại Whisper từ file media gốc.";
  return "Không còn source/transcript để retry. Cần upload lại file gốc.";
}

export function getMeetingStepLabel(item: MeetingRecord, language: MeetingLanguage) {
  const step = item.current_step ?? item.status;
  if (step === "downloading") {
    return language === "ja" ? "URL音声を取得中" : language === "en" ? "Downloading source audio" : "Đang tải audio từ URL";
  }
  if (step === "queued" || step === "processing") {
    return language === "ja" ? "処理キューに登録済み" : language === "en" ? "Queued for processing" : "Đã vào hàng đợi xử lý";
  }
  if (step === "transcribing") {
    return language === "ja" ? "Whisperで文字起こし中" : language === "en" ? "Transcribing with Whisper" : "Đang transcribe bằng Whisper";
  }
  if (step === "preparing_audio") {
    return language === "ja" ? "音声を抽出中" : language === "en" ? "Extracting audio for faster transcription" : "Đang tách audio để transcribe nhanh hơn";
  }
  if (step === "summarizing") {
    if (item.summary_chunks_total && item.summary_chunks_done) {
      return language === "ja"
        ? `長文要約 ${item.summary_chunks_done}/${item.summary_chunks_total}`
        : language === "en"
          ? `Summarizing chunks ${item.summary_chunks_done}/${item.summary_chunks_total}`
          : `Đang tóm tắt chunk ${item.summary_chunks_done}/${item.summary_chunks_total}`;
    }
    return language === "ja" ? "会議メモを要約中" : language === "en" ? "Building meeting memo" : "Đang tạo meeting memo";
  }
  if (step === "reducing") {
    if (item.reduce_batches_total && item.reduce_batches_done) {
      return language === "ja"
        ? `要約を統合中 ${item.reduce_batches_done}/${item.reduce_batches_total}`
        : language === "en"
          ? `Reducing summaries ${item.reduce_batches_done}/${item.reduce_batches_total}`
          : `Đang gộp tóm tắt ${item.reduce_batches_done}/${item.reduce_batches_total}`;
    }
    return language === "ja" ? "要約を統合中" : language === "en" ? "Reducing summaries" : "Đang gộp các phần tóm tắt";
  }
  if (step === "analyzing") {
    return language === "ja" ? "Decision / action / speaker抽出中" : language === "en" ? "Extracting decisions, actions, speakers" : "Đang trích decision, action, speaker";
  }
  if (step === "completed") {
    return language === "ja" ? "メモ完成" : language === "en" ? "Memo ready" : "Memo đã sẵn sàng";
  }
  if (step === "failed") {
    return language === "ja" ? "処理失敗" : language === "en" ? "Processing failed" : "Xử lý thất bại";
  }
  if (step === "missing_source") {
    return language === "ja" ? "元ファイルが見つかりません" : language === "en" ? "Source file is missing" : "Thiếu file gốc, cần upload lại";
  }
  if (step === "missing_memo") {
    return language === "ja" ? "メモファイルが見つかりません" : language === "en" ? "Memo file is missing" : "Thiếu file memo, cần rebuild hoặc upload lại";
  }
  return item.status_message || step;
}

export function formatMeetingStats(item: MeetingRecord, language: MeetingLanguage) {
  const parts: string[] = [];
  if (item.speaker_count) {
    parts.push(
      language === "ja"
        ? `${item.speaker_count} 話者`
        : language === "en"
          ? `${item.speaker_count} speakers`
          : `${item.speaker_count} speaker`
    );
  }
  if (item.segment_count) {
    parts.push(
      language === "ja"
        ? `${item.segment_count} segment`
        : language === "en"
          ? `${item.segment_count} segments`
          : `${item.segment_count} segments`
    );
  }
  if (item.transcript_word_count && item.status === "completed") {
    parts.push(
      language === "ja"
        ? `${item.transcript_word_count} words`
        : language === "en"
          ? `${item.transcript_word_count} words`
          : `${item.transcript_word_count} từ`
    );
  }
  return parts.join(" · ");
}

const QUALITY_WARNING_LABELS: Record<string, string> = {
  transcript_too_short: "Transcript quá ngắn",
  repeated_segments: "Đoạn lặp (nghi hallucination)",
  low_lexical_diversity: "Từ vựng lặp bất thường",
  abnormal_long_segments: "Đoạn dài bất thường",
};

/** Compact STT telemetry line: "whisper small · cpu · 2× realtime · conf 87%". */
export function formatSttInfo(item: MeetingRecord): string {
  const parts: string[] = [];
  const engineModel = [item.transcript_engine, item.transcript_model].filter(Boolean).join(" ");
  if (engineModel) parts.push(engineModel);
  if (item.transcript_device) parts.push(item.transcript_device);
  if (item.detected_language) parts.push(`lang ${item.detected_language}`);
  const realtime = item.transcript_benchmark?.realtime_factor;
  if (realtime) parts.push(`${realtime}× realtime`);
  if (typeof item.transcript_confidence === "number" && item.transcript_confidence > 0) {
    parts.push(`conf ${Math.round(item.transcript_confidence * 100)}%`);
  }
  return parts.join(" · ");
}

/** Human-readable transcript quality warnings (falls back to the raw code). */
export function formatQualityWarnings(item: MeetingRecord): string[] {
  return (item.transcript_quality_warnings ?? []).map((code) => QUALITY_WARNING_LABELS[code] ?? code);
}

// --- Memo language-mismatch detection ---
// Catches the case where the AI memo came back in a different language than the
// one requested (e.g. you asked for a Vietnamese memo but got Japanese). This is
// a real quality failure; transcript JA → memo VI is the normal BrSE case and is
// NOT flagged. Detection is conservative (script axis + clear VI→EN) to avoid noise.

const VIET_DIACRITICS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

/** Best-effort dominant language of a memo body: ja / vi / en / unknown. */
export function detectMemoLanguage(text: string): MeetingLanguage | "unknown" {
  let ja = 0;
  let latin = 0;
  let vietDiacritics = 0;
  for (const ch of String(text || "")) {
    const code = ch.codePointAt(0) ?? 0;
    // Hiragana + Katakana + CJK unified ideographs
    if ((code >= 0x3040 && code <= 0x30ff) || (code >= 0x4e00 && code <= 0x9fff)) {
      ja += 1;
    } else if (VIET_DIACRITICS.test(ch)) {
      // Accented Vietnamese letters are not matched by /[a-z]/, so check first.
      latin += 1;
      vietDiacritics += 1;
    } else if (/[a-z]/i.test(ch)) {
      latin += 1;
    }
  }
  const total = ja + latin;
  if (total < 8) return "unknown"; // too little signal to judge
  if (ja / total > 0.3) return "ja"; // scattered JP glossary terms stay below this
  return latin > 0 && vietDiacritics / latin > 0.02 ? "vi" : "en";
}

/**
 * Returns the requested/detected pair when a loaded memo body looks like it
 * came back in the wrong language, or null when it's fine. The caller passes the
 * meeting's requested summary language and the loaded memo text. Conservative on
 * purpose (script axis + clear VI→EN) so normal JA→VI memos are never flagged.
 */
export function getMemoLanguageWarning(
  requestedLanguage: string | undefined,
  memoText: string,
): { requested: MeetingLanguage; detected: MeetingLanguage } | null {
  const requested: MeetingLanguage =
    requestedLanguage === "ja" || requestedLanguage === "en" ? requestedLanguage : "vi";
  const detected = detectMemoLanguage(memoText);
  if (detected === "unknown" || detected === requested) return null;

  const requestedLatin = requested === "vi" || requested === "en";
  if (requestedLatin && detected === "ja") return { requested, detected };
  if (requested === "ja" && (detected === "vi" || detected === "en")) return { requested, detected };
  if (requested === "vi" && detected === "en") return { requested, detected };
  return null;
}

const LANGUAGE_NAMES: Record<MeetingLanguage, Record<MeetingLanguage, string>> = {
  vi: { vi: "Tiếng Việt", en: "Tiếng Anh", ja: "Tiếng Nhật" },
  en: { vi: "Vietnamese", en: "English", ja: "Japanese" },
  ja: { vi: "ベトナム語", en: "英語", ja: "日本語" },
};

/** Localized non-blocking warning label for a memo language mismatch. */
export function formatMemoLanguageWarning(
  warning: { requested: MeetingLanguage; detected: MeetingLanguage },
  uiLanguage: MeetingLanguage,
): string {
  const names = LANGUAGE_NAMES[uiLanguage] ?? LANGUAGE_NAMES.vi;
  const detected = names[warning.detected];
  const requested = names[warning.requested];
  if (uiLanguage === "ja") return `⚠️ メモは${detected}のようですが、${requested}を選択しています`;
  if (uiLanguage === "en") return `⚠️ Memo looks like ${detected} but you selected ${requested}`;
  return `⚠️ Memo có vẻ là ${detected} nhưng bạn đã chọn ${requested}`;
}

export const MEETING_PIPELINE_STAGES = ["Upload", "Transcribe", "Summarize", "Analyze", "Done"] as const;

/** Index (0..4) of the active pipeline stage for the visual stepper. */
export function getPipelineStageIndex(item: MeetingRecord): number {
  if (item.status === "completed") return 4;
  const step = item.current_step ?? item.status;
  if (step === "analyzing") return 3;
  if (step === "summarizing") return 2;
  if (step === "transcribing" || step === "recording") return 1;
  // pending / queued / uploading / downloading -> the Upload stage
  return 0;
}

export function formatFileSize(size?: number) {
  if (!size) return "";
  if (size >= 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
