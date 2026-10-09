"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { CheckSquare, Edit3, GitBranch, Link2, Plus, TestTube2, Trash2 } from "lucide-react";
import type {
  DecisionLogEntry,
  DecisionLogInput,
  OperationDependencyInput,
  OperationDependencyLink,
  OperationRecord,
  OperationTestMatrixInput,
  OperationTestMatrixItem,
  ReleaseGateChecklist,
  TestMatrixStatus,
} from "@/lib/operations";
import type { TranslationKey } from "@/lib/uiLanguage";
import {
  dependencyLabels,
  emptyDecisionForm,
  emptyDependencyForm,
  emptyTestMatrixForm,
  testStatuses,
} from "./operationsConfig";

type ReleaseGateProgress = { total: number; done: number; percent: number };
type TestMatrixStats = { total: number; passed: number; failed: number; blocked: number };
type DependencyRow = { link: OperationDependencyLink; source: OperationRecord | null; target: OperationRecord | null };

type OperationsReleaseWorkspaceProps = {
  workspaceTab: "work" | "release";
  t: (key: TranslationKey) => string;
  currentProjectName: string;
  startDecisionCreate: () => void;
  submitDecisionLog: (event: FormEvent<HTMLFormElement>) => void;
  decisionForm: DecisionLogInput;
  updateDecisionField: <K extends keyof DecisionLogInput>(key: K, value: DecisionLogInput[K]) => void;
  editingDecisionId: string;
  setEditingDecisionId: Dispatch<SetStateAction<string>>;
  setDecisionForm: Dispatch<SetStateAction<DecisionLogInput>>;
  projectDecisionLogs: DecisionLogEntry[];
  startDecisionEdit: (decisionId: string) => void;
  removeDecision: (decisionId: string) => void;
  setSelectedId: Dispatch<SetStateAction<string>>;
  projectReleaseGate: ReleaseGateChecklist;
  releaseGateProgress: ReleaseGateProgress;
  updateReleaseGateField: <K extends keyof ReleaseGateChecklist>(key: K, value: ReleaseGateChecklist[K]) => void;
  projectOpenQna: number;
  projectCriticalBugs: number;
  projectPendingCr: number;
  syncReleaseGateSnapshot: () => void;
  startDependencyCreate: () => void;
  submitDependency: (event: FormEvent<HTMLFormElement>) => void;
  dependencyForm: OperationDependencyInput;
  updateDependencyField: <K extends keyof OperationDependencyInput>(key: K, value: OperationDependencyInput[K]) => void;
  projectRecords: OperationRecord[];
  editingDependencyId: string;
  setEditingDependencyId: Dispatch<SetStateAction<string>>;
  setDependencyForm: Dispatch<SetStateAction<OperationDependencyInput>>;
  dependencyRows: DependencyRow[];
  startDependencyEdit: (link: OperationDependencyLink) => void;
  removeDependency: (linkId: string) => void;
  testMatrixPercent: number;
  testMatrixStats: TestMatrixStats;
  startTestMatrixCreate: () => void;
  submitTestMatrix: (event: FormEvent<HTMLFormElement>) => void;
  testMatrixForm: OperationTestMatrixInput;
  updateTestMatrixField: <K extends keyof OperationTestMatrixInput>(key: K, value: OperationTestMatrixInput[K]) => void;
  editingTestMatrixId: string;
  setEditingTestMatrixId: Dispatch<SetStateAction<string>>;
  setTestMatrixForm: Dispatch<SetStateAction<OperationTestMatrixInput>>;
  projectTestMatrixItems: OperationTestMatrixItem[];
  recordById: Map<string, OperationRecord>;
  startTestMatrixEdit: (itemId: string) => void;
  removeTestMatrixItem: (itemId: string) => void;
};

export function OperationsReleaseWorkspace({
  workspaceTab,
  t,
  currentProjectName,
  startDecisionCreate,
  submitDecisionLog,
  decisionForm,
  updateDecisionField,
  editingDecisionId,
  setEditingDecisionId,
  setDecisionForm,
  projectDecisionLogs,
  startDecisionEdit,
  removeDecision,
  setSelectedId,
  projectReleaseGate,
  releaseGateProgress,
  updateReleaseGateField,
  projectOpenQna,
  projectCriticalBugs,
  projectPendingCr,
  syncReleaseGateSnapshot,
  startDependencyCreate,
  submitDependency,
  dependencyForm,
  updateDependencyField,
  projectRecords,
  editingDependencyId,
  setEditingDependencyId,
  setDependencyForm,
  dependencyRows,
  startDependencyEdit,
  removeDependency,
  testMatrixPercent,
  testMatrixStats,
  startTestMatrixCreate,
  submitTestMatrix,
  testMatrixForm,
  updateTestMatrixField,
  editingTestMatrixId,
  setEditingTestMatrixId,
  setTestMatrixForm,
  projectTestMatrixItems,
  recordById,
  startTestMatrixEdit,
  removeTestMatrixItem,
}: OperationsReleaseWorkspaceProps) {
  return (
    <>      {workspaceTab === "release" ? (
      <>
      <section className="grid gap-5 p-4 xl:grid-cols-2">
        <section className="brse-section p-5">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--brse-panel-border)] pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Decision Log</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{t("operations.decisionLogTitle")}</h2>
              <p className="mt-1 text-xs text-textMuted">{t("operations.decisionLogDesc")}</p>
            </div>
            <button
              type="button"
              onClick={startDecisionCreate}
              className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t("operations.createFromSelection")}
            </button>
          </div>

          <form onSubmit={submitDecisionLog} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.fieldTitle")}</span>
                <input
                  value={decisionForm.title}
                  onChange={(event) => updateDecisionField("title", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                  placeholder={t("operations.decisionTitlePlaceholder")}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.decisionDate")}</span>
                <input
                  type="date"
                  value={decisionForm.decisionDate}
                  onChange={(event) => updateDecisionField("decisionDate", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.decisionContent")}</span>
              <textarea
                value={decisionForm.decision}
                onChange={(event) => updateDecisionField("decision", event.target.value)}
                rows={3}
                className="field-control px-3 py-2 text-sm leading-6 text-ink"
                placeholder={t("operations.decisionContentPlaceholder")}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.decisionOwner")}</span>
                <input
                  value={decisionForm.owner}
                  onChange={(event) => updateDecisionField("owner", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                  placeholder={t("operations.decisionOwnerPlaceholder")}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.evidence")}</span>
                <input
                  value={decisionForm.evidenceUrl}
                  onChange={(event) => updateDecisionField("evidenceUrl", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                  placeholder={t("operations.evidencePlaceholder")}
                />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.impact")}</span>
              <textarea
                value={decisionForm.impact}
                onChange={(event) => updateDecisionField("impact", event.target.value)}
                rows={2}
                className="field-control px-3 py-2 text-sm leading-6 text-ink"
                placeholder={t("operations.impactPlaceholder")}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {editingDecisionId ? t("operations.updateDecision") : t("operations.saveDecision")}
              </button>
              {editingDecisionId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDecisionId("");
                    setDecisionForm(emptyDecisionForm);
                  }}
                  className="field-control px-4 py-2 text-sm font-semibold text-ink"
                >
                  {t("operations.cancelEdit")}
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-5 grid gap-3">
            {projectDecisionLogs.length ? projectDecisionLogs.map((item) => (
              <article key={item.id} className="brse-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-xs text-textMuted">{item.decisionDate || "-"} · {item.owner || "-"} · {item.projectName || currentProjectName}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startDecisionEdit(item.id)}
                      className="rounded-md border border-[var(--brse-panel-border)] bg-surface/40 p-2 text-textMuted transition hover:border-primary/30 hover:text-primary hover:bg-surfaceHover hover:scale-105 shadow-sm"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDecision(item.id)}
                      className="rounded-md border border-[var(--brse-panel-border)] bg-surface/40 p-2 text-textMuted transition hover:border-vermilion/30 hover:text-vermilion hover:bg-surfaceHover hover:scale-105 shadow-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{item.decision}</p>
                {item.impact ? <p className="mt-2 text-xs leading-5 text-textMuted">Impact: {item.impact}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.relatedRecordId ? (
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.relatedRecordId)}
                      className="rounded border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                    >
                      Open linked operation
                    </button>
                  ) : null}
                  {item.evidenceUrl ? (
                    <span className="rounded border border-[var(--brse-panel-border)] bg-surface/40 px-2 py-1 text-xs text-textMuted">{item.evidenceUrl}</span>
                  ) : null}
                </div>
              </article>
            )) : (
              <p className="brse-card brse-card-muted p-4 text-sm text-textMuted">{t("operations.noDecisions")}</p>
            )}
          </div>
        </section>

        <section className="brse-section p-5">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--brse-panel-border)] pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Release Gate / UAT</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{t("operations.releaseGateChecklist")} {currentProjectName}</h2>
              <p className="mt-1 text-xs text-textMuted">{t("operations.releaseGateDesc")}</p>
            </div>
            <div className="rounded-lg border border-matcha/30 bg-matcha/10 px-3 py-2 text-right">
              <p className="text-xs text-matcha">{t("operations.gateProgress")}</p>
              <p className="text-lg font-semibold text-matcha">{releaseGateProgress.percent}%</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.releaseDate")}</span>
              <input
                type="date"
                value={projectReleaseGate.releaseDate}
                onChange={(event) => updateReleaseGateField("releaseDate", event.target.value)}
                className="field-control min-h-10 px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.uatStart")}</span>
              <input
                type="date"
                value={projectReleaseGate.uatStart}
                onChange={(event) => updateReleaseGateField("uatStart", event.target.value)}
                className="field-control min-h-10 px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.uatEnd")}</span>
              <input
                type="date"
                value={projectReleaseGate.uatEnd}
                onChange={(event) => updateReleaseGateField("uatEnd", event.target.value)}
                className="field-control min-h-10 px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="brse-card p-3">
              <p className="text-xs text-textMuted">{t("operations.openQna")}</p>
              <p className="mt-1 text-xl font-semibold text-ink">{projectOpenQna}</p>
            </div>
            <div className="rounded-lg border border-vermilion/25 bg-vermilion/10 p-3">
              <p className="text-xs text-vermilion">{t("operations.criticalBugs")}</p>
              <p className="mt-1 text-xl font-semibold text-vermilion">{projectCriticalBugs}</p>
            </div>
            <div className="rounded-lg border border-primary/25 bg-background/55 p-3">
              <p className="text-xs text-textMuted">{t("operations.pendingCr")}</p>
              <p className="mt-1 text-xl font-semibold text-primary">{projectPendingCr}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={syncReleaseGateSnapshot}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25"
          >
            <CheckSquare className="h-4 w-4" aria-hidden="true" />
            {t("operations.syncSnapshot")}
          </button>

          <div className="mt-4 grid gap-2">
            {[
              { key: "qnaClosed", label: t("operations.qnaClosed") },
              { key: "criticalBugClosed", label: t("operations.criticalBugClosed") },
              { key: "crReviewed", label: t("operations.crReviewed") },
              { key: "uatPassed", label: t("operations.uatPassed") },
              { key: "evidenceReady", label: t("operations.evidenceReady") },
              { key: "customerApproved", label: t("operations.customerApproved") },
              { key: "deployNoteReady", label: t("operations.deployNoteReady") }
            ].map((item) => (
              <label key={item.key} className="brse-card flex items-center gap-3 px-3 py-2 text-sm text-ink transition-all duration-300 hover:border-primary/20">
                <input
                  type="checkbox"
                  checked={Boolean(projectReleaseGate[item.key as keyof ReleaseGateChecklist])}
                  onChange={(event) => updateReleaseGateField(item.key as keyof ReleaseGateChecklist, event.target.checked as never)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <label className="mt-4 grid gap-2">
            <span className="text-sm font-semibold text-ink">{t("operations.releaseNote")}</span>
            <textarea
              value={projectReleaseGate.note}
              onChange={(event) => updateReleaseGateField("note", event.target.value)}
              rows={4}
              className="field-control px-3 py-2 text-sm leading-6 text-ink"
              placeholder={t("operations.releaseNotePlaceholder")}
            />
          </label>
        </section>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="brse-section p-5">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--brse-panel-border)] pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Dependency View</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{t("operations.dependencyTitle")}</h2>
              <p className="mt-1 text-xs text-textMuted">{t("operations.dependencyDesc")}</p>
            </div>
            <button
              type="button"
              onClick={startDependencyCreate}
              className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25"
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              {t("operations.createLink")}
            </button>
          </div>

          <form onSubmit={submitDependency} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_150px_1fr]">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.source")}</span>
                <select
                  value={dependencyForm.sourceId}
                  onChange={(event) => updateDependencyField("sourceId", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                >
                  <option value="">{t("operations.selectSource")}</option>
                  {projectRecords.map((record) => (
                    <option key={record.id} value={record.id}>{record.type.toUpperCase()} · {record.title}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.relation")}</span>
                <select
                  value={dependencyForm.relation}
                  onChange={(event) => updateDependencyField("relation", event.target.value as OperationDependencyInput["relation"])}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                >
                  {Object.entries(dependencyLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.target")}</span>
                <select
                  value={dependencyForm.targetId}
                  onChange={(event) => updateDependencyField("targetId", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                >
                  <option value="">{t("operations.selectTarget")}</option>
                  {projectRecords.map((record) => (
                    <option key={record.id} value={record.id}>{record.type.toUpperCase()} · {record.title}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.dependencyNote")}</span>
              <textarea
                value={dependencyForm.note}
                onChange={(event) => updateDependencyField("note", event.target.value)}
                rows={2}
                className="field-control px-3 py-2 text-sm leading-6 text-ink"
                placeholder={t("operations.dependencyNotePlaceholder")}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover">
                <Link2 className="h-4 w-4" aria-hidden="true" />
                {editingDependencyId ? t("operations.updateDependency") : t("operations.saveDependency")}
              </button>
              {editingDependencyId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDependencyId("");
                    setDependencyForm(emptyDependencyForm);
                  }}
                  className="field-control px-4 py-2 text-sm font-semibold text-ink"
                >
                  {t("operations.cancelEdit")}
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-5 grid gap-3">
            {dependencyRows.length ? dependencyRows.map(({ link, source, target }) => (
              <article key={link.id} className="brse-card p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="grid min-w-0 flex-1 gap-2 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <button
                      type="button"
                      onClick={() => source?.id && setSelectedId(source.id)}
                      className="brse-card min-w-0 px-3 py-2 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
                    >
                      <span className="block truncate font-semibold text-ink">{source?.title || "Missing source"}</span>
                      <span className="mt-1 block text-xs text-textMuted">{source?.type.toUpperCase() || "-"} · {source?.status || "-"}</span>
                    </button>
                    <span className="rounded border border-primary/25 bg-primary/10 px-2 py-1 text-center text-xs font-semibold text-primary">
                      {dependencyLabels[link.relation]}
                    </span>
                    <button
                      type="button"
                      onClick={() => target?.id && setSelectedId(target.id)}
                      className="brse-card min-w-0 px-3 py-2 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
                    >
                      <span className="block truncate font-semibold text-ink">{target?.title || "Missing target"}</span>
                      <span className="mt-1 block text-xs text-textMuted">{target?.type.toUpperCase() || "-"} · {target?.status || "-"}</span>
                    </button>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => startDependencyEdit(link)} className="rounded-md border border-[var(--brse-panel-border)] bg-surface/40 p-2 text-textMuted transition hover:border-primary/30 hover:text-primary hover:bg-surfaceHover hover:scale-105 shadow-sm">
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => removeDependency(link.id)} className="rounded-md border border-[var(--brse-panel-border)] bg-surface/40 p-2 text-textMuted transition hover:border-vermilion/30 hover:text-vermilion hover:bg-surfaceHover hover:scale-105 shadow-sm">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {link.note ? <p className="mt-2 text-xs leading-5 text-textMuted">{link.note}</p> : null}
              </article>
            )) : (
              <p className="brse-card brse-card-muted p-4 text-sm text-textMuted">{t("operations.noDependencies")}</p>
            )}
          </div>
        </section>

        <section className="brse-section p-5">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--brse-panel-border)] pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Test Matrix / UAT Tracker</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{t("operations.testMatrixTitle")}</h2>
              <p className="mt-1 text-xs text-textMuted">{t("operations.testMatrixDesc")}</p>
            </div>
            <div className="rounded-lg border border-matcha/30 bg-matcha/10 px-3 py-2 text-right">
              <p className="text-xs text-matcha">{t("operations.uatPass")}</p>
              <p className="text-lg font-semibold text-matcha">{testMatrixPercent}%</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="brse-card p-3">
              <p className="text-xs text-textMuted">{t("operations.testTotal")}</p>
              <p className="mt-1 text-xl font-semibold text-ink">{testMatrixStats.total}</p>
            </div>
            <div className="rounded-lg border border-matcha/30 bg-matcha/10 p-3">
              <p className="text-xs text-matcha">{t("operations.testPassed")}</p>
              <p className="mt-1 text-xl font-semibold text-matcha">{testMatrixStats.passed}</p>
            </div>
            <div className="rounded-lg border border-vermilion/25 bg-vermilion/10 p-3">
              <p className="text-xs text-vermilion">{t("operations.testFailed")}</p>
              <p className="mt-1 text-xl font-semibold text-vermilion">{testMatrixStats.failed}</p>
            </div>
            <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3">
              <p className="text-xs text-amber-300">{t("operations.testBlocked")}</p>
              <p className="mt-1 text-xl font-semibold text-amber-300">{testMatrixStats.blocked}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={startTestMatrixCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25"
          >
            <TestTube2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t("operations.createTestFromSelection")}
          </button>

          <form onSubmit={submitTestMatrix} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.requirement")}</span>
                <input
                  value={testMatrixForm.requirement}
                  onChange={(event) => updateTestMatrixField("requirement", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                  placeholder={t("operations.requirementPlaceholder")}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.linkedOperation")}</span>
                <select
                  value={testMatrixForm.operationId}
                  onChange={(event) => updateTestMatrixField("operationId", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                >
                  <option value="">{t("operations.noLink")}</option>
                  {projectRecords.map((record) => (
                    <option key={record.id} value={record.id}>{record.type.toUpperCase()} · {record.title}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.testCase")}</span>
                <textarea
                  value={testMatrixForm.testCase}
                  onChange={(event) => updateTestMatrixField("testCase", event.target.value)}
                  rows={2}
                  className="field-control px-3 py-2 text-sm leading-6 text-ink"
                  placeholder={t("operations.testCasePlaceholder")}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.expectedResult")}</span>
                <textarea
                  value={testMatrixForm.expectedResult}
                  onChange={(event) => updateTestMatrixField("expectedResult", event.target.value)}
                  rows={2}
                  className="field-control px-3 py-2 text-sm leading-6 text-ink"
                  placeholder={t("operations.expectedResultPlaceholder")}
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.owner")}</span>
                <input
                  value={testMatrixForm.owner}
                  onChange={(event) => updateTestMatrixField("owner", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.uatStatus")}</span>
                <select
                  value={testMatrixForm.uatStatus}
                  onChange={(event) => updateTestMatrixField("uatStatus", event.target.value as TestMatrixStatus)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                >
                  {testStatuses.map((statusItem) => <option key={statusItem}>{statusItem}</option>)}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.lastRun")}</span>
                <input
                  type="date"
                  value={testMatrixForm.lastRunDate}
                  onChange={(event) => updateTestMatrixField("lastRunDate", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("operations.evidence")}</span>
                <input
                  value={testMatrixForm.evidenceUrl}
                  onChange={(event) => updateTestMatrixField("evidenceUrl", event.target.value)}
                  className="field-control min-h-10 px-3 py-2 text-sm text-ink"
                  placeholder={t("operations.evidencePlaceholder")}
                />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.note")}</span>
              <textarea
                value={testMatrixForm.note}
                onChange={(event) => updateTestMatrixField("note", event.target.value)}
                rows={2}
                className="field-control px-3 py-2 text-sm leading-6 text-ink"
                placeholder={t("operations.notePlaceholder")}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover">
                <TestTube2 className="h-4 w-4" aria-hidden="true" />
                {editingTestMatrixId ? t("operations.updateTest") : t("operations.saveTest")}
              </button>
              {editingTestMatrixId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTestMatrixId("");
                    setTestMatrixForm(emptyTestMatrixForm);
                  }}
                  className="field-control px-4 py-2 text-sm font-semibold text-ink"
                >
                  {t("operations.cancelEdit")}
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-5 grid gap-3">
            {projectTestMatrixItems.length ? projectTestMatrixItems.map((item) => {
              const linkedOperation = item.operationId ? recordById.get(item.operationId) : null;
              return (
                <article key={item.id} className="brse-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{item.requirement}</p>
                      <p className="mt-1 text-xs text-textMuted">
                        {item.owner || "-"} · {item.lastRunDate || "No run date"} · {linkedOperation ? `${linkedOperation.type.toUpperCase()} ${linkedOperation.title}` : "No operation link"}
                      </p>
                    </div>
                    <span className={`rounded border px-2 py-1 text-xs font-semibold ${
                      item.uatStatus === "Passed"
                        ? "border-matcha/30 bg-matcha/10 text-matcha"
                        : item.uatStatus === "Failed" || item.uatStatus === "Blocked"
                          ? "border-vermilion/25 bg-vermilion/10 text-vermilion"
                          : "border-[var(--brse-panel-border)] bg-surface/40 text-textMuted"
                    }`}>
                      {item.uatStatus}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs leading-5 text-textMuted">
                    {item.testCase ? <p><span className="font-semibold text-ink">Test:</span> {item.testCase}</p> : null}
                    {item.expectedResult ? <p><span className="font-semibold text-ink">Expected:</span> {item.expectedResult}</p> : null}
                    {item.note ? <p><span className="font-semibold text-ink">Note:</span> {item.note}</p> : null}
                    {item.evidenceUrl ? <p><span className="font-semibold text-ink">Evidence:</span> {item.evidenceUrl}</p> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {linkedOperation ? (
                      <button type="button" onClick={() => setSelectedId(linkedOperation.id)} className="rounded border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        Open linked operation
                      </button>
                    ) : null}
                    <button type="button" onClick={() => startTestMatrixEdit(item.id)} className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-surface/40 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-primary/40">
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("operations.edit")}
                    </button>
                    <button type="button" onClick={() => removeTestMatrixItem(item.id)} className="inline-flex items-center gap-2 rounded-md border border-vermilion/25 bg-surface/70 px-3 py-1.5 text-xs font-semibold text-vermilion transition hover:bg-vermilion/10">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("operations.delete")}
                    </button>
                  </div>
                </article>
              );
            }) : (
              <p className="brse-card brse-card-muted p-4 text-sm text-textMuted">{t("operations.noTestMatrix")}</p>
            )}
          </div>
        </section>
      </section>
      </>
      ) : null}
    </>
  );
}
