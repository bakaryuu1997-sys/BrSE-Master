"use client";

import React from "react";
import { 
  CheckCircle2, 
  Trash2, 
  Loader2, 
  Clock, 
  Upload, 
  PlayCircle, 
  FileText, 
  Pencil, 
  MessageSquare, 
  CheckSquare, 
  RotateCcw,
  Scissors,
  Download
} from "lucide-react";
import {
  MeetingRecord,
  getMeetingCorrectedTranscriptDownloadUrl,
  getMeetingMediaUrl,
  getMeetingTranscriptDownloadUrl,
  getMeetingTranscriptSrtDownloadUrl,
} from "@/lib/meetings";
import { Button } from "@/components/ui/button";
import { MeetingPipelineStepper } from "./MeetingPipelineStepper";
import { cn } from "@/lib/utils";
import { 
  getMeetingProgress,
  getMeetingStepLabel,
  formatMeetingStats,
  formatJstDateTime,
  formatDuration,
  formatSttInfo,
  formatQualityWarnings,
  getRetryTitle,
  MeetingLanguage
} from "@/lib/meetingUIUtils";
import { useUiLanguage } from "@/components/LanguageProvider";


function formatUploadSize(bytes?: number | null) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function formatUploadResumeDetail(item: MeetingRecord) {
  const received = item.upload_received_bytes ?? 0;
  const total = item.upload_file_size ?? 0;
  const remaining = item.upload_remaining_bytes ?? Math.max(0, total - received);
  const chunksDone = item.upload_chunks_done ?? null;
  const chunksTotal = item.upload_chunks_total ?? null;
  const chunkLabel = chunksDone && chunksTotal ? ` · chunk ${chunksDone}/${chunksTotal}` : "";
  if (!total) return `Đã nhận ${formatUploadSize(received)}. Chọn lại file gốc để backend đọc tiếp offset hiện tại.${chunkLabel}`;
  return `Đã nhận ${formatUploadSize(received)} / ${formatUploadSize(total)} · còn thiếu ${formatUploadSize(remaining)}${chunkLabel}`;
}

interface MeetingHistoryItemProps {
  item: MeetingRecord;
  language: any; // from useUiLanguage
  meetingLanguage: MeetingLanguage;
  selectedCombineIds: string[];
  onToggleSelect: (id: string) => void;
  onViewMemo: (id: string, title: string) => void;
  onChat: (id: string, title: string) => void;
  onRename: (item: MeetingRecord) => void;
  onSyncTodos: (item: MeetingRecord) => void;
  onResummarize: (id: string) => void;
  onRetranscribe: (id: string) => void;
  onDelete: (id: string) => void;
  onTrim: (item: MeetingRecord) => void;
  onHandleResumeUpload: (item: MeetingRecord, event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  resumingUploadId: string | null;
  retryingId: string | null;
  syncingActionsId: string | null;
}

export function MeetingHistoryItem({
  item,
  language,
  meetingLanguage,
  selectedCombineIds,
  onToggleSelect,
  onViewMemo,
  onChat,
  onRename,
  onSyncTodos,
  onResummarize,
  onRetranscribe,
  onDelete,
  onTrim,
  onHandleResumeUpload,
  isUploading,
  resumingUploadId,
  retryingId,
  syncingActionsId,
}: MeetingHistoryItemProps) {
  const { t } = useUiLanguage();
  const isSelected = selectedCombineIds.includes(item.id);
  const progress = getMeetingProgress(item);
  const pendingActionCount = item.meeting_action_pending_count ?? 0;
  const syncedActionCount = item.meeting_action_synced_count ?? 0;
  const rejectedActionCount = item.meeting_action_rejected_count ?? 0;

  return (
    <div 
      className="group relative rounded-xl border border-[var(--brse-panel-border)]/55 bg-surface/50 p-4 transition-all hover:border-primary/30 hover:bg-surfaceHover"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <label className="mt-2 flex shrink-0 items-center" title={item.status === "completed" ? "Chọn để gộp memo" : "Chỉ chọn được meeting đã hoàn thành"}>
            <input
              type="checkbox"
              checked={isSelected}
              disabled={item.status !== "completed"}
              onChange={() => onToggleSelect(item.id)}
              className="h-4 w-4 rounded border-[var(--brse-panel-border)] bg-background text-primary disabled:opacity-35"
            />
          </label>
          <div className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
            item.status === "completed" ? "border-green-500/20 bg-green-500/10 text-green-500" :
            item.status === "failed" ? "border-red-500/20 bg-red-500/10 text-red-500" :
            "border-primary/20 bg-primary/10 text-primary"
          )}>
            {item.status === "completed" ? <CheckCircle2 className="h-5 w-5" /> :
             item.status === "failed" ? <Trash2 className="h-5 w-5" /> :
             <Loader2 className="h-5 w-5 animate-spin" />}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink">{item.title}</h3>
            {item.filename ? (
              <p className="mt-0.5 truncate text-xs text-textMuted">
                File gốc: <span className="font-medium text-ink/75">{item.filename}</span>
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-textMuted">
              <span className="flex items-center gap-1">
                <Clock className="h-3.3 w-3.3" />
                JST {formatJstDateTime(item.created_at, language)}
              </span>
              <span className="capitalize rounded bg-border/50 px-1.5 py-0.5">{item.status}</span>
              {pendingActionCount > 0 ? (
                <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-semibold text-amber-200">
                  {pendingActionCount} {t("meeting.actionsPendingReview")}
                </span>
              ) : null}
              {syncedActionCount > 0 ? (
                <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 font-semibold text-emerald-200">
                  {syncedActionCount} {t("meeting.actionsSyncedTodo")}
                </span>
              ) : null}
              {rejectedActionCount > 0 ? (
                <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-semibold text-textMuted">
                  {rejectedActionCount} {t("meeting.actionsIgnored")}
                </span>
              ) : null}
              {formatMeetingStats(item, meetingLanguage) ? <span>{formatMeetingStats(item, meetingLanguage)}</span> : null}
            </div>
            {item.status !== "completed" ? (
              <div className="mt-3 max-w-xl">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-textMuted">
                  <span>{getMeetingStepLabel(item, meetingLanguage)}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-background/80">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      item.status === "failed" ? "bg-red-500" : "bg-primary"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <MeetingPipelineStepper item={item} />
                {item.status_message ? (
                  <p className="mt-2 rounded-md border border-[var(--brse-panel-border)] bg-background/60 px-3 py-2 text-xs leading-5 text-textMuted">
                    {item.current_step === "uploading"
                      ? `${item.status_message} Chọn lại đúng file "${item.filename || item.title}" để upload tiếp từ đoạn đã dừng.`
                      : item.status_message}
                  </p>
                ) : null}
                {item.current_step === "uploading" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-md border border-amber-300/35 bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/25",
                        (isUploading || resumingUploadId === item.id) && "pointer-events-none opacity-60"
                      )}
                    >
                      {resumingUploadId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {t("meeting.resumeSelectFile")}
                      <input
                        type="file"
                        className="hidden"
                        accept="audio/*,video/*"
                        disabled={isUploading || resumingUploadId === item.id}
                        onChange={(event) => onHandleResumeUpload(item, event)}
                      />
                    </label>
                    <span className="text-[11px] leading-5 text-textMuted">
                      {formatUploadResumeDetail(item)}. App sẽ gửi tiếp từ chunk cuối, không upload lại từ đầu.
                    </span>
                  </div>
                ) : null}
                {!item.source_available ? (
                  <span className="text-[11px] leading-5 text-textMuted">{t("meeting.sourceCleanedNotice")}</span>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs text-textMuted">
                {formatMeetingStats(item, meetingLanguage) || null}
                {formatMeetingStats(item, meetingLanguage) && item.completed_at ? " · " : null}
                {item.completed_at ? `Hoàn thành JST ${formatJstDateTime(item.completed_at, language)}` : null}
                {item.ai_processing_seconds ? ` · AI note ${formatDuration(item.ai_processing_seconds)}` : null}
                {item.transcript_only ? " · Transcript only" : item.ai_processing_mode ? ` · ${item.ai_processing_mode === "whisper" ? "Whisper + memo" : "Memo từ transcript"}` : null}
              </p>
            )}
            {formatSttInfo(item) || formatQualityWarnings(item).length > 0 ? (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-5 text-textMuted">
                {formatSttInfo(item) ? <span>{formatSttInfo(item)}</span> : null}
                {formatQualityWarnings(item).map((warning) => (
                  <span
                    key={warning}
                    className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-amber-200"
                  >
                    ⚠ {warning}
                  </span>
                ))}
              </p>
            ) : null}
            {item.transcript_available ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-teal-300/25 bg-teal-300/10 px-2.5 py-1.5 text-xs font-semibold text-teal-100 transition hover:bg-teal-300/18"
                  onClick={() => window.open(getMeetingTranscriptDownloadUrl(item.id), "_blank", "noopener,noreferrer")}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("meeting.downloadRawTranscript")}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/18"
                  onClick={() => window.open(getMeetingCorrectedTranscriptDownloadUrl(item.id), "_blank", "noopener,noreferrer")}
                  title="Tải transcript đã sửa các thuật ngữ kỹ thuật phổ biến, không ghi đè raw transcript"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("meeting.downloadCleanTranscript")}
                </button>
                {item.transcript_srt_available ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/18"
                    onClick={() => window.open(getMeetingTranscriptSrtDownloadUrl(item.id), "_blank", "noopener,noreferrer")}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t("meeting.downloadSrt")}
                  </button>
                ) : null}
                {(item.upload_file_size || item.upload_received_bytes || 0) > 100 * 1024 * 1024 && (item.transcript_word_count || 0) < 3000 ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/30 bg-amber-300/12 px-2.5 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20 disabled:opacity-55"
                    onClick={() => onRetranscribe(item.id)}
                    disabled={retryingId === item.id || item.current_step === "uploading" || !item.source_available}
                    title="Transcript có vẻ quá ngắn so với file dài. Chạy lại Whisper từ file gốc bằng auto language."
                  >
                    {retryingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    {t("meeting.retranscribeFull")}
                  </button>
                ) : null}
              </div>
            ) : null}
            {(item.current_step === "missing_source" || item.current_step === "missing_memo" || item.memo_available === false) ? (
              <p className="mt-2 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-200">
                {item.status_message || "File memo/media bị thiếu. Hãy retry nếu còn transcript/media, hoặc upload lại file gốc."}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-textMuted hover:text-primary"
            onClick={() => window.open(getMeetingMediaUrl(item.id), "_blank", "noopener,noreferrer")}
            disabled={item.status === "recording" || item.status === "pending" || !item.source_available}
            title={item.source_available ? "Mở file gốc để nghe/xem lại" : "File gốc đã được dọn sau khi xử lý"}
          >
            <PlayCircle className="h-4.5 w-4.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-textMuted hover:text-primary"
            onClick={() => onViewMemo(item.id, item.title)}
            disabled={item.status !== "completed" || item.transcript_only || item.memo_available === false}
            title={item.transcript_only ? "Transcript-only: tải file .txt bằng nút download" : "Mở memo"}
          >
            <FileText className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-textMuted hover:text-primary"
            onClick={() => window.open(getMeetingTranscriptDownloadUrl(item.id), "_blank", "noopener,noreferrer")}
            disabled={!item.transcript_available}
            title="Tải transcript .txt"
          >
            <Download className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-textMuted hover:text-primary"
            onClick={() => onRename(item)}
            title="Đổi tên file Meeting Note"
          >
            <Pencil className="h-4.5 w-4.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-textMuted hover:text-primary"
            onClick={() => onTrim(item)}
            disabled={item.status !== "completed" || !item.source_available}
            title={item.source_available ? "Cắt file gốc" : "Không thể cắt vì file gốc đã được dọn"}
          >
            <Scissors className="h-4.5 w-4.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-textMuted hover:text-primary"
            onClick={() => onChat(item.id, item.title)}
            disabled={item.status !== "completed"}
          >
            <MessageSquare className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-textMuted hover:text-primary"
            onClick={() => onSyncTodos(item)}
            disabled={item.status !== "completed" || syncingActionsId === item.id}
            title="Sync action items sang BrSE Todo"
          >
            {syncingActionsId === item.id ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <CheckSquare className="h-4.5 w-4.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-textMuted hover:text-primary"
            onClick={() => onResummarize(item.id)}
            disabled={retryingId === item.id || item.current_step === "uploading"}
            title={getRetryTitle(item)}
          >
            {retryingId === item.id ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <RotateCcw className="h-4.5 w-4.5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-textMuted hover:text-red-500"
            onClick={() => onDelete(item.id)}
            title={["pending", "processing", "recording", "transcribing", "summarizing"].includes(item.status) ? "Huỷ job và xoá meeting" : "Xoá meeting"}
          >
            <Trash2 className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
