"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  BookOpenText,
  Copy,
  Zap,
  Maximize2,
  Minimize2,
  Download,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDashboardConfig } from "@/components/dashboard/useDashboardConfig";
import { useDashboardActions } from "@/components/dashboard/useDashboardActions";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { useDashboardOperationsSummary } from "@/components/dashboard/useDashboardOperationsSummary";
import { useDashboardPriority } from "@/components/dashboard/useDashboardPriority";
import { useDashboardPwaInstall } from "@/components/dashboard/useDashboardPwaInstall";
import { useUiLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

// Refactored Components
import { DashboardMorningBriefPanel } from "@/components/dashboard/DashboardMorningBriefPanel";
import { LiveGlossarySearch } from "@/components/dashboard/LiveGlossarySearch";
import { ProjectOverviewPanel } from "@/components/dashboard/ProjectOverviewPanel";
import { QuickKeigoComposer } from "@/components/dashboard/QuickKeigoComposer";
import { DashboardMetricCards } from "@/components/dashboard/DashboardMetricCards";
import { CommandIntelligenceBoard } from "@/components/dashboard/CommandIntelligenceBoard";
import { WeekPlanner } from "@/components/dashboard/WeekPlanner";
import { TodayTimeline } from "@/components/dashboard/TodayTimeline";
import { DashboardActivityStream } from "@/components/dashboard/DashboardActivityStream";
import { DashboardDrawers } from "@/components/dashboard/DashboardDrawers";
import { CommunicationPulseCard } from "@/components/dashboard/CommunicationPulseCard";
import { DashboardClocks } from "@/components/dashboard/DashboardClocks";

import { DashboardCustomizer } from "@/components/dashboard/DashboardCustomizer";

// --- Types & Constants ---

type DashboardNotice = {
  message: string;
  tone: "success" | "warning" | "error";
};

// --- Main Page Component ---

export default function AppHomePage() {
  const { t, language } = useUiLanguage();
  const [notice, setNotice] = useState<DashboardNotice | null>(null);
  const {
    activeProject,
    calendarSchedulesByDate,
    commandCenter,
    history,
    operations,
    projects,
    setCalendarSchedules,
    setOperations,
    setTodoCommand,
    todayIso,
    todayLabel,
    todaySchedules,
    todoCommand,
    weekDates,
    weeklyScheduleCount,
  } = useDashboardData(language);

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState<"" | "todo" | "qna" | "cr" | "meetings">("");

  // Dashboard Config
  const {
    visibility,
    order,
    loaded,
    toggleWidget,
    moveWidget,
    resetConfig,
    isVisible,
    getOrderedWidgets,
  } = useDashboardConfig();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [isComposerFullscreen, setIsComposerFullscreen] = useState(false);

  function notify(message: string, tone: DashboardNotice["tone"] = "success") {
    setNotice({ message, tone });
  }

  const { canInstallPwa, triggerInstallPwa } = useDashboardPwaInstall(() => notify(t("dashboard.pwaInstalling")));

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const {
    getDayRisk,
    overdueOperations,
    pendingCr,
    qnaReminderCandidates,
    waitingQna,
  } = useDashboardOperationsSummary(operations, todayIso, todoCommand.deadlineRisk);

  const { priorityFocus, priorityStack, todayBoard, todoActionHref } = useDashboardPriority({
    activeProject,
    commandCenter,
    overdueOperations,
    pendingCr,
    t,
    todoCommand,
    waitingQna,
  });
  const todoPercent = todoCommand.total ? Math.round((todoCommand.done / todoCommand.total) * 100) : 0;

  const {
    approveMeetingDraft,
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
  } = useDashboardActions({
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
  });

  return (
    <main className="brse-page" data-route-scroll-root>
      {notice && (
        <div className={cn("brse-card fixed right-5 top-5 z-[260] max-w-sm px-4 py-3 text-sm font-bold backdrop-blur-xl", notice.tone === "success" && "border-matcha/25 bg-matcha/15 text-matcha", notice.tone === "warning" && "border-gold/25 bg-gold/15 text-gold", notice.tone === "error" && "border-vermilion/25 bg-vermilion/15 text-vermilion")} role="status">
          {notice.message}
        </div>
      )}

      <PageHeader
        badge={t("dashboard.cockpitBadge")}
        title={
          <span className="flex flex-wrap items-center gap-4">
            <span>{t("dashboard.today")}</span>
            <span className="text-white/10 text-xl font-light select-none">|</span>
            <DashboardClocks />
          </span>
        }
        description={todayLabel}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canInstallPwa && (
              <button
                onClick={triggerInstallPwa}
                className="brse-button border-cyan/25 bg-cyan/10 text-cyan hover:bg-cyan/20 group h-10 px-4 gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all duration-300"
                title={t("dashboard.pwaInstallTitle")}
              >
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                {t("dashboard.pwaInstallBtn")}
              </button>
            )}
            <button onClick={copyDashboardDailySummary} className="brse-button group h-10 px-4">
              <Copy className="h-4 w-4 transition-transform group-hover:rotate-12" />
              {t("dashboard.copySummary")}
            </button>
            <button onClick={() => setCustomizerOpen(true)} className="brse-button h-10 w-10 !p-0" title={t("dashboard.configureInterface")}>
              <Settings className="h-4 w-4 text-textMuted hover:text-textPrimary" />
            </button>
            <Link href="/app/meeting-note" className="brse-button group h-10 px-4">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
              </span>
              {t("dashboard.recordMeeting")}
            </Link>
            <Link href="/app/reports" className="brse-button brse-button-primary group h-10 px-5">
              <Zap className="h-4 w-4 fill-current" />
              {t("dashboard.dailyReport")}
            </Link>
          </div>
        }
      />

      <div className="mt-6 space-y-6">
        {loaded && isVisible("metricCards") && (
          <DashboardMetricCards
            t={t}
            todoRiskCount={todoCommand.deadlineRisk.length}
            qnaWaitingCount={waitingQna.length}
            pendingCrCount={pendingCr.length}
            meetingActionsCount={commandCenter?.metrics.unsynced_meeting_actions || 0}
            activeDrawer={drawerOpen}
            onToggleDrawer={(d) => setDrawerOpen(drawerOpen === d ? "" : d)}
          />
        )}

        {loaded && isVisible("projectOverview") && (
          <ProjectOverviewPanel projects={projects} activeProjectId={activeProject?.id} t={t} />
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            {loaded && getOrderedWidgets("left").map((w) => {
              if (!isVisible(w.id)) return null;
              switch (w.id) {
                case "commandIntelligence":
                  return (
                    <CommandIntelligenceBoard
                      key={w.id}
                      priorityFocus={priorityFocus}
                      priorityStack={priorityStack}
                      todoPercent={todoPercent}
                      qnaCount={waitingQna.length}
                      crCount={pendingCr.length}
                      overdueCount={todoCommand.deadlineRisk.length}
                      t={t}
                      onCopyHorenso={copyProactiveHorenso}
                      onMarkTodoDone={markTodoDone}
                      onSnoozeTodo={snoozeTodo}
                      onApproveMeetingDraft={approveMeetingDraft}
                      onRejectMeetingDraft={rejectMeetingDraft}
                      onMarkQnaReplied={markQnaReplied}
                    />
                  );
                case "weekPlanner":
                  return (
                    <WeekPlanner
                      key={w.id}
                      weekDates={weekDates}
                      todayIso={todayIso}
                      calendarSchedulesByDate={calendarSchedulesByDate}
                      weeklyScheduleCount={weeklyScheduleCount}
                      getDayRisk={getDayRisk}
                      t={t}
                      onSaveQuickSchedule={saveQuickSchedule}
                    />
                  );
                case "todayTimeline":
                  return (
                    <TodayTimeline key={w.id} todaySchedules={todaySchedules} t={t} />
                  );

                default:
                  return null;
              }
            })}
          </div>

          <aside className="space-y-5 lg:col-span-4">
            {loaded && getOrderedWidgets("right").map((w) => {
              if (!isVisible(w.id)) return null;
              switch (w.id) {
                case "morningBrief":
                  return (
                    <DashboardMorningBriefPanel
                      key={w.id}
                      activeProject={activeProject}
                      focus={priorityFocus}
                      priorityItems={priorityStack}
                      todaySchedules={todaySchedules.slice(0, 4).map(s => ({ title: s.title, time: "" }))} 
                      counts={{
                        todoRisks: todoCommand.deadlineRisk.length,
                        waitingQna: waitingQna.length,
                        pendingCr: pendingCr.length,
                        overdueOperations: overdueOperations.length,
                        meetingFollowUps: commandCenter?.metrics.unsynced_meeting_actions || 0,
                      }}
                      t={t}
                      onNotify={notify}
                    />
                  );
                case "communicationPulse":
                  return (
                    <CommunicationPulseCard key={w.id} t={t} />
                  );
                case "activityStream":
                  return (
                    <DashboardActivityStream key={w.id} history={history} t={t} />
                  );
                case "glossarySearch":
                  return (
                    <section key={w.id} className="brse-section p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{t("dashboard.quickTools")}</p>
                          <h3 className="mt-1 text-sm font-black text-textPrimary">{t("dashboard.glossaryAtPlace")}</h3>
                        </div>
                        <BookOpenText className="h-4 w-4 text-primary" />
                      </div>
                      <LiveGlossarySearch t={t} />
                      <div className="mt-3">
                        <Link href="/app/glossary" className="flex items-center justify-center gap-1 rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.02] py-2 text-xs font-bold text-textMuted transition hover:border-primary/20 hover:text-primary">
                          {t("dashboard.glossaryOpenFull")}
                        </Link>
                      </div>
                    </section>
                  );
                case "keigoComposer":
                  return (
                    <section key={w.id} className="brse-section p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{t("dashboard.aiKeigo")}</p>
                          <h3 className="mt-1 text-sm font-black text-textPrimary">{t("dashboard.keigoComposeQuick")}</h3>
                        </div>
                        <button
                          onClick={() => setIsComposerFullscreen(true)}
                          className="rounded-lg p-1 text-textMuted transition hover:bg-white/[0.06] hover:text-textPrimary"
                          title={t("dashboard.maximize")}
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <QuickKeigoComposer t={t} onNotify={notify} />
                    </section>
                  );
                default:
                  return null;
              }
            })}
          </aside>
        </div>
      </div>

      <DashboardDrawers
        drawerOpen={drawerOpen}
        onClose={() => setDrawerOpen("")}
        todoCommand={todoCommand}
        waitingQna={waitingQna}
        pendingCr={pendingCr}
        commandCenter={commandCenter}
        todayIso={todayIso}
        updatingTodoId={updatingTodoId}
        updatingOperationId={updatingOperationId}
        updatingMeetingDraftId={updatingMeetingDraftId}
        onMarkTodoDone={markTodoDone}
        onMarkQnaReplied={markQnaReplied}
        onCopyCrFollowUp={copyCrFollowUp}
        onApproveMeetingDraft={approveMeetingDraft}
        onRejectMeetingDraft={rejectMeetingDraft}
        onCopyProactiveHorenso={copyProactiveHorenso}
        todoActionHref={todoActionHref}
        qnaReminderCandidates={qnaReminderCandidates}
        t={t}
      />

      {/* Widget Customizer Drawer */}
      <DashboardCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        visibility={visibility}
        order={order}
        onToggle={toggleWidget}
        onMove={moveWidget}
        onReset={resetConfig}
        t={t}
      />

      {/* Fullscreen Keigo Composer Modal */}
      {isComposerFullscreen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="relative flex h-[90vh] w-full max-w-4xl flex-col border border-[var(--brse-panel-border)] bg-[linear-gradient(180deg,rgba(24,25,30,0.98),rgba(16,17,20,0.99))] p-6 shadow-2xl backdrop-blur-2xl rounded-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-black text-primary uppercase">{t("dashboard.focusMode")}</span>
                <h2 className="text-base font-black text-textPrimary">{t("dashboard.keigoFocusTitle")}</h2>
              </div>
              <button
                onClick={() => setIsComposerFullscreen(false)}
                className="brse-button h-8 w-8 !min-h-0 !p-0"
                title={t("dashboard.minimize")}
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <QuickKeigoComposer t={t} onNotify={notify} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
