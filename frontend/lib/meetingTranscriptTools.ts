import { apiBaseUrl } from "./config";

export type MeetingTranslationTarget = "vi" | "ja" | "en";

export interface TranscriptRecleanResult {
  updated_count: number;
  skipped_count: number;
  meeting_ids: string[];
}

export interface TranscriptTranslateResult {
  id: string;
  target_language: MeetingTranslationTarget;
  transcript_path: string;
  srt_path?: string | null;
  transcript_char_count: number;
  srt_available: boolean;
  model?: string | null;
}

export interface MeetingGlossaryTermDraft {
  english: string;
  japanese?: string;
  vietnamese: string;
  note?: string;
  example?: string;
}

function slugifyTerm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44) || "term";
}

function normalizeTargetLanguage(value: string): MeetingTranslationTarget {
  if (value === "ja" || value === "en") return value;
  return "vi";
}

export function getMeetingTranslatedTranscriptDownloadUrl(jobId: string, targetLanguage: MeetingTranslationTarget = "vi") {
  const params = new URLSearchParams({ target_language: targetLanguage });
  return `${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/transcript/translated/download?${params.toString()}`;
}

export function getMeetingTranslatedSrtDownloadUrl(jobId: string, targetLanguage: MeetingTranslationTarget = "vi") {
  const params = new URLSearchParams({ target_language: targetLanguage });
  return `${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/transcript/translated/srt?${params.toString()}`;
}

export async function translateMeetingTranscript(jobId: string, targetLanguage: MeetingTranslationTarget = "vi", model?: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/transcript/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_language: normalizeTargetLanguage(targetLanguage), model: model || null }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Không thể dịch transcript/SRT.");
  }
  return response.json() as Promise<TranscriptTranslateResult>;
}

export async function recleanMeetingTranscripts(meetingIds?: string[]) {
  const response = await fetch(`${apiBaseUrl}/meetings/transcripts/reclean`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meeting_ids: meetingIds && meetingIds.length ? meetingIds : null }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Không thể re-clean transcript theo glossary.");
  }
  return response.json() as Promise<TranscriptRecleanResult>;
}

export async function createMeetingGlossaryTerm(draft: MeetingGlossaryTermDraft) {
  const english = draft.english.trim();
  const vietnamese = draft.vietnamese.trim();
  const japanese = draft.japanese?.trim() || "N/A";
  if (!english || !vietnamese) {
    throw new Error("Cần nhập thuật ngữ English và nghĩa Vietnamese.");
  }
  const id = `meeting-${slugifyTerm(english)}-${Date.now().toString(36)}`;
  const response = await fetch(`${apiBaseUrl}/glossary/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      english,
      japanese,
      kana: null,
      vietnamese,
      roles: ["BrSE", "Dev"],
      category: "Project",
      note: draft.note?.trim() || "Meeting transcript correction term",
      example: draft.example?.trim() || null,
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Không thể thêm glossary term.");
  }
  return response.json();
}
