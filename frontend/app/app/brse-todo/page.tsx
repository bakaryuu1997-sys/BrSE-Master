"use client";

import { useRef, useState } from "react";
import { useTodoProjectSync } from "@/features/todo/useTodoProjectSync";
import { TodoPageHeader } from "@/features/todo/TodoPageHeader";
import { TodoWorkflowPanel } from "@/features/todo/TodoWorkflowPanel";
import { TodoTaskBoard } from "@/features/todo/TodoTaskBoard";
import { exportProjectSignOffHtml } from "@/lib/projectSignOffExport";

export default function BrseTodoPage() {
  const sync = useTodoProjectSync();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
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
    <main className="brse-page py-3">
      {/* Sleek Compact Toolbar */}
      <TodoPageHeader
        t={sync.t}
        activeProjectId={sync.activeProjectId}
        activeProjectName={sync.activeProjectName}
        activeProjects={sync.activeProjects}
        switchProject={sync.switchProject}
        progress={sync.progress}
        overdueCount={sync.overdueCount}
        soonCount={sync.soonCount}
        openItemsCount={sync.openItemsCount}
        linkedCount={sync.linkedCount}
        syncStatus={sync.syncStatus}
        exportMarkdown={sync.exportMarkdown}
        onExportSignOff={() => {
          const currentProject = sync.projects.find((p) => p.id === sync.activeProjectId) || {
            id: sync.activeProjectId,
            name: sync.activeProjectName,
          };
          exportProjectSignOffHtml(currentProject as any, sync.items);
        }}
        resetChecklist={sync.resetChecklist}
        saveSnapshot={sync.saveSnapshot}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {sync.externalChangeNotice ? (
        <section className="mb-3 flex flex-col gap-2 rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs text-gold md:flex-row md:items-center md:justify-between">
          <p>{sync.externalChangeNotice}</p>
          <button
            type="button"
            onClick={sync.reloadState}
            className="inline-flex items-center justify-center rounded-md border border-gold/35 bg-background/40 px-2.5 py-1 font-semibold text-gold transition hover:border-gold/60"
          >
            {sync.t("todo.reloadLatest")}
          </button>
        </section>
      ) : null}

      {sync.savedAt ? (
        <div className="mb-3 rounded-lg border border-green-400/30 bg-green-400/10 px-3 py-2 text-xs text-green-300">
          {sync.t("todo.savedAt")} {sync.savedAt}.
        </div>
      ) : null}

      {/* Main 3-Column Task Board: Phase Stepper | Task List | Right Dock */}
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
        addNewItem={sync.addNewItem}
        deleteItem={sync.deleteItem}
        toggleSubtask={sync.toggleSubtask}
        addSubtask={sync.addSubtask}
        attachEvidenceImageFromClipboard={sync.attachEvidenceImageFromClipboard}
        setActivePhase={sync.setActivePhase}
      />

      {/* Project Configuration & Management Modal */}
      <TodoWorkflowPanel
        t={sync.t}
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
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
      />
    </main>
  );
}
