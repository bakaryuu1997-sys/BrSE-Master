"use client";

import { useRef, useMemo } from "react";
import { FolderPlus, Copy, Archive, Trash2, Bell, CheckCircle2 } from "lucide-react";
import { TodoProject, PresetKey, presetLabels } from "./useTodoProjectSync";

interface TodoWorkflowPanelProps {
  t: any;
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

  progress: number;
  doneCount: number;
  itemsCount: number;
  p0Progress: number;
  p0Done: number;
  p0ItemsCount: number;
  overdueCount: number;
  soonCount: number;
  linkedCount: number;
  evidenceCount: number;

  phases: string[];
  activePhase: string;
  phaseStats: any[];
  selectPhase: (phase: string) => void;
  currentPhaseNumber: number;
  openItemsCount: number;
  currentPhaseOpenCount: number;
  previousPhaseBlockers: any[];
  selectedPhaseStat: any;
  deadlineRiskItemsCount: number;
}

export function TodoWorkflowPanel({
  t,
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

  progress,
  doneCount,
  itemsCount,
  p0Progress,
  p0Done,
  p0ItemsCount,
  overdueCount,
  soonCount,
  linkedCount,
  evidenceCount,

  phases,
  activePhase,
  phaseStats,
  selectPhase,
  currentPhaseNumber,
  openItemsCount,
  currentPhaseOpenCount,
  previousPhaseBlockers,
  selectedPhaseStat,
  deadlineRiskItemsCount,
}: TodoWorkflowPanelProps) {
  return (
    <div className="space-y-6">
      {/* Project Configuration Bar */}
      <section className="brse-section grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_220px_auto] xl:items-end">
        <label className="grid gap-1 text-xs font-semibold text-textMuted">
          {t("todo.activeProject")}
          <select
            value={activeProjectId}
            onChange={(event) => switchProject(event.target.value)}
            className="h-11 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-sm text-ink outline-none focus:border-primary"
          >
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-semibold text-textMuted">
          {t("todo.projectName")}
          <input
            value={activeProjectName}
            onChange={(event) => renameActiveProject(event.target.value)}
            className="h-11 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-sm text-ink outline-none focus:border-primary"
            placeholder="VD: EC site phase 2"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold text-textMuted">
          {t("todo.addParallelProject")}
          <input
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addProject();
            }}
            className="h-11 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-sm text-ink outline-none focus:border-primary"
            placeholder={t("todo.newProjectPlaceholder")}
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold text-textMuted">
          {t("todo.preset")}
          <select
            value={preset}
            onChange={(event) => changePreset(event.target.value as PresetKey)}
            className="h-11 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-sm text-ink outline-none focus:border-primary"
          >
            {Object.entries(presetLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={addProject}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-4 text-sm font-semibold text-primary hover:bg-primary/25"
        >
          <FolderPlus className="h-4 w-4" />
          {t("todo.add")}
        </button>
      </section>

      {/* Project Action Bar */}
      <section className="brse-section grid gap-3 p-4 xl:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={cloneActiveProject}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-3 text-sm font-semibold text-ink hover:border-primary/35"
          >
            <Copy className="h-4 w-4 text-primary" />
            {t("todo.cloneProject")}
          </button>
          <button
            type="button"
            onClick={archiveActiveProject}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 text-sm font-semibold text-amber-300 hover:bg-amber-400/15"
          >
            <Archive className="h-4 w-4" />
            {t("todo.archiveProject")}
          </button>
          <button
            type="button"
            onClick={deleteActiveProject}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-vermilion/30 bg-vermilion/10 px-3 text-sm font-semibold text-vermilion hover:bg-vermilion/15"
          >
            <Trash2 className="h-4 w-4" />
            {t("todo.deleteProject")}
          </button>
        </div>
        <button
          type="button"
          onClick={remindDeadlines}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 text-sm font-semibold text-primary hover:bg-primary/25"
        >
          <Bell className="h-4 w-4" />
          {t("todo.deadlineNotification")}
        </button>
        {deadlineNotice ? <p className="text-xs leading-5 text-textMuted xl:col-span-2">{deadlineNotice}</p> : null}
        {archivedProjects.length ? (
          <div className="flex flex-wrap items-center gap-2 xl:col-span-2">
            <span className="text-xs font-semibold text-textMuted">{t("todo.archivedProjects")}:</span>
            {archivedProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => restoreProject(project.id)}
                className="rounded border border-[var(--brse-panel-border)] bg-background px-2 py-1 text-xs font-semibold text-textMuted hover:border-primary/35 hover:text-primary"
              >
                {t("todo.restore")} {project.name}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {/* Basic Metrics Display */}
      <section className="grid gap-4 md:grid-cols-5">
        {[
          [t("todo.overall"), `${progress}%`, `${doneCount}/${itemsCount} ${t("todo.doneItems")}`],
          [t("todo.critical"), `${p0Progress}%`, `${p0Done}/${p0ItemsCount} ${t("todo.criticalItems")}`],
          [t("todo.deadline"), `${overdueCount}/${soonCount}`, t("todo.deadlineItems")],
          [t("todo.linked"), `${linkedCount}`, t("todo.linkedItems")],
          [t("todo.evidence"), `${evidenceCount}`, t("todo.evidenceItems")],
        ].map(([label, value, note]) => (
          <div key={label} className="brse-card p-5">
            <p className="text-muted text-[10px] font-bold uppercase tracking-[0.2em]">{label}</p>
            <p className="mt-2 text-2xl font-display font-extrabold text-white">{value}</p>
            <p className="mt-1 text-xs text-muted font-medium">{note}</p>
          </div>
        ))}
      </section>

      {/* Bird's Eye View Phase Progress Panel */}
      <section className="brse-section p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-muted text-[10px] font-bold uppercase tracking-[0.25em]">{t("todo.birdEye")}</p>
            <h2 className="mt-2 text-2xl font-display font-extrabold text-textPrimary">
              {t("todo.phaseInfo").replace("{current}", String(currentPhaseNumber)).replace("{total}", String(phases.length))}: {activePhase.replace(/^\d+\.\s*/, t(("todo.phase." + activePhase.split(".")[0]) as any))}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink font-medium">
              {t("todo.remaining")} <span className="text-textPrimary">{openItemsCount}</span> {t("todo.openInProject")} · <span className="text-primary">{currentPhaseOpenCount}</span> {t("todo.openInPhase")}
              {previousPhaseBlockers.length ? ` · ` : ""}
              {previousPhaseBlockers.length ? <span className="text-danger font-bold">{previousPhaseBlockers.length} {t("todo.blockerPrefix")}</span> : ` · ${t("todo.noBlockers")}`}.
            </p>
          </div>
          <div className="grid gap-3 text-xs sm:grid-cols-3 lg:min-w-[440px]">
            <div className="brse-card p-4">
              <p className="font-bold uppercase tracking-wider text-muted">{t("todo.currentPhase")}</p>
              <p className="mt-2 text-2xl font-display font-extrabold text-textPrimary">{selectedPhaseStat?.progress ?? 0}%</p>
            </div>
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
              <p className="font-bold uppercase tracking-wider text-danger/80">{t("todo.deadlineRisk")}</p>
              <p className="mt-2 text-2xl font-display font-extrabold text-textPrimary">{deadlineRiskItemsCount}</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="font-bold uppercase tracking-wider text-primary">{t("todo.linkedOps")}</p>
              <p className="mt-2 text-2xl font-display font-extrabold text-textPrimary">{linkedCount}</p>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-7">
          {phaseStats.map((stat, index) => {
            const isActive = stat.phase === activePhase;
            const isDone = stat.total > 0 && stat.done === stat.total;
            const phaseOpen = stat.total - stat.done;
            return (
              <button
                key={stat.phase}
                type="button"
                onClick={() => selectPhase(stat.phase)}
                className={`min-h-[120px] rounded-xl border p-4 text-left transition-all duration-300 ${
                  isActive
                    ? "border-primary/60 bg-primary/15 shadow-glow-indigo scale-[1.02] ring-1 ring-primary/30"
                    : isDone
                      ? "border-success/20 bg-success/[0.04] opacity-90 shadow-sm"
                      : "border-[var(--brse-panel-border)] bg-surface/40 shadow-sm hover:border-primary/25 hover:bg-surfaceHover/60 hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${isActive ? "bg-primary text-textPrimary" : "bg-surfaceHover text-textMuted"}`}>
                    {index + 1}
                  </span>
                  {isDone ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span className={`text-[10px] font-bold ${isActive ? "text-primary" : "text-muted"}`}>{stat.progress}%</span>}
                </div>
                <p className={`mt-3 line-clamp-2 text-[11px] font-bold leading-relaxed ${isActive ? "text-textPrimary" : "text-ink"}`}>{t(`todo.phase.${stat.phase.split(".")[0]}` as any)}</p>
                <div className="mt-3 h-1 rounded-full bg-border">
                  <div className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-success" : "bg-primary"}`} style={{ width: `${stat.progress}%` }} />
                </div>
                <p className="mt-3 text-[10px] font-medium text-muted">{phaseOpen} open / {stat.total}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
