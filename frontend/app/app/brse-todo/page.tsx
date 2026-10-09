"use client";

import { useRef } from "react";
import { useTodoProjectSync } from "@/features/todo/useTodoProjectSync";
import { TodoPageHeader } from "@/features/todo/TodoPageHeader";
import { TodoWorkflowPanel } from "@/features/todo/TodoWorkflowPanel";
import { TodoTaskBoard } from "@/features/todo/TodoTaskBoard";

export default function BrseTodoPage() {
  const sync = useTodoProjectSync();
  const phaseListRef = useRef<HTMLDivElement | null>(null);
  const itemListRef = useRef<HTMLDivElement | null>(null);
  const phaseButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (!sync.isLoaded) {
    return (
      <main className="brse-page flex items-center justify-center min-h-[400px]">
        <div className="text-center text-textMuted font-medium">
          {sync.t("todo.loading")}
        </div>
      </main>
    );
  }

  return (
    <main className="brse-page">
      <TodoPageHeader
        t={sync.t}
        activeProjectName={sync.activeProjectName}
        progress={sync.progress}
        overdueCount={sync.overdueCount}
        soonCount={sync.soonCount}
        openItemsCount={sync.openItemsCount}
        linkedCount={sync.linkedCount}
        exportMarkdown={sync.exportMarkdown}
        resetChecklist={sync.resetChecklist}
        saveSnapshot={sync.saveSnapshot}
      />

      {sync.externalChangeNotice ? (
        <section className="mb-5 flex flex-col gap-3 rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-gold md:flex-row md:items-center md:justify-between">
          <p>{sync.externalChangeNotice}</p>
          <button
            type="button"
            onClick={sync.reloadState}
            className="inline-flex items-center justify-center rounded-md border border-gold/35 bg-background/40 px-3 py-2 font-semibold text-gold transition hover:border-gold/60"
          >
            {sync.t("todo.reloadLatest")}
          </button>
        </section>
      ) : null}

      <TodoWorkflowPanel
        t={sync.t}
        activeProjectId={sync.activeProjectId}
        activeProjectName={sync.activeProjectName}
        projects={sync.projects}
        activeProjects={sync.activeProjects}
        archivedProjects={sync.archivedProjects}
        preset={sync.preset}
        newProjectName={sync.newProjectName}
        setNewProjectName={sync.setNewProjectName}
        switchProject={sync.switchProject}
        renameActiveProject={sync.renameActiveProject}
        addProject={sync.addProject}
        changePreset={sync.changePreset}
        cloneActiveProject={sync.cloneActiveProject}
        archiveActiveProject={sync.archiveActiveProject}
        deleteActiveProject={sync.deleteActiveProject}
        remindDeadlines={sync.remindDeadlines}
        restoreProject={sync.restoreProject}
        deadlineNotice={sync.deadlineNotice}
        progress={sync.progress}
        doneCount={sync.doneCount}
        itemsCount={sync.items.length}
        p0Progress={sync.p0Progress}
        p0Done={sync.p0Done}
        p0ItemsCount={sync.p0Items.length}
        overdueCount={sync.overdueCount}
        soonCount={sync.soonCount}
        linkedCount={sync.linkedCount}
        evidenceCount={sync.evidenceCount}
        phases={sync.phases}
        activePhase={sync.activePhase}
        phaseStats={sync.phaseStats}
        selectPhase={sync.selectPhase}
        currentPhaseNumber={sync.currentPhaseNumber}
        openItemsCount={sync.openItemsCount}
        currentPhaseOpenCount={sync.currentPhaseOpenCount}
        previousPhaseBlockers={sync.previousPhaseBlockers}
        selectedPhaseStat={sync.selectedPhaseStat}
        deadlineRiskItemsCount={sync.deadlineRiskItems.length}
      />

      {sync.savedAt ? (
        <div className="my-5 rounded-lg border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm text-green-300">
          {sync.t("todo.savedAt")} {sync.savedAt}.
        </div>
      ) : null}

      <div className="brse-card brse-card-muted my-5 px-4 py-2 text-xs font-semibold text-textMuted">
        Sync: {sync.t(`todo.syncStatus.${sync.syncStatus === sync.t("todo.syncStatus.synced") ? "synced" : sync.syncStatus === sync.t("todo.syncStatus.offline") ? "offline" : sync.syncStatus === sync.t("todo.syncStatus.cleared") ? "cleared" : sync.syncStatus === sync.t("todo.syncStatus.empty") ? "empty" : "usingLocal"}` as any)}
      </div>

      <TodoTaskBoard
        t={sync.t}
        items={sync.items}
        operations={sync.operations}
        activePhase={sync.activePhase}
        filter={sync.filter}
        setFilter={sync.setFilter}
        query={sync.query}
        setQuery={sync.setQuery}
        expandedItemId={sync.expandedItemId}
        setExpandedItemId={sync.setExpandedItemId}
        subtaskDrafts={sync.subtaskDrafts}
        setSubtaskDrafts={sync.setSubtaskDrafts}
        itemListRef={itemListRef}
        phaseListRef={phaseListRef}
        phaseButtonRefs={phaseButtonRefs}
        phaseStats={sync.phaseStats}
        selectPhase={sync.selectPhase}
        previousPhase={sync.previousPhase}
        nextPhaseName={sync.nextPhaseName}
        selectedPhaseStat={sync.selectedPhaseStat}
        filteredItems={sync.filteredItems}
        staleDoneItems={sync.staleDoneItems}
        dailyReport={sync.dailyReport}
        copyDailyReport={sync.copyDailyReport}
        reportCopied={sync.reportCopied}
        nextFocus={sync.nextFocus}
        deadlineRiskItems={sync.deadlineRiskItems}
        toggleItem={sync.toggleItem}
        updateItem={sync.updateItem}
        toggleSubtask={sync.toggleSubtask}
        addSubtask={sync.addSubtask}
        attachEvidenceImageFromClipboard={sync.attachEvidenceImageFromClipboard}
        setActivePhase={sync.setActivePhase}
      />
    </main>
  );
}
