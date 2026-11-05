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
