"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Clipboard,
  Download,
  FileSpreadsheet,
  Plus,
  Upload,
} from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import {
  deleteDecisionLogServerFirst,
  deleteOperationDependencyLinkServerFirst,
  deleteOperationRecord,
  deleteOperationTestMatrixItemServerFirst,
  getOperationRecords,
  getOperationDependencyLinks,
  getOperationDependencyLinksServerFirst,
  getOperationTestMatrixItems,
  getOperationTestMatrixItemsServerFirst,
  getDecisionLogs,
  getDecisionLogsServerFirst,
  getReleaseGate,
  getReleaseGateServerFirst,
  getSlaEscalations,
  importOperationsCsv,
  isOverdue,
  saveDecisionLogServerFirst,
  saveOperationDependencyLinkServerFirst,
  saveOperationRecord,
  saveReleaseGateServerFirst,
  saveOperationTestMatrixItemServerFirst,
  type DecisionLogInput,
  type OperationDependencyInput,
  type OperationDependencyLink,
  type OperationRecord,
  type OperationRecordInput,
  type OperationType,
  type OperationTestMatrixInput,
  type ReleaseGateChecklist,
  type TestMatrixStatus,
  exportOperationsCsvJP,
  type OperationExportRow,
  downloadImportTemplate
} from "@/lib/operations";
import {
  findBrseTodoLinksByOperation,
  readActiveBrseTodoProjectId,
  readAllBrseTodoLinks,
  readBrseTodoProjects,
  upsertOperationTodo,
  type BrseTodoOperationLink,
  type BrseTodoProject,
} from "@/lib/brseTodo";
import { getActiveProject } from "@/lib/projectSettings";
import {
  configs,
  daysSince,
  emptyDecisionForm,
  emptyDependencyForm,
  emptyForm,
  emptyTestMatrixForm,
  OperationsWorkspaceTabs,
  todayIso,
  buildOperationsBriefingItems,
  buildOperationsEmailPreviewState,
  buildOperationsReleaseModel,
  toOperationInput,
  OperationsHeaderToolbar,
} from "@/features/operations";
import dynamic from "next/dynamic";

const OperationsMorningBriefing = dynamic(
  () => import("@/features/operations").then((m) => m.OperationsMorningBriefing),
  { ssr: false }
);
const OperationsWorkSurface = dynamic(
  () => import("@/features/operations").then((m) => m.OperationsWorkSurface),
  { ssr: false }
);
const OperationRecordSlideOver = dynamic(
  () => import("@/features/operations").then((m) => m.OperationRecordSlideOver),
  { ssr: false }
);
const OperationsReleaseWorkspace = dynamic(
  () => import("@/features/operations").then((m) => m.OperationsReleaseWorkspace),
  { ssr: false }
);

import { useOperationsState } from "@/hooks/useOperationsState";

export default function OperationsPage() {
  const { t } = useUiLanguage();
  const {
    activeType,
    setActiveType,
    form,
    editingId,
    isRecordEditorOpen,
    setIsRecordEditorOpen,
    query,
    setQuery,
    selectedId,
    setSelectedId,
    status,
    isLoading,
    workspaceTab,
    setWorkspaceTab,
    selectedRecords,
    setSelectedRecords,
    typeTitle,
    filteredRecords,
    selectedRecord,
    currentProjectName,
    selectedTodoLinks,
    linkedOperationIds,
    qnaAging,
    projectReleaseGate,
    releaseGateProgress,
    projectOpenQna,
    projectCriticalBugs,
    projectPendingCr,
    recordById,
    dependencyRows,
    projectTestMatrixItems,
    testMatrixStats,
    testMatrixPercent,
    slaEscalations,
    operationsBriefingItems,
    isBatchMode,
    emailPreview,
    emailSubject,
    switchType,
    updateField,
    startEdit,
    submitRecord,
    removeRecord,
    copyEmail,
    startDecisionCreate,
    startDecisionEdit,
    submitDecisionLog,
    removeDecision,
    updateDecisionField,
    updateReleaseGateField,
    syncReleaseGateSnapshot,
    startDependencyCreate,
    updateDependencyField,
    submitDependency,
    startDependencyEdit,
    removeDependency,
    startTestMatrixCreate,
    updateTestMatrixField,
    submitTestMatrix,
    startTestMatrixEdit,
    removeTestMatrixItem,
    applySlaEscalation,
    syncSelectedOperationToTodo,
    openGmail,
    handleImportCsv,
    handleExportCsv,
    toggleRecordSelection,
    bulkMarkSelectedQnaAnswered,
    decisionForm,
    editingDecisionId,
    setEditingDecisionId,
    setDecisionForm,
    dependencyForm,
    editingDependencyId,
    setEditingDependencyId,
    setDependencyForm,
    testMatrixForm,
    editingTestMatrixId,
    setEditingTestMatrixId,
    setTestMatrixForm,
    projectDecisionLogs,
    compactMode,
    setCompactMode,
    startCreate,
    projectRecords,
  } = useOperationsState();

  return (
    <main className="brse-page">
      <PageHeader
        compact
        badge={t("operations.badge")}
        title={t("operations.title")}
        className="mb-2"
      />

      {status ? (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            status.kind === "error"
              ? "border-vermilion/25 bg-vermilion/10 text-vermilion"
              : status.kind === "info"
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-matcha/25 bg-matcha/10 text-matcha"
          }`}
        >
          {status.text}
        </div>
      ) : null}

      <OperationsMorningBriefing
        isLoading={isLoading}
        slaEscalations={slaEscalations}
        projectOpenQna={projectOpenQna}
        projectPendingCr={projectPendingCr}
        operationsBriefingItems={operationsBriefingItems}
        switchType={switchType}
        setSelectedId={setSelectedId}
      />

      <OperationsWorkspaceTabs activeTab={workspaceTab} onChange={setWorkspaceTab} />

      {workspaceTab === "work" ? (
        <>
        <OperationsHeaderToolbar
          t={t}
          activeType={activeType}
          switchType={switchType}
          startCreate={startCreate}
          compactMode={compactMode}
          setCompactMode={setCompactMode}
          filteredRecordsCount={filteredRecords.length}
          handleExportCsv={handleExportCsv}
          handleImportCsv={handleImportCsv}
          downloadImportTemplate={downloadImportTemplate}
        />
        {activeType === "qna" && selectedRecords.size > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
            <p className="text-sm font-bold text-textPrimary">
              {t("operations.selectedQnaCount").replace("{count}", String(selectedRecords.size))}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={bulkMarkSelectedQnaAnswered}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-white transition hover:bg-primaryHover"
              >
                {t("operations.markAnswered")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecords(new Set())}
                className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.03] px-4 py-2 text-xs font-bold text-textMuted transition hover:text-textPrimary"
              >
                {t("operations.deselect")}
              </button>
            </div>
          </div>
        ) : null}
        <OperationsWorkSurface
          t={t}
          compactMode={compactMode}
          isLoading={isLoading}
          query={query}
          setQuery={setQuery}
          filteredRecords={filteredRecords}
          selectedRecords={selectedRecords}
          activeType={activeType}
          toggleRecordSelection={toggleRecordSelection}
          selectedRecord={selectedRecord}
          setSelectedId={setSelectedId}
          setActiveType={setActiveType}
          startEdit={startEdit}
          removeRecord={removeRecord}
          linkedOperationIds={linkedOperationIds}
          qnaAging={qnaAging}
          slaEscalations={slaEscalations}
          applySlaEscalation={applySlaEscalation}
          isBatchMode={isBatchMode}
          selectedTodoLinks={selectedTodoLinks}
          syncSelectedOperationToTodo={syncSelectedOperationToTodo}
          emailPreview={emailPreview}
          emailSubject={emailSubject}
          copyEmail={copyEmail}
          openGmail={openGmail}
        />
        </>
      ) : null}

      <OperationRecordSlideOver
        isOpen={isRecordEditorOpen}
        isLoading={isLoading}
        activeType={activeType}
        typeTitle={typeTitle}
        form={form}
        editingId={editingId}
        status={status}
        onClose={() => setIsRecordEditorOpen(false)}
        onSubmit={submitRecord}
        onFieldChange={updateField}
      />

      <OperationsReleaseWorkspace
        workspaceTab={workspaceTab}
        t={t}
        currentProjectName={currentProjectName}
        startDecisionCreate={startDecisionCreate}
        submitDecisionLog={submitDecisionLog}
        decisionForm={decisionForm}
        updateDecisionField={updateDecisionField}
        editingDecisionId={editingDecisionId}
        setEditingDecisionId={setEditingDecisionId}
        setDecisionForm={setDecisionForm}
        projectDecisionLogs={projectDecisionLogs}
        startDecisionEdit={startDecisionEdit}
        removeDecision={removeDecision}
        setSelectedId={setSelectedId}
        projectReleaseGate={projectReleaseGate}
        releaseGateProgress={releaseGateProgress}
        updateReleaseGateField={updateReleaseGateField}
        projectOpenQna={projectOpenQna}
        projectCriticalBugs={projectCriticalBugs}
        projectPendingCr={projectPendingCr}
        syncReleaseGateSnapshot={syncReleaseGateSnapshot}
        startDependencyCreate={startDependencyCreate}
        submitDependency={submitDependency}
        dependencyForm={dependencyForm}
        updateDependencyField={updateDependencyField}
        projectRecords={projectRecords}
        editingDependencyId={editingDependencyId}
        setEditingDependencyId={setEditingDependencyId}
        setDependencyForm={setDependencyForm}
        dependencyRows={dependencyRows}
        startDependencyEdit={startDependencyEdit}
        removeDependency={removeDependency}
        testMatrixPercent={testMatrixPercent}
        testMatrixStats={testMatrixStats}
        startTestMatrixCreate={startTestMatrixCreate}
        submitTestMatrix={submitTestMatrix}
        testMatrixForm={testMatrixForm}
        updateTestMatrixField={updateTestMatrixField}
        editingTestMatrixId={editingTestMatrixId}
        setEditingTestMatrixId={setEditingTestMatrixId}
        setTestMatrixForm={setTestMatrixForm}
        projectTestMatrixItems={projectTestMatrixItems}
        recordById={recordById}
        startTestMatrixEdit={startTestMatrixEdit}
        removeTestMatrixItem={removeTestMatrixItem}
      />    </main>
  );
}
