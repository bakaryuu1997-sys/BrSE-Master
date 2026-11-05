"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveProject } from "@/lib/projectSettings";
import { useProjectContext } from "@/components/ProjectContextProvider";
import { buildProjectAiPayload } from "@/lib/projectAiContext";
import { getMeetingHistory, getMeetingTranscript, type MeetingRecord } from "@/lib/meetings";
import {
  getMeetingMinutesList,
  getMeetingMinutes,
  createMeetingMinutes,
  updateMeetingMinutes,
  extractMinutesFromTranscript,
} from "@/lib/meetingMinutes";
import { fetchClientStateValue, saveClientStateValue } from "@/lib/clientState";
import { ensureBrseTodoProject, saveBrseTodoStateToDb, upsertMeetingMinutesActionTodo } from "@/lib/brseTodo";
import { saveOperationRecord } from "@/lib/operations";

export type AgendaItem = {
  id: string;
  title: string;
  discussion: string;
  decision: string;
};

export type ActionItem = {
  id: string;
  content: string;
  owner: string;
  deadline: string;
  status: string;
};

export type MinutesForm = {
  projectName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
  customerAttendees: string;
  vnAttendees: string;
  nextMeeting: string;
  nextAgenda: string;
  creator: string;
};

export type MinutesDraft = {
  form: MinutesForm;
  agendaItems: AgendaItem[];
  actionItems: ActionItem[];
  createdDate: string;
};

const MINUTES_DRAFT_KEY = "brse.meetingMinutesDraft.v1";

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export const initialForm: MinutesForm = {
  projectName: "",
  meetingDate: "",
  startTime: "10:00",
  endTime: "10:30",
  location: "Teams",
  customerAttendees: "",
  vnAttendees: "",
  nextMeeting: "未定",
  nextAgenda: "",
  creator: ""
};

export function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
}

export function createAgendaItem(): AgendaItem {
  return { id: createId(), title: "", discussion: "", decision: "" };
}

export function createActionItem(): ActionItem {
  return { id: createId(), content: "", owner: "", deadline: "", status: "未着手" };
}

export const initialAgendaItems: AgendaItem[] = [{ id: "agenda-1", title: "", discussion: "", decision: "" }];
export const initialActionItems: ActionItem[] = [{ id: "action-1", content: "", owner: "", deadline: "", status: "未着手" }];

export type ExtractedMinutesPayload = {
  project_name?: string;
  agenda_items?: Array<Partial<AgendaItem>>;
  action_items?: Array<Partial<ActionItem>>;
};

export function getMinutesDraft(): MinutesDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MINUTES_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as MinutesDraft) : null;
  } catch {
    return null;
  }
}

export async function fetchMinutesDraftFromDb(): Promise<MinutesDraft | null> {
  try {
    const raw = await fetchClientStateValue(MINUTES_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as MinutesDraft) : null;
  } catch {
    return null;
  }
}

/**
 * B-015: a draft only counts as "changed" once it differs from the first snapshot taken when the
 * page became ready. Otherwise merely opening the page would auto-create an empty DB record.
 */
export function hasMinutesDraftChanged(baselineJson: string | null, current: unknown): boolean {
  if (baselineJson === null) return false;
  return JSON.stringify(current) !== baselineJson;
}

export function saveMinutesDraft(draft: MinutesDraft) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MINUTES_DRAFT_KEY, JSON.stringify(draft));
  }
  void saveClientStateValue(MINUTES_DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
}

export function removeMinutesDraft() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(MINUTES_DRAFT_KEY);
  }
  void saveClientStateValue(MINUTES_DRAFT_KEY, "").catch(() => {});
}

export function formatAttendees(raw: string, prefix: string) {
  const attendees = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  if (attendees.length === 0) return `  ・[${prefix}]`;
  return attendees.map((attendee) => `  ・[${prefix}] ${attendee}`).join("\n");
}

export function buildMinutesMarkdown(form: MinutesForm, agendaItems: AgendaItem[], actionItems: ActionItem[], createdDate: string) {
  const agendaMarkdown = agendaItems
    .map((item, index) => {
      return [
        `【議題${index + 1}】${item.title || "未入力"}`,
        `  ・説明：${item.discussion || "未入力"}`,
        `  ・決定事項：${item.decision || "未定"}`
      ].join("\n");
    })
    .join("\n\n");

  const actionRows = actionItems.length === 0
      ? "| 1 |  |  |  | 未着手 |"
      : actionItems
          .map((item, index) => {
            return `| ${index + 1} | ${item.content || ""} | ${item.owner || ""} | ${item.deadline || ""} | ${item.status || "未着手"} |`;
          })
          .join("\n");

  return `━━━━━━━━━━━━━━━━━━━━━━━
           議事録
━━━━━━━━━━━━━━━━━━━━━━━
■ プロジェクト名：${form.projectName || "未入力"}
■ 日時：${form.meetingDate || "未入力"} ${form.startTime || ""} ～ ${form.endTime || ""}
■ 場所/URL：${form.location || "未入力"}
■ 出席者：
${formatAttendees(form.customerAttendees, "KH")}
${formatAttendees(form.vnAttendees, "VN")}

━━━━━━━━━━━━━━━━━━━━━━
1. 議題
━━━━━━━━━━━━━━━━━━━━━━
${agendaMarkdown || "【議題1】未入力\n  ・説明：未入力\n  ・決定事項：未定"}

━━━━━━━━━━━━━━━━━━━━━━
2. 宿題・次回アクション (To-Do)
━━━━━━━━━━━━━━━━━━━━━━
| No | 内容 | 担当 | 期日 | 状態 |
|----|------|------|------|------|
${actionRows}

━━━━━━━━━━━━━━━━━━━━━━
3. 次回打ち合わせ
━━━━━━━━━━━━━━━━━━━━━━
■ 予定日時：${form.nextMeeting || "未定"}
■ 議題（予定）：${form.nextAgenda || "未定"}

以上
作成者：${form.creator || "未入力"} / ${createdDate || form.meetingDate || "未入力"}
`;
}

export function toBulletLines(values: string[]) {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  return cleaned.length ? cleaned.map((value) => `- ${value}`).join("\n") : "- No input yet";
}

export function useMeetingMinutesState() {
  const router = useRouter();
  const [form, setForm] = useState<MinutesForm>(initialForm);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(initialAgendaItems);
  const [actionItems, setActionItems] = useState<ActionItem[]>(initialActionItems);
  const [createdDate, setCreatedDate] = useState("");
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);
  const [meetingPickList, setMeetingPickList] = useState<MeetingRecord[]>([]);
  const [loadingMeetingPickList, setLoadingMeetingPickList] = useState(false);
  const [savedMinutesList, setSavedMinutesList] = useState<Array<{ id: string; title: string; meeting_date: string }>>([]);
  const [activeMinutesId, setActiveMinutesId] = useState("");
  const [loadedMinutesBody, setLoadedMinutesBody] = useState<string | null>(null);
  const { activeProject } = useProjectContext();
  const [activeFormTab, setActiveFormTab] = useState<"info" | "agenda" | "action">("info");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  async function loadMinutesRecord(minutesId: string) {
    const record = await getMeetingMinutes(minutesId);
    setActiveMinutesId(record.id);
    setLoadedMinutesBody(record.body_markdown || "");
    setCreatedDate(record.created_at?.slice(0, 10) || getTodayDate());
    setForm((current) => ({
      ...current,
      projectName: record.title || current.projectName,
      meetingDate: record.meeting_date || current.meetingDate || getTodayDate(),
      location: record.location || current.location,
    }));
    if (Array.isArray(record.agenda_items) && record.agenda_items.length) {
      setAgendaItems(record.agenda_items.map((item: any) => ({
        id: item.id || createId(),
        title: item.title || "",
        discussion: item.discussion || "",
        decision: item.decision || "",
      })));
    }
    if (Array.isArray(record.action_items) && record.action_items.length) {
      setActionItems(record.action_items.map((item: any) => ({
        id: item.id || createId(),
        content: item.content || "",
        owner: item.owner || "",
        deadline: item.deadline || "",
        status: item.status || "未着手",
      })));
    }
    setDraftStatus(`Đã mở biên bản: ${record.title}`);
  }

  useEffect(() => {
    const pid = activeProject?.id || "default";
    getMeetingMinutesList(pid).then(rows => setSavedMinutesList(Array.isArray(rows) ? rows : [])).catch(() => {});
  }, [activeProject?.id]);

  // Prefill empty form fields when the user switches project (not on first mount).
  const lastProjectId = useRef(activeProject?.id);
  useEffect(() => {
    if (lastProjectId.current === activeProject?.id) return;
    lastProjectId.current = activeProject?.id;
    setForm((current) => {
      if (current.projectName || current.creator) return current;
      return {
        ...current,
        projectName: activeProject?.name || "",
        creator: activeProject?.brse_name || "",
      };
    });
  }, [activeProject]);

  const loadMeetingPickList = useCallback(() => {
    setLoadingMeetingPickList(true);
    getMeetingHistory()
      .then((rows) => setMeetingPickList(rows.filter((row) => row.status === "completed" && row.transcript_available !== false)))
      .catch(() => {})
      .finally(() => setLoadingMeetingPickList(false));
  }, []);

  useEffect(() => {
    loadMeetingPickList();
  }, [loadMeetingPickList]);

  useEffect(() => {
    if (isAiModalOpen) {
      loadMeetingPickList();
    }
  }, [isAiModalOpen, loadMeetingPickList]);

  useEffect(() => {
    let isMounted = true;
    async function restoreDraft() {
      const currentDate = getTodayDate();
      const project = getActiveProject();
      const params = new URLSearchParams(window.location.search);
      const minutesId = params.get("minutesId");
      if (minutesId) {
        setCreatedDate(currentDate);
        await loadMinutesRecord(minutesId);
        if (isMounted) setIsDraftReady(true);
        return;
      }
      const draft = getMinutesDraft() ?? await fetchMinutesDraftFromDb();
      if (!isMounted) return;
      if (draft) {
        setCreatedDate(draft.createdDate || currentDate);
        setForm({ ...initialForm, ...draft.form, meetingDate: draft.form.meetingDate || currentDate });
        setAgendaItems(draft.agendaItems?.length ? draft.agendaItems : initialAgendaItems);
        setActionItems(draft.actionItems?.length ? draft.actionItems : initialActionItems);
        setDraftStatus("Đã khôi phục bản nháp.");
      } else {
        setCreatedDate(currentDate);
        setForm((current) => ({
          ...current,
          meetingDate: currentDate,
          projectName: project?.name || "",
          creator: project?.brse_name || ""
        }));
      }
      setIsDraftReady(true);
    }
    restoreDraft();
    return () => { isMounted = false; };
  }, []);

  const preview = useMemo(() => buildMinutesMarkdown(form, agendaItems, actionItems, createdDate), [form, agendaItems, actionItems, createdDate]);
  const projectAiPayload = useMemo(() => buildProjectAiPayload(activeProject), [activeProject]);
  const displayedMinutes = loadedMinutesBody ?? preview;

  const saveMinutesToDb = useCallback(async (bodyOverride?: string, isAutoSave: boolean = false) => {
    setIsSavingMinutes(true);
    const body = bodyOverride ?? displayedMinutes;
    try {
      const payload = {
        project_id: activeProject?.id || "default",
        title: `${form.projectName || "Meeting"} - ${form.meetingDate}`,
        meeting_date: form.meetingDate,
        body_markdown: body,
        agenda_items: agendaItems,
        action_items: actionItems,
        location: form.location,
        status: "completed"
      };
      const saved = activeMinutesId
        ? await updateMeetingMinutes(activeMinutesId, payload)
        : await createMeetingMinutes(payload);
      setActiveMinutesId(saved.id);
      setLoadedMinutesBody(saved.body_markdown || body);
      setHasUnsavedChanges(false);

      const timeStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (isAutoSave) {
        setDraftStatus(`💾 Đã tự động lưu nháp lúc ${timeStr}`);
      } else {
        setDraftStatus(activeMinutesId ? `✅ Đã cập nhật biên bản lúc ${timeStr}` : `✅ Đã lưu vào Database lúc ${timeStr}`);
      }
    } catch (error) {
      setDraftStatus("❌ Lỗi lưu DB.");
    } finally {
      setIsSavingMinutes(false);
    }
  }, [activeMinutesId, activeProject, agendaItems, actionItems, displayedMinutes, form.projectName, form.meetingDate, form.location]);

  const draftBaselineRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isDraftReady) return;
    const draft = { form, agendaItems, actionItems, createdDate };
    saveMinutesDraft(draft);
    if (draftBaselineRef.current === null) {
      draftBaselineRef.current = JSON.stringify(draft);
      return;
    }
    if (hasMinutesDraftChanged(draftBaselineRef.current, draft)) setHasUnsavedChanges(true);
  }, [form, agendaItems, actionItems, createdDate, isDraftReady]);

  useEffect(() => {
    if (!hasUnsavedChanges || isSavingMinutes || !isDraftReady) return;
    const timer = setTimeout(() => {
      void saveMinutesToDb(undefined, true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, isSavingMinutes, isDraftReady, saveMinutesToDb]);

  function updateForm<K extends keyof MinutesForm>(key: K, value: MinutesForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateAgenda(id: string, key: keyof AgendaItem, value: string) {
    setAgendaItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  function updateAction(id: string, key: keyof ActionItem, value: string) {
    setActionItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  async function loadTranscriptFromMeeting(meeting: MeetingRecord) {
    setIsGeneratingAi(true);
    setDraftStatus(`Đang tải transcript: ${meeting.title}`);
    try {
      const data = await getMeetingTranscript(meeting.id);
      setTranscript(data.transcript || "");
      setDraftStatus(`Đã tải transcript: ${meeting.title}`);
    } catch {
      setDraftStatus("❌ Lỗi tải transcript.");
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function autoGenerateFromMeeting(meeting: MeetingRecord) {
    setIsGeneratingAi(true);
    setDraftStatus(`Đang nạp transcript từ "${meeting.title}"...`);
    try {
      const data = await getMeetingTranscript(meeting.id);
      const text = data.transcript || "";
      setTranscript(text);
      if (!text.trim()) {
        setDraftStatus(`⚠️ Cuộc họp "${meeting.title}" chưa có transcript.`);
        return;
      }
      setDraftStatus(`AI đang trích xuất biên bản từ "${meeting.title}"...`);
      const extracted = await extractMinutesFromTranscript(text, {
        projectId: projectAiPayload.project_id,
        customerStyle: projectAiPayload.customer_style,
        reportRule: projectAiPayload.report_rule,
        timezoneRule: projectAiPayload.timezone_rule,
        communicationNotes: projectAiPayload.communication_notes,
      });
      applyExtractedMinutes(extracted);
      const meetingDate = meeting.created_at ? meeting.created_at.slice(0, 10) : "";
      if (meetingDate) {
        setForm((current) => ({
          ...current,
          meetingDate: meetingDate || current.meetingDate,
        }));
      }
      setDraftStatus(`✅ Đã tự động tạo biên bản từ "${meeting.title}".`);
    } catch {
      setDraftStatus("❌ Lỗi tự động tạo biên bản từ cuộc họp.");
    } finally {
      setIsGeneratingAi(false);
    }
  }

  function applyExtractedMinutes(data: ExtractedMinutesPayload) {
    const nextAgendaItems = Array.isArray(data.agenda_items) && data.agenda_items.length
      ? data.agenda_items.map((item) => ({
          id: item.id || createId(),
          title: item.title || "",
          discussion: item.discussion || "",
          decision: item.decision || "継続検討",
        }))
      : agendaItems;
    const nextActionItems = Array.isArray(data.action_items) && data.action_items.length
      ? data.action_items.map((item) => ({
          id: item.id || createId(),
          content: item.content || "",
          owner: item.owner || "",
          deadline: item.deadline || "",
          status: item.status || "未着手",
        }))
      : actionItems;

    setAgendaItems(nextAgendaItems);
    setActionItems(nextActionItems);
    setLoadedMinutesBody(null);
    setForm((current) => ({
      ...current,
      projectName: data.project_name || current.projectName || activeProject?.name || "",
      creator: current.creator || activeProject?.brse_name || "",
    }));
  }

  async function generateMinutesFromTranscript() {
    if (!transcript.trim()) {
      setDraftStatus("Transcript đang trống.");
      return;
    }
    setIsGeneratingAi(true);
    setDraftStatus("Đang trích xuất biên bản bằng AI...");
    try {
      const data = await extractMinutesFromTranscript(transcript, {
        projectId: projectAiPayload.project_id,
        customerStyle: projectAiPayload.customer_style,
        reportRule: projectAiPayload.report_rule,
        timezoneRule: projectAiPayload.timezone_rule,
        communicationNotes: projectAiPayload.communication_notes,
      });
      applyExtractedMinutes(data);
      setIsAiModalOpen(false);
      setDraftStatus("✅ Đã trích xuất biên bản từ transcript.");
    } catch {
      setDraftStatus("❌ Lỗi trích xuất biên bản.");
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function convertActionToTodo(item: ActionItem, index: number) {
    if (!item.content.trim()) {
      setDraftStatus("Action item đang trống.");
      return;
    }
    const project = ensureBrseTodoProject(activeProject?.name || form.projectName || "Meeting Minutes");
    const minutesId = activeMinutesId || `draft-${form.meetingDate || createdDate || getTodayDate()}`;
    const minutesTitle = `${form.projectName || "Meeting"} - ${form.meetingDate || createdDate || getTodayDate()}`;
    const result = upsertMeetingMinutesActionTodo(
      project.id,
      {
        id: minutesId,
        title: minutesTitle,
        projectId: activeProject?.id || project.id,
        createdAt: createdDate || new Date().toISOString(),
      },
      {
        task: item.content,
        owner: item.owner,
        deadline: item.deadline,
        status: item.status,
      },
      index,
    );
    try {
      await saveBrseTodoStateToDb(project, result.state);
      setDraftStatus(result.created ? "✅ Đã tạo Todo từ Meeting Minutes." : "✅ Đã cập nhật Todo từ Meeting Minutes.");
    } catch {
      setDraftStatus("✅ Đã lưu Todo vào local cache; backend Todo sync chưa sẵn sàng.");
    }
  }

  async function convertActionToQna(item: ActionItem) {
    if (!item.content.trim()) {
      setDraftStatus("Action item đang trống.");
      return;
    }
    try {
      const saved = await saveOperationRecord({
        type: "qna",
        title: item.content,
        status: "Waiting Customer",
        priority: "P1",
        owner: item.owner || "BrSE",
        dueDate: item.deadline || "",
        customerOwner: "Customer",
        projectName: activeProject?.name || form.projectName || "General",
        fieldA: `[Trích xuất từ Cuộc họp ${form.projectName || "Meeting"} (${form.meetingDate || createdDate || getTodayDate()})]\n${item.content}`,
        fieldB: "",
        fieldC: "",
        fieldD: activeMinutesId ? `/app/minutes/new?minutesId=${encodeURIComponent(activeMinutesId)}` : "",
        fieldE: "Tự động tạo từ 1-Click Meeting Action Triaging",
      });
      if (saved) {
        setDraftStatus("✅ Đã tạo câu hỏi Q&A khách hàng thành công từ Action item!");
      }
    } catch (err) {
      setDraftStatus("❌ Lỗi khi tạo Q&A: " + (err instanceof Error ? err.message : ""));
    }
  }

  function copyActionEmailDraft(item: ActionItem) {
    if (!item.content.trim()) {
      setDraftStatus("Action item đang trống.");
      return;
    }
    const meetingTitle = form.projectName || "打合せ";
    const subject = `【ご確認】${meetingTitle} 議事録のアクションアイテムにつきまして`;
    const body = `いつも大変お世話になっております。BrSEチームでございます。\n\n先ほどの打合せ（${meetingTitle}）における下記のアクションアイテムにつきまして、ご確認いただけますと幸いです。\n\n■ 確認事項・タスク:\n${item.content}\n・担当: ${item.owner || "担当者未定"}\n・期日: ${item.deadline || "未定"}\n\nご確認のほど、何卒よろしくお願い申し上げます。`;
    navigator.clipboard.writeText(`${subject}\n\n${body}`);
    setDraftStatus("📋 Đã copy bản nháp Email Keigo cho Action item này vào Clipboard!");
  }

  return {
    form,
    agendaItems,
    setAgendaItems,
    actionItems,
    setActionItems,
    createdDate,
    isDraftReady,
    draftStatus,
    setDraftStatus,
    isAiModalOpen,
    setIsAiModalOpen,
    transcript,
    setTranscript,
    isGeneratingAi,
    isSavingMinutes,
    meetingPickList,
    loadingMeetingPickList,
    savedMinutesList,
    activeMinutesId,
    loadedMinutesBody,
    setLoadedMinutesBody,
    activeProject,
    activeFormTab,
    setActiveFormTab,
    hasUnsavedChanges,
    preview,
    projectAiPayload,
    displayedMinutes,

    loadMinutesRecord,
    updateForm,
    updateAgenda,
    updateAction,
    saveMinutesToDb,
    loadTranscriptFromMeeting,
    autoGenerateFromMeeting,
    applyExtractedMinutes,
    generateMinutesFromTranscript,
    convertActionToTodo,
    convertActionToQna,
    copyActionEmailDraft,
  };
}
