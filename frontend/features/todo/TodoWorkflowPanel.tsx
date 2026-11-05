"use client";

import { FolderPlus, Copy, Archive, Trash2, Bell, Settings, X } from "lucide-react";
import { TodoProject, PresetKey, presetLabels } from "./useTodoProjectSync";

interface TodoWorkflowPanelProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string;
  activeProjectName: string;
  projects: TodoProject[];
  activeProjects: TodoProject[];
  archivedProjects: TodoProject[];
  preset: PresetKey;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  switchProject: (id: string) => void;
  renameActiveProject: (name: string) => void;
  addProject: () => void;
  changePreset: (preset: PresetKey) => void;
  cloneActiveProject: () => void;
  archiveActiveProject: () => void;
  deleteActiveProject: () => void;
  remindDeadlines: () => void;
  restoreProject: (id: string) => void;
  deadlineNotice: string;
}

export function TodoWorkflowPanel({
  t,
  isOpen,
  onClose,
  activeProjectId,
  activeProjectName,
  projects,
  activeProjects,
  archivedProjects,
  preset,
  newProjectName,
  setNewProjectName,
  switchProject,
  renameActiveProject,
  addProject,
  changePreset,
  cloneActiveProject,
  archiveActiveProject,
  deleteActiveProject,
  remindDeadlines,
  restoreProject,
  deadlineNotice,
}: TodoWorkflowPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="brse-section w-full max-w-xl p-5 shadow-2xl border border-[var(--brse-panel-border)] bg-surface/95 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--brse-panel-border)]/60 mb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-ink">Cấu hình & Quản lý Dự án</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-textMuted hover:bg-surface hover:text-ink transition"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Project Name & Preset */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold text-textMuted">
            {t("todo.projectName")}
            <input
              value={activeProjectName}
              onChange={(event) => renameActiveProject(event.target.value)}
              className="field-control w-full py-2 px-3 text-xs bg-background/50 text-ink border-[var(--brse-panel-border)]"
              placeholder="VD: EC site phase 2"
            />
          </label>

          <label className="grid gap-1 text-xs font-bold text-textMuted">
            {t("todo.preset")}
            <select
              value={preset}
              onChange={(event) => changePreset(event.target.value as PresetKey)}
              className="field-control w-full py-2 px-3 text-xs bg-background/50 text-ink border-[var(--brse-panel-border)]"
            >
              {Object.entries(presetLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Add Parallel Project */}
        <div className="mt-4 pt-3 border-t border-[var(--brse-panel-border)]/50">
          <label className="grid gap-1 text-xs font-bold text-textMuted mb-1.5">
            {t("todo.addParallelProject")}
          </label>
          <div className="flex gap-2">
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addProject();
              }}
              className="field-control flex-1 py-1.5 px-3 text-xs bg-background/50 text-ink border-[var(--brse-panel-border)]"
              placeholder={t("todo.newProjectPlaceholder")}
            />
            <button
              type="button"
              onClick={addProject}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/20 px-3.5 text-xs font-bold text-primary hover:bg-primary/30 transition"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              {t("todo.add")}
            </button>
          </div>
        </div>

        {/* Project Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--brse-panel-border)]/60 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={cloneActiveProject}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-xs font-semibold text-ink hover:border-primary/40 transition"
            >
              <Copy className="h-3.5 w-3.5 text-primary" />
              {t("todo.cloneProject")}
            </button>
            <button
              type="button"
              onClick={archiveActiveProject}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition"
            >
              <Archive className="h-3.5 w-3.5" />
              {t("todo.archiveProject")}
            </button>
            <button
              type="button"
              onClick={deleteActiveProject}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-vermilion/30 bg-vermilion/10 px-3 text-xs font-semibold text-vermilion hover:bg-vermilion/20 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("todo.deleteProject")}
            </button>
          </div>

          <button
            type="button"
            onClick={remindDeadlines}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-3 text-xs font-semibold text-primary hover:bg-primary/25 transition"
          >
            <Bell className="h-3.5 w-3.5" />
            {t("todo.deadlineNotification")}
          </button>
        </div>

        {deadlineNotice ? (
          <p className="mt-3 text-xs leading-5 text-textMuted bg-background/40 p-2 rounded-lg border border-[var(--brse-panel-border)]">
            {deadlineNotice}
          </p>
        ) : null}

        {/* Archived Projects */}
        {archivedProjects.length ? (
          <div className="mt-4 pt-3 border-t border-[var(--brse-panel-border)]/50">
            <span className="text-xs font-bold text-textMuted block mb-2">{t("todo.archivedProjects")}:</span>
            <div className="flex flex-wrap gap-1.5">
              {archivedProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => restoreProject(project.id)}
                  className="rounded border border-[var(--brse-panel-border)] bg-background px-2.5 py-1 text-xs font-semibold text-textMuted hover:border-primary/40 hover:text-primary transition"
                >
                  {t("todo.restore")} {project.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Footer Close */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-surface/80 border border-[var(--brse-panel-border)] px-4 py-1.5 text-xs font-semibold text-ink hover:bg-surface transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
