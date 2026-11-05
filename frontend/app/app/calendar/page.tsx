"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { DayPlannerPanel, MonthPanel, WeekPlannerPanel, holidayTone } from "./calendarPanels";
import { PageHeader } from "@/components/PageHeader";
import {
  useCalendarState,
  formatDateLong,
  formatScheduleTimeRange,
  timezoneShortName,
  timezoneOptions,
} from "@/features/calendar/useCalendarState";
import { CalendarReleaseCheck } from "@/features/calendar/CalendarReleaseCheck";
import { CalendarTimezoneConverter } from "@/features/calendar/CalendarTimezoneConverter";

export default function CalendarPage() {
  const [dockTab, setDockTab] = useState<"day" | "agenda" | "tools">("day");
  const {
    t,
    language,
    viewMode,
    isHydrated,
    todayDate,
    visibleStart,
    setVisibleStart,
    isLoadingHolidays,
    holidayError,
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
  } = useCalendarState();

  return (
    <main className="brse-page">
      <PageHeader
        compact
        badge="Calendar Command Center"
        title={
          viewMode === "day"
            ? t("calendar.titleDay")
            : viewMode === "week"
            ? t("calendar.titleWeek")
            : t("calendar.titleMonth")
        }
        description={
          viewMode === "day"
            ? t("calendar.descDay")
            : viewMode === "week"
            ? t("calendar.descWeek")
            : t("calendar.descMonth")
        }
        toolbar={
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-[var(--brse-panel-border)] bg-background/60 p-0.5">
                <button
                  type="button"
                  onClick={() => switchViewMode("month")}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                    viewMode === "month"
                      ? "bg-primary text-white"
                      : "text-textMuted hover:text-ink"
                  }`}
                >
                  {t("calendar.viewMonth")}
                </button>
                <button
                  type="button"
                  onClick={() => switchViewMode("week")}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                    viewMode === "week"
                      ? "bg-cyan text-background"
                      : "text-textMuted hover:text-ink"
                  }`}
                >
                  {t("calendar.viewWeek")}
                </button>
                <button
                  type="button"
                  onClick={() => switchViewMode("day")}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                    viewMode === "day"
                      ? "bg-matcha text-background"
                      : "text-textMuted hover:text-ink"
                  }`}
                >
                  {t("calendar.viewDay")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (viewMode === "week") {
                    const current = selectedDate
                      ? new Date(`${selectedDate}T12:00:00`)
                      : new Date();
                    const prevWeekDate = new Date(current);
                    prevWeekDate.setDate(current.getDate() - 7);
                    const year = prevWeekDate.getFullYear();
                    const month = `${prevWeekDate.getMonth() + 1}`.padStart(2, "0");
                    const day = `${prevWeekDate.getDate()}`.padStart(2, "0");
                    handleSelectDate(`${year}-${month}-${day}`);
                    return;
                  }
                  if (viewMode === "day") {
                    const current = selectedDate
                      ? new Date(`${selectedDate}T12:00:00`)
                      : new Date();
                    const prevDayDate = new Date(current);
                    prevDayDate.setDate(current.getDate() - 1);
                    const year = prevDayDate.getFullYear();
                    const month = `${prevDayDate.getMonth() + 1}`.padStart(2, "0");
                    const day = `${prevDayDate.getDate()}`.padStart(2, "0");
                    handleSelectDate(`${year}-${month}-${day}`);
                    return;
                  }
                  // Month mode visibleStart prev
                  if (visibleStart) {
                    const prev = new Date(visibleStart);
                    prev.setMonth(visibleStart.getMonth() - 4);
                    setVisibleStart(prev);
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {viewMode === "week"
                  ? t("calendar.prevWeek")
                  : viewMode === "day"
                  ? t("calendar.prevDay")
                  : t("calendar.prev4Months")}
              </button>
              <button
                type="button"
                onClick={() => goToToday()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {t("calendar.today")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewMode === "week") {
                    const current = selectedDate
                      ? new Date(`${selectedDate}T12:00:00`)
                      : new Date();
                    const nextWeekDate = new Date(current);
                    nextWeekDate.setDate(current.getDate() + 7);
                    const year = nextWeekDate.getFullYear();
                    const month = `${nextWeekDate.getMonth() + 1}`.padStart(2, "0");
                    const day = `${nextWeekDate.getDate()}`.padStart(2, "0");
                    handleSelectDate(`${year}-${month}-${day}`);
                    return;
                  }
                  if (viewMode === "day") {
                    const current = selectedDate
                      ? new Date(`${selectedDate}T12:00:00`)
                      : new Date();
                    const nextDayDate = new Date(current);
                    nextDayDate.setDate(current.getDate() + 1);
                    const year = nextDayDate.getFullYear();
                    const month = `${nextDayDate.getMonth() + 1}`.padStart(2, "0");
                    const day = `${nextDayDate.getDate()}`.padStart(2, "0");
                    handleSelectDate(`${year}-${month}-${day}`);
                    return;
                  }
                  // Month mode visibleStart next
                  if (visibleStart) {
                    const next = new Date(visibleStart);
                    next.setMonth(visibleStart.getMonth() + 4);
                    setVisibleStart(next);
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-primary/60 hover:bg-primary/20"
              >
                {viewMode === "week"
                  ? t("calendar.nextWeek")
                  : viewMode === "day"
                  ? t("calendar.nextDay")
                  : t("calendar.next4Months")}
                <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-textMuted">
              <span>
                {t("calendar.visibleYears")}{" "}
                <strong className="text-ink">
                  {visibleYears.length ? visibleYears.join(", ") : "—"}
                </strong>
              </span>
              {isLoadingHolidays ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />{" "}
                  {t("calendar.loadingHolidays")}
                </span>
              ) : null}
              {holidayError ? (
                <span className="text-vermilion">{holidayError}</span>
              ) : null}
            </div>
          </div>
        }
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] items-start">
        {/* Main Calendar Section (Left Column) */}
        <section className="min-w-0">
          {!isHydrated || !visibleStart ? (
            <section className="brse-section min-h-[420px] animate-pulse p-5">
              <div className="h-5 w-44 rounded-full bg-surfaceHover" />
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-40 rounded-2xl border border-[var(--brse-panel-border)] bg-background/55"
                  />
                ))}
              </div>
            </section>
          ) : viewMode === "month" ? (
            <section className="grid auto-rows-max items-start gap-3 lg:grid-cols-2">
              {visibleMonths.map((month) => (
                <MonthPanel
                  key={`${month.getFullYear()}-${month.getMonth()}`}
                  monthDate={month}
                  holidaysByDate={holidaysByDate}
                  schedulesByDate={schedulesByDate}
                  operationDeadlinesByDate={operationDeadlinesByDate}
                  selectedDate={selectedDate}
                  todayIso={todayDate}
                  onSelectDate={handleSelectDate}
                  lang={language}
                  t={t}
                />
              ))}
            </section>
          ) : viewMode === "week" ? (
            <WeekPlannerPanel
              selectedDate={selectedDate}
              todayIso={todayDate}
              schedulesByDate={schedulesByDate}
              operationDeadlinesByDate={operationDeadlinesByDate}
              onSelectDate={handleSelectDate}
              onSelectSlot={openSlotModal}
              onRescheduleSchedule={rescheduleSchedule}
              lang={language}
              t={t}
            />
          ) : (
            <DayPlannerPanel
              selectedDate={selectedDate}
              holidays={holidaysByDate[selectedDate] ?? []}
              schedules={selectedSchedules}
              operationDeadlines={selectedOperationDeadlines}
              onSelectSlot={openSlotModal}
              onRescheduleSchedule={rescheduleSchedule}
              lang={language}
              t={t}
            />
          )}
        </section>

        {/* Right Inspector & Cockpit Dock */}
        <aside className="brse-section sticky top-4 flex max-h-[calc(100vh-5rem)] flex-col p-3.5 shadow-lg">
          {/* Dock Tabs Header */}
          <div className="shrink-0 flex items-center gap-1 border-b border-[var(--brse-panel-border)] pb-2.5 text-xs">
            <button
              type="button"
              onClick={() => setDockTab("day")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition ${
                dockTab === "day"
                  ? "bg-primary text-white shadow-sm"
                  : "text-textMuted hover:bg-surfaceHover hover:text-ink"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{t("calendar.selectedDay") ?? "Ngày chọn"}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[9px] ${dockTab === "day" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                {selectedSchedules.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDockTab("agenda")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition ${
                dockTab === "agenda"
                  ? "bg-primary text-white shadow-sm"
                  : "text-textMuted hover:bg-surfaceHover hover:text-ink"
              }`}
            >
              <span>{t("calendar.weekAgenda") ?? "Agenda tuần"}</span>
              {weekAgendaItems.length > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[9px] ${dockTab === "agenda" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                  {weekAgendaItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDockTab("tools")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition ${
                dockTab === "tools"
                  ? "bg-primary text-white shadow-sm"
                  : "text-textMuted hover:bg-surfaceHover hover:text-ink"
              }`}
            >
              <span>⚡ Tiện ích BrSE</span>
            </button>
          </div>

          {/* Dock Content Body */}
          <div className="flex-1 overflow-y-auto pr-1 pt-3 space-y-4">
            {dockTab === "day" && (
              <>
                {/* Day Header Banner */}
                <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {t("calendar.selectedDay") ?? "Ngày được chọn"}
                      </p>
                      <h3 className="mt-0.5 text-sm font-bold text-ink">
                        {selectedDate ? formatDateLong(selectedDate, language) : t("calendar.pickDate")}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full border border-matcha/30 bg-matcha/10 px-2 py-0.5 text-[10px] font-bold text-matcha">
                      {selectedSchedules.length} lịch
                    </span>
                  </div>

                  {/* Holiday badges */}
                  {(holidaysByDate[selectedDate] ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(holidaysByDate[selectedDate] ?? []).map((h) => (
                        <span
                          key={`${h.country}-${h.name}`}
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${holidayTone(h.country)}`}
                        >
                          {h.country} Nghỉ lễ: {h.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Schedule Form */}
                <div className="rounded-xl border border-[var(--brse-panel-border)] bg-surface/40 p-3">
                  <div className="flex items-center gap-1.5 pb-2 text-xs font-semibold text-ink">
                    {editingId ? <Edit3 className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5 text-primary" />}
                    <span>{editingId ? t("calendar.editSchedule") : t("calendar.quickSchedule")}</span>
                  </div>

                  <form onSubmit={submitSchedule} className="grid gap-2.5">
                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold text-textMuted uppercase">{t("calendar.title")}</span>
                      <input
                        required
                        value={scheduleForm.title}
                        onChange={(event) =>
                          setScheduleForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder={t("calendar.titlePlaceholder")}
                        className="field-control px-2.5 py-1.5 text-xs placeholder:text-textMuted/70"
                      />
                    </label>

                    <div className="grid grid-cols-3 gap-1.5">
                      <label className="grid gap-1">
                        <span className="text-[10px] font-semibold text-textMuted uppercase">{t("calendar.startTime")}</span>
                        <input
                          type="time"
                          value={scheduleForm.startTime}
                          onChange={(event) =>
                            setScheduleForm((current) => ({
                              ...current,
                              startTime: event.target.value,
                            }))
                          }
                          className="field-control px-2 py-1 text-xs"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[10px] font-semibold text-textMuted uppercase">{t("calendar.endTime")}</span>
                        <input
                          type="time"
                          value={scheduleForm.endTime}
                          onChange={(event) =>
                            setScheduleForm((current) => ({
                              ...current,
                              endTime: event.target.value,
                            }))
                          }
                          className="field-control px-2 py-1 text-xs"
                        />
                      </label>
                      <label className="grid min-w-0 gap-1">
                        <span className="text-[10px] font-semibold text-textMuted uppercase">{t("calendar.timezone")}</span>
                        <select
                          value={scheduleForm.timezone}
                          onChange={(event) =>
                            setScheduleForm((current) => ({
                              ...current,
                              timezone: event.target.value,
                            }))
                          }
                          className="field-control w-full min-w-0 px-1.5 py-1 text-xs"
                        >
                          {timezoneOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="grid gap-1">
                      <span className="text-[10px] font-semibold text-textMuted uppercase">{t("calendar.content")}</span>
                      <textarea
                        value={scheduleForm.note}
                        onChange={(event) =>
                          setScheduleForm((current) => ({
                            ...current,
                            note: event.target.value,
                          }))
                        }
                        rows={2}
                        placeholder={t("calendar.contentPlaceholder")}
                        className="field-control px-2.5 py-1.5 text-xs placeholder:text-textMuted/70"
                      />
                    </label>

                    {preferenceWarnings.length > 0 && (
                      <div className="flex gap-1.5 rounded-lg border border-amber-300/30 bg-amber-300/10 p-2 text-xs text-amber-100">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-300" />
                        <div className="space-y-0.5 text-[11px]">
                          {preferenceWarnings.map((w) => (
                            <p key={w}>{w}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={!scheduleForm.title.trim()}
                        className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primaryHover disabled:opacity-50 transition"
                      >
                        {editingId ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        <span>{editingId ? t("calendar.updateSchedule") : t("calendar.addSchedule")}</span>
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={resetScheduleForm}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[var(--brse-panel-border)] bg-surface px-2.5 text-xs text-textMuted hover:text-ink transition"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>{t("calendar.cancelEdit")}</span>
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Personal Schedules List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold text-ink">
                      {t("calendar.personalSchedules")} ({selectedSchedules.length})
                    </h4>
                  </div>
                  {selectedSchedules.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--brse-panel-border)] p-4 text-center text-xs text-textMuted">
                      {t("calendar.noPersonalSchedules")}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedSchedules.map((schedule) => (
                        <article
                          key={schedule.id}
                          className="rounded-xl border border-[var(--brse-panel-border)] bg-background/55 p-2.5 transition hover:border-primary/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-ink">{schedule.title}</p>
                              <div className="mt-1 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                <Clock3 className="h-3 w-3" />
                                <span>
                                  {formatScheduleTimeRange(schedule.startTime, schedule.endTime, t)} · {timezoneShortName(schedule.timezone)}
                                </span>
                              </div>
                              {schedule.note && (
                                <p className="mt-1 text-[11px] text-textMuted line-clamp-2">{schedule.note}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(schedule)}
                                className="rounded p-1 text-textMuted hover:bg-surface hover:text-primary transition"
                                title={t("calendar.editSchedule")}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSchedule(schedule.id)}
                                className="rounded p-1 text-textMuted hover:bg-surface hover:text-vermilion transition"
                                title={t("calendar.deleteSchedule")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                {/* Operations Deadlines List */}
                <div className="space-y-2 pt-2 border-t border-[var(--brse-panel-border)]">
                  <h4 className="text-xs font-bold text-ink">
                    {t("calendar.operationsDeadlines")} ({selectedOperationDeadlines.length})
                  </h4>
                  {selectedOperationDeadlines.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--brse-panel-border)] p-3 text-center text-xs text-textMuted">
                      {t("calendar.noDeadlines")}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedOperationDeadlines.map((record) => (
                        <a
                          key={record.id}
                          href={`/app/operations?type=${record.type}&id=${encodeURIComponent(record.id)}`}
                          className="block rounded-xl border border-amber-300/30 bg-amber-300/10 p-2.5 transition hover:bg-amber-300/15"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-300">
                            <span>{record.type} DEADLINE</span>
                            <span className="text-textMuted">{record.status}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs font-semibold text-ink">{record.title}</p>
                          <p className="mt-0.5 text-[10px] text-textMuted">
                            {record.priority} · {record.owner || record.customerOwner || "Chưa gán"}
                          </p>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {dockTab === "agenda" && (
              <>
                {/* Week Agenda */}
                <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-ink">{t("calendar.weekAgenda")}</h3>
                    <span className="text-[10px] text-textMuted">
                      {weekAgendaRange.start} - {weekAgendaRange.end}
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {weekAgendaItems.length > 0 ? (
                      weekAgendaItems.map((item) => (
                        <div
                          key={`${item.tone}-${item.id}`}
                          className={`rounded-lg border p-2 text-xs ${
                            item.tone === "operation"
                              ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                              : "border-matcha/30 bg-matcha/10 text-matcha"
                          }`}
                        >
                          <p className="font-bold text-ink">{item.date} · {item.title}</p>
                          <p className="mt-0.5 text-[10px] text-textMuted">{item.helper}</p>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-center text-xs text-textMuted">{t("calendar.noWeekAgenda")}</p>
                    )}
                  </div>
                </div>

                {/* Upcoming Holidays */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold text-ink">{t("calendar.upcomingHolidays")}</h3>
                    <button
                      type="button"
                      onClick={() => void loadHolidaysForVisibleYears(visibleYears)}
                      className="rounded p-1 text-textMuted hover:bg-surface hover:text-primary transition"
                      title={t("calendar.reloadHolidays")}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {upcomingHolidays.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--brse-panel-border)] p-4 text-center text-xs text-textMuted">
                      {t("calendar.noUpcomingHolidays")}
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {upcomingHolidays.map((h) => (
                        <div
                          key={`${h.country}-${h.date}-${h.name}`}
                          className="rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-2.5"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-primary">
                            <span>{h.country} Holiday</span>
                            <span>{h.date}</span>
                          </div>
                          <p className="mt-0.5 text-xs font-semibold text-ink">{h.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {dockTab === "tools" && (
              <div className="space-y-4">
                <CalendarReleaseCheck
                  t={t}
                  releaseDate={releaseDate}
                  setReleaseDate={setReleaseDate}
                  isCheckingRelease={isCheckingRelease}
                  releaseError={releaseError}
                  releaseResult={releaseResult}
                  checkReleaseDate={checkReleaseDate}
                />

                <CalendarTimezoneConverter
                  t={t}
                  convertForm={convertForm}
                  setConvertForm={setConvertForm}
                  isConverting={isConverting}
                  convertError={convertError}
                  convertResult={convertResult}
                  convertTimezone={convertTimezone}
                  swapTimezones={swapTimezones}
                />
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
