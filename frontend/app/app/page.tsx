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
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getBrseTodoCommandSummary } from "@/lib/brseTodo";
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
import { PortfolioProgressStrip } from "@/components/dashboard/PortfolioProgressStrip";
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
import { WeatherAisatsuWidget } from "@/components/dashboard/WeatherAisatsuWidget";
import { QuickCreateTicketModal } from "@/components/dashboard/QuickCreateTicketModal";
import { DailySyncModal } from "@/components/dashboard/DailySyncModal";
import { DualTimezoneSmartPing } from "@/components/dashboard/DualTimezoneSmartPing";

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
    selectedProjectId,
    setSelectedProjectId,
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
  const [quickTicketOpen, setQuickTicketOpen] = useState(false);
  const [dailySyncOpen, setDailySyncOpen] = useState(false);
  const [dailySyncTime, setDailySyncTime] = useState("17:30");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTime = localStorage.getItem("brse.dailySync.time");
      if (savedTime) setDailySyncTime(savedTime);
    }
  }, []);

  function handleUpdateDailySyncTime(time: string) {
    setDailySyncTime(time);
    if (typeof window !== "undefined") {
      localStorage.setItem("brse.dailySync.time", time);
    }
  }

  // Auto-trigger Daily Sync when current time matches dailySyncTime (once per day)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const currentHhMm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayStr = now.toISOString().slice(0, 10);
      const lastTriggeredDate = localStorage.getItem("brse.dailySync.lastTriggeredDate");

      if (currentHhMm === dailySyncTime && lastTriggeredDate !== todayStr) {
        localStorage.setItem("brse.dailySync.lastTriggeredDate", todayStr);
        setDailySyncOpen(true);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [dailySyncTime]);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === "Q" || e.key === "q")) ||
        (e.altKey && (e.key === "q" || e.key === "Q"))
      ) {
        e.preventDefault();
        setQuickTicketOpen(true);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  function handleTicketCreated(record: any) {
    setOperations((prev) => [record, ...prev]);
    setTodoCommand(getBrseTodoCommandSummary(selectedProjectId));
  }

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
        compact
        badge={t("dashboard.cockpitBadge")}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span>{t("dashboard.today")}</span>
            <span className="select-none text-lg font-light text-white/10">|</span>
            <DashboardClocks />
            <WeatherAisatsuWidget />
          </span>
        }
        description={`${todayLabel} · ${selectedProjectId === "all" ? `🌐 ${t("dashboard.allProjects")}` : (projects.find((p) => p.id === selectedProjectId)?.name || activeProject?.name || "Sensei Hub")}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canInstallPwa && (
              <button
                onClick={triggerInstallPwa}
                className="brse-button group h-8.5 gap-1.5 border-cyan/25 bg-cyan/10 px-3 text-xs text-cyan shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-300 hover:bg-cyan/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                title={t("dashboard.pwaInstallTitle")}
              >
                <Download className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
                {t("dashboard.pwaInstallBtn")}
              </button>
            )}
            <button
              onClick={() => setQuickTicketOpen(true)}
              className="brse-button group h-8.5 gap-1.5 border-amber-500/30 bg-amber-500/10 px-3 text-xs font-black text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300 hover:bg-amber-500/20"
              title="Tạo nhanh Q&A / Bug / CR (Ctrl+Shift+Q)"
            >
              <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
              <span>+ Thêm ticket</span>
            </button>
            <button
              onClick={() => setDailySyncOpen(true)}
              className="brse-button group h-8.5 gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-black text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all duration-300 hover:bg-emerald-500/20"
              title={`Tổng kết ngày & Hou-Ren-So tự động (Giờ nhắc tùy chỉnh: ${dailySyncTime})`}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 transition-transform group-hover:scale-110" />
              <span>⚡ Báo cáo ngày ({dailySyncTime})</span>
            </button>
            <button onClick={copyDashboardDailySummary} className="brse-button group h-8.5 gap-1.5 px-3 text-xs">
              <Copy className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
              {t("dashboard.copySummary")}
            </button>
            <button onClick={() => setCustomizerOpen(true)} className="brse-button h-8.5 w-8.5 !p-0" title={t("dashboard.configureInterface")}>
              <Settings className="h-3.5 w-3.5 text-textMuted hover:text-textPrimary" />
            </button>
            <Link href="/app/meeting-note" className="brse-button group h-8.5 gap-1.5 px-3 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
              </span>
              {t("dashboard.recordMeeting")}
            </Link>
            <Link href="/app/reports" className="brse-button brse-button-primary group h-8.5 gap-1.5 px-3.5 text-xs">
              <Zap className="h-3.5 w-3.5 fill-current" />
              {t("dashboard.dailyReport")}
            </Link>
          </div>
        }
      />

      <div className="mt-4 space-y-4">
        {/* Dual Timezone Smart Meeting Ping Banner */}
        <DualTimezoneSmartPing todaySchedules={todaySchedules} />

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
          <PortfolioProgressStrip
            projectStats={todoCommand.projectStats}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            t={t}
          />
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
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

          <aside className="space-y-4 lg:col-span-4">
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
                    <CommunicationPulseCard
                      key={w.id}
                      projectId={activeProject?.id}
                      t={t}
                    />
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
        projectLabel={selectedProjectId === "all" ? t("dashboard.allProjects") : (projects.find((p) => p.id === selectedProjectId)?.name || activeProject?.name || "")}
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
        onConvertToQna={convertDraftToQna}
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
      {/* Quick Create Ticket Modal (Ctrl+Shift+Q) */}
      <QuickCreateTicketModal
        open={quickTicketOpen}
        onClose={() => setQuickTicketOpen(false)}
        projects={projects}
        defaultProjectId={selectedProjectId === "all" ? activeProject?.id : selectedProjectId}
        onCreated={handleTicketCreated}
        notify={notify}
        t={t}
      />
      {/* One-Click Daily Sync Modal */}
      <DailySyncModal
        open={dailySyncOpen}
        onClose={() => setDailySyncOpen(false)}
        todoCommand={todoCommand}
        operations={operations}
        activeProject={activeProject}
        dailySyncTime={dailySyncTime}
        onUpdateSyncTime={handleUpdateDailySyncTime}
      />
    </main>
  );
}
