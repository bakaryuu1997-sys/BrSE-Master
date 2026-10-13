"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateLabel, toIsoDate } from "@/components/dashboard/DashboardCalendarPanel";
import { EMPTY_BRSE_TODO_COMMAND_SUMMARY, getBrseTodoCommandSummary } from "@/lib/brseTodo";
import { fetchEmailHistory, getEmailHistory, type GeneratedEmailHistoryItem } from "@/lib/emailHistory";
import { getOperationRecords, type OperationRecord } from "@/lib/operations";
import {
  ACTIVE_PROJECT_CHANGED_EVENT,
  fetchProjectSettings,
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
  const [today, setToday] = useState<Date | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectSetting | null>(null);
  const [projects, setProjects] = useState<ProjectSetting[]>([]);
  const [history, setHistory] = useState<GeneratedEmailHistoryItem[]>([]);
  const [operations, setOperations] = useState<OperationRecord[]>([]);
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
      setTodoCommand(getBrseTodoCommandSummary());
      setCalendarSchedules(getPersonalSchedules());

      fetchEmailHistory(project?.id || "default")
        .then((items) => {
          if (!cancelled) setHistory(items.slice(0, 3));
        })
        .catch(() => {});
      fetchProjectSettings()
        .then((items) => {
          if (!cancelled) setProjects(items);
        })
        .catch(() => {
          if (!cancelled) setProjects(getProjectSettings());
        });
      getOperationRecords()
        .then((items) => {
          if (!cancelled) setOperations(items);
        })
        .catch(() => {
          if (!cancelled) setOperations([]);
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
  }, []);

  const todayIso = today ? toIsoDate(today) : "";
  const calendarSchedulesByDate = useMemo(() => groupSchedulesByDate(calendarSchedules), [calendarSchedules]);
  const todaySchedules = useMemo(() => calendarSchedulesByDate[todayIso] ?? [], [calendarSchedulesByDate, todayIso]);
  const weekDates = useMemo(() => buildWeekDates(today, language), [today, language]);
  const weeklyScheduleCount = useMemo(
    () => weekDates.reduce((total, day) => total + (calendarSchedulesByDate[day.iso]?.length ?? 0), 0),
    [calendarSchedulesByDate, weekDates]
  );

  return {
    activeProject,
    calendarSchedulesByDate,
    commandCenter,
    history,
    operations,
    projects,
    setCalendarSchedules,
    setOperations,
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
