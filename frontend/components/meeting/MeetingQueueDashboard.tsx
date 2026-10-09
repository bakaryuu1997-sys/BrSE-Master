"use client";

import { Loader2, RotateCcw, Trash2, Upload } from "lucide-react";
import type { ChangeEvent } from "react";
import type { MeetingRecord } from "@/lib/meetings";
import { cn } from "@/lib/utils";
import { useUiLanguage } from "@/components/LanguageProvider";

type MeetingQueueDashboardProps = {
  uploadResumeItems: MeetingRecord[];
  activeAiItems: MeetingRecord[];
  uploadResumeCount: number;
  activeAiCount: number;
  isUploading: boolean;
  resumingUploadId: string | null;
  retryingId: string | null;
  onShowQueue: () => void;
  onResumeUpload: (item: MeetingRecord, event: ChangeEvent<HTMLInputElement>) => void;
  onRetry: (item: MeetingRecord) => void;
  onCancel: (item: MeetingRecord) => void;
  getProgress: (item: MeetingRecord) => number;
  getStepLabel: (item: MeetingRecord) => string;
};

const queueSteps = ["Upload", "Audio", "Whisper", "Summary", "Analysis", "Done"];

function getStepIndex(item: MeetingRecord) {
  const step = item.current_step ?? item.status;
  if (step === "uploading") return 0;
  if (step === "preparing_audio") return 1;
  if (step === "transcribing") return 2;
  if (step === "summarizing" || step === "reducing") return 3;
  if (step === "analyzing") return 4;
  if (step === "completed") return 5;
  return 1;
}

function QueueTimeline({ item }: { item: MeetingRecord }) {
  const activeIndex = getStepIndex(item);
  return (
    <div className="mt-3 grid grid-cols-6 gap-1.5">
      {queueSteps.map((step, index) => (
        <div key={step} className="min-w-0">
          <div
            className={cn(
              "h-1.5 rounded-full",
              index <= activeIndex ? "bg-primary" : "bg-border"
            )}
          />
          <p className={cn("mt-1 truncate text-[10px]", index === activeIndex ? "font-semibold text-primary" : "text-textMuted")}>
            {step}
          </p>
        </div>
      ))}
    </div>
  );
}

export function MeetingQueueDashboard({
  uploadResumeItems,
  activeAiItems,
  uploadResumeCount,
  activeAiCount,
  isUploading,
  resumingUploadId,
  retryingId,
  onShowQueue,
  onResumeUpload,
  onRetry,
  onCancel,
  getProgress,
  getStepLabel,
}: MeetingQueueDashboardProps) {
  const { t } = useUiLanguage();
  const visibleItems = uploadResumeItems.length ? uploadResumeItems : activeAiItems;

  function getQueueHint(item: MeetingRecord) {
    if (item.current_step === "uploading") {
      return t("queue.uploadHint");
    }
    if (item.current_step === "transcribing") {
      return t("queue.whisperHint");
    }
    if (item.summary_chunks_total) {
      return t("queue.summaryProgress")
        .replace("{done}", String(item.summary_chunks_done ?? 0))
        .replace("{total}", String(item.summary_chunks_total));
    }
    if (item.reduce_batches_total) {
      return t("queue.reduceProgress")
        .replace("{done}", String(item.reduce_batches_done ?? 0))
        .replace("{total}", String(item.reduce_batches_total));
    }
    return t("queue.aiProcessHint");
  }

  function getEtaText(item: MeetingRecord) {
    if (item.current_step === "uploading") return t("queue.etaUpload");
    if (item.current_step === "transcribing") return t("queue.etaWhisper");
    if (item.summary_chunks_total) {
      const remain = Math.max(0, item.summary_chunks_total - (item.summary_chunks_done ?? 0));
      return remain 
        ? t("queue.etaSummary").replace("{count}", String(remain)) 
        : t("queue.etaSummaryFinishing");
    }
    if (item.reduce_batches_total) {
      const remain = Math.max(0, item.reduce_batches_total - (item.reduce_batches_done ?? 0));
      return remain 
        ? t("queue.etaReduce").replace("{count}", String(remain)) 
        : t("queue.etaReduceFinishing");
    }
    return t("queue.waitingLane");
  }

  return (
    <section className="mb-4 rounded-xl border border-[var(--brse-panel-border)] bg-surface/55 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("queue.title")}</h3>
          <p className="mt-1 text-xs leading-5 text-textMuted">
            2 AI lanes · {t("queue.activeProcessing").replace("{count}", String(activeAiCount))} · {t("queue.needResume").replace("{count}", String(uploadResumeCount))}. {t("queue.longVideoHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={onShowQueue}
          className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-xs font-semibold text-textMuted transition hover:border-primary/40 hover:text-primary"
        >
          {t("queue.view")}
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        {visibleItems.length ? (
          visibleItems.slice(0, 6).map((item) => {
            const isUploadResume = item.current_step === "uploading";
            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-lg border px-3 py-3",
                  isUploadResume ? "border-amber-300/25 bg-amber-300/10" : "border-primary/20 bg-primary/10"
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{item.filename || item.title}</p>
                      <span className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        isUploadResume ? "border-amber-300/30 text-amber-100" : "border-primary/30 text-primary"
                      )}>
                        {isUploadResume ? t("queue.resumeRequired") : t("queue.aiLane")}
                      </span>
                    </div>
                    <p className={cn("mt-1 text-xs leading-5", isUploadResume ? "text-amber-100" : "text-textMuted")}>
                      {getStepLabel(item)} · {getProgress(item)}% · {getEtaText(item)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-textMuted">{getQueueHint(item)}</p>
                    <QueueTimeline item={item} />
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isUploadResume ? (
                      <label
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-amber-300/35 bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/25",
                          (isUploading || resumingUploadId === item.id) && "pointer-events-none opacity-60"
                        )}
                      >
                        {resumingUploadId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {t("queue.resumeUpload")}
                        <input
                          type="file"
                          className="hidden"
                          accept="audio/*,video/*"
                          disabled={isUploading || resumingUploadId === item.id}
                          onChange={(event) => onResumeUpload(item, event)}
                        />
                      </label>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRetry(item)}
                        disabled={retryingId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-background/70 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {retryingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        {t("error.retry")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onCancel(item)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("modals.cancel")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-lg border border-[var(--brse-panel-border)] bg-background/55 px-3 py-2 text-xs text-textMuted">
            {t("queue.empty")}
          </p>
        )}
      </div>
    </section>
  );
}
