"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ListChecks,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { DocxToPdfConverter } from "@/components/tools/DocxToPdfConverter";
import { saveOperationRecord, type OperationRecordInput } from "@/lib/operations";
import { ACTIVE_PROJECT_CHANGED_EVENT, getActiveProject } from "@/lib/projectSettings";
import { defaultPowerToolsState, fetchPowerToolsState, savePowerToolsState, type PowerToolsState, type RiskItem, type SprintTask } from "@/lib/powerTools";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

function riskScore(value: "Low" | "Medium" | "High") {
  return value === "High" ? 3 : value === "Medium" ? 2 : 1;
}

function riskTone(risk: RiskItem) {
  const score = riskScore(risk.impact) * riskScore(risk.probability);
  if (risk.status === "Closed") return "brse-card-muted text-textMuted";
  if (score >= 6) return "border-vermilion/40 bg-vermilion/10 text-vermilion";
  if (score >= 4) return "border-gold/40 bg-gold/10 text-gold";
  return "border-matcha/40 bg-matcha/10 text-matcha";
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BurndownSnapshot({ totalHours, doneHours, sprintDays }: { totalHours: number; doneHours: number; sprintDays: number }) {
  const width = 320;
  const height = 130;
  const padding = 16;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const safeTotal = Math.max(totalHours, 1);
  const remainingHours = Math.max(totalHours - doneHours, 0);
  const progressRatio = totalHours > 0 ? Math.min(doneHours / totalHours, 1) : 0;
  const currentX = padding + chartWidth * Math.max(progressRatio, 0.08);
  const currentY = padding + chartHeight * (remainingHours / safeTotal);
  const ideal = Array.from({ length: Math.max(sprintDays, 2) }, (_, index) => {
    const ratio = index / Math.max(sprintDays - 1, 1);
    return `${padding + chartWidth * ratio},${padding + chartHeight * ratio}`;
  }).join(" ");

  return (
    <div className="brse-section p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Burndown snapshot</p>
          <p className="mt-1 text-sm text-textMuted">{remainingHours.toFixed(1)}h remaining / {totalHours.toFixed(1)}h scope</p>
        </div>
        <span className="rounded-full bg-primary/20 px-2 py-1 text-[10px] font-black text-primary">{Math.round(progressRatio * 100)}%</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-32 w-full" role="img" aria-label="Sprint burndown snapshot">
        <line x1={padding} y1={padding + chartHeight} x2={width - padding} y2={padding + chartHeight} stroke="rgba(255,255,255,0.12)" />
        <line x1={padding} y1={padding} x2={padding} y2={padding + chartHeight} stroke="rgba(255,255,255,0.12)" />
        <polyline points={ideal} fill="none" stroke="rgba(56,189,248,0.45)" strokeDasharray="5 5" strokeWidth="2" />
        <path
          d={`M ${padding} ${padding} C ${padding + chartWidth * 0.25} ${padding + chartHeight * 0.15}, ${currentX - 28} ${currentY}, ${currentX} ${currentY}`}
          fill="none"
          stroke="rgba(34,197,94,0.95)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={currentX} cy={currentY} r="5" fill="rgb(34,197,94)" />
      </svg>
    </div>
  );
}

export default function PowerToolsPage() {
  const { t, language } = useUiLanguage();
  const [state, setState] = useState<PowerToolsState>(defaultPowerToolsState);
  const [taskForm, setTaskForm] = useState({ name: "", owner: "", hours: "4" });
  const [checkTitle, setCheckTitle] = useState("");
  const [riskForm, setRiskForm] = useState({
    title: "",
    impact: "Medium" as RiskItem["impact"],
    probability: "Medium" as RiskItem["probability"],
    mitigation: "",
  });
  const [savedAt, setSavedAt] = useState("");
  const [operationSyncStatus, setOperationSyncStatus] = useState("");
  const [syncStatus, setSyncStatus] = useState(t("tools.syncLoading"));
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(() => getActiveProject()?.id || "default");

  useEffect(() => {
    function handleProjectChange() {
      setActiveProjectId(getActiveProject()?.id || "default");
    }

    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    setSyncStatus(t("tools.syncLoading"));
    fetchPowerToolsState(activeProjectId)
      .then(({ state: nextState, source }) => {
        if (cancelled) return;
        setState(nextState);
        setSyncStatus(source === "postgres" ? t("tools.syncSuccess") : source === "indexeddb" ? t("tools.syncOffline") : "Default preset");
      })
      .catch(() => {
        if (!cancelled) setSyncStatus(t("tools.syncFail"));
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProjectId, t]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = window.setTimeout(() => {
      savePowerToolsState(activeProjectId, state)
        .then((target) => setSyncStatus(target === "postgres" ? t("tools.syncSuccess") : t("tools.syncOffline")))
        .catch(() => setSyncStatus(t("tools.syncOffline")));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeProjectId, isLoaded, state, t]);

  const totalHours = useMemo(
    () => state.tasks.reduce((sum, task) => sum + Number(task.hours || 0), 0),
    [state.tasks]
  );
  const capacityHours = useMemo(
    () => state.teamSize * state.sprintDays * 8 * (state.focusRatio / 100),
    [state.focusRatio, state.sprintDays, state.teamSize]
  );
  const doneHours = useMemo(
    () => state.tasks.filter((task) => task.status === "done").reduce((sum, task) => sum + task.hours, 0),
    [state.tasks]
  );
  const checklistDone = state.checklist.filter((item) => item.done).length;
  const openHighRisks = state.risks.filter(
    (risk) => risk.status !== "Closed" && riskScore(risk.impact) * riskScore(risk.probability) >= 6
  ).length;
  const testEstimateHours = Math.max(4, Math.round(totalHours * 0.35));
  const incompleteChecks = state.checklist.length - checklistDone;
  const scopeComplexity = Math.min(40, state.tasks.length * 5);
  const timelinePressure = Math.min(35, Math.max(0, totalHours - capacityHours) * 2 + openHighRisks * 6);
  const stakeholderImpact = Math.min(25, incompleteChecks * 3 + openHighRisks * 5);
  const crRiskScore = Math.min(100, Math.round(scopeComplexity + timelinePressure + stakeholderImpact));

  function updateState(patch: Partial<PowerToolsState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskForm.name.trim()) return;
    setState((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: createId("task"),
          name: taskForm.name.trim(),
          owner: taskForm.owner.trim() || "BrSE",
          hours: Number(taskForm.hours) || 0,
          status: "todo",
        },
      ],
    }));
    setTaskForm({ name: "", owner: "", hours: "4" });
  }

  function addChecklistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkTitle.trim()) return;
    setState((current) => ({
      ...current,
      checklist: [...current.checklist, { id: createId("check"), title: checkTitle.trim(), done: false }],
    }));
    setCheckTitle("");
  }

  function addRisk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!riskForm.title.trim()) return;
    setState((current) => ({
      ...current,
      risks: [
        ...current.risks,
        {
          id: createId("risk"),
          title: riskForm.title.trim(),
          impact: riskForm.impact,
          probability: riskForm.probability,
          mitigation: riskForm.mitigation.trim(),
          status: "Open",
        },
      ],
    }));
    setRiskForm({ title: "", impact: "Medium", probability: "Medium", mitigation: "" });
  }

  function saveSnapshot() {
    savePowerToolsState(activeProjectId, state)
      .then((target) => setSyncStatus(target === "postgres" ? t("tools.syncSuccess") : t("tools.syncOffline")))
      .catch(() => setSyncStatus(t("tools.syncOffline")));
    setSavedAt(new Date().toLocaleTimeString());
  }

  function exportPowerToolsReport() {
    const lines = [
      `# BrSE Power Tools Snapshot`,
      ``,
      `- Team size: ${state.teamSize}`,
      `- Sprint days: ${state.sprintDays}`,
      `- Focus ratio: ${state.focusRatio}%`,
      `- Capacity: ${capacityHours.toFixed(1)}h`,
      `- Total effort: ${totalHours.toFixed(1)}h`,
      `- Done effort: ${doneHours.toFixed(1)}h`,
      `- High risks: ${openHighRisks}`,
      ``,
      `## Sprint Tasks`,
      ...state.tasks.map((task) => `- [${task.status === "done" ? "x" : " "}] ${task.name} / ${task.owner} / ${task.hours}h / ${task.status}`),
      ``,
      `## Checklist`,
      ...state.checklist.map((item) => `- [${item.done ? "x" : " "}] ${item.title}`),
      ``,
      `## Risks`,
      ...state.risks.map((risk) => `- ${risk.title} / impact=${risk.impact} / probability=${risk.probability} / status=${risk.status}\n  - Mitigation: ${risk.mitigation || "-"}`),
    ];
    downloadText(`brse-power-tools-${new Date().toISOString().slice(0, 10)}.md`, lines.join("\n"));
    setSavedAt(new Date().toLocaleTimeString());
  }

  function applyBrsePreset() {
    const presetChecks = [
      t("tools.presetCrImpact"),
      t("tools.presetEstimate"),
      t("tools.presetUat"),
      t("tools.presetRelease"),
    ];
    const presetRisks: RiskItem[] = [
      {
        id: createId("risk"),
        title: t("tools.presetCrScope"),
        impact: "High",
        probability: "Medium",
        mitigation: t("tools.presetCrScopeMitigation"),
        status: "Watching",
      },
      {
        id: createId("risk"),
        title: t("tools.presetEvidence"),
        impact: "Medium",
        probability: "Medium",
        mitigation: t("tools.presetEvidenceMitigation"),
        status: "Open",
      },
    ];
    setState((current) => {
      const existingChecks = new Set(current.checklist.map((item) => item.title));
      const nextChecks = presetChecks
        .filter((title) => !existingChecks.has(title))
        .map((title) => ({ id: createId("check"), title, done: false }));
      return {
        ...current,
        checklist: [...current.checklist, ...nextChecks],
        risks: [...presetRisks, ...current.risks],
      };
    });
    setSavedAt(new Date().toLocaleTimeString());
  }

  async function pushOpenRisksToOperations() {
    const project = getActiveProject();
    const openRisks = state.risks.filter((risk) => risk.status !== "Closed");
    if (!openRisks.length) {
      setOperationSyncStatus(t("tools.noOpenRisks"));
      return;
    }

    let created = 0;
    try {
      for (const risk of openRisks) {
      const score = riskScore(risk.impact) * riskScore(risk.probability);
      const input: OperationRecordInput = {
        type: "cr",
        title: `Risk: ${risk.title}`,
        status: risk.status === "Watching" ? "Sent" : "Draft",
        priority: score >= 6 ? "High" : score >= 4 ? "Medium" : "Low",
        owner: project?.brse_name || t("tools.defaultOwner"),
        dueDate: "",
        customerOwner: project?.customer_name || "",
        projectName: project?.name || "General",
        fieldA: t("tools.riskRegisterTitle"),
        fieldB: `Impact: ${risk.impact} / Probability: ${risk.probability}`,
        fieldC: risk.mitigation || t("tools.noMitigation"),
        fieldD: t("tools.syncSource"),
        fieldE: `Source: Power Tools · status=${risk.status}`,
      };
      const saved = await saveOperationRecord(input);
      if (saved) created += 1;
      }
      setOperationSyncStatus(t("tools.pushedToOps").replace("{count}", created.toString()));
    } catch (error) {
      setOperationSyncStatus(
        t("tools.pushToOpsFailedCreated")
          .replace("{error}", error instanceof Error ? error.message : "Push to Operations failed")
          .replace("{created}", String(created))
          .replace("{total}", String(openRisks.length)),
      );
    }
  }

  return (
    <main className="brse-page">
      <PageHeader
        className="mb-6"
        badge={t("tools.badge")}
        title={t("tools.title")}
        description={t("tools.body")}
        icon={Calculator}
        stats={[
          { label: t("tools.totalEffort"), value: `${totalHours.toFixed(1)}h`, variant: "primary" },
          { label: t("tools.capacity"), value: `${capacityHours.toFixed(1)}h`, variant: "cyan" },
          { label: t("tools.doneEffort"), value: `${doneHours.toFixed(1)}h`, variant: "success" },
          { label: t("tools.highRisks"), value: `${openHighRisks}`, variant: openHighRisks ? "danger" : "default" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
          <button
            onClick={exportPowerToolsReport}
            className="brse-button px-4 py-2.5 text-sm"
          >
            {t("tools.exportReport")}
          </button>
          <button
            onClick={applyBrsePreset}
            className="brse-button px-4 py-2.5 text-sm text-matcha hover:border-matcha/40"
          >
            Apply BrSE preset
          </button>
          <button
            onClick={pushOpenRisksToOperations}
            className="brse-button px-4 py-2.5 text-sm text-gold hover:border-gold/40"
          >
            Push risks to Operations
          </button>
          <button
            onClick={saveSnapshot}
            className="brse-button brse-button-primary px-4 py-2.5 text-sm"
          >
            <Save className="h-4 w-4" />
            {t("tools.saveSnapshot")}
          </button>
          </div>
        }
      />

      {savedAt ? (
        <div className="mb-5 rounded-lg border border-matcha/30 bg-matcha/10 px-4 py-3 text-sm text-matcha">
          {t("tools.savedAt")} {savedAt}.
        </div>
      ) : null}
      {operationSyncStatus ? (
        <div className="mb-5 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
          {operationSyncStatus}
        </div>
      ) : null}
      <div className="brse-card brse-card-muted mb-5 px-4 py-2 text-xs font-semibold text-textMuted">
        Sync: {syncStatus}
      </div>

      <div className="mb-8">
        <DocxToPdfConverter />
      </div>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="brse-card p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            CR Risk Score
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal text-textMuted">
              {t("tools.heuristicEstimate")}
            </span>
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">{crRiskScore}/100</p>
          <div className="mt-3 grid gap-2 text-[11px] text-textMuted">
            <span>Scope complexity: {scopeComplexity}/40</span>
            <span>Timeline pressure: {Math.round(timelinePressure)}/35</span>
            <span>Stakeholder impact: {stakeholderImpact}/25</span>
          </div>
          <p className="mt-2 text-[10px] italic leading-snug text-textMuted/80">
            {t("tools.heuristicScoreNote")}
          </p>
        </div>
        <div className="brse-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">{t("tools.estimateHelper")}</p>
          <p className="mt-2 text-2xl font-bold text-ink">{testEstimateHours}h</p>
          <p className="mt-1 text-xs leading-5 text-textMuted">{t("tools.qaEffortHint")}</p>
        </div>
        <div className="brse-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vermilion">Risk Automation</p>
          <p className="mt-2 text-2xl font-bold text-ink">{openHighRisks}</p>
          <p className="mt-1 text-xs leading-5 text-textMuted">{t("tools.highRiskOpenHint")}</p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="brse-section space-y-5 p-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-ink">{t("tools.sprintCalculator")}</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-semibold text-textMuted">
              {t("tools.teamSize")}
              <input
                type="number"
                min={1}
                value={state.teamSize}
                onChange={(event) => updateState({ teamSize: Number(event.target.value) || 1 })}
                className="field-control mt-1 w-full px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-xs font-semibold text-textMuted">
              {t("tools.sprintDays")}
              <input
                type="number"
                min={1}
                value={state.sprintDays}
                onChange={(event) => updateState({ sprintDays: Number(event.target.value) || 1 })}
                className="field-control mt-1 w-full px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-xs font-semibold text-textMuted">
              {t("tools.focusRatio")}
              <input
                type="number"
                min={10}
                max={100}
                value={state.focusRatio}
                onChange={(event) => updateState({ focusRatio: Number(event.target.value) || 80 })}
                className="field-control mt-1 w-full px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <form onSubmit={addTask} className="grid gap-3 md:grid-cols-[1fr_140px_110px_auto]">
            <input
              value={taskForm.name}
              onChange={(event) => setTaskForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t("tools.taskName")}
              className="field-control px-3 py-2 text-sm text-ink"
            />
            <input
              value={taskForm.owner}
              onChange={(event) => setTaskForm((current) => ({ ...current, owner: event.target.value }))}
              placeholder={t("tools.owner")}
              className="field-control px-3 py-2 text-sm text-ink"
            />
            <input
              type="number"
              min={0}
              step={0.5}
              value={taskForm.hours}
              onChange={(event) => setTaskForm((current) => ({ ...current, hours: event.target.value }))}
              placeholder={t("tools.hours")}
              className="field-control px-3 py-2 text-sm text-ink"
            />
            <button className="brse-button brse-button-primary px-4 py-2 text-sm">
              <Plus className="h-4 w-4" />
              {t("tools.add")}
            </button>
          </form>

          <BurndownSnapshot totalHours={totalHours} doneHours={doneHours} sprintDays={state.sprintDays} />

          <div className="space-y-2">
            {state.tasks.map((task) => (
              <div key={task.id} className="brse-card brse-card-muted grid gap-2 p-3 md:grid-cols-[1fr_120px_90px_120px_auto] md:items-center">
                <p className="text-sm font-semibold text-ink">{task.name}</p>
                <p className="text-xs text-textMuted">{task.owner}</p>
                <p className="text-sm text-ink">{task.hours}h</p>
                <select
                  value={task.status}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      tasks: current.tasks.map((item) =>
                        item.id === task.id ? { ...item, status: event.target.value as SprintTask["status"] } : item
                      ),
                    }))
                  }
                  className="field-control px-2 py-1.5 text-xs text-ink"
                >
                  <option value="todo">Todo</option>
                  <option value="doing">Doing</option>
                  <option value="done">Done</option>
                </select>
                <button
                  onClick={() => setState((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))}
                  className="rounded-md p-2 text-textMuted hover:bg-vermilion/10 hover:text-vermilion"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="brse-section space-y-5 p-5">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-ink">{t("tools.checklistHub")}</h2>
          </div>
          <form onSubmit={addChecklistItem} className="flex gap-2">
            <input
              value={checkTitle}
              onChange={(event) => setCheckTitle(event.target.value)}
              placeholder={t("tools.checklistItem")}
              className="field-control min-w-0 flex-1 px-3 py-2 text-sm text-ink"
            />
            <button className="brse-button brse-button-primary px-3 py-2">
              <Plus className="h-4 w-4" />
            </button>
          </form>
          <div className="space-y-2">
            {state.checklist.map((item) => (
              <div key={item.id} className="brse-card brse-card-muted flex items-center gap-3 p-3">
                <button
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      checklist: current.checklist.map((check) =>
                        check.id === item.id ? { ...check, done: !check.done } : check
                      ),
                    }))
                  }
                  className={`rounded-md p-1 ${item.done ? "text-matcha" : "text-textMuted"}`}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
                <span className={`flex-1 text-sm ${item.done ? "text-textMuted line-through" : "text-ink"}`}>{item.title}</span>
                <button
                  onClick={() => setState((current) => ({ ...current, checklist: current.checklist.filter((check) => check.id !== item.id) }))}
                  className="rounded-md p-2 text-textMuted hover:bg-vermilion/10 hover:text-vermilion"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="brse-section mt-8 space-y-5 p-5">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-ink">{t("tools.riskRegister")}</h2>
        </div>

        <form onSubmit={addRisk} className="grid gap-3 lg:grid-cols-[1fr_140px_140px_1fr_auto]">
          <input
            value={riskForm.title}
            onChange={(event) => setRiskForm((current) => ({ ...current, title: event.target.value }))}
            placeholder={t("tools.riskTitle")}
            className="field-control px-3 py-2 text-sm text-ink"
          />
          <select
            value={riskForm.impact}
            onChange={(event) => setRiskForm((current) => ({ ...current, impact: event.target.value as RiskItem["impact"] }))}
            className="field-control px-3 py-2 text-sm text-ink"
          >
            <option value="Low">{t("tools.low")}</option>
            <option value="Medium">{t("tools.medium")}</option>
            <option value="High">{t("tools.high")}</option>
          </select>
          <select
            value={riskForm.probability}
            onChange={(event) => setRiskForm((current) => ({ ...current, probability: event.target.value as RiskItem["probability"] }))}
            className="field-control px-3 py-2 text-sm text-ink"
          >
            <option value="Low">{t("tools.low")}</option>
            <option value="Medium">{t("tools.medium")}</option>
            <option value="High">{t("tools.high")}</option>
          </select>
          <input
            value={riskForm.mitigation}
            onChange={(event) => setRiskForm((current) => ({ ...current, mitigation: event.target.value }))}
            placeholder={t("tools.mitigation")}
            className="field-control px-3 py-2 text-sm text-ink"
          />
          <button className="brse-button brse-button-primary px-4 py-2 text-sm">
            <Plus className="h-4 w-4" />
            {t("tools.add")}
          </button>
        </form>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.risks.map((risk) => (
            <div key={risk.id} className={`rounded-xl border p-4 ${riskTone(risk)}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{risk.title}</p>
                  <p className="mt-1 text-xs text-textMuted">{t("tools.impact")} {risk.impact} · {t("tools.probability")} {risk.probability}</p>
                </div>
                <AlertTriangle className="h-4 w-4 shrink-0" />
              </div>
              <p className="min-h-10 text-xs leading-5 text-textMuted">{risk.mitigation || t("tools.noMitigation")}</p>
              <div className="mt-4 flex items-center gap-2">
                <select
                  value={risk.status}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      risks: current.risks.map((item) =>
                        item.id === risk.id ? { ...item, status: event.target.value as RiskItem["status"] } : item
                      ),
                    }))
                  }
                  className="field-control min-w-0 flex-1 px-2 py-1.5 text-xs text-ink"
                >
                  <option>Open</option>
                  <option>Watching</option>
                  <option>Closed</option>
                </select>
                <button
                  onClick={() => setState((current) => ({ ...current, risks: current.risks.filter((item) => item.id !== risk.id) }))}
                  className="rounded-md p-2 text-textMuted hover:bg-vermilion/10 hover:text-vermilion"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
