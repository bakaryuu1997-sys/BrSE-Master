/**
 * useMeetingHandlers
 *
 * Extracted hook for all async mutation handlers in the Meeting Note page.
 * Keeps page.tsx as thin orchestration — all business logic lives here.
 */

import { type Dispatch, type SetStateAction } from "react";
import {
  uploadMeeting,
  resumeMeetingUpload,
  processUrl,
  processTranscript,
  combineMeetingMemos,
  deleteMeeting,
  retryMeetingProcessing,
  retranscribeMeetingProcessing,
  updateMeetingTitle,
  getMeetingMemo,
  type MeetingRecord,
} from "@/lib/meetings";
import { ensureBrseTodoProject, upsertMeetingActionTodos } from "@/lib/brseTodo";
import { getMeetingProgress } from "@/lib/meetingUIUtils";
import { formatAppDate } from "@/lib/dateUtils";
import { type MeetingLanguage } from "@/lib/meetingUIUtils";

type SetState<T> = Dispatch<SetStateAction<T>>;
type UploadProgress = { fileName: string; loaded: number; total?: number; percent?: number; queueIndex?: number; queueTotal?: number };

export interface MeetingHandlersDeps {
  // State setters
  setHistory: SetState<MeetingRecord[]>;
  setIsUploading: SetState<boolean>;
  setUploadProgress: SetState<UploadProgress | null>;
  setIsProcessingUrl: SetState<boolean>;
  setIsProcessingTranscript: SetState<boolean>;
  setRetryingId: SetState<string | null>;
  setResumingUploadId: SetState<string | null>;
  setIsRetryingFailedQueue: SetState<boolean>;
  setIsCancelingProcessingQueue: SetState<boolean>;
  setIsCombiningMemos: SetState<boolean>;
  setSyncingActionsId: SetState<string | null>;
  setRenamingItem: SetState<MeetingRecord | null>;
  setNotice: (text: string, kind?: "success" | "error" | "info") => void;
  setUrlInput: SetState<string>;
  setTranscriptTitle: SetState<string>;
  setTranscriptText: SetState<string>;
  setSelectedCombineIds: SetState<string[]>;
  setViewingMemo: SetState<{ id: string; title: string } | null>;
  setChattingWith: SetState<{ id: string; title: string } | null>;
  // Read-only state (values, not setters)
  history: MeetingRecord[];
  meetingLanguage: MeetingLanguage;
  meetingTemplate: "meeting" | "minutes" | "action";
  transcriptOnlyMode: boolean;
  keepSourceMedia: boolean;
  urlInput: string;
  transcriptText: string;
  transcriptTitle: string;
  selectedCombineIds: string[];
  renameTitle: string;
  renamingItem: MeetingRecord | null;
  viewingMemo: { id: string; title: string } | null;
  chattingWith: { id: string; title: string } | null;
  activeProjectName: string | undefined;
  language: string;
  whisperModel: string;
  // Utilities
  fetchHistory: () => Promise<void>;
  confirm: (opts: {
    type?: "danger" | "warning" | "info";
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  }) => Promise<boolean>;
}

export function useMeetingHandlers(deps: MeetingHandlersDeps) {
  const {
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
    activeProjectName,
    language,
    whisperModel,
    fetchHistory,
    confirm,
  } = deps;

  // ─── File Upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setIsUploading(true);
    setNotice("");
    let completed = 0;
    const failures: string[] = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const queueIndex = index + 1;
        const queueTotal = files.length;
        setUploadProgress({ fileName: file.name, loaded: 0, total: file.size, percent: 0, queueIndex, queueTotal });
        try {
          await uploadMeeting(file, meetingLanguage, meetingTemplate, {
            transcriptOnly: transcriptOnlyMode,
            keepSourceMedia,
            whisperModel,
            onProgress: (progress) => setUploadProgress({ fileName: file.name, ...progress, queueIndex, queueTotal }),
          });
          completed += 1;
          await fetchHistory();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Lỗi khi tải lên cuộc họp";
          failures.push(`${file.name}: ${message}`);
        }
      }

      if (completed) await fetchHistory();
      if (failures.length) {
        setNotice(`Đã nhận ${completed}/${files.length} file. ${failures.length} file lỗi: ${failures.slice(0, 3).join(" | ")}${failures.length > 3 ? " ..." : ""}`, "error");
        return;
      }
      setNotice(
        files.length > 1
          ? `Đã nhận ${completed} file. App đã tạo job riêng cho từng video và backend sẽ xử lý theo queue; nếu bị ngắt, chọn lại cùng file để resume chunk còn thiếu.`
          : transcriptOnlyMode
            ? `Đã nhận file. App sẽ chỉ tạo transcript, không sinh memo.${keepSourceMedia ? " File gốc sẽ được giữ lại." : " File gốc sẽ tự xóa sau khi transcript xong."}`
            : `Đã nhận file. Meeting Note sẽ xử lý ở background.${keepSourceMedia ? " File gốc sẽ được giữ lại." : " File gốc sẽ tự xóa sau khi memo xong."}`
      );
    } finally {
      setIsUploading(false);
      e.target.value = "";
      window.setTimeout(() => setUploadProgress(null), 1800);
    }
  };

  // ─── Resume Upload ────────────────────────────────────────────────────────────
  const handleResumeUpload = async (
    item: MeetingRecord,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const expectedName = item.filename || item.title;
    if (expectedName && file.name !== expectedName) {
      const ok = await confirm({
        type: "warning",
        message: `File bạn chọn là "${file.name}", khác tên gốc "${expectedName}". Nếu đây đúng là cùng video đã đổi tên, vẫn tiếp tục resume?`,
      });
      if (!ok) {
        e.target.value = "";
        return;
      }
    }

    setResumingUploadId(item.id);
    setIsUploading(true);
    setUploadProgress({ fileName: file.name, loaded: 0, total: file.size, percent: getMeetingProgress(item) });
    setNotice("");
    try {
      await resumeMeetingUpload(item.id, file, {
        onProgress: (progress) => setUploadProgress({ fileName: file.name, ...progress }),
      });
      await fetchHistory();
      setNotice(`Đã resume xong ${file.name}. AI note sẽ tự chạy tiếp trong background.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể resume upload. Hãy chọn lại đúng file gốc.", "error");
    } finally {
      setResumingUploadId(null);
      setIsUploading(false);
      e.target.value = "";
      window.setTimeout(() => setUploadProgress(null), 1800);
    }
  };

  // ─── URL Submit ───────────────────────────────────────────────────────────────
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || deps.history.some(() => false)) { /* guard */ }
    if (!urlInput.trim()) return;

    setIsProcessingUrl(true);
    setNotice("");
    try {
      await processUrl(urlInput, meetingLanguage, meetingTemplate, transcriptOnlyMode, keepSourceMedia, whisperModel);
      setUrlInput("");
      await fetchHistory();
      setNotice(
        transcriptOnlyMode
          ? `Đã nhận URL. App sẽ tải và chỉ tạo transcript.${keepSourceMedia ? " File nguồn sẽ được giữ lại." : " File nguồn sẽ tự xóa sau khi transcript xong."}`
          : `Đã nhận URL. Meeting Note sẽ tải và xử lý ở background.${keepSourceMedia ? " File nguồn sẽ được giữ lại." : " File nguồn sẽ tự xóa sau khi memo xong."}`
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lỗi khi xử lý URL", "error");
    } finally {
      setIsProcessingUrl(false);
    }
  };

  // ─── Transcript Submit ────────────────────────────────────────────────────────
  const handleTranscriptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcriptText.trim()) return;

    setIsProcessingTranscript(true);
    setNotice("");
    try {
      await processTranscript(
        transcriptTitle || "Meeting transcript",
        transcriptText,
        meetingLanguage,
        meetingTemplate
      );
      setTranscriptTitle("");
      setTranscriptText("");
      await fetchHistory();
      setNotice("Đã nhận transcript. AI đang tạo memo trong background.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lỗi khi xử lý transcript", "error");
    } finally {
      setIsProcessingTranscript(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const item = history.find((m) => m.id === id);
    const isActive = item
      ? ["pending", "processing", "recording", "transcribing", "summarizing"].includes(item.status)
      : false;
    const message = isActive
      ? "Meeting này đang xử lý. Bạn muốn huỷ job nền và xoá file khỏi lịch sử?"
      : "Bạn có chắc chắn muốn xóa cuộc họp này?";
    const ok = await confirm({ type: "danger", message });
    if (!ok) return;
    try {
      await deleteMeeting(id);
      setHistory((curr) => curr.filter((m) => m.id !== id));
      setNotice(isActive ? "Đã gửi huỷ job và xoá meeting note khỏi lịch sử." : "Đã xóa meeting note.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lỗi khi xóa cuộc họp", "error");
    }
  };

  // ─── Rename ───────────────────────────────────────────────────────────────────
  const handleRename = (item: MeetingRecord) => {
    setRenamingItem(item);
  };

  const handleRenameSubmit = async () => {
    if (!renamingItem || !renameTitle.trim() || renameTitle.trim() === renamingItem.title) {
      setRenamingItem(null);
      return;
    }
    try {
      const updated = await updateMeetingTitle(renamingItem.id, renameTitle.trim());
      setHistory((curr) =>
        curr.map((m) => (m.id === renamingItem.id ? { ...m, ...updated } : m))
      );
      if (viewingMemo?.id === renamingItem.id)
        setViewingMemo({ id: renamingItem.id, title: updated.title });
      if (chattingWith?.id === renamingItem.id)
        setChattingWith({ id: renamingItem.id, title: updated.title });
      setNotice("Đã đổi tên Meeting Note và lưu vào metadata để lần sau recover vẫn giữ tên.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể đổi tên Meeting Note.", "error");
    } finally {
      setRenamingItem(null);
    }
  };

  // ─── Cancel Processing Queue ──────────────────────────────────────────────────
  const handleCancelProcessingQueue = async () => {
    const processingItems = history.filter((item) =>
      ["pending", "processing", "recording", "transcribing", "summarizing"].includes(item.status)
    );
    if (!processingItems.length) return;
    const ok = await confirm({
      type: "danger",
      message: `Huỷ và xoá ${processingItems.length} meeting note đang xử lý? File nguồn của các job này cũng sẽ bị xoá.`,
    });
    if (!ok) return;
    setIsCancelingProcessingQueue(true);
    setNotice("");
    let okCount = 0;
    for (const item of processingItems) {
      try {
        await deleteMeeting(item.id);
        okCount += 1;
      } catch {
        // Continue with remaining items
      }
    }
    await fetchHistory();
    setNotice(`Đã huỷ/xoá ${okCount}/${processingItems.length} meeting note đang xử lý.`);
    setIsCancelingProcessingQueue(false);
  };

  // ─── Resummarize / Retry ──────────────────────────────────────────────────────
  const handleResummarize = async (id: string) => {
    const item = history.find((m) => m.id === id);
    if (item?.current_step === "uploading") {
      setNotice(
        `Upload của ${item.filename || item.title} chưa hoàn tất. Hãy chọn lại đúng file đó để resume từ chunk cuối; retry không chạy AI khi file chưa upload đủ.`
      );
      return;
    }
    setRetryingId(id);
    setNotice("");
    try {
      await retryMeetingProcessing(id);
      await fetchHistory();
      setNotice(
        item?.transcript_available
          ? "Đã gửi rebuild memo từ transcript đã có, không transcribe lại từ đầu."
          : "Đã gửi retry. Vì transcript chưa có nên job sẽ chạy lại Whisper từ source media."
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể retry meeting note.", "error");
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetranscribe = async (id: string) => {
    const item = history.find((m) => m.id === id);
    if (item?.current_step === "uploading") {
      setNotice(
        `Upload của ${item.filename || item.title} chưa hoàn tất. Hãy chọn lại đúng file đó để resume trước khi transcribe lại.`
      );
      return;
    }
    setRetryingId(id);
    setNotice("");
    try {
      await retranscribeMeetingProcessing(id);
      await fetchHistory();
      setNotice("Đã gửi chạy lại Whisper từ file gốc với auto language. Dùng nút này khi transcript cũ bị ngắn hoặc sai ngôn ngữ.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể transcribe lại meeting note.", "error");
    } finally {
      setRetryingId(null);
    }
  };

  // ─── Retry Failed Queue ───────────────────────────────────────────────────────
  const handleRetryFailedQueue = async () => {
    const failedItems = history.filter((item) => item.status === "failed");
    if (!failedItems.length) return;
    setIsRetryingFailedQueue(true);
    setNotice("");
    let okCount = 0;
    for (const item of failedItems) {
      try {
        await retryMeetingProcessing(item.id);
        okCount += 1;
      } catch {
        // Continue with remaining items
      }
    }
    await fetchHistory();
    setNotice(`Đã gửi retry ${okCount}/${failedItems.length} meeting note bị lỗi.`);
    setIsRetryingFailedQueue(false);
  };

  // ─── Combine Memos ────────────────────────────────────────────────────────────
  const handleCombineSelectedMemos = async () => {
    if (selectedCombineIds.length < 2) {
      setNotice("Hãy chọn ít nhất 2 meeting note đã hoàn thành để gộp thành một bản học/tóm tắt lớn.");
      return;
    }
    setIsCombiningMemos(true);
    setNotice("");
    try {
      await combineMeetingMemos(
        selectedCombineIds,
        `Combined learning memo ${formatAppDate(new Date(), language as any)}`,
        meetingLanguage,
        meetingTemplate
      );
      setSelectedCombineIds([]);
      await fetchHistory();
      setNotice("Đã tạo job gộp các memo đã chọn. Bản tổng hợp sẽ xuất hiện trong History khi xử lý xong.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể gộp meeting memos.", "error");
    } finally {
      setIsCombiningMemos(false);
    }
  };

  // ─── Sync Actions to Todo ─────────────────────────────────────────────────────
  const handleSyncActionsToTodo = async (item: MeetingRecord) => {
    setSyncingActionsId(item.id);
    setNotice("");
    try {
      const memo = await getMeetingMemo(item.id);
      const actions = memo.analysis?.actions ?? [];
      if (!actions.length) {
        setNotice("Meeting này chưa có action item rõ ràng để sync sang BrSE Todo.");
        return;
      }
      const preview = actions
        .slice(0, 5)
        .map(
          (action: { task: string; owner?: string; deadline?: string }, index: number) =>
            `${index + 1}. ${action.task}${action.owner ? ` / ${action.owner}` : ""}${action.deadline ? ` / ${action.deadline}` : ""}`
        )
        .join("\n");
      const ok = await confirm({
        type: "info",
        title: "Sync action items sang BrSE Todo?",
        message: `AI tìm thấy ${actions.length} action item trong "${item.title}".\n\n${preview}${actions.length > 5 ? "\n..." : ""}\n\nCác item này sẽ được tạo/cập nhật trong Todo project: ${activeProjectName || item.title}. Bạn muốn tiếp tục?`,
        confirmText: "Sync to Todo",
        cancelText: "Review later",
      });
      if (!ok) {
        setNotice("Đã giữ action items trong Meeting Note, chưa sync sang BrSE Todo.");
        return;
      }
      const project = ensureBrseTodoProject(activeProjectName || item.title);
      const count = upsertMeetingActionTodos(project.id, item, actions);
      setNotice(`Đã sync ${count} action item từ Meeting Note sang BrSE Todo (${project.name}).`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể sync action items sang BrSE Todo.", "error");
    } finally {
      setSyncingActionsId(null);
    }
  };

  return {
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
  };
}
