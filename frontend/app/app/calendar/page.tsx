"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { DayPlannerPanel, MonthPanel, WeekPlannerPanel } from "./calendarPanels";
import { PageHeader } from "@/components/PageHeader";
import { useCalendarState } from "@/features/calendar/useCalendarState";
import { CalendarQuickScheduleForm } from "@/features/calendar/CalendarQuickScheduleForm";
import { CalendarSidebarPanel } from "@/features/calendar/CalendarSidebarPanel";
import { CalendarReleaseCheck } from "@/features/calendar/CalendarReleaseCheck";
import { CalendarTimezoneConverter } from "@/features/calendar/CalendarTimezoneConverter";

export default function CalendarPage() {
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
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-[var(--brse-panel-border)] bg-background/60 p-1">
                <button
                  type="button"
                  onClick={() => switchViewMode("month")}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
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
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
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
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
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
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <ChevronLeft className="h-4 w-4 text-primary" aria-hidden="true" />
                {viewMode === "week"
                  ? t("calendar.prevWeek")
                  : viewMode === "day"
                  ? t("calendar.prevDay")
                  : t("calendar.prev4Months")}
              </button>
              <button
                type="button"
                onClick={() => goToToday()}
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
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
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-primary/30 bg-primary/15 px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-primary/60 hover:bg-primary/20"
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

      <div className="grid gap-3">
        {isHydrated && visibleStart ? (
          <CalendarQuickScheduleForm
            t={t}
            language={language}
            selectedDate={selectedDate}
            scheduleForm={scheduleForm}
            setScheduleForm={setScheduleForm}
            editingId={editingId}
            preferenceWarnings={preferenceWarnings}
            submitSchedule={submitSchedule}
            resetScheduleForm={resetScheduleForm}
            selectedSchedules={selectedSchedules}
            selectedOperationDeadlines={selectedOperationDeadlines}
            holidays={holidaysByDate[selectedDate] ?? []}
          />
        ) : null}

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

        {isHydrated && visibleStart ? (
          <CalendarSidebarPanel
            t={t}
            language={language}
            selectedDate={selectedDate}
            selectedSchedules={selectedSchedules}
            selectedOperationDeadlines={selectedOperationDeadlines}
            holidays={holidaysByDate[selectedDate] ?? []}
            weekAgendaRange={weekAgendaRange}
            weekAgendaItems={weekAgendaItems}
            upcomingHolidays={upcomingHolidays}
            visibleYears={visibleYears}
            loadHolidaysForVisibleYears={loadHolidaysForVisibleYears}
            startEdit={startEdit}
            removeSchedule={removeSchedule}
          />
        ) : null}
      </div>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        {isHydrated && (
          <>
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
          </>
        )}
      </section>
    </main>
  );
}
