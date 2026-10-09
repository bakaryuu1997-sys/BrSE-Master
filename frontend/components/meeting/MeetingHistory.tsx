"use client";

import React from "react";
import { Search, Loader2, RefreshCw, RotateCcw, Trash2, FileText, PlayCircle, Scissors, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/PageHeader";
import { MeetingQueueDashboard } from "@/components/meeting/MeetingQueueDashboard";
import { MeetingHistoryItem } from "@/components/meeting/MeetingHistoryItem";
import { MeetingRecord, MeetingTranscriptSearchResult } from "@/lib/meetings";
import { formatAppDateTime } from "@/lib/dateUtils";
import { MeetingLanguage } from "@/lib/meetingUIUtils";
import { UiLanguage } from "@/lib/uiLanguage";

type HistoryFilter = "all" | "completed" | "processing" | "failed";

const historyFilterLabels: Record<HistoryFilter, "meeting.filter.all" | "meeting.filter.completed" | "meeting.filter.processing" | "meeting.filter.failed"> = {
  all: "meeting.filter.all",
  completed: "meeting.filter.completed",
  processing: "meeting.filter.processing",
  failed: "meeting.filter.failed",
};

interface MeetingHistoryProps {
  t: any;
  language: UiLanguage;
  meetingLanguage: MeetingLanguage;
  historyFilter: HistoryFilter;
  setHistoryFilter: (filter: HistoryFilter) => void;
  fetchHistory: () => Promise<void>;
  failedCount: number;
  isRetryingFailedQueue: boolean;
  handleRetryFailedQueue: () => void;
  processingCount: number;
  isCancelingProcessingQueue: boolean;
  handleCancelProcessingQueue: () => void;
  completedCount: number;
  activeAiCount: number;
  uploadResumeCount: number;
  artifactIssueCount: number;
  transcriptSearchQuery: string;
  setTranscriptSearchQuery: (val: string) => void;
  isSearchingTranscript: boolean;
  transcriptSearchResults: MeetingTranscriptSearchResult[];
  transcriptSearchStatus: string;
  selectedCombineIds: string[];
  setSelectedCombineIds: React.Dispatch<React.SetStateAction<string[]>>;
  isCombiningMemos: boolean;
  handleCombineSelectedMemos: () => void;
  isLoading: boolean;
  filteredHistory: MeetingRecord[];
  
  // Dashboard & actions callbacks
  uploadResumeItems: MeetingRecord[];
  activeAiItems: MeetingRecord[];
  isUploading: boolean;
  resumingUploadId: string | null;
  retryingId: string | null;
  syncingActionsId: string | null;
  handleResumeUpload: (item: MeetingRecord, e: React.ChangeEvent<HTMLInputElement>) => void;
  handleResummarize: (id: string) => void;
  handleRetranscribe: (id: string) => void;
  handleDelete: (id: string) => void;
  handleRename: (item: MeetingRecord) => void;
  handleSyncActionsToTodo: (item: MeetingRecord) => void;
  setViewingMemo: (val: { id: string; title: string } | null) => void;
  setChattingWith: (val: { id: string; title: string } | null) => void;
  setTrimmingMeeting: (val: MeetingRecord | null) => void;
  getMeetingProgress: (item: MeetingRecord) => number;
  getMeetingStepLabel: (item: MeetingRecord, lang: MeetingLanguage) => string;
}

export function MeetingHistory({
  t,
  language,
  meetingLanguage,
  historyFilter,
  setHistoryFilter,
  fetchHistory,
  failedCount,
  isRetryingFailedQueue,
  handleRetryFailedQueue,
  processingCount,
  isCancelingProcessingQueue,
  handleCancelProcessingQueue,
  completedCount,
  activeAiCount,
  uploadResumeCount,
  artifactIssueCount,
  transcriptSearchQuery,
  setTranscriptSearchQuery,
  isSearchingTranscript,
  transcriptSearchResults,
  transcriptSearchStatus,
  selectedCombineIds,
  setSelectedCombineIds,
  isCombiningMemos,
  handleCombineSelectedMemos,
  isLoading,
  filteredHistory,
  uploadResumeItems,
  activeAiItems,
  isUploading,
  resumingUploadId,
  retryingId,
  syncingActionsId,
  handleResumeUpload,
  handleResummarize,
  handleRetranscribe,
  handleDelete,
  handleRename,
  handleSyncActionsToTodo,
  setViewingMemo,
  setChattingWith,
  setTrimmingMeeting,
  getMeetingProgress,
  getMeetingStepLabel
}: MeetingHistoryProps) {
  return (
    <div className="space-y-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">{t("meeting.history")}</h2>
          <p className="mt-1 text-xs text-textMuted">
            {completedCount} {t("meeting.completed")} · {processingCount} {t("meeting.processing")} · {failedCount} {t("meeting.failed")}
            {artifactIssueCount ? ` · ${t("meeting.memoNeedRecover").replace("{count}", String(artifactIssueCount))}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "completed", "processing", "failed"] as HistoryFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setHistoryFilter(filter)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                historyFilter === filter ? "border-primary/40 bg-primary/15 text-primary" : "border-[var(--brse-panel-border)] bg-surface text-textMuted hover:text-ink"
              }`}
            >
              {t(historyFilterLabels[filter])}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchHistory}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brse-panel-border)] bg-surface px-3 py-1.5 text-xs font-semibold text-textMuted transition hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleRetryFailedQueue}
            disabled={!failedCount || isRetryingFailedQueue}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRetryingFailedQueue ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Retry failed queue
          </button>
          <button
            type="button"
            onClick={handleCancelProcessingQueue}
            disabled={!processingCount || isCancelingProcessingQueue}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCancelingProcessingQueue ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Cancel processing
          </button>
        </div>
      </div>

      <section className="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">{t("meeting.searchTranscriptTitle")}</h3>
            <p className="mt-1 text-xs leading-5 text-textMuted">
              {t("meeting.searchTranscriptDesc")}
            </p>
          </div>
          <label className="relative block min-w-0 lg:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
            <input
              value={transcriptSearchQuery}
              onChange={(event) => setTranscriptSearchQuery(event.target.value)}
              placeholder="VD: deadline, UAT, 仕様, confirm..."
              className="h-10 w-full rounded-lg border border-[var(--brse-panel-border)] bg-background/80 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-primary"
            />
          </label>
        </div>
        {transcriptSearchQuery.trim().length >= 2 ? (
          <div className="mt-3 grid gap-2">
            {isSearchingTranscript ? (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--brse-panel-border)] bg-background/60 px-3 py-2 text-xs text-textMuted">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                {t("meeting.searchTranscriptSearching")}
              </div>
            ) : transcriptSearchResults.length ? (
              transcriptSearchResults.map((result) => (
                <article key={result.id} className="rounded-lg border border-[var(--brse-panel-border)] bg-background/60 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{result.title}</p>
                      <p className="mt-1 text-[11px] text-textMuted">
                        {result.matches.length} match · {result.created_at ? formatAppDateTime(result.created_at, language) : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingMemo({ id: result.id, title: result.title })}
                        className="rounded-md border border-[var(--brse-panel-border)] bg-surface px-2.5 py-1.5 text-xs font-semibold text-textMuted transition hover:border-primary/40 hover:text-primary"
                      >
                        {t("meeting.openMemo")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setChattingWith({ id: result.id, title: result.title })}
                        className="rounded-md border border-[var(--brse-panel-border)] bg-surface px-2.5 py-1.5 text-xs font-semibold text-textMuted transition hover:border-primary/40 hover:text-primary"
                      >
                        {t("meeting.chatTranscript")}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {result.matches.map((match) => (
                      <p key={`${result.id}-${match.line_number}`} className="rounded-md border border-[var(--brse-panel-border)] bg-surface/70 px-3 py-2 text-xs leading-5 text-textMuted">
                        <span className="mr-2 font-semibold text-primary">Line {match.line_number}</span>
                        {match.snippet}
                      </p>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-[var(--brse-panel-border)] bg-background/60 px-3 py-2 text-xs text-textMuted">
                {transcriptSearchStatus || t("meeting.searchTranscriptMinChars")}
              </p>
            )}
          </div>
        ) : null}
      </section>

      <div className="mb-4 grid gap-3 rounded-xl border border-[var(--brse-panel-border)]/55 bg-surface/55 p-3 md:grid-cols-3">
        <div className="rounded-lg border border-[var(--brse-hairline-border)] bg-green-400/10 p-3">
          <p className="text-xs font-semibold text-green-300">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-[var(--brse-hairline-border)] bg-primary/10 p-3">
          <p className="text-xs font-semibold text-primary">AI lanes</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{processingCount}</p>
          <p className="mt-1 text-[11px] text-textMuted">{t("meeting.historyStatusSummary").replace("{activeAiCount}", String(activeAiCount)).replace("{uploadResumeCount}", String(uploadResumeCount))}</p>
        </div>
        <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3">
          <p className="text-xs font-semibold text-red-300">Needs retry</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{failedCount}</p>
        </div>
      </div>

      <MeetingQueueDashboard
        uploadResumeItems={uploadResumeItems}
        activeAiItems={activeAiItems}
        uploadResumeCount={uploadResumeCount}
        activeAiCount={activeAiCount}
        isUploading={isUploading}
        resumingUploadId={resumingUploadId}
        retryingId={retryingId}
        onShowQueue={() => setHistoryFilter(uploadResumeCount ? "processing" : "all")}
        onResumeUpload={handleResumeUpload}
        onRetry={(item) => handleResummarize(item.id)}
        onCancel={(item) => handleDelete(item.id)}
        getProgress={getMeetingProgress}
        getStepLabel={(item) => getMeetingStepLabel(item, meetingLanguage)}
      />

      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">{t("meeting.combineNotesTitle")}</h3>
            <p className="mt-1 text-xs leading-5 text-textMuted">
              {t("meeting.combineNotesDesc")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleCombineSelectedMemos}
            disabled={selectedCombineIds.length < 2 || isCombiningMemos}
          >
            {isCombiningMemos ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {t("meeting.combineCount").replace("{count}", String(selectedCombineIds.length))}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
          <SkeletonCard rows={3} />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--brse-panel-border)] bg-surface/30 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface border border-[var(--brse-panel-border)] mb-4">
            <FileText className="h-6 w-6 text-textMuted" />
          </div>
          <p className="text-ink font-medium">{t("meeting.empty")}</p>
          <p className="text-sm text-textMuted mt-1">{t("meeting.emptyHint")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredHistory.map((item) => (
            <MeetingHistoryItem
              key={item.id}
              item={item}
              language={language}
              meetingLanguage={meetingLanguage}
              selectedCombineIds={selectedCombineIds}
              onToggleSelect={(id) => {
                setSelectedCombineIds((current) =>
                  current.includes(id) ? current.filter((cid) => cid !== id) : [...current, id].slice(0, 12)
                );
              }}
              onViewMemo={(id, title) => setViewingMemo({ id, title })}
              onChat={(id, title) => setChattingWith({ id, title })}
              onRename={handleRename}
              onSyncTodos={handleSyncActionsToTodo}
              onResummarize={handleResummarize}
              onRetranscribe={handleRetranscribe}
              onDelete={handleDelete}
              onTrim={setTrimmingMeeting}
              onHandleResumeUpload={handleResumeUpload}
              isUploading={isUploading}
              resumingUploadId={resumingUploadId}
              retryingId={retryingId}
              syncingActionsId={syncingActionsId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
