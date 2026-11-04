"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Mic, FileText, Loader2, PlayCircle, Scissors, MessageSquare, ScreenShare, Volume2, Pencil } from "lucide-react";
import { getMeetingHistory, getMeetingTopicClusters, searchMeetingTranscripts, type MeetingRecord, type MeetingTopicCluster, type MeetingTranscriptSearchResult } from "@/lib/meetings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/AppModal";
import { PageHeader } from "@/components/PageHeader";
import { useUiLanguage } from "@/components/LanguageProvider";
import { formatAppDate, getLocaleString } from "@/lib/dateUtils";
import { useConfirm } from "@/components/ConfirmProvider";
import { getMeetingProgress, getMeetingStepLabel, MeetingLanguage } from "@/lib/meetingUIUtils";
import type { RecordingMode } from "@/components/LiveRecordingPanel";
import dynamic from "next/dynamic";

const MeetingMemoModal = dynamic(
  () => import("@/components/MeetingMemoModal").then((m) => m.MeetingMemoModal),
  { ssr: false }
);
const MeetingChatModal = dynamic(
  () => import("@/components/MeetingChatModal").then((m) => m.MeetingChatModal),
  { ssr: false }
);
const LiveRecordingPanel = dynamic(
  () => import("@/components/LiveRecordingPanel").then((m) => m.LiveRecordingPanel),
  { ssr: false }
);
const VideoTrimModal = dynamic(
  () => import("@/components/VideoTrimModal").then((m) => m.VideoTrimModal),
  { ssr: false }
);
import { useProjectContext } from "@/components/ProjectContextProvider";
import { useMeetingHandlers } from "@/features/meeting/useMeetingHandlers";

// Extracted sub-components
import { MeetingUploader } from "@/components/meeting/MeetingUploader";
import { MeetingHistory } from "@/components/meeting/MeetingHistory";

type MeetingTemplate = "meeting" | "minutes" | "action";
type HistoryFilter = "all" | "completed" | "processing" | "failed";

export default function MeetingNotePage() {
  const { language, t } = useUiLanguage();
  const { confirm } = useConfirm();
  const [history, setHistory] = useState<MeetingRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; loaded: number; total?: number; percent?: number; queueIndex?: number; queueTotal?: number } | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [transcriptTitle, setTranscriptTitle] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [resumingUploadId, setResumingUploadId] = useState<string | null>(null);
  const [isRetryingFailedQueue, setIsRetryingFailedQueue] = useState(false);
  const [isCancelingProcessingQueue, setIsCancelingProcessingQueue] = useState(false);
  const [notice, setNoticeState] = useState<{ text: string; kind: "success" | "error" | "info" } | null>(null);
  // Wrapper keeps every existing setNotice("...") call working while adding a
  // severity; the handlers pass kind "error" from their catch blocks.
  const setNotice = useCallback(
    (text: string, kind: "success" | "error" | "info" = "info") => setNoticeState(text ? { text, kind } : null),
    []
  );
  const { activeProject } = useProjectContext();
  const [isLoading, setIsLoading] = useState(true);
  const [meetingLanguage, setMeetingLanguage] = useState<MeetingLanguage>(language);
  const [meetingTemplate, setMeetingTemplate] = useState<MeetingTemplate>("meeting");
  const [transcriptOnlyMode, setTranscriptOnlyMode] = useState(false);
  const [keepSourceMedia, setKeepSourceMedia] = useState(false);
  const [whisperModel, setWhisperModel] = useState<string>("small");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [syncingActionsId, setSyncingActionsId] = useState<string | null>(null);
  const [topicClusters, setTopicClusters] = useState<MeetingTopicCluster[]>([]);
  const [activeViewTab, setActiveViewTab] = useState<"history" | "record">("history");
  
  // Modal states
  const [viewingMemo, setViewingMemo] = useState<{id: string, title: string} | null>(null);
  const [chattingWith, setChattingWith] = useState<{id: string, title: string} | null>(null);
  const [trimmingMeeting, setTrimmingMeeting] = useState<MeetingRecord | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [initialRecordingMode, setInitialRecordingMode] = useState<RecordingMode>("mixed");
  const [transcriptSearchQuery, setTranscriptSearchQuery] = useState("");
  const [transcriptSearchResults, setTranscriptSearchResults] = useState<MeetingTranscriptSearchResult[]>([]);
  const [isSearchingTranscript, setIsSearchingTranscript] = useState(false);
  const [transcriptSearchStatus, setTranscriptSearchStatus] = useState("");
  const [selectedCombineIds, setSelectedCombineIds] = useState<string[]>([]);
  const [isCombiningMemos, setIsCombiningMemos] = useState(false);
  const [renamingItem, setRenamingItem] = useState<MeetingRecord | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deepLinkedMeetingId, setDeepLinkedMeetingId] = useState("");
  const [hasOpenedDeepLink, setHasOpenedDeepLink] = useState(false);

  useEffect(() => {
    void fetchHistory();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search");
    const initialMeeting = params.get("meeting");
    if (initialSearch) setTranscriptSearchQuery(initialSearch);
    if (initialMeeting) setDeepLinkedMeetingId(initialMeeting);
  }, []);

  useEffect(() => {
    if (!deepLinkedMeetingId || hasOpenedDeepLink || !history.length) return;
    const match = history.find((item) => item.id === deepLinkedMeetingId);
    if (!match) return;
    setHistoryFilter("all");
    setViewingMemo({ id: match.id, title: match.title });
    setHasOpenedDeepLink(true);
  }, [deepLinkedMeetingId, hasOpenedDeepLink, history]);

  useEffect(() => {
    const busy = history.some(
      (item) =>
        ["pending", "processing", "recording", "transcribing", "summarizing"].includes(item.status) ||
        ["queued", "transcribing", "summarizing", "reducing", "analyzing"].includes(item.current_step || "")
    );
    const intervalMs = busy ? 5000 : 20000;
    const interval = setInterval(() => {
      // Skip polling while the tab is hidden to save CPU/network.
      if (!document.hidden) void fetchHistory();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [history]);

  // Auto-dismiss the notice so it doesn't linger forever.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNoticeState(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setMeetingLanguage(language);
  }, [language]);

  useEffect(() => {
    const query = transcriptSearchQuery.trim();
    if (query.length < 2) {
      setTranscriptSearchResults([]);
      setTranscriptSearchStatus("");
      setIsSearchingTranscript(false);
      return;
    }
    setIsSearchingTranscript(true);
    setTranscriptSearchStatus("");
    const timer = window.setTimeout(() => {
      searchMeetingTranscripts(query)
        .then((results) => {
          setTranscriptSearchResults(results);
          setTranscriptSearchStatus(results.length ? "" : t("meeting.searchNoResults"));
        })
        .catch(() => {
          setTranscriptSearchResults([]);
          setTranscriptSearchStatus(t("meeting.searchError"));
        })
        .finally(() => setIsSearchingTranscript(false));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [t, transcriptSearchQuery]);

  const fetchHistory = async () => {
    try {
      const data = await getMeetingHistory();
      setHistory(data);
      getMeetingTopicClusters().then(setTopicClusters).catch(() => setTopicClusters([]));
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const {
    handleFileUpload,
    handleResumeUpload,
    handleUrlSubmit,
    handleTranscriptSubmit,
    handleDelete,
    handleRename,
    handleRenameSubmit,
    handleCancelProcessingQueue,
    handleResummarize,
    handleRetranscribe,
    handleRetryFailedQueue,
    handleCombineSelectedMemos,
    handleSyncActionsToTodo,
  } = useMeetingHandlers({
    // setters
    setHistory,
    setIsUploading,
    setUploadProgress,
    setIsProcessingUrl,
    setIsProcessingTranscript,
    setRetryingId,
    setResumingUploadId,
    setIsRetryingFailedQueue,
    setIsCancelingProcessingQueue,
    setIsCombiningMemos,
    setSyncingActionsId,
    setRenamingItem,
    setNotice,
    setUrlInput,
    setTranscriptTitle,
    setTranscriptText,
    setSelectedCombineIds,
    setViewingMemo,
    setChattingWith,
    // values
    history,
    meetingLanguage,
    meetingTemplate,
    transcriptOnlyMode,
    keepSourceMedia,
    urlInput,
    transcriptText,
    transcriptTitle,
    selectedCombineIds,
    renameTitle,
    renamingItem,
    viewingMemo,
    chattingWith,
    activeProjectName: activeProject?.name,
    language,
    whisperModel,
    // utilities
    fetchHistory,
    confirm,
  });


  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (historyFilter === "all") return true;
      if (historyFilter === "processing") return ["pending", "processing", "transcribing", "summarizing"].includes(item.status);
      return item.status === historyFilter;
    });
  }, [history, historyFilter]);

  const completedCount = useMemo(() => history.filter((item) => item.status === "completed").length, [history]);
  const processingCount = useMemo(() => history.filter((item) => ["pending", "processing", "transcribing", "summarizing"].includes(item.status)).length, [history]);
  const uploadResumeItems = useMemo(() => history.filter((item) => item.current_step === "uploading" && item.status === "pending"), [history]);
  const activeAiItems = useMemo(() => history.filter((item) => ["processing", "transcribing", "summarizing"].includes(item.status) || ["queued", "transcribing", "summarizing", "reducing", "analyzing"].includes(item.current_step || "")), [history]);
  const uploadResumeCount = uploadResumeItems.length;
  const activeAiCount = activeAiItems.length;
  const failedCount = useMemo(() => history.filter((item) => item.status === "failed").length, [history]);
  const artifactIssueCount = useMemo(() => history.filter((item) => item.status === "completed" && item.memo_available === false).length, [history]);

  function openRecorder(mode: RecordingMode = "mixed") {
    setInitialRecordingMode(mode);
    setIsRecording(true);
  }

  return (
    <main className="brse-page">
      <PageHeader
        compact={true}
        badge="Communication"
        title={t("meeting.title")}
        description={t("meeting.body")}
        stats={[
          { label: t("meeting.completed"), value: completedCount, variant: "success" },
          { label: t("meeting.aiProcessing"), value: activeAiCount, variant: "primary" },
          { label: t("meeting.retry"), value: failedCount, variant: "danger" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/app/minutes/new">
              <Button variant="outline" size="sm" className="gap-1.5 border-matcha/40 text-matcha hover:bg-matcha/10 text-xs font-semibold">
                <FileText className="h-3.5 w-3.5" />
                {t("meeting.createMinutes")}
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setActiveViewTab(activeViewTab === "record" ? "history" : "record")}
              className={cn(
                "gap-1.5 text-xs font-bold transition shadow-sm",
                activeViewTab === "record"
                  ? "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                  : "bg-primary text-slate-950 hover:bg-primary/90"
              )}
            >
              {activeViewTab === "record" ? (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  {t("meeting.tabMeetings")}
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  {t("meeting.newRecording")}
                </>
              )}
            </Button>
          </div>
        }
      />
      
      <div className="mt-4">
        {/* Navigation Tabs */}
        <div className="mb-4 flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveViewTab("history")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition border",
                activeViewTab === "history"
                  ? "bg-primary/15 text-primary border-primary/30 shadow-sm"
                  : "text-textMuted border-transparent hover:text-ink hover:bg-slate-900/40"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              {t("meeting.tabMeetings")}
              <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] text-primary">
                {history.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab("record")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition border",
                activeViewTab === "record"
                  ? "bg-cyan/15 text-cyan border-cyan/30 shadow-sm"
                  : "text-textMuted border-transparent hover:text-ink hover:bg-slate-900/40"
              )}
            >
              <Mic className="h-3.5 w-3.5" />
              {t("meeting.tabRecord")}
            </button>
          </div>

          {activeProject?.name && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-textMuted text-[11px]">Dự án:</span>
              <span className="rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                {activeProject.name}
              </span>
            </div>
          )}
        </div>

        {notice ? (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 rounded-xl border px-4 py-2.5 text-xs leading-5 ${
              notice.kind === "error"
                ? "border-vermilion/25 bg-vermilion/10 text-vermilion"
                : notice.kind === "success"
                ? "border-matcha/25 bg-matcha/10 text-matcha"
                : "border-primary/25 bg-primary/10 text-primary"
            }`}
          >
            {notice.text}
          </div>
        ) : null}

        {uploadProgress ? (
          <div className="brse-card brse-card-muted mb-4 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink">{uploadProgress.queueTotal && uploadProgress.queueTotal > 1 ? `File ${uploadProgress.queueIndex}/${uploadProgress.queueTotal} · ` : ""}{uploadProgress.fileName}</p>
                <p className="mt-0.5 text-[11px] text-textMuted">
                  Upload {uploadProgress.loaded} / {uploadProgress.total}
                  {isUploading ? ` · ${t("meeting.longFileNotice")}` : ` · ${t("meeting.uploadFinished")}`}
                </p>
              </div>
              <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {uploadProgress.percent ?? 0}%
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${uploadProgress.percent ?? 0}%` }}
              />
            </div>
          </div>
        ) : null}

        {activeViewTab === "record" && (
          <div className="space-y-4 mb-8">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => openRecorder("mixed")}
                className="brse-card p-3.5 text-left transition hover:border-cyan hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <ScreenShare className="h-5 w-5 text-cyan" />
                  <span className="rounded-full bg-cyan/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan">Live</span>
                </div>
                <p className="mt-2 font-bold text-ink text-sm">{t("meeting.screenMic")}</p>
                <p className="mt-1 text-[11px] leading-4 text-textMuted">{t("meeting.screenMicDesc")}</p>
              </button>
              <button
                type="button"
                onClick={() => openRecorder("screenVideo")}
                className="brse-card p-3.5 text-left transition hover:border-primary hover:shadow-md group"
              >
                <ScreenShare className="h-5 w-5 text-primary" />
                <p className="mt-2 font-bold text-ink text-sm">{t("meeting.screenRecord")}</p>
                <p className="mt-1 text-[11px] leading-4 text-textMuted">{t("meeting.screenRecordDesc")}</p>
              </button>
              <button
                type="button"
                onClick={() => openRecorder("system")}
                className="brse-card p-3.5 text-left transition hover:border-primary/50 hover:shadow-md group"
              >
                <Volume2 className="h-5 w-5 text-primary" />
                <p className="mt-2 font-bold text-ink text-sm">{t("meeting.screenAudio")}</p>
                <p className="mt-1 text-[11px] leading-4 text-textMuted">{t("meeting.screenAudioDesc")}</p>
              </button>
              <button
                type="button"
                onClick={() => openRecorder("mic")}
                className="brse-card p-3.5 text-left transition hover:border-primary/50 hover:shadow-md group"
              >
                <Mic className="h-5 w-5 text-primary" />
                <p className="mt-2 font-bold text-ink text-sm">{t("meeting.onlyMic")}</p>
                <p className="mt-1 text-[11px] leading-4 text-textMuted">{t("meeting.onlyMicDesc")}</p>
              </button>
            </section>

            <div className="brse-card p-5">
              <MeetingUploader
                t={t}
                meetingLanguage={meetingLanguage}
                setMeetingLanguage={setMeetingLanguage}
                meetingTemplate={meetingTemplate}
                setMeetingTemplate={setMeetingTemplate}
                transcriptOnlyMode={transcriptOnlyMode}
                setTranscriptOnlyMode={setTranscriptOnlyMode}
                keepSourceMedia={keepSourceMedia}
                setKeepSourceMedia={setKeepSourceMedia}
                urlInput={urlInput}
                setUrlInput={setUrlInput}
                isProcessingUrl={isProcessingUrl}
                handleUrlSubmit={(e) => {
                  handleUrlSubmit(e);
                  setActiveViewTab("history");
                }}
                isUploading={isUploading}
                handleFileUpload={(e) => {
                  handleFileUpload(e);
                  setActiveViewTab("history");
                }}
                transcriptTitle={transcriptTitle}
                setTranscriptTitle={setTranscriptTitle}
                transcriptText={transcriptText}
                setTranscriptText={setTranscriptText}
                isProcessingTranscript={isProcessingTranscript}
                handleTranscriptSubmit={(e) => {
                  handleTranscriptSubmit(e);
                  setActiveViewTab("history");
                }}
                openRecorder={openRecorder}
                activeProjectName={activeProject?.name}
                whisperModel={whisperModel}
                setWhisperModel={setWhisperModel}
              />
            </div>
          </div>
        )}

        {activeViewTab === "history" && (
          <MeetingHistory
            t={t}
            language={language}
          meetingLanguage={meetingLanguage}
          historyFilter={historyFilter}
          setHistoryFilter={setHistoryFilter}
          fetchHistory={fetchHistory}
          failedCount={failedCount}
          isRetryingFailedQueue={isRetryingFailedQueue}
          handleRetryFailedQueue={handleRetryFailedQueue}
          processingCount={processingCount}
          isCancelingProcessingQueue={isCancelingProcessingQueue}
          handleCancelProcessingQueue={handleCancelProcessingQueue}
          completedCount={completedCount}
          activeAiCount={activeAiCount}
          uploadResumeCount={uploadResumeCount}
          artifactIssueCount={artifactIssueCount}
          transcriptSearchQuery={transcriptSearchQuery}
          setTranscriptSearchQuery={setTranscriptSearchQuery}
          isSearchingTranscript={isSearchingTranscript}
          transcriptSearchResults={transcriptSearchResults}
          transcriptSearchStatus={transcriptSearchStatus}
          selectedCombineIds={selectedCombineIds}
          setSelectedCombineIds={setSelectedCombineIds}
          isCombiningMemos={isCombiningMemos}
          handleCombineSelectedMemos={handleCombineSelectedMemos}
          isLoading={isLoading}
          filteredHistory={filteredHistory}
          uploadResumeItems={uploadResumeItems}
          activeAiItems={activeAiItems}
          isUploading={isUploading}
          resumingUploadId={resumingUploadId}
          retryingId={retryingId}
          syncingActionsId={syncingActionsId}
          handleResumeUpload={handleResumeUpload}
          handleResummarize={handleResummarize}
          handleRetranscribe={handleRetranscribe}
          handleDelete={handleDelete}
          handleRename={handleRename}
          handleSyncActionsToTodo={handleSyncActionsToTodo}
          setViewingMemo={setViewingMemo}
          setChattingWith={setChattingWith}
          setTrimmingMeeting={setTrimmingMeeting}
          getMeetingProgress={getMeetingProgress}
          getMeetingStepLabel={getMeetingStepLabel}
        />
      )}

        {viewingMemo && (
          <MeetingMemoModal
            jobId={viewingMemo.id}
            title={viewingMemo.title}
            memoLanguage={history.find((item) => item.id === viewingMemo.id)?.language}
            onClose={() => setViewingMemo(null)}
          />
        )}

        {chattingWith && (
          <MeetingChatModal 
            jobId={chattingWith.id} 
            title={chattingWith.title} 
            onClose={() => setChattingWith(null)} 
          />
        )}

        {isRecording && (
          <LiveRecordingPanel 
            language={meetingLanguage}
            template={meetingTemplate}
            initialMode={initialRecordingMode}
            whisperModel={whisperModel}
            onClose={() => setIsRecording(false)} 
            onFinished={() => {
              setIsRecording(false);
              fetchHistory();
              setNotice(t("meeting.recordingSaved"));
            }}
          />
        )}

        {trimmingMeeting && (
          <VideoTrimModal 
            meeting={trimmingMeeting} 
            onClose={() => setTrimmingMeeting(null)} 
            onFinished={() => {
              setTrimmingMeeting(null);
              fetchHistory();
            }} 
          />
        )}

        <AppModal
          open={Boolean(renamingItem)}
          onClose={() => setRenamingItem(null)}
          title={t("meeting.renameTitle")}
          description={renamingItem ? t("meeting.renameCurrent").replace("{title}", renamingItem.title) : ""}
          icon={<Pencil className="h-5 w-5" />}
          size="sm"
          tone="primary"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setRenamingItem(null)}>{t("meeting.cancel")}</Button>
              <Button type="button" onClick={handleRenameSubmit}>{t("meeting.saveButton")}</Button>
            </>
          }
        >
          <input
            autoFocus
            type="text"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") setRenamingItem(null); }}
            className="field-control w-full px-3 py-2.5 text-sm"
            placeholder={t("meeting.renamePlaceholder")}
          />
        </AppModal>
      </div>
    </main>
  );
}
