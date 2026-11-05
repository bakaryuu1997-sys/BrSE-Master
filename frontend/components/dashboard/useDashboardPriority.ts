"use client";

import { useCallback, useMemo } from "react";
import { buildProjectExecutionWarnings } from "@/lib/projectExecutionWarnings";
import type { BrseTodoItem } from "@/lib/brseTodo";
import type { CommandCenterData, MeetingTodoDraft } from "@/lib/commandCenter";
import type { OperationRecord } from "@/lib/operations";
import type { ProjectSetting } from "@/lib/projectSettings";
import type { TranslationKey } from "@/lib/uiLanguage";
import type { DashboardPriorityItem } from "./CommandIntelligenceBoard";

function truncateText(value: string, max: number) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

interface UseDashboardPriorityInput {
  activeProject: ProjectSetting | null;
  commandCenter: CommandCenterData | null;
  overdueOperations: OperationRecord[];
  pendingCr: OperationRecord[];
  t: (key: TranslationKey) => string;
  todoCommand: {
    activeProject?: { id: string } | null;
    deadlineRisk: BrseTodoItem[];
    nextFocus: BrseTodoItem[];
  };
  waitingQna: OperationRecord[];
}

export interface BuildDashboardPriorityBoardInput {
  activeProject: ProjectSetting | null;
  deadlineRisk: BrseTodoItem[];
  nextFocus: BrseTodoItem[];
  overdueOperations: OperationRecord[];
  pendingCr: OperationRecord[];
  t: (key: TranslationKey) => string;
  todoActionHref: (item: { id: string; phase: string }) => string;
  unsyncedMeetingActions: MeetingTodoDraft[];
  waitingQna: OperationRecord[];
}

/**
 * Pure ranking of the dashboard "today board": gathers project warnings, deadline
 * risks, unsynced meeting actions, overdue/waiting operations and next-focus todos,
 * sorts them by severity (lower = more urgent) and keeps the top 6. Extracted from
 * the hook so the ranking can be unit-tested without React.
 */
export function buildDashboardPriorityBoard({
  activeProject,
  deadlineRisk,
  nextFocus,
  overdueOperations,
  pendingCr,
  t,
  todoActionHref,
  unsyncedMeetingActions,
  waitingQna,
}: BuildDashboardPriorityBoardInput): DashboardPriorityItem[] {
  const projectWarnings = buildProjectExecutionWarnings(activeProject);
  const items: DashboardPriorityItem[] = [
    ...projectWarnings.map((warning, index) => ({
      id: warning.id,
      title: warning.title,
      helper: warning.message,
      href: warning.id === "project-health-red" ? "/app/settings/projects" : "/app/operations",
      kind: warning.id === "project-health-red" ? "project" as const : "release" as const,
      severity: warning.id === "project-health-red" ? -8 : 1 + index / 10,
      originalItem: undefined,
      projectName: activeProject?.name || "Dự án",
    })),
    ...deadlineRisk.slice(0, 3).map((item) => ({
      id: `deadline-${item.id}`,
      title: item.title,
      helper: item.deadline ? t("dashboard.priorityDeadlineHelper").replace("{date}", item.deadline) : t("dashboard.risk"),
      href: todoActionHref(item),
      kind: "deadline" as const,
      severity: -10,
      originalItem: item,
      projectName: item.projectName || activeProject?.name || "Dự án",
    })),
    ...unsyncedMeetingActions.slice(0, 2).map((draft) => ({
      id: `meeting-${draft.id}`,
      // Whole transcript snippets used to land here (240+ chars -> a 550px tall heading).
      title: t("dashboard.priorityMeetingActionTitle").replace("{task}", truncateText(draft.task, 90)),
      helper: `${draft.meeting_title} · ${draft.owner || t("dashboard.noOwner")}`,
      href: "/app/meeting-note",
      kind: "meeting" as const,
      severity: -6,
      originalItem: draft,
      projectName: draft.project_name || activeProject?.name || "Dự án",
    })),
    ...overdueOperations.slice(0, 3).map((record, index) => ({
      id: `overdue-op-${record.id}`,
      title: t("dashboard.priorityOverdueOperationTitle").replace("{type}", record.type.toUpperCase()).replace("{title}", record.title),
      helper: t("dashboard.priorityOverdueHelper").replace("{date}", record.dueDate || "-"),
      href: `/app/operations?type=${record.type}&id=${encodeURIComponent(record.id)}`,
      kind: record.type === "qna" ? "qna" as const : "cr" as const,
      severity: -4 + index / 10,
      originalItem: record,
      projectName: record.projectName || activeProject?.name || "Dự án",
    })),
    ...waitingQna.slice(0, 3).map((record, index) => ({
      id: `qna-${record.id}`,
      title: record.title,
      helper: record.owner || t("dashboard.noOwner"),
      href: `/app/operations?type=qna&id=${encodeURIComponent(record.id)}`,
      kind: "qna" as const,
      severity: 2 + index,
      originalItem: record,
      projectName: record.projectName || activeProject?.name || "Dự án",
    })),
    ...pendingCr.slice(0, 2).map((record, index) => ({
      id: `cr-${record.id}`,
      title: record.title,
      helper: `${record.status}`,
      href: `/app/operations?type=cr&id=${encodeURIComponent(record.id)}`,
      kind: "cr" as const,
      severity: 5 + index,
      originalItem: record,
      projectName: record.projectName || activeProject?.name || "Dự án",
    })),
    ...nextFocus.slice(0, 3).map((item, index) => ({
      id: `todo-${item.id}`,
      title: item.title,
      helper: `${item.phase}`,
      href: todoActionHref(item),
      kind: "todo" as const,
      severity: 7 + index,
      originalItem: item,
      projectName: item.projectName || activeProject?.name || "Dự án",
    })),
  ];
  return items.sort((a, b) => a.severity - b.severity).slice(0, 6);
}

export function useDashboardPriority({
  activeProject,
  commandCenter,
  overdueOperations,
  pendingCr,
  t,
  todoCommand,
  waitingQna,
}: UseDashboardPriorityInput) {
  const todoActionHref = useCallback(
    (item: { id: string; phase: string; projectId?: string }) =>
      `/app/brse-todo?projectId=${encodeURIComponent(item.projectId || todoCommand.activeProject?.id || "")}&phase=${encodeURIComponent(item.phase)}&itemId=${encodeURIComponent(item.id)}`,
    [todoCommand.activeProject?.id]
  );

  const todayBoard = useMemo(
    () =>
      buildDashboardPriorityBoard({
        activeProject,
        deadlineRisk: todoCommand.deadlineRisk,
        nextFocus: todoCommand.nextFocus,
        overdueOperations,
        pendingCr,
        t,
        todoActionHref,
        unsyncedMeetingActions: commandCenter?.unsynced_meeting_actions ?? [],
        waitingQna,
      }),
    [activeProject, commandCenter?.unsynced_meeting_actions, overdueOperations, pendingCr, t, todoActionHref, todoCommand.deadlineRisk, todoCommand.nextFocus, waitingQna]
  );

  return {
    priorityFocus: todayBoard[0] ?? null,
    priorityStack: todayBoard.slice(1, 5),
    todayBoard,
    todoActionHref,
  };
}
