import { apiBaseUrl } from "./config";

export interface MeetingRecord {
  id: string;
  title: string;
  status: "pending" | "processing" | "recording" | "transcribing" | "summarizing" | "completed" | "failed";
  language: string;
  template: string;
  filename?: string;
  created_at: string;
  completed_at?: string;
  progress_percent?: number;
  current_step?: string;
  status_message?: string;
  transcript_word_count?: number;
  segment_count?: number;
  speaker_count?: number;
  summary_chunks_done?: number;
  summary_chunks_total?: number;
  reduce_batches_done?: number;
  reduce_batches_total?: number;
  ai_processing_started_at?: string;
  ai_processing_completed_at?: string;
  ai_processing_seconds?: number;
  ai_processing_mode?: string;
  source_available?: boolean;
  transcript_available?: boolean;
  corrected_transcript_available?: boolean;
  transcript_srt_available?: boolean;
  memo_available?: boolean;
  meeting_action_pending_count?: number;
  meeting_action_synced_count?: number;
  meeting_action_rejected_count?: number;
  meeting_actions_synced?: boolean;
  transcript_only?: boolean;
  upload_received_bytes?: number;
  upload_file_size?: number;
  upload_remaining_bytes?: number;
  upload_chunk_size?: number;
  upload_chunks_done?: number;
  upload_chunks_total?: number;
  // STT engine telemetry (recorded by the backend after transcription).
  transcript_engine?: string;
  transcript_model?: string;
  transcript_device?: string;
  detected_language?: string;
  transcript_confidence?: number;
  transcript_benchmark?: SttBenchmark;
  transcript_quality_warnings?: string[];
  transcript_quality_stats?: Record<string, number>;
}

export interface SttBenchmark {
  engine: string;
  model: string;
  device: string;
  transcribe_seconds: number;
  audio_seconds: number;
  realtime_factor: number;
}

export interface MeetingSpeakerSignal {
  label: string;
  role_hint?: string;
  highlights: string[];
}

export interface MeetingActionSignal {
  task: string;
  owner?: string;
  deadline?: string;
  status?: string;
}

export interface MeetingAnalysis {
  summary?: string;
  short_summary?: string;
  detailed_summary?: string;
  source?: string;
  speakers?: MeetingSpeakerSignal[];
  decisions?: string[];
  actions?: MeetingActionSignal[];
  risks?: string[];
  open_questions?: string[];
  keywords?: string[];
}

export interface MeetingTopicCluster {
  topic: string;
  count: number;
  keywords: string[];
  meetings: Array<{
    id: string;
    title: string;
    created_at: string;
  }>;
}

export interface MeetingTranscriptSearchResult {
  id: string;
  title: string;
  created_at: string;
  matches: Array<{
    line_number: number;
    snippet: string;
  }>;
}

export interface LiveMeetingAssistResponse {
  memo: string[];
  suggestions: string[];
  explanations: string[];
  questions: string[];
  reply_drafts: string[];
  raw?: string;
}

export interface MeetingUploadProgress {
  loaded: number;
  total?: number;
  percent?: number;
}

export interface MeetingUploadOptions {
  onProgress?: (progress: MeetingUploadProgress) => void;
  transcriptOnly?: boolean;
  keepSourceMedia?: boolean;
  whisperModel?: string;
}

type ResumableUploadStatus = {
  job_id: string;
  received_bytes: number;
  file_size: number;
  complete: boolean;
  status: string;
};

function parseUploadError(xhr: XMLHttpRequest) {
  if (!xhr.responseText) return "Failed to upload meeting";
  try {
    const payload = JSON.parse(xhr.responseText) as { detail?: string; message?: string };
    return payload.detail || payload.message || "Failed to upload meeting";
  } catch {
    return xhr.responseText || "Failed to upload meeting";
  }
}

export async function uploadMeeting(
  file: File,
  language: string = "vi",
  template: string = "meeting",
  options: MeetingUploadOptions = {}
) {
  return uploadMeetingResumable(file, language, template, options);
}

function resumableUploadKey(file: File, language: string, template: string, transcriptOnly = false, keepSourceMedia = false) {
  return [
    "brse.meetingUpload",
    file.name,
    file.size,
    file.lastModified,
    language,
    template,
    transcriptOnly ? "transcript" : "memo",
    keepSourceMedia ? "keep-source" : "cleanup-source",
  ].join(".");
}

async function uploadMeetingResumable(
  file: File,
  language: string = "vi",
  template: string = "meeting",
  options: MeetingUploadOptions = {}
) {
  const chunkSize = 5 * 1024 * 1024;
  const storageKey = resumableUploadKey(file, language, template, Boolean(options.transcriptOnly), Boolean(options.keepSourceMedia));
  let jobId = "";
  let offset = 0;

  try {
    const cached = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (cached) {
      const parsed = JSON.parse(cached) as { jobId?: string };
      if (parsed.jobId) {
        const statusResponse = await fetch(`${apiBaseUrl}/meetings/uploads/${parsed.jobId}/status`, { cache: "no-store" });
        if (statusResponse.ok) {
          const status = (await statusResponse.json()) as ResumableUploadStatus;
          if (status.status === "pending" || status.status === "failed") {
            jobId = status.job_id;
            offset = Math.min(status.received_bytes, file.size);
          }
        }
      }
    }
  } catch {
    // If the saved upload session is stale, start a new resumable upload.
  }

  if (!jobId) {
    const initResponse = await fetch(`${apiBaseUrl}/meetings/uploads/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, file_size: file.size, language, template, transcript_only: Boolean(options.transcriptOnly), keep_source_media: Boolean(options.keepSourceMedia), whisper_model: options.whisperModel || null }),
    });
    if (!initResponse.ok) {
      const payload = await initResponse.json().catch(() => null) as { detail?: string } | null;
      throw new Error(payload?.detail || "Cannot initialize resumable upload.");
    }
    const initStatus = (await initResponse.json()) as ResumableUploadStatus;
    jobId = initStatus.job_id;
    offset = initStatus.received_bytes;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify({ jobId, fileName: file.name, fileSize: file.size, language, template, keepSourceMedia: Boolean(options.keepSourceMedia) }));
    }
  }

  options.onProgress?.({ loaded: offset, total: file.size, percent: file.size ? Math.round((offset / file.size) * 100) : 0 });

  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
    const response = await fetch(`${apiBaseUrl}/meetings/uploads/${jobId}/chunk?offset=${offset}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: chunk,
    });
    if (response.status === 409) {
      const payload = await response.json().catch(() => null) as { detail?: { expected_offset?: number } | string } | null;
      const expectedOffset = typeof payload?.detail === "object" ? payload.detail.expected_offset : undefined;
      if (typeof expectedOffset === "number" && expectedOffset >= 0 && expectedOffset <= file.size) {
        offset = expectedOffset;
        continue;
      }
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { detail?: string } | null;
      throw new Error(payload?.detail || "Upload interrupted. Chọn lại cùng file để tiếp tục từ chunk cuối.");
    }
    const status = (await response.json()) as ResumableUploadStatus;
    offset = Math.min(status.received_bytes, file.size);
    const percent = file.size ? Math.min(99, Math.round((offset / file.size) * 100)) : undefined;
    options.onProgress?.({ loaded: offset, total: file.size, percent });
  }

  const completeResponse = await fetch(`${apiBaseUrl}/meetings/uploads/${jobId}/complete`, { method: "POST" });
  if (!completeResponse.ok) {
    const payload = await completeResponse.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Cannot complete resumable upload.");
  }
  if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
  options.onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
  return completeResponse.json() as Promise<MeetingRecord>;
}

export async function resumeMeetingUpload(
  jobId: string,
  file: File,
  options: MeetingUploadOptions = {}
) {
  const chunkSize = 5 * 1024 * 1024;
  const statusResponse = await fetch(`${apiBaseUrl}/meetings/uploads/${jobId}/status`, { cache: "no-store" });
  if (!statusResponse.ok) {
    const payload = await statusResponse.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Không tìm thấy upload session để resume.");
  }
  const initialStatus = (await statusResponse.json()) as ResumableUploadStatus;
  if (initialStatus.file_size && initialStatus.file_size !== file.size) {
    throw new Error(
      `File không khớp với upload cũ. Cần chọn đúng file gốc (${formatUploadBytes(initialStatus.file_size)}), file hiện tại là ${formatUploadBytes(file.size)}.`
    );
  }

  let offset = Math.min(initialStatus.received_bytes, file.size);
  options.onProgress?.({ loaded: offset, total: file.size, percent: file.size ? Math.round((offset / file.size) * 100) : 0 });

  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
    const response = await fetch(`${apiBaseUrl}/meetings/uploads/${jobId}/chunk?offset=${offset}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: chunk,
    });
    if (response.status === 409) {
      const payload = await response.json().catch(() => null) as { detail?: { expected_offset?: number } | string } | null;
      const expectedOffset = typeof payload?.detail === "object" ? payload.detail.expected_offset : undefined;
      if (typeof expectedOffset === "number" && expectedOffset >= 0 && expectedOffset <= file.size) {
        offset = expectedOffset;
        options.onProgress?.({ loaded: offset, total: file.size, percent: file.size ? Math.round((offset / file.size) * 100) : 0 });
        continue;
      }
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { detail?: string } | null;
      throw new Error(payload?.detail || "Resume upload bị gián đoạn. Chọn lại cùng file để tiếp tục.");
    }
    const status = (await response.json()) as ResumableUploadStatus;
    offset = Math.min(status.received_bytes, file.size);
    options.onProgress?.({ loaded: offset, total: file.size, percent: file.size ? Math.min(99, Math.round((offset / file.size) * 100)) : undefined });
  }

  const completeResponse = await fetch(`${apiBaseUrl}/meetings/uploads/${jobId}/complete`, { method: "POST" });
  if (!completeResponse.ok) {
    const payload = await completeResponse.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Không thể hoàn tất upload để bắt đầu AI note.");
  }
  options.onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
  return completeResponse.json() as Promise<MeetingRecord>;
}

function formatUploadBytes(size: number) {
  if (size >= 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export async function uploadMeetingLegacy(
  file: File,
  language: string = "vi",
  template: string = "meeting",
  options: MeetingUploadOptions = {}
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", language);
  formData.append("template", template);
  formData.append("transcript_only", String(Boolean(options.transcriptOnly)));
  formData.append("keep_source_media", String(Boolean(options.keepSourceMedia)));

  return new Promise<MeetingRecord>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBaseUrl}/meetings/upload`);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : file.size;
      const percent = total ? Math.min(99, Math.round((event.loaded / total) * 100)) : undefined;
      options.onProgress?.({ loaded: event.loaded, total, percent });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
        resolve(xhr.response as MeetingRecord);
        return;
      }
      reject(new Error(parseUploadError(xhr)));
    };

    xhr.onerror = () => reject(new Error("Upload failed. Kiểm tra backend hoặc kích thước file video."));
    xhr.ontimeout = () => reject(new Error("Upload timeout. Với video dài, thử dùng file audio MP3/M4A hoặc tăng timeout proxy."));
    xhr.send(formData);
  });
}

export async function processUrl(url: string, language: string = "vi", template: string = "meeting", transcriptOnly: boolean = false, keepSourceMedia: boolean = false, whisperModel?: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/process-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, language, template, transcript_only: transcriptOnly, keep_source_media: keepSourceMedia, whisper_model: whisperModel || null }),
  });

  if (!response.ok) {
    throw new Error("Failed to process URL");
  }

  return response.json() as Promise<MeetingRecord>;
}

export async function processTranscript(
  title: string,
  transcript: string,
  language: string = "vi",
  template: string = "meeting"
) {
  const response = await fetch(`${apiBaseUrl}/meetings/transcript`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, transcript, language, template }),
  });

  if (!response.ok) {
    throw new Error("Failed to process transcript");
  }

  return response.json() as Promise<MeetingRecord>;
}

export async function combineMeetingMemos(
  meetingIds: string[],
  title: string,
  language: string = "vi",
  template: string = "meeting"
) {
  const response = await fetch(`${apiBaseUrl}/meetings/combine-memos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ meeting_ids: meetingIds, title, language, template }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Failed to combine meeting memos");
  }

  return response.json() as Promise<MeetingRecord>;
}

export function getExportUrl(jobId: string, format: "pdf" | "docx" | "md") {
  return `${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/export/${format}`;
}

export function getMeetingMediaUrl(jobId: string) {
  return `${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/media`;
}

export function getMeetingTranscriptDownloadUrl(jobId: string) {
  return `${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/transcript/download`;
}

export function getMeetingCorrectedTranscriptDownloadUrl(jobId: string) {
  return `${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/transcript/corrected/download`;
}

export function getMeetingTranscriptSrtDownloadUrl(jobId: string) {
  return `${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/transcript/srt`;
}

export async function trimMeeting(jobId: string, startTime: number, endTime: number) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/trim?start_time=${startTime}&end_time=${endTime}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to trim meeting");
  }

  return response.json() as Promise<MeetingRecord>;
}

export async function resummarizeMeeting(jobId: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/resummarize`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to re-summarize meeting");
  }

  return response.json() as Promise<MeetingRecord>;
}

export async function retryMeetingProcessing(jobId: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/retry`, {
    method: "POST",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Failed to retry meeting processing");
  }

  return response.json() as Promise<MeetingRecord>;
}


export async function retranscribeMeetingProcessing(jobId: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/retranscribe`, {
    method: "POST",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Failed to re-transcribe meeting source media");
  }

  return response.json() as Promise<MeetingRecord>;
}

export async function getMeetingHistory() {
  const response = await fetch(`${apiBaseUrl}/meetings/history`);
  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }
  return response.json() as Promise<MeetingRecord[]>;
}

export async function getMeetingTopicClusters() {
  const response = await fetch(`${apiBaseUrl}/meetings/topics`);
  if (!response.ok) {
    throw new Error("Failed to fetch meeting topic clusters");
  }
  return response.json() as Promise<MeetingTopicCluster[]>;
}

export async function searchMeetingTranscripts(query: string) {
  const params = new URLSearchParams({
    query,
    limit: "8",
    matches_per_meeting: "3",
  });
  const response = await fetch(`${apiBaseUrl}/meetings/transcripts/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to search meeting transcripts");
  }
  return response.json() as Promise<MeetingTranscriptSearchResult[]>;
}

export async function getMeetingTranscript(jobId: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/transcript`, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Failed to fetch meeting transcript");
  }
  return response.json() as Promise<{
    id: string;
    title: string;
    transcript: string;
    truncated: boolean;
    char_count: number;
  }>;
}

export async function getMeetingStatus(jobId: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch meeting status");
  }
  return response.json() as Promise<MeetingRecord>;
}

export async function getMeetingMemo(jobId: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/memo`);
  if (!response.ok) {
    throw new Error("Failed to fetch memo");
  }
  return response.json() as Promise<{ content: string; analysis?: MeetingAnalysis }>;
}

export async function saveMeetingMemo(jobId: string, content: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}/memo`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error("Failed to save memo");
  }

  return response.json() as Promise<{ message: string; size: number }>;
}

export async function chatWithMeeting(message: string, jobId?: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, job_id: jobId }),
  });

  if (!response.ok) {
    throw new Error("Failed to chat with AI");
  }

  return response.json() as Promise<{ response: string }>;
}

export async function liveMeetingAssist(
  context: string,
  question: string = "",
  language: string = "vi",
  mode: "assist" | "explain" | "reply" | "memo" = "assist"
) {
  const response = await fetch(`${apiBaseUrl}/meetings/live-assist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ context, question, language, mode }),
    // Don't let a slow/hung 9router spin the copilot forever; caller falls back
    // to the local summary on timeout.
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error("Failed to run live meeting assist");
  }

  return response.json() as Promise<LiveMeetingAssistResponse>;
}

export async function deleteMeeting(jobId: string) {
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete meeting");
  }

  return response.json();
}

export async function updateMeetingTitle(jobId: string, title: string) {
  const params = new URLSearchParams({ title });
  const response = await fetch(`${apiBaseUrl}/meetings/${encodeURIComponent(jobId)}?${params.toString()}`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Failed to update meeting title");
  }

  return response.json() as Promise<MeetingRecord>;
}
