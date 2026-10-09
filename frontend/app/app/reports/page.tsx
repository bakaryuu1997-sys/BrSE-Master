"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useReportsState } from "@/features/reports/useReportsState";
import { ReportsPageHeader } from "@/features/reports/ReportsPageHeader";
import dynamic from "next/dynamic";

const ReportsDailyBuilder = dynamic(
  () => import("@/features/reports/ReportsDailyBuilder").then((m) => m.ReportsDailyBuilder),
  { ssr: false }
);
const ReportsWeeklyBuilder = dynamic(
  () => import("@/features/reports/ReportsWeeklyBuilder").then((m) => m.ReportsWeeklyBuilder),
  { ssr: false }
);
const ReportsAiRefinerModal = dynamic(
  () => import("@/features/reports/ReportsAiRefinerModal").then((m) => m.ReportsAiRefinerModal),
  { ssr: false }
);

export default function ReportsPage() {
  const state = useReportsState();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <main className="brse-page">
      <ReportsPageHeader
        t={state.t}
        analytics={state.analytics}
        activeTab={state.activeTab}
        setActiveTab={state.setActiveTab}
        fillFromLiveData={state.fillFromLiveData}
        reportLanguage={state.reportLanguage}
        setReportLanguage={state.setReportLanguage}
        projectMemory={state.projectMemory}
        projectExecutionWarnings={state.projectExecutionWarnings}
      />

      {/* Status Alert Banner */}
      {state.status && (
        <div className="brse-card brse-card-muted mb-4 flex items-center justify-between px-4 py-3 text-sm text-ink animate-fade-in">
          <span>{state.status}</span>
          <button onClick={() => state.setStatus("")} aria-label="Close status alert">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Overview stats marquee row */}
      <section className="cinema-grid scene-marquee mb-6 grid gap-4 p-4 lg:grid-cols-[1fr_0.8fr_0.8fr] lg:p-5">
        <div className="relative z-10 rounded-[22px] border border-primary/15 bg-background/45 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{state.t("reports.overview")}</p>
          <h2 className="mt-2 text-lg font-semibold text-ink">{state.t("reports.labDesc")}</h2>
          <p className="mt-2 text-sm leading-6 text-textMuted">
            {state.t("reports.labDescSub")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="scene-chip">Daily</span>
            <span className="scene-chip">Weekly</span>
            <span className="scene-chip">JP Business</span>
          </div>
        </div>
        <div className="scene-stat-card relative z-10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Flow health</p>
          <p className="mt-3 text-3xl font-black text-ink">{state.analytics.todoProgress}%</p>
          <p className="mt-1 text-xs text-textMuted">{state.analytics.todoDone}/{state.analytics.todoTotal || 0} todo đã chốt</p>
          <span className="scene-bar mt-4" style={{ width: `${Math.max(18, state.analytics.todoProgress)}%` }} />
        </div>
        <div className="scene-stat-card relative z-10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Attention lane</p>
          <p className="mt-3 text-3xl font-black text-ink">{state.analytics.waitingQna + state.analytics.pendingCr}</p>
          <p className="mt-1 text-xs text-textMuted">{state.t("dashboard.handleRisk")}</p>
          <span className="scene-bar mt-4 w-3/5" />
        </div>
      </section>

      {/* Daily Builder Form and Preview */}
      {state.activeTab === "daily" && (
        <ReportsDailyBuilder
          t={state.t}
          language={state.language}
          handleSubmit={state.handleSubmit}
          form={state.form}
          updateField={state.updateField}
          tasksDoneArr={state.tasksDoneArr}
          taskInput={state.taskInput}
          setTaskInput={state.setTaskInput}
          addTask={state.addTask}
          removeTask={state.removeTask}
          openAiReportRefiner={state.openAiReportRefiner}
          isLoading={state.isLoading}
          editingId={state.editingId}
          resetForm={state.resetForm}
          preview={state.preview}
          liveDailyPreview={state.liveDailyPreview}
          copyToClipboard={state.copyToClipboard}
          copied={state.copied}
          openEmailDraft={state.openEmailDraft}
          reportCalendar={state.reportCalendar}
          reportsByDate={state.reportsByDate}
          startEdit={state.startEdit}
          setEditingId={state.setEditingId}
          setForm={state.setForm}
          setTasksDoneArr={state.setTasksDoneArr}
          setPreview={state.setPreview}
          setStatus={state.setStatus}
          records={state.records}
          handleDelete={state.handleDelete}
          isHistoryOpen={isHistoryOpen}
          setIsHistoryOpen={setIsHistoryOpen}
        />
      )}

      {/* Weekly / Monthly Summary Views */}
      {(state.activeTab === "weekly" || state.activeTab === "monthly") && (
        <ReportsWeeklyBuilder
          t={state.t}
          language={state.language}
          activeTab={state.activeTab}
          setActiveTab={state.setActiveTab}
          weekStart={state.weekStart}
          weekEnd={state.weekEnd}
          weekRecords={state.weekRecords}
          weeklyText={state.weeklyText}
          copied={state.copied}
          copyToClipboard={state.copyToClipboard}
          openEmailDraft={state.openEmailDraft}
          records={state.records}
          form={state.form}
          resetForm={state.resetForm}
        />
      )}

      {/* AI Assistant Refiner Modal */}
      <ReportsAiRefinerModal
        t={state.t}
        isAiModalOpen={state.isAiModalOpen}
        setIsAiModalOpen={state.setIsAiModalOpen}
        aiBulletPoints={state.aiBulletPoints}
        setAiBulletPoints={state.setAiBulletPoints}
        generateWithAI={state.generateWithAI}
        isGeneratingAi={state.isGeneratingAi}
      />
    </main>
  );
}
