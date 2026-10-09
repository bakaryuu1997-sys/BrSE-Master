"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/config";
import { buildCalendarPreferenceWarnings } from "@/lib/communicationPreferences";
import {
  deletePersonalSchedule,
  deletePersonalScheduleFromDb,
  fetchPersonalSchedules,
  getPersonalSchedules,
  groupSchedulesByDate,
  savePersonalSchedule,
  savePersonalScheduleToDb,
  type PersonalSchedule
} from "@/lib/personalCalendar";
import { getActiveProject } from "@/lib/projectSettings";
import { getOperationRecords, type OperationRecord } from "@/lib/operations";
import { type Holiday, type HolidayWithCountry } from "../../app/app/calendar/calendarPanels";
import { useUiLanguage } from "@/components/LanguageProvider";
import { getLocaleString } from "@/lib/dateUtils";

export type CountryCode = "VN" | "JP";

export type HolidaysResponse = Record<CountryCode, Holiday[]>;

export type ReleaseDateCheckResponse = {
  release_date: string;
  has_warning: boolean;
  warnings: string[];
};

export type TimezoneConvertResponse = {
  source_datetime: string;
  target_datetime: string;
  source_timezone: string;
  target_timezone: string;
};

export type TimezoneConvertForm = {
  date: string;
  time: string;
  source_timezone: string;
  target_timezone: string;
};

export const timezoneOptions = [
  { value: "Asia/Tokyo", label: "JST - Asia/Tokyo" },
  { value: "Asia/Ho_Chi_Minh", label: "ICT - Asia/Ho_Chi_Minh" }
];

export const defaultScheduleTime = {
  startTime: "09:00",
  endTime: "10:00",
  timezone: "Asia/Tokyo"
};

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDate() {
  return toIsoDate(new Date());
}

export function getSlotEndTime(hour: string, durationHours = 1) {
  const startHour = Number(hour.slice(0, 2));
  if (!Number.isFinite(startHour)) return defaultScheduleTime.endTime;
  const endHour = startHour + durationHours;
  if (endHour >= 24) return "23:59";
  return `${`${Math.max(startHour + durationHours, startHour + 1)}`.padStart(2, "0")}:00`;
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function formatDateLong(isoDate: string, lang: any) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(getLocaleString(lang), {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

export function formatApiDateTime(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(.+)?$/);
  if (!match) return value;
  return `${match[1]} ${match[2]} ${match[3] ?? ""}`.trim();
}

export function timezoneShortName(timezone: string) {
  if (timezone === "Asia/Tokyo") return "JST";
  if (timezone === "Asia/Ho_Chi_Minh") return "ICT";
  return timezone;
}

export function formatScheduleTimeRange(startTime: string, endTime: string, t: (key: any) => string) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  if (startTime) return `${t("calendar.from")} ${startTime}`;
  if (endTime) return `${t("calendar.to")} ${endTime}`;
  return t("calendar.noTimeSet");
}

export function getWeekAgendaRange(selectedDate: string) {
  const base = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
  const day = base.getDay();
  const offset = (day === 0 ? -6 : 1) - day;
  const start = new Date(base);
  start.setDate(base.getDate() + offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: toIsoDate(start),
    end: toIsoDate(end)
  };
}

export function normalizeHolidays(data: Partial<HolidaysResponse>): HolidaysResponse {
  return {
    VN: Array.isArray(data.VN) ? data.VN : [],
    JP: Array.isArray(data.JP) ? data.JP : []
  };
}

export function flattenHolidaysByDate(holidaysByYear: Record<string, HolidaysResponse>) {
  return Object.values(holidaysByYear).reduce<Record<string, HolidayWithCountry[]>>((grouped, holidays) => {
    (["VN", "JP"] as CountryCode[]).forEach((country) => {
      holidays[country].forEach((holiday) => {
        grouped[holiday.date] = [...(grouped[holiday.date] ?? []), { ...holiday, country }];
      });
    });
    return grouped;
  }, {});
}

export function useCalendarState() {
  const { t, language } = useUiLanguage();
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isHydrated, setIsHydrated] = useState(false);
  const [todayDate, setTodayDate] = useState("");
  const [visibleStart, setVisibleStart] = useState<Date | null>(null);
  const [holidaysByYear, setHolidaysByYear] = useState<Record<string, HolidaysResponse>>({});
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(true);
  const [holidayError, setHolidayError] = useState("");

  const [schedules, setSchedules] = useState<PersonalSchedule[]>([]);
  const [operationDeadlines, setOperationDeadlines] = useState<OperationRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ title: "", note: "", ...defaultScheduleTime });

  const [releaseDate, setReleaseDate] = useState("");
  const [releaseResult, setReleaseResult] = useState<ReleaseDateCheckResponse | null>(null);
  const [isCheckingRelease, setIsCheckingRelease] = useState(false);
  const [releaseError, setReleaseError] = useState("");

  const [convertForm, setConvertForm] = useState<TimezoneConvertForm>({
    date: "",
    time: "10:00",
    source_timezone: "Asia/Tokyo",
    target_timezone: "Asia/Ho_Chi_Minh"
  });
  const [convertResult, setConvertResult] = useState<TimezoneConvertResponse | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState("");

  const visibleMonths = useMemo(
    () => (visibleStart ? Array.from({ length: 4 }, (_, index) => addMonths(visibleStart, index)) : []),
    [visibleStart]
  );
  const visibleYears = useMemo(
    () => Array.from(new Set(visibleMonths.map((month) => `${month.getFullYear()}`))),
    [visibleMonths]
  );
  const visibleYearsKey = visibleYears.join(",");
  const holidaysByDate = useMemo(() => flattenHolidaysByDate(holidaysByYear), [holidaysByYear]);
  const schedulesByDate = useMemo(() => groupSchedulesByDate(schedules), [schedules]);
  const operationDeadlinesByDate = useMemo(() => {
    return operationDeadlines.reduce<Record<string, OperationRecord[]>>((grouped, record) => {
      if (!record.dueDate) return grouped;
      grouped[record.dueDate] = [...(grouped[record.dueDate] ?? []), record];
      return grouped;
    }, {});
  }, [operationDeadlines]);
  const selectedSchedules = schedulesByDate[selectedDate] ?? [];
  const selectedOperationDeadlines = operationDeadlinesByDate[selectedDate] ?? [];
  const weekAgendaRange = useMemo(() => getWeekAgendaRange(selectedDate), [selectedDate]);
  const weekAgendaItems = useMemo(() => {
    const personal = schedules
      .filter((schedule) => schedule.date >= weekAgendaRange.start && schedule.date <= weekAgendaRange.end)
      .map((schedule) => ({
        id: schedule.id,
        date: schedule.date,
        time: schedule.startTime || "99:99",
        title: schedule.title,
        helper: `${formatScheduleTimeRange(schedule.startTime, schedule.endTime, t)} · ${timezoneShortName(schedule.timezone)}`,
        tone: "personal" as const
      }));
    const operations = operationDeadlines
      .filter((record) => record.dueDate && record.dueDate >= weekAgendaRange.start && record.dueDate <= weekAgendaRange.end)
      .map((record) => ({
        id: record.id,
        date: record.dueDate,
        time: "99:98",
        title: `${record.type.toUpperCase()} · ${record.title}`,
        helper: `${record.status} · ${record.priority} · ${record.owner || record.customerOwner || "No owner"}`,
        tone: "operation" as const
      }));
    return [...personal, ...operations].sort((first, second) => first.date.localeCompare(second.date) || first.time.localeCompare(second.time));
  }, [operationDeadlines, schedules, t, weekAgendaRange.end, weekAgendaRange.start]);

  const upcomingHolidays = useMemo(() => {
    return Object.values(holidaysByDate)
      .flat()
      .filter((holiday) => (todayDate ? holiday.date >= todayDate : true))
      .sort((first, second) => first.date.localeCompare(second.date))
      .slice(0, 6);
  }, [holidaysByDate, todayDate]);

  const preferenceWarnings = useMemo(() => {
    const project = getActiveProject();
    if (!selectedDate) return [];
    return buildCalendarPreferenceWarnings({
      meetingDate: selectedDate,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      scheduleTimezone: scheduleForm.timezone,
      notes: project?.communication_notes ?? "",
      timezoneRule: project?.timezone_rule ?? "",
    });
  }, [selectedDate, scheduleForm.startTime, scheduleForm.endTime, scheduleForm.timezone]);

  const loadHolidaysForVisibleYears = useCallback(async (years: string[]) => {
    setIsLoadingHolidays(true);
    setHolidayError("");

    try {
      const yearResults = await Promise.all(
        years.map(async (year) => {
          const response = await fetch(`${apiBaseUrl}/calendar/holidays?year=${encodeURIComponent(year)}`);
          if (!response.ok) throw new Error(`Không tải được holiday API cho năm ${year}.`);
          const data = normalizeHolidays((await response.json()) as Partial<HolidaysResponse>);
          return [year, data] as const;
        })
      );

      setHolidaysByYear((current) => ({
        ...current,
        ...Object.fromEntries(yearResults)
      }));
    } catch (error) {
      setHolidayError(error instanceof Error ? error.message : "Không tải được danh sách ngày nghỉ.");
    } finally {
      setIsLoadingHolidays(false);
    }
  }, []);

  async function checkReleaseDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCheckingRelease(true);
    setReleaseError("");
    setReleaseResult(null);

    try {
      const response = await fetch(`${apiBaseUrl}/calendar/check-release-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ release_date: releaseDate })
      });
      if (!response.ok) throw new Error("Không kiểm tra được release date.");

      setReleaseResult((await response.json()) as ReleaseDateCheckResponse);
    } catch (error) {
      setReleaseError(error instanceof Error ? error.message : "Không kiểm tra được release date.");
    } finally {
      setIsCheckingRelease(false);
    }
  }

  async function convertTimezone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsConverting(true);
    setConvertError("");
    setConvertResult(null);

    try {
      const response = await fetch(`${apiBaseUrl}/calendar/convert-timezone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(convertForm)
      });
      if (!response.ok) throw new Error("Không đổi được timezone.");

      setConvertResult((await response.json()) as TimezoneConvertResponse);
    } catch (error) {
      setConvertError(error instanceof Error ? error.message : "Không đổi được timezone.");
    } finally {
      setIsConverting(false);
    }
  }

  function resetScheduleForm() {
    setEditingId(null);
    setScheduleForm({ title: "", note: "", ...defaultScheduleTime });
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setReleaseDate(date);
    setConvertForm((current) => ({ ...current, date }));
    resetScheduleForm();
  }

  function openSlotModal(date: string, hour: string) {
    setSelectedDate(date);
    setReleaseDate(date);
    setConvertForm((current) => ({ ...current, date }));
    setEditingId(null);
    setScheduleForm((current) => ({
      ...current,
      title: "",
      note: "",
      startTime: hour,
      endTime: getSlotEndTime(hour),
    }));
  }

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDate || !scheduleForm.title.trim()) return;

    const input = {
      date: selectedDate,
      title: scheduleForm.title,
      note: scheduleForm.note,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      timezone: scheduleForm.timezone
    };
    try {
      await savePersonalScheduleToDb(input, editingId ?? undefined);
    } catch {
      savePersonalSchedule(input, editingId ?? undefined);
    }
    setSchedules(getPersonalSchedules());
    resetScheduleForm();
  }

  function startEdit(schedule: PersonalSchedule) {
    setSelectedDate(schedule.date);
    setEditingId(schedule.id);
    setScheduleForm({
      title: schedule.title,
      note: schedule.note,
      startTime: schedule.startTime || defaultScheduleTime.startTime,
      endTime: schedule.endTime || defaultScheduleTime.endTime,
      timezone: schedule.timezone || defaultScheduleTime.timezone
    });
  }

  async function removeSchedule(scheduleId: string) {
    try {
      await deletePersonalScheduleFromDb(scheduleId);
    } catch {
      deletePersonalSchedule(scheduleId);
    }
    setSchedules(getPersonalSchedules());
    if (editingId === scheduleId) resetScheduleForm();
  }

  async function rescheduleSchedule(scheduleId: string, date: string, hour: string) {
    const current = schedules.find((schedule) => schedule.id === scheduleId);
    if (!current) return;
    const durationHours =
      current.startTime && current.endTime
        ? Math.max(
            1,
            Math.round(
              (Number(current.endTime.slice(0, 2)) * 60 +
                Number(current.endTime.slice(3, 5)) -
                (Number(current.startTime.slice(0, 2)) * 60 + Number(current.startTime.slice(3, 5)))) /
                60
            )
          )
        : 1;
    const input = {
      date,
      title: current.title,
      note: current.note,
      startTime: hour,
      endTime: getSlotEndTime(hour, durationHours),
      timezone: current.timezone,
    };
    try {
      await savePersonalScheduleToDb(input, scheduleId);
    } catch {
      savePersonalSchedule(input, scheduleId);
    }
    const nextSchedules = schedules.map((schedule) =>
      schedule.id === scheduleId ? { ...schedule, ...input } : schedule
    );
    setSchedules(nextSchedules);
    if (editingId === scheduleId) {
      setSelectedDate(date);
      setScheduleForm({
        title: input.title,
        note: input.note,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone,
      });
    }
  }

  function swapTimezones() {
    setConvertForm((current) => ({
      ...current,
      source_timezone: current.target_timezone,
      target_timezone: current.source_timezone
    }));
    setConvertResult(null);
  }

  function goToToday(nextViewMode = viewMode) {
    const currentDate = todayDate || getTodayDate();
    const now = new Date(`${currentDate}T12:00:00`);
    setVisibleStart(new Date(now.getFullYear(), now.getMonth(), 1));
    setViewMode(nextViewMode);
    handleSelectDate(currentDate);
  }

  function switchViewMode(nextViewMode: "month" | "week" | "day") {
    if (nextViewMode === "week") {
      goToToday("week");
      return;
    }
    setViewMode(nextViewMode);
  }

  useEffect(() => {
    const currentDate = getTodayDate();
    const now = new Date();
    setIsHydrated(true);
    setTodayDate(currentDate);
    setSelectedDate(currentDate);
    setVisibleStart(new Date(now.getFullYear(), now.getMonth(), 1));
    setReleaseDate(currentDate);
    setConvertForm((current) => ({ ...current, date: currentDate }));
    setSchedules(getPersonalSchedules());
    fetchPersonalSchedules().then(setSchedules).catch(() => {});
    getOperationRecords().then(setOperationDeadlines).catch(() => setOperationDeadlines([]));
  }, []);

  useEffect(() => {
    if (!visibleYears.length) return;
    void loadHolidaysForVisibleYears(visibleYears);
  }, [loadHolidaysForVisibleYears, visibleYears, visibleYearsKey]);

  return {
    t,
    language,
    viewMode,
    setViewMode,
    isHydrated,
    todayDate,
    visibleStart,
    setVisibleStart,
    holidaysByYear,
    isLoadingHolidays,
    holidayError,
    schedules,
    operationDeadlines,
    selectedDate,
    editingId,
    scheduleForm,
    setScheduleForm,
    releaseDate,
    setReleaseDate,
    releaseResult,
    isCheckingRelease,
    releaseError,
    convertForm,
    setConvertForm,
    convertResult,
    isConverting,
    convertError,
    visibleMonths,
    visibleYears,
    visibleYearsKey,
    holidaysByDate,
    schedulesByDate,
    operationDeadlinesByDate,
    selectedSchedules,
    selectedOperationDeadlines,
    weekAgendaRange,
    weekAgendaItems,
    upcomingHolidays,
    preferenceWarnings,
    loadHolidaysForVisibleYears,
    checkReleaseDate,
    convertTimezone,
    resetScheduleForm,
    handleSelectDate,
    openSlotModal,
    submitSchedule,
    startEdit,
    removeSchedule,
    rescheduleSchedule,
    swapTimezones,
    goToToday,
    switchViewMode,
  };
}
