"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import {
  getBrseTodoCommandSummary,
  readBrseTodoState,
  saveBrseTodoStateToDb,
  writeBrseTodoState,
  type BrseTodoItem,
} from "@/lib/brseTodo";
import { useApproveMeetingTodoDraftMutation, useRejectMeetingTodoDraftMutation } from "@/lib/command-center-hooks";
import type { MeetingTodoDraft } from "@/lib/commandCenter";
import { buildBatchQnaEmail, saveOperationRecord, type OperationRecord, type OperationRecordInput } from "@/lib/operations";
import { fetchPersonalSchedules, savePersonalScheduleToDb, type PersonalSchedule } from "@/lib/personalCalendar";
import type { ProjectSetting } from "@/lib/projectSettings";
import type { TranslationKey, UiLanguage } from "@/lib/uiLanguage";
import type { DashboardPriorityItem } from "./CommandIntelligenceBoard";

type TodoCommandSummary = ReturnType<typeof getBrseTodoCommandSummary>;
type DashboardNoticeTone = "success" | "warning" | "error";
type NotifyDashboard = (message: string, tone?: DashboardNoticeTone) => void;

function toOperationRecordInput(record: OperationRecord): OperationRecordInput {
  return {
    type: record.type,
    title: record.title,
    status: record.status,
    priority: record.priority,
    owner: record.owner,
    dueDate: record.dueDate,
    customerOwner: record.customerOwner,
    projectName: record.projectName,
    fieldA: record.fieldA,
    fieldB: record.fieldB,
    fieldC: record.fieldC,
    fieldD: record.fieldD,
    fieldE: record.fieldE,
  };
}

interface UseDashboardActionsInput {
  activeProject: ProjectSetting | null;
  language: UiLanguage;
  notify: NotifyDashboard;
  pendingCr: OperationRecord[];
  qnaReminderCandidates: OperationRecord[];
  setCalendarSchedules: Dispatch<SetStateAction<PersonalSchedule[]>>;
  setOperations: Dispatch<SetStateAction<OperationRecord[]>>;
  setTodoCommand: Dispatch<SetStateAction<TodoCommandSummary>>;
  t: (key: TranslationKey) => string;
  todayBoard: DashboardPriorityItem[];
  todoCommand: TodoCommandSummary;
  waitingQna: OperationRecord[];
}

export function useDashboardActions({
  activeProject,
  language,
  notify,
  pendingCr,
  qnaReminderCandidates,
  setCalendarSchedules,
  setOperations,
  setTodoCommand,
  t,
  todayBoard,
  todoCommand,
  waitingQna,
}: UseDashboardActionsInput) {
  const [updatingOperationId, setUpdatingOperationId] = useState("");
  const [updatingTodoId, setUpdatingTodoId] = useState("");
  const [updatingMeetingDraftId, setUpdatingMeetingDraftId] = useState("");
  const approveMeetingTodoDraftMutation = useApproveMeetingTodoDraftMutation();
  const rejectMeetingTodoDraftMutation = useRejectMeetingTodoDraftMutation();

  const copyDashboardDailySummary = useCallback(async () => {
    const lines = [
      t("dashboard.copyDailySummaryHeader"),
      `${t("dashboard.projectStatus")}: ${activeProject?.name || "-"}`,
      `${t("dashboard.copyDailySummaryPendingQna")}: ${waitingQna.length}`,
      `${t("dashboard.copyDailySummaryPendingCr")}: ${pendingCr.length}`,
      `${t("dashboard.copyDailySummaryRiskItems")}: ${todoCommand.deadlineRisk.length}`,
      "",
      `${t("dashboard.priorityStack")}:`,
      ...todayBoard.map((item, index) => `${index + 1}. [${item.kind}] ${item.title}`),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    notify(t("commandpalette.dailyFocusCopied"));
  }, [activeProject?.name, notify, pendingCr.length, t, todayBoard, todoCommand.deadlineRisk.length, waitingQna.length]);

  const copyProactiveHorenso = useCallback(async () => {
    const projName = activeProject?.name || todoCommand.activeProject?.name || "対象プロジェクト";

    if (qnaReminderCandidates.length > 0) {
      const subject = `【ご確認】未回答Q&Aのリマインド (${qnaReminderCandidates.length}件)`;
      const body = buildBatchQnaEmail(qnaReminderCandidates, projName);
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      notify(t("commandpalette.qnaReminderCopied"), "success");
      return;
    }

    if (todoCommand.deadlineRisk.length > 0) {
      const subject = `【進捗・課題共有】${projName}の重要課題および進捗アラート`;
      const body = [
        "お世話になっております。",
        "BrSE担当チームでございます。",
        "",
        `現在進行中の${projName}におきまして、期日管理上の重要課題が発生しております。`,
        "プロジェクトの納期遵守のため、以下の状況と対応方針をご報告・ご相談申し上げます。",
        "",
        "■ 要注意・対応中タスク一覧:",
        ...todoCommand.deadlineRisk.slice(0, 5).map((task) => `- 【${task.priority}】${task.title} (期限: ${task.deadline || "未定"} / Phase: ${task.phase})`),
        "",
        "■ 当方の対応方針:",
        "- 開発リソースの重点配分および仕様確認の早期完了を進めております。",
        "- ご不明点やスコープ調整のご相談がございましたら、迅速に対応いたします。",
        "",
        "ご確認のほど、何卒よろしくお願い申し上げます。",
      ].join("\n");

      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      notify("Đã copy email Horenso cảnh báo rủi ro (Keigo chuẩn Nhật) vào Clipboard!", "success");
      return;
    }

    // Default Good-Standing Horenso
    const subject = `【進捗共有】${projName}の進捗状況のご報告（順調）`;
    const body = [
      "お世話になっております。",
      "BrSE担当チームでございます。",
      "",
      `本日時点の${projName}の進捗状況をご報告いたします。`,
      "現在、ブロッカーおよび遅延はなく、全タスク順調に推移しております。",
      "",
      `・総合進捗: ${todoCommand.total ? Math.round((todoCommand.done / todoCommand.total) * 100) : 100}%`,
      `・完了タスク数: ${todoCommand.done}/${todoCommand.total}`,
      "",
      "引き続きよろしくお願い申し上げます。",
    ].join("\n");

    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    notify("Đã copy báo cáo tiến độ Hou-Ren-So chuẩn Nhật vào Clipboard!", "success");
  }, [activeProject?.name, notify, qnaReminderCandidates, t, todoCommand]);

  const markQnaReplied = useCallback(async (record: OperationRecord) => {
    setUpdatingOperationId(record.id);
    try {
      const saved = await saveOperationRecord({ ...toOperationRecordInput(record), status: "Answered" }, record.id);
      if (saved) setOperations((current) => current.map((item) => (item.id === record.id ? saved : item)));
      notify(
        language === "vi"
          ? t("dashboard.markQnaRepliedSuccessVi").replace("{title}", record.title)
          : language === "ja"
            ? t("dashboard.markQnaRepliedSuccessJa").replace("{title}", record.title)
            : t("dashboard.markQnaRepliedSuccessEn").replace("{title}", record.title)
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : t("dashboard.qnaUpdateError"), "error");
    } finally {
      setUpdatingOperationId("");
    }
  }, [language, notify, setOperations, t]);

  const copyCrFollowUp = useCallback(async (record: OperationRecord) => {
    const subject = `【CR確認】${record.title}`;
    const body = [
      "お世話になっております。",
      "",
      `${activeProject?.name || record.projectName || "対象プロジェクト"}のCRについて、状況確認をお願いいたします。`,
      "",
      "【CR情報】",
      `- 件名: ${record.title}`,
      `- 状態: ${record.status || "-"}`,
      `- 優先度: ${record.priority || "-"}`,
      record.dueDate ? `- 希望期限: ${record.dueDate}` : "",
      record.fieldA ? `- 内容: ${record.fieldA}` : "",
      "",
      "ご確認のほどよろしくお願いいたします。",
    ].filter(Boolean).join("\n");

    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    notify(
      language === "vi"
        ? t("dashboard.crFollowUpCopiedVi").replace("{title}", record.title)
        : language === "ja"
          ? t("dashboard.crFollowUpCopiedJa").replace("{title}", record.title)
          : t("dashboard.crFollowUpCopiedEn").replace("{title}", record.title)
    );
  }, [activeProject?.name, language, notify, t]);

  const markTodoDone = useCallback(async (item: BrseTodoItem) => {
    const project = todoCommand.activeProject;
    if (!project) return notify(t("dashboard.todoNoActiveProject"), "error");
    const state = readBrseTodoState(project.id);
    if (!state) return notify(t("dashboard.todoReadError"), "error");
    setUpdatingTodoId(item.id);
    const nextState = {
      ...state,
      items: state.items.map((todo) => (todo.id === item.id ? { ...todo, done: true, updatedAt: new Date().toISOString() } : todo)),
    };
    try {
      writeBrseTodoState(project.id, nextState);
      setTodoCommand(getBrseTodoCommandSummary());
      await saveBrseTodoStateToDb(project, nextState);
      notify(
        language === "vi"
          ? t("dashboard.todoCompleteSuccessVi").replace("{title}", item.title)
          : language === "ja"
            ? t("dashboard.todoCompleteSuccessJa").replace("{title}", item.title)
            : t("dashboard.todoCompleteSuccessEn").replace("{title}", item.title)
      );
    } catch {
      notify(t("dashboard.todoLocalSaved"), "warning");
    } finally {
      setUpdatingTodoId("");
    }
  }, [language, notify, setTodoCommand, t, todoCommand.activeProject]);

  const snoozeTodo = useCallback(async (item: BrseTodoItem) => {
    const project = todoCommand.activeProject;
    if (!project) return notify(t("dashboard.todoNoActiveProject"), "error");
    const state = readBrseTodoState(project.id);
    if (!state) return notify(t("dashboard.todoReadError"), "error");
    setUpdatingTodoId(item.id);
    const baseDate = item.deadline ? new Date(item.deadline) : new Date();
    baseDate.setDate(baseDate.getDate() + 1);
    const newDeadline = baseDate.toISOString().slice(0, 10);
    const nextState = {
      ...state,
      items: state.items.map((todo) => (todo.id === item.id ? { ...todo, deadline: newDeadline, updatedAt: new Date().toISOString() } : todo)),
    };
    try {
      writeBrseTodoState(project.id, nextState);
      setTodoCommand(getBrseTodoCommandSummary());
      await saveBrseTodoStateToDb(project, nextState);
      notify(t("dashboard.todoExtendSuccess").replace("{title}", item.title).replace("{deadline}", newDeadline));
    } catch {
      notify(t("dashboard.todoExtendLocal"), "warning");
    } finally {
      setUpdatingTodoId("");
    }
  }, [notify, setTodoCommand, t, todoCommand.activeProject]);

  const approveMeetingDraft = useCallback(async (draftId: string) => {
    setUpdatingMeetingDraftId(draftId);
    try {
      await approveMeetingTodoDraftMutation.mutateAsync(draftId);
      setTodoCommand(getBrseTodoCommandSummary());
      notify(t("dashboard.meetingApproveSuccess"));
    } catch {
      notify(t("dashboard.meetingApproveError"), "error");
    } finally {
      setUpdatingMeetingDraftId("");
    }
  }, [approveMeetingTodoDraftMutation, notify, setTodoCommand, t]);

  const rejectMeetingDraft = useCallback(async (draftId: string) => {
    setUpdatingMeetingDraftId(draftId);
    try {
      await rejectMeetingTodoDraftMutation.mutateAsync(draftId);
      setTodoCommand(getBrseTodoCommandSummary());
      notify(t("dashboard.meetingRejectSuccess"));
    } catch {
      notify(t("dashboard.meetingRejectError"), "error");
    } finally {
      setUpdatingMeetingDraftId("");
    }
  }, [notify, rejectMeetingTodoDraftMutation, setTodoCommand, t]);

  const convertDraftToQna = useCallback(async (draft: MeetingTodoDraft) => {
    setUpdatingMeetingDraftId(draft.id);
    try {
      const saved = await saveOperationRecord({
        type: "qna",
        title: draft.task,
        status: "Waiting Customer",
        priority: draft.priority || "P1",
        owner: draft.owner || "BrSE",
        dueDate: draft.deadline || "",
        customerOwner: "Customer",
        projectName: activeProject?.name || "General",
        fieldA: `[Trích xuất từ Cuộc họp ${draft.meeting_title || "Meeting"}]\n${draft.task}`,
        fieldB: "",
        fieldC: "",
        fieldD: `/app/meeting-note`,
        fieldE: "Tự động tạo từ 1-Click Meeting Action Triaging",
      });
      if (saved) {
        setOperations((current) => [saved, ...current]);
        await rejectMeetingTodoDraftMutation.mutateAsync(draft.id);
        setTodoCommand(getBrseTodoCommandSummary());
        notify("✅ Đã chuyển Action item thành câu hỏi Q&A khách hàng!");
      }
    } catch (err) {
      notify("❌ Lỗi khi chuyển thành Q&A: " + (err instanceof Error ? err.message : ""), "error");
    } finally {
      setUpdatingMeetingDraftId("");
    }
  }, [activeProject, notify, rejectMeetingTodoDraftMutation, setOperations, setTodoCommand]);

  const saveQuickSchedule = useCallback(async (date: string, title: string) => {
    try {
      await savePersonalScheduleToDb({
        date,
        title,
        note: t("dashboard.calendarQuickScheduleDesc"),
        startTime: "09:00",
        endTime: "10:00",
      });
      const items = await fetchPersonalSchedules();
      setCalendarSchedules(items);
      notify(t("dashboard.calendarQuickSaveSuccess").replace("{title}", title).replace("{date}", date));
    } catch {
      notify(t("dashboard.calendarQuickSaveError"), "error");
    }
  }, [notify, setCalendarSchedules, t]);

  return {
    approveMeetingDraft,
    convertDraftToQna,
    copyCrFollowUp,
    copyDashboardDailySummary,
    copyProactiveHorenso,
    markQnaReplied,
    markTodoDone,
    rejectMeetingDraft,
    saveQuickSchedule,
    snoozeTodo,
    updatingMeetingDraftId,
    updatingOperationId,
    updatingTodoId,
  };
}
