"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectContext } from "@/components/ProjectContextProvider";
import { useUiLanguage } from "@/components/LanguageProvider";
import { useNotify } from "@/components/ToastProvider";
import { formatDateLabel, toIsoDate } from "@/components/dashboard/DashboardCalendarPanel";
import { EMPTY_BRSE_TODO_COMMAND_SUMMARY, getBrseTodoCommandSummary } from "@/lib/brseTodo";
import { fetchEmailHistory, getEmailHistory, type GeneratedEmailHistoryItem } from "@/lib/emailHistory";
import { getOperationRecords, type OperationRecord } from "@/lib/operations";
import {
  ACTIVE_PROJECT_CHANGED_EVENT,
  fetchProjectSettingsWithFallback,
  getActiveProject,
  getProjectSettings,
  type ProjectSetting,
} from "@/lib/projectSettings";
import {
  fetchPersonalSchedules,
  getPersonalSchedules,
  groupSchedulesByDate,
  type PersonalSchedule,
} from "@/lib/personalCalendar";
import { useCommandCenterQuery } from "@/lib/command-center-hooks";
import type { CommandCenterData } from "@/lib/commandCenter";
import type { UiLanguage } from "@/lib/uiLanguage";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function buildWeekDates(today: Date | null, lang: UiLanguage) {
  if (!today) return [];
  const start = new Date(today);
  const dayNumber = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayNumber);

  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const locale = lang === "vi" ? "vi-VN" : lang === "ja" ? "ja-JP" : "en-US";
    return {
      iso: toIsoDate(d),
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d),
      dayMonth: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d),
    };
  });
}

export function useDashboardData(language: UiLanguage) {
  const { activeProjectId: contextProjectId } = useProjectContext();
  const { t } = useUiLanguage();
  const { notify } = useNotify();
  const projectsFallbackNotified = useRef(false);
  // Latest toast callback without making the data-loading effect depend on t/notify identity.
  const notifyCacheFallback = useRef<() => void>(() => undefined);
  useEffect(() => {
    notifyCacheFallback.current = () => notify(t("settings.status.usingCache"), "info");
  }, [notify, t]);
  const [today, setToday] = useState<Date | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [activeProject, setActiveProject] = useState<ProjectSetting | null>(null);
  const [projects, setProjects] = useState<ProjectSetting[]>([]);
  const [history, setHistory] = useState<GeneratedEmailHistoryItem[]>([]);
  const [rawOperations, setRawOperations] = useState<OperationRecord[]>([]);
  const [calendarSchedules, setCalendarSchedules] = useState<PersonalSchedule[]>([]);
  const [todoCommand, setTodoCommand] = useState(EMPTY_BRSE_TODO_COMMAND_SUMMARY);
  const [commandCenter, setCommandCenter] = useState<CommandCenterData | null>(null);
  const commandCenterQuery = useCommandCenterQuery();

  useEffect(() => {
    setToday(new Date());
  }, []);

  useEffect(() => {
    setCommandCenter(commandCenterQuery.data ?? null);
  }, [commandCenterQuery.data]);

  useEffect(() => {
    let cancelled = false;

    function loadDashboardContext() {
      const project = getActiveProject();
      setActiveProject(project);
      setProjects(getProjectSettings());
      setHistory(getEmailHistory().slice(0, 3));
      setTodoCommand(getBrseTodoCommandSummary(selectedProjectId));
      setCalendarSchedules(getPersonalSchedules());

      fetchEmailHistory(project?.id || "default")
        .then((items) => {
          if (!cancelled) setHistory(items.slice(0, 3));
        })
        .catch(() => {});
      fetchProjectSettingsWithFallback(() => {
        if (cancelled || projectsFallbackNotified.current) return;
        projectsFallbackNotified.current = true;
        notifyCacheFallback.current();
      }).then((items) => {
        if (!cancelled) setProjects(items);
      });
      getOperationRecords()
        .then((items) => {
          if (!cancelled) setRawOperations(items);
        })
        .catch(() => {
          if (!cancelled) setRawOperations([]);
        });
      fetchPersonalSchedules()
        .then((items) => {
          if (!cancelled) setCalendarSchedules(items);
        })
        .catch(() => {});
    }

    loadDashboardContext();
    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, loadDashboardContext);
    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, loadDashboardContext);
    };
  }, [selectedProjectId]);

  // Sidebar "Project Context" switch scopes the dashboard (todo drawer, KPIs). Driven by the
  // shared ProjectContext so the filter can't stay on "all" while the user works in one project.
  const lastContextProjectId = useRef(contextProjectId);
  useEffect(() => {
    const previous = lastContextProjectId.current;
    if (previous === contextProjectId) return;
    lastContextProjectId.current = contextProjectId;
    // "" -> id is the provider's initial hydration, not a user switch: keep the default "all" view.
    if (previous && contextProjectId) setSelectedProjectId(contextProjectId);
  }, [contextProjectId]);

  const handleSelectProjectId = (id: string) => {
    setSelectedProjectId(id);
    setTodoCommand(getBrseTodoCommandSummary(id));
  };

  const operations = useMemo(() => {
    if (selectedProjectId === "all") return rawOperations;
    const proj = projects.find((p) => p.id === selectedProjectId);
    const projName = proj?.name?.trim().toLowerCase();
    return rawOperations.filter((op) => {
      const opProj = op.projectName?.trim().toLowerCase();
      return (projName && opProj === projName) || op.projectName === selectedProjectId;
    });
  }, [rawOperations, selectedProjectId, projects]);

  const activeProjectScope = useMemo(() => {
    if (selectedProjectId === "all") return activeProject;
    return projects.find((p) => p.id === selectedProjectId) ?? activeProject;
  }, [selectedProjectId, projects, activeProject]);

  const todayIso = today ? toIsoDate(today) : "";
  const calendarSchedulesByDate = useMemo(() => groupSchedulesByDate(calendarSchedules), [calendarSchedules]);
  const todaySchedules = useMemo(() => calendarSchedulesByDate[todayIso] ?? [], [calendarSchedulesByDate, todayIso]);
  const weekDates = useMemo(() => buildWeekDates(today, language), [today, language]);
  const weeklyScheduleCount = useMemo(
    () => weekDates.reduce((total, day) => total + (calendarSchedulesByDate[day.iso]?.length ?? 0), 0),
    [calendarSchedulesByDate, weekDates]
  );

  return {
    activeProject: activeProjectScope,
    selectedProjectId,
    setSelectedProjectId: handleSelectProjectId,
    calendarSchedulesByDate,
    commandCenter,
    history,
    operations,
    projects,
    setCalendarSchedules,
    setOperations: setRawOperations,
    setTodoCommand,
    today,
    todayIso,
    todayLabel: today ? formatDateLabel(today, "Asia/Tokyo", language) : "--",
    todaySchedules,
    todoCommand,
    weekDates,
    weeklyScheduleCount,
  };
}
