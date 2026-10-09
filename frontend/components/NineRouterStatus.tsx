"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { apiBaseUrl } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useUiLanguage } from "@/components/LanguageProvider";

type AiModelPreset = {
  id: string;
  label: string;
  provider: string;
  notes?: string;
  custom?: boolean;
};

type AiStatus = {
  provider: string;
  base_url: string;
  model: string;
  default_model?: string;
  available_models?: AiModelPreset[];
  configured: boolean;
  runtime_checked?: boolean;
  runtime_reachable?: boolean | null;
  runtime_status_code?: number | null;
  runtime_error?: string;
  latency_ms?: number | null;
};

type AiModelSmokeResult = {
  id: string;
  label: string;
  provider: string;
  ok: boolean;
  status: string;
  elapsed_ms: number | null;
  reply_preview?: string;
  error?: string;
};

const CURATED_AI_MODELS: AiModelPreset[] = [
  { id: "openrouter/nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super Free", provider: "openrouter" },
  { id: "cx/gpt-5.5", label: "ChatGPT 5.5 Codex", provider: "cx" },
  { id: "qwen2.5-coder:7b-instruct", label: "Qwen 2.5 Coder (Ollama)", provider: "ollama" },
  { id: "gemini/gemma-4-31b-it", label: "Gemma 4 31B", provider: "gemini" },
  { id: "nvidia/google/gemma-4-31b-it", label: "NVIDIA Gemma 4 31B", provider: "nvidia" },
  { id: "free-logic", label: "9router Free Logic", provider: "combo" },
];

const CURATED_AI_MODEL_IDS = new Set(CURATED_AI_MODELS.map((model) => model.id));
const DEFAULT_CURATED_MODEL = CURATED_AI_MODELS[0].id;
const PROVIDER_OPTIONS = ["ollama", "openrouter", "gemini", "nvidia", "cx", "combo", "openai", "custom"];

// Merge the curated presets with whatever the backend reports (presets + any
// user-added custom models). Curated stay first/enriched; custom models from the
// backend are appended so the user can select models they added in Settings.
function mergeModels(models: AiModelPreset[] | undefined): AiModelPreset[] {
  const byId = new Map(CURATED_AI_MODELS.map((model) => [model.id, model]));
  for (const model of models ?? []) {
    if (!model?.id) continue;
    byId.set(model.id, { ...byId.get(model.id), ...model });
  }
  const ordered: AiModelPreset[] = CURATED_AI_MODELS.map((model) => byId.get(model.id) ?? model);
  for (const model of models ?? []) {
    if (model?.id && !CURATED_AI_MODEL_IDS.has(model.id)) {
      ordered.push({ ...byId.get(model.id), ...model, custom: true } as AiModelPreset);
    }
  }
  return ordered;
}

export function NineRouterStatus() {
  const { t } = useUiLanguage();
  const tRef = useRef(t);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingModels, setIsTestingModels] = useState(false);
  const [modelSmokeResults, setModelSmokeResults] = useState<AiModelSmokeResult[]>([]);
  const [error, setError] = useState("");
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModelId, setNewModelId] = useState("");
  const [newModelLabel, setNewModelLabel] = useState("");
  const [newModelProvider, setNewModelProvider] = useState("ollama");

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/ai/status?check_runtime=true`, { cache: "no-store" });
      if (!response.ok) throw new Error(tRef.current("ninerouter.readError"));
      const data = await response.json();
      const merged = mergeModels(data.available_models);
      const knownIds = new Set(merged.map((model) => model.id));
      setStatus({
        ...data,
        model: knownIds.has(data.model) ? data.model : DEFAULT_CURATED_MODEL,
        available_models: merged,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : tRef.current("ninerouter.connectError"));
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const hasStatus = status !== null;
  useEffect(() => {
    // Only poll if status has been successfully initialized once
    if (!hasStatus) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/ai/health`, { cache: "no-store" });
        if (response.ok) {
          const healthData = await response.json();
          setStatus((current) => {
            if (!current) return null;
            return {
              ...current,
              runtime_reachable: healthData.reachable,
              runtime_error: healthData.error,
              latency_ms: healthData.latency_ms,
            };
          });
        }
      } catch (err) {
        // Silently catch error to prevent disruption in UI
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [hasStatus]);

  async function changeModel(model: string) {
    if (!model || model === status?.model) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/ai/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("ninerouter.changeModelError"));
      setStatus((current) => current ? { ...current, model: data.model } : current);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ninerouter.changeModelError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function addCustomModel() {
    const id = newModelId.trim();
    if (!id) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/ai/models/custom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label: newModelLabel.trim(), provider: newModelProvider }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("ninerouter.addModelError"));
      setNewModelId("");
      setNewModelLabel("");
      setShowAddModel(false);
      await loadStatus();
      await changeModel(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ninerouter.addModelError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeCustomModel(id: string) {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/ai/models/custom/${encodeURI(id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || t("ninerouter.removeModelError"));
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ninerouter.removeModelError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function testAiModels() {
    setIsTestingModels(true);
    setError("");
    setModelSmokeResults([]);
    try {
      const response = await fetch(`${apiBaseUrl}/ai/model-smoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Sequential avoids provider contention (parallel smokes falsely time out
        // 9router models). 30s/model keeps the 7-model total (~110s) safely under
        // the 150s proxy budget while still giving slower models a fair chance.
        body: JSON.stringify({ message: "Tra loi dung mot tu OK", sequential: true, timeout_seconds: 30 }),
        signal: AbortSignal.timeout(170_000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("ninerouter.modelSmokeError"));
      setModelSmokeResults(Array.isArray(data.results) ? data.results : []);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ninerouter.modelSmokeError"));
    } finally {
      setIsTestingModels(false);
    }
  }

  const runtimeCode = status?.runtime_status_code ?? null;
  const runtimeWarning = Boolean(status?.runtime_reachable) && typeof runtimeCode === "number" && runtimeCode >= 400;
  const reachable = Boolean(status?.runtime_reachable) && !runtimeWarning;
  const runtimeState = isLoading
    ? {
        dot: "bg-amber-300",
        label: t("ninerouter.checking"),
        badge: "border-[var(--brse-hairline-border)] bg-gold/10 text-gold",
        message: "",
      }
    : reachable
      ? {
          dot: "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.75)]",
          label: `Runtime online${runtimeCode ? ` · ${runtimeCode}` : ""}${status?.latency_ms ? ` (${status.latency_ms}ms)` : ""}`,
          badge: "border-[var(--brse-hairline-border)] bg-green-400/10 text-green-300",
          message: "",
        }
      : runtimeWarning
        ? {
            dot: "bg-gold",
            label: `Runtime warning · ${runtimeCode}`,
            badge: "border-[var(--brse-hairline-border)] bg-gold/10 text-gold",
            message: t("ninerouter.authWarning"),
          }
        : {
            dot: "bg-vermilion",
            label: t("ninerouter.offline"),
            badge: "border-[var(--brse-hairline-border)] bg-vermilion/10 text-vermilion",
            message: status?.runtime_error || "",
          };
  const models = mergeModels(status?.available_models);
  const knownModelIds = new Set(models.map((model) => model.id));
  const activeModel = status?.model && knownModelIds.has(status.model) ? status.model : DEFAULT_CURATED_MODEL;
  const activePreset = models.find((model) => model.id === activeModel);
  const isOllamaUnavailable =
    status?.provider === "ollama" &&
    status.runtime_checked === true &&
    status.runtime_reachable === false &&
    activeModel !== DEFAULT_CURATED_MODEL;

  return (
    <section className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.015] shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.015)] p-2.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex flex-1 items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-surface/55 px-2 py-1 ring-1 ring-[var(--brse-hairline-border)]">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                runtimeState.dot
              )}
              aria-hidden="true"
            />
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">9router</p>
          </div>
          <p className="truncate text-[11px] text-textMuted">
            {runtimeState.label}
          </p>
        </div>
        <button
          type="button"
          onClick={loadStatus}
          className="rounded-md bg-surface/60 p-1.5 text-textMuted ring-1 ring-[var(--brse-hairline-border)] transition hover:ring-primary/30 hover:text-primary"
          aria-label="Refresh 9router status"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <select
          value={activeModel}
          onChange={(event) => changeModel(event.target.value)}
          disabled={isSaving || isLoading || !models.length}
          className="min-h-8 w-full rounded-md border border-[var(--brse-panel-border)] bg-surface px-2 py-1 text-[11px] font-semibold text-ink outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          title={activeModel}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
        <span
          className={cn(
            "inline-flex min-h-8 items-center rounded-md border px-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
            runtimeState.badge
          )}
        >
          AI
        </span>
      </div>

      {error || runtimeState.message ? (
        <p className={cn("mt-2 line-clamp-2 text-[10px] leading-4", runtimeWarning ? "text-gold" : "text-vermilion")}>
          {error || runtimeState.message}
        </p>
      ) : null}
      {status ? (
        <p className="mt-1 truncate text-[10px] text-textMuted">
          {t("ninerouter.activeModel")}: {activePreset?.label ?? activeModel} · {status.provider}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowAddModel((value) => !value)}
          className="rounded-md border border-[var(--brse-hairline-border)] bg-surface/60 px-2 py-1 text-[10px] font-bold text-textMuted transition hover:border-primary/30 hover:text-primary"
        >
          {showAddModel ? t("ninerouter.cancel") : t("ninerouter.addModel")}
        </button>
      </div>
      {showAddModel ? (
        <div className="mt-1.5 grid gap-1.5 rounded-md border border-[var(--brse-panel-border)] bg-surface/40 p-2">
          <input
            value={newModelId}
            onChange={(event) => setNewModelId(event.target.value)}
            placeholder={t("ninerouter.modelIdPlaceholder")}
            className="min-h-8 w-full rounded-md border border-[var(--brse-panel-border)] bg-surface px-2 py-1 text-[11px] text-ink outline-none focus:border-primary"
          />
          <input
            value={newModelLabel}
            onChange={(event) => setNewModelLabel(event.target.value)}
            placeholder={t("ninerouter.modelLabelPlaceholder")}
            className="min-h-8 w-full rounded-md border border-[var(--brse-panel-border)] bg-surface px-2 py-1 text-[11px] text-ink outline-none focus:border-primary"
          />
          <div className="grid grid-cols-[1fr_auto] gap-1.5">
            <select
              value={newModelProvider}
              onChange={(event) => setNewModelProvider(event.target.value)}
              className="min-h-8 rounded-md border border-[var(--brse-panel-border)] bg-surface px-2 py-1 text-[11px] font-semibold text-ink outline-none focus:border-primary"
            >
              {PROVIDER_OPTIONS.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addCustomModel}
              disabled={!newModelId.trim() || isSaving}
              className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("ninerouter.addModelConfirm")}
            </button>
          </div>
        </div>
      ) : null}
      {models.some((model) => model.custom) ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {models.filter((model) => model.custom).map((model) => (
            <span
              key={model.id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--brse-hairline-border)] bg-surface/55 px-2 py-0.5 text-[10px] text-textMuted"
              title={model.id}
            >
              {model.label}
              <button
                type="button"
                onClick={() => removeCustomModel(model.id)}
                disabled={isSaving}
                aria-label={`Remove ${model.label}`}
                className="text-vermilion transition hover:text-vermilion/70 disabled:opacity-50"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {isOllamaUnavailable ? (
        <button
          type="button"
          onClick={() => changeModel(DEFAULT_CURATED_MODEL)}
          disabled={isSaving}
          className="mt-2 w-full rounded-md border border-cyan/25 bg-cyan/10 px-2 py-1.5 text-[10px] font-bold text-cyan transition hover:bg-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("ninerouter.switchToStableModel")}
        </button>
      ) : null}
      <div className="mt-2 grid gap-1.5">
        <button
          type="button"
          onClick={testAiModels}
          disabled={isTestingModels || isLoading}
          className="w-full rounded-md border border-primary/25 bg-primary/10 px-2 py-1.5 text-[10px] font-bold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isTestingModels ? t("ninerouter.testingModels") : t("ninerouter.testApiKey")}
        </button>
        {modelSmokeResults.length ? (
          <button
            type="button"
            onClick={() => setModelSmokeResults([])}
            className="w-full rounded-md border border-[var(--brse-hairline-border)] bg-surface/60 px-2 py-1.5 text-[10px] font-bold text-textMuted transition hover:border-primary/30 hover:text-primary"
          >
            {t("ninerouter.hideTestResults")}
          </button>
        ) : null}
      </div>
      {modelSmokeResults.length ? (
        <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto pr-1">
          {modelSmokeResults.map((model) => (
            <div
              key={model.id}
              className={cn(
                "rounded-md border px-2 py-1.5",
                model.ok
                  ? "border-green-400/20 bg-green-400/10 text-green-200"
                  : "border-vermilion/25 bg-vermilion/10 text-vermilion"
              )}
              title={model.error || model.reply_preview || model.id}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-bold">{model.label}</span>
                <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em]">
                  {model.ok ? "OK" : "NG"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[9px] opacity-85">
                {model.provider} · {model.elapsed_ms ?? "-"}ms
                {!model.ok && model.error ? ` · ${model.error}` : ""}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {isSaving ? (
        <p className="mt-1 truncate text-[10px] text-textMuted">{t("ninerouter.savingModel")}</p>
      ) : null}
    </section>
  );
}
