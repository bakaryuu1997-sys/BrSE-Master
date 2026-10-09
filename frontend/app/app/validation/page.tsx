"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  Thermometer,
  Wifi,
  XCircle,
  Zap,
} from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { formatAppTime } from "@/lib/dateUtils";
import { apiBaseUrl } from "@/lib/config";
import { PageHeader } from "@/components/PageHeader";
import { EnvironmentInfoPanel } from "@/components/validation/EnvironmentInfoPanel";
import { SystemTelemetryPanel, type HealthMetric } from "@/components/validation/SystemTelemetryPanel";
import type { TranslationKey } from "@/lib/uiLanguage";

type ServiceStatus = "checking" | "ok" | "warn" | "error";

interface ServiceCheck {
  id: string;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: ReactNode;
  status: ServiceStatus;
  latency?: number;
  detail?: string;
}

type DeepHealth = {
  status: "ok" | "warn" | "error";
  checked_at?: string;
  database?: {
    status: string;
    dialect?: string;
    table_counts?: Record<string, number | null>;
  };
  resources?: {
    disk?: {
      path?: string;
      total_bytes?: number;
      used_bytes?: number;
      free_bytes?: number;
      used_percent?: number;
      status?: string;
    };
    memory?: {
      total_bytes?: number;
      available_bytes?: number;
      used_bytes?: number;
      used_percent?: number;
      process_rss_bytes?: number | null;
      status?: string;
      detail?: string;
    };
    load?: {
      status?: string;
      load_1m?: number;
      load_5m?: number;
      load_15m?: number;
      cpu_count?: number | null;
      detail?: string;
    };
    cpu?: {
      status?: string;
      usage_percent?: number | null;
      temperature_c?: number | null;
      cpu_count?: number | null;
      detail?: string | null;
    };
    gpu?: {
      status?: string;
      name?: string | null;
      utilization_percent?: number | null;
      temperature_c?: number | null;
      source?: string | null;
      detail?: string | null;
    };
  };
  meeting_jobs?: {
    status?: string;
    by_phase?: Record<string, number>;
    active_count?: number;
    terminal_count?: number;
    stale_count?: number;
    failed_with_error?: number;
  };
  glossary_health?: {
    status: "ok" | "warn";
    total_count: number;
    auto_extracted_count: number;
    potential_duplicates: number;
  };
  warnings?: string[];
};

const SERVICES: Omit<ServiceCheck, "status">[] = [
  { id: "backend",  nameKey: "validation.backendName",  descriptionKey: "validation.backendDesc",  icon: <Server className="h-5 w-5" /> },
  { id: "db",       nameKey: "validation.dbName",       descriptionKey: "validation.dbDesc",       icon: <Database className="h-5 w-5" /> },
  { id: "ai",       nameKey: "validation.aiName",       descriptionKey: "validation.aiDesc",       icon: <Cpu className="h-5 w-5" /> },
  { id: "internet", nameKey: "validation.internetName", descriptionKey: "validation.internetDesc", icon: <Wifi className="h-5 w-5" /> },
  { id: "stt",      nameKey: "validation.sttName",      descriptionKey: "validation.sttDesc",      icon: <Activity className="h-5 w-5" /> },
];

const statusConfig = (t: (key: TranslationKey) => string) => ({
  checking: { color: "text-textMuted",  bg: "bg-textMuted/10",  border: "border-textMuted/20", label: t("validation.statusChecking"), icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  ok:       { color: "text-matcha",     bg: "bg-matcha/10",     border: "border-matcha/25",    label: "Online",           icon: <CheckCircle2 className="h-4 w-4" /> },
  warn:     { color: "text-gold",       bg: "bg-gold/10",       border: "border-gold/25",      label: t("validation.warn"), icon: <AlertTriangle className="h-4 w-4" /> },
  error:    { color: "text-vermilion",  bg: "bg-vermilion/10",  border: "border-vermilion/25", label: "Offline",          icon: <XCircle className="h-4 w-4" /> },
});

async function checkService(
  id: string,
  t: (key: TranslationKey) => string
): Promise<{ status: ServiceStatus; latency: number; detail?: string }> {
  const start = performance.now();
  try {
    if (id === "internet") {
      // Localhost-first tool: rely on the browser's own connectivity flag instead
      // of pinging an external host (no privacy leak, no per-tick outbound request).
      return navigator.onLine
        ? { status: "ok", latency: Math.round(performance.now() - start) }
        : { status: "error", latency: Math.round(performance.now() - start), detail: "Browser reports offline" };
    }
    if (id === "backend") {
      const res = await fetch(`${apiBaseUrl}/health`, { signal: AbortSignal.timeout(5000) });
      const latency = Math.round(performance.now() - start);
      return res.ok ? { status: "ok", latency } : { status: "error", latency, detail: `HTTP ${res.status}` };
    }
    if (id === "db") {
      const res = await fetch(`${apiBaseUrl}/health/db`, { signal: AbortSignal.timeout(5000) });
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { status: "ok", latency, detail: data.version ?? undefined };
      }
      return { status: "error", latency, detail: `HTTP ${res.status}` };
    }
    if (id === "ai") {
      const res = await fetch(`${apiBaseUrl}/ai/status?check_runtime=true`, { signal: AbortSignal.timeout(5000) });
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.runtime_reachable === false) {
          return { status: "warn", latency, detail: data.runtime_error || "9router runtime is not reachable" };
        }
        if (typeof data.runtime_status_code === "number" && data.runtime_status_code >= 400) {
          return { status: "warn", latency, detail: `9router HTTP ${data.runtime_status_code}: check API key` };
        }
        return { status: "ok", latency, detail: data.model ?? "Connected" };
      }
        return { status: "warn", latency, detail: t("validation.aiProxyNoResponse") };
    }
    if (id === "stt") {
      const res = await fetch(`${apiBaseUrl}/stt/status`, { signal: AbortSignal.timeout(5000) });
      const latency = Math.round(performance.now() - start);
      return res.ok ? { status: "ok", latency } : { status: "warn", latency, detail: t("validation.sttNotReady") };
    }
    return { status: "error", latency: 0, detail: "Unknown service" };
  } catch {
    return { status: "error", latency: Math.round(performance.now() - start), detail: "Connection refused / timeout" };
  }
}

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return "N/A";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatPercent(value?: number | null) {
  return typeof value === "number" ? `${value}%` : "N/A";
}

function formatTemp(value?: number | null) {
  return typeof value === "number" ? `${value}°C` : "N/A";
}

async function fetchDeepHealth(): Promise<DeepHealth> {
  const res = await fetch(`${apiBaseUrl}/health/deep`, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function ValidationPage() {
  const { t, language } = useUiLanguage();
  const [services, setServices] = useState<ServiceCheck[]>(
    SERVICES.map((s) => ({ ...s, status: "checking" as ServiceStatus }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const runningRef = useRef(false);
  const [deepHealth, setDeepHealth] = useState<DeepHealth | null>(null);
  const [deepHealthError, setDeepHealthError] = useState("");
  const [environmentInfo, setEnvironmentInfo] = useState({
    frontend: "N/A",
    userAgent: "N/A",
    timezone: "N/A",
    browserLanguage: "N/A",
    online: "N/A",
  });

  // Metric history state for Sparklines (limit last 15 queries)
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [cpuTempHistory, setCpuTempHistory] = useState<number[]>([]);
  const [gpuHistory, setGpuHistory] = useState<number[]>([]);
  const [gpuTempHistory, setGpuTempHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const [memFreeHistory, setMemFreeHistory] = useState<number[]>([]);
  const [loadHistory, setLoadHistory] = useState<number[]>([]);
  const [diskHistory, setDiskHistory] = useState<number[]>([]);

  const runChecks = useCallback(async () => {
    if (runningRef.current) return; // skip if a previous cycle is still in flight
    runningRef.current = true;
    setIsRefreshing(true);
    setDeepHealthError("");
    setServices((current) => current.map((s) => ({ ...s, status: "checking" as ServiceStatus, latency: undefined, detail: undefined })));

    const [results, deepResult] = await Promise.all([
      Promise.allSettled(SERVICES.map((s) => checkService(s.id, t))),
      fetchDeepHealth().then((payload) => ({ ok: true as const, payload })).catch((error: Error) => ({ ok: false as const, error })),
    ]);

    setServices((current) =>
      current.map((s, i) => {
        const result = results[i];
        if (result.status === "fulfilled") {
          return { ...s, ...result.value };
        }
        return { ...s, status: "error" as ServiceStatus, detail: "Check failed" };
      })
    );

    if (deepResult.ok) {
      const payload = deepResult.payload;
      setDeepHealth(payload);
      
      // Update historical states safely
      const res = payload?.resources;
      if (res) {
        const cpuObj = res.cpu;
        if (cpuObj && typeof cpuObj.usage_percent === "number") {
          const val: number = cpuObj.usage_percent;
          setCpuHistory(prev => [...prev.slice(-14), val]);
        }
        if (cpuObj && typeof cpuObj.temperature_c === "number") {
          const val: number = cpuObj.temperature_c;
          setCpuTempHistory(prev => [...prev.slice(-14), val]);
        }
        const gpuObj = res.gpu;
        if (gpuObj && typeof gpuObj.utilization_percent === "number") {
          const val: number = gpuObj.utilization_percent;
          setGpuHistory(prev => [...prev.slice(-14), val]);
        }
        if (gpuObj && typeof gpuObj.temperature_c === "number") {
          const val: number = gpuObj.temperature_c;
          setGpuTempHistory(prev => [...prev.slice(-14), val]);
        }
        const memObj = res.memory;
        if (memObj && typeof memObj.used_percent === "number") {
          const val: number = memObj.used_percent;
          setMemHistory(prev => [...prev.slice(-14), val]);
          setMemFreeHistory(prev => [...prev.slice(-14), 100 - val]);
        }
        const loadObj = res.load;
        if (loadObj && typeof loadObj.load_1m === "number") {
          const val: number = loadObj.load_1m;
          setLoadHistory(prev => [...prev.slice(-14), val]);
        }
        const diskObj = res.disk;
        if (diskObj && typeof diskObj.used_percent === "number") {
          const val: number = diskObj.used_percent;
          setDiskHistory(prev => [...prev.slice(-14), val]);
        }
      }
    } else {
      setDeepHealth(null);
      setDeepHealthError(deepResult.error.message || t("validation.deepHealthUnavailable"));
    }

    setLastChecked(new Date());
    setIsRefreshing(false);
    runningRef.current = false;
  }, [t]);

  useEffect(() => {
    setEnvironmentInfo({
      frontend: window.location.origin,
      userAgent: `${navigator.userAgent.slice(0, 60)}...`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      browserLanguage: navigator.language,
      online: navigator.onLine ? "Yes" : "No",
    });
    void runChecks();

    // Auto-refresh every 5s, but only while the tab is visible (saves CPU/network
    // when the page is backgrounded). Re-check immediately when the tab regains focus.
    const interval = setInterval(() => {
      if (!document.hidden) void runChecks();
    }, 5000);
    const onVisible = () => {
      if (!document.hidden) void runChecks();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runChecks]);

  const okCount    = services.filter((s) => s.status === "ok").length;
  const warnCount  = services.filter((s) => s.status === "warn").length;
  const errorCount = services.filter((s) => s.status === "error").length;
  const allOk      = okCount === services.length;

  const overallStatus: ServiceStatus =
    errorCount > 0 ? "error" : warnCount > 0 ? "warn" : okCount === services.length ? "ok" : "checking";

  const statuses = useMemo(() => statusConfig(t), [t]);

  const deepWarnings = deepHealth?.warnings ?? [];
  const disk = deepHealth?.resources?.disk;
  const memory = deepHealth?.resources?.memory;
  const load = deepHealth?.resources?.load;
  const cpu = deepHealth?.resources?.cpu;
  const gpu = deepHealth?.resources?.gpu;
  const jobs = deepHealth?.meeting_jobs;
  const glossary = deepHealth?.glossary_health;
  const tableCounts = deepHealth?.database?.table_counts ?? {};

  // Formulated infrastructure metrics array
  const systemMetrics: HealthMetric[] = [
    {
      label: t("validation.cpu"),
      value: formatPercent(cpu?.usage_percent),
      description: `${cpu?.cpu_count ?? "--"} ${t("validation.logicalCores")}`,
      icon: <Cpu className="h-4 w-4" />,
      tone: "primary" as const,
      percent: cpu?.usage_percent,
      sparklineData: cpuHistory,
    },
    {
      label: t("validation.cpuTemp"),
      value: formatTemp(cpu?.temperature_c),
      description: cpu?.detail || t("validation.thermalSensor"),
      icon: <Thermometer className="h-4 w-4" />,
      tone: "vermilion" as const,
      sparklineData: cpuTempHistory,
    },
    {
      label: t("validation.gpu"),
      value: gpu?.utilization_percent !== undefined && gpu?.utilization_percent !== null ? formatPercent(gpu.utilization_percent) : "N/A",
      description: gpu?.name || gpu?.detail || t("validation.sensorUnavailable"),
      icon: <Activity className="h-4 w-4" />,
      tone: "primary" as const,
      percent: gpu?.utilization_percent,
      sparklineData: gpuHistory,
    },
    {
      label: t("validation.gpuTemp"),
      value: gpu?.temperature_c !== undefined && gpu?.temperature_c !== null ? formatTemp(gpu.temperature_c) : "N/A",
      description: gpu?.source || t("validation.sensorUnavailable"),
      icon: <Thermometer className="h-4 w-4" />,
      tone: "vermilion" as const,
      sparklineData: gpuTempHistory,
    },
    {
      label: t("validation.memUsed"),
      value: formatBytes(memory?.used_bytes),
      description: `${t("validation.of")} ${formatBytes(memory?.total_bytes)}`,
      icon: <Server className="h-4 w-4" />,
      tone: "cyan" as const,
      percent: memory?.used_percent,
      sparklineData: memHistory,
    },
    {
      label: t("validation.memFree"),
      value: formatBytes(memory?.available_bytes),
      description: `${t("validation.of")} ${formatBytes(memory?.total_bytes)}`,
      icon: <Server className="h-4 w-4" />,
      tone: "matcha" as const,
      percent: typeof memory?.used_percent === "number" ? 100 - memory.used_percent : null,
      sparklineData: memFreeHistory,
    },
    {
      label: "System Load (1m)",
      value: load?.load_1m !== undefined && load?.load_1m !== null ? String(load.load_1m) : "N/A",
      description: `5m: ${load?.load_5m ?? "--"} / 15m: ${load?.load_15m ?? "--"}`,
      icon: <Activity className="h-4 w-4" />,
      tone: "gold" as const,
      sparklineData: loadHistory,
    },
    {
      label: "Disk Used",
      value: disk?.used_percent !== undefined && disk?.used_percent !== null ? formatPercent(disk.used_percent) : "N/A",
      description: `${formatBytes(disk?.free_bytes)} free / ${formatBytes(disk?.total_bytes)}`,
      icon: <Server className="h-4 w-4" />,
      tone: "cyan" as const,
      percent: disk?.used_percent,
      sparklineData: diskHistory,
    },
  ];

  return (
    <main className="brse-page">
      <PageHeader
        badge="System"
        title="System Validation"
        description={t("validation.systemPageDesc")}
        icon={Shield}
        stats={[
          { label: "Online",  value: okCount,    variant: "success" },
          { label: "Warning", value: warnCount,  variant: "warning" },
          { label: "Offline", value: errorCount, variant: "danger"  },
          { label: "Total",   value: services.length },
        ]}
        actions={
          <button
            type="button"
            onClick={() => void runChecks()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? t("validation.checkingShort") : t("validation.recheck")}
          </button>
        }
      />

      {/* Overall status banner */}
      <div className={`mt-5 flex items-center gap-3 rounded-xl border p-4 ${statuses[overallStatus].border} ${statuses[overallStatus].bg}`}>
        <span className={statuses[overallStatus].color}>{statuses[overallStatus].icon}</span>
        <div className="flex-1">
          <p className={`font-semibold ${statuses[overallStatus].color}`}>
            {overallStatus === "ok" && t("validation.statusReady")}
            {overallStatus === "warn" && t("validation.statusWarn")}
            {overallStatus === "error" && t("validation.statusError")}
            {overallStatus === "checking" && t("validation.statusChecking")}
          </p>
          {lastChecked && (
            <p className="mt-0.5 text-xs text-textMuted">
              {t("validation.lastUpdated")} {lastChecked ? formatAppTime(lastChecked, language) : "--:--"}
            </p>
          )}
        </div>
        {allOk && <Zap className="h-8 w-8 text-matcha/60" />}
      </div>

      <SystemTelemetryPanel checkedAt={deepHealth?.checked_at} language={language} metrics={systemMetrics} t={t} />

      {/* Segment B: Workspace Productivity & DB Health */}
      <section className="mt-5 brse-section p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="brse-label">{t("validation.workspaceLabel")}</p>
            <h2 className="mt-1 text-xl font-black text-ink">{t("validation.workspaceTitle")}</h2>
            <p className="mt-1 max-w-3xl text-sm text-textMuted">{t("validation.workspaceDesc")}</p>
          </div>
          <div className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
            deepHealth?.status === "ok"
              ? "border-[var(--brse-hairline-border)] bg-matcha/10 text-matcha"
              : deepHealth
              ? "border-[var(--brse-hairline-border)] bg-gold/10 text-gold"
              : "border-[var(--brse-hairline-border)] bg-vermilion/10 text-vermilion"
          }`}>
            {deepHealth ? deepHealth.status : "Unavailable"}
          </div>
        </div>

        {deepHealthError ? (
          <div className="mt-4 rounded-xl border border-[var(--brse-hairline-border)] bg-vermilion/10 p-4 text-sm text-vermilion">
            {t("validation.deepHealthUnavailable")}: {deepHealthError}
          </div>
        ) : null}

        {deepWarnings.length ? (
          <div className="mt-4 grid gap-2">
            {deepWarnings.map((warning) => (
              <div key={warning} className="flex items-center gap-2 rounded-xl border border-[var(--brse-hairline-border)] bg-gold/10 px-3 py-2 text-sm text-gold">
                <AlertTriangle className="h-4 w-4" />
                {warning}
              </div>
            ))}
          </div>
        ) : deepHealth ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--brse-hairline-border)] bg-matcha/10 px-3 py-2 text-sm text-matcha">
            <CheckCircle2 className="h-4 w-4" />
            {t("validation.deepHealthNoWarnings")}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {/* DB table counts */}
          <div className="rounded-2xl border border-[var(--brse-hairline-border)] bg-background/35 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-bold text-ink">{t("validation.dbRecordsTitle")}</p>
                <span className="rounded-full bg-cyan/10 px-2 py-1 text-[10px] font-black uppercase text-cyan">{deepHealth?.database?.dialect ?? "unknown"}</span>
              </div>
              <div className="grid gap-2 grid-cols-2">
                {Object.entries(tableCounts).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2 transition-transform duration-300 hover:scale-[1.02]">
                    <p className="text-[9px] font-black uppercase tracking-[0.08em] text-textMuted">{key.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-lg font-black text-ink">{value ?? "N/A"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Meeting queue phases */}
          <div className="rounded-2xl border border-[var(--brse-hairline-border)] bg-background/35 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-bold text-ink">{t("validation.meetingQueueTitle")}</p>
                <Database className="h-4 w-4 text-gold" />
              </div>
              <div className="grid gap-2">
                {Object.entries(jobs?.by_phase ?? {}).length ? Object.entries(jobs?.by_phase ?? {}).map(([phase, count]) => (
                  <div key={phase} className="flex items-center justify-between rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2">
                    <span className="text-xs font-bold text-textMuted">{phase}</span>
                    <span className="text-sm font-black text-ink">{count}</span>
                  </div>
                )) : (
                  <p className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-4 text-center text-xs text-textMuted italic">
                    {t("validation.noMeetingJobs")}
                  </p>
                )}
              </div>
            </div>
            {jobs?.active_count !== undefined && (
              <div className="mt-3 pt-2 border-t border-[var(--brse-hairline-border)] flex items-center justify-between text-xs text-textMuted">
                <span>{t("validation.activeJobs")}: <b>{jobs.active_count}</b></span>
                <span>{t("validation.failedJobs")}: <b>{jobs.failed_with_error ?? 0}</b></span>
              </div>
            )}
          </div>

          {/* Glossary Analytics */}
          <div className="rounded-2xl border border-[var(--brse-hairline-border)] bg-background/35 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-bold text-ink">{t("validation.glossaryAnalyticsTitle")}</p>
                <Globe className="h-4 w-4 text-cyan" />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2">
                  <span className="text-xs font-bold text-textMuted">{t("validation.glossaryTotal")}</span>
                  <span className="text-sm font-black text-ink">{glossary?.total_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2">
                  <span className="text-xs font-bold text-textMuted">{t("validation.glossaryAuto")}</span>
                  <span className={`text-sm font-black ${glossary?.auto_extracted_count ? 'text-gold' : 'text-ink'}`}>
                    {glossary?.auto_extracted_count ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[var(--brse-hairline-border)] bg-surface/45 px-3 py-2">
                  <span className="text-xs font-bold text-textMuted">{t("validation.glossaryDuplicates")}</span>
                  <span className={`text-sm font-black ${glossary?.potential_duplicates ? 'text-vermilion' : 'text-ink'}`}>
                    {glossary?.potential_duplicates ?? 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-textMuted italic leading-tight pt-2 border-t border-[var(--brse-hairline-border)]">
              {t("validation.glossaryFootnote")}
            </div>
          </div>
        </div>
      </section>

      {/* Service grid with dynamic glows */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const cfg = statuses[service.status];
          return (
            <div
              key={service.id}
              className={`brse-section border p-5 transition-all duration-300 hover:shadow-glow-sm ${cfg.border} ${
                service.status === "ok" ? "hover:shadow-matcha/5" :
                service.status === "error" ? "border-vermilion/45 bg-vermilion/5" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${cfg.border} ${cfg.bg} ${cfg.color}`}>
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">{t(service.nameKey)}</h3>
                    <p className="text-xs text-textMuted">{t(service.descriptionKey)}</p>
                  </div>
                </div>

                {/* Status badge with pulsing glow */}
                <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold relative ${cfg.border} ${cfg.bg} ${cfg.color}`}>
                  {service.status === "ok" && (
                    <span className="absolute -left-1 -top-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-matcha opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-matcha" />
                    </span>
                  )}
                  {service.status === "error" && (
                    <span className="absolute -left-1 -top-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vermilion opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-vermilion" />
                    </span>
                  )}
                  {service.status === "warn" && (
                    <span className="absolute -left-1 -top-1 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                    </span>
                  )}
                  {cfg.icon}
                  {cfg.label}
                </div>
              </div>

              {/* Latency + detail */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {service.latency !== undefined && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.03] px-2.5 py-1.5">
                    <Activity className="h-3.5 w-3.5 text-textMuted" />
                    <span className="text-xs font-mono text-textMuted">{service.latency}ms</span>
                  </div>
                )}
                {service.detail && (
                  <p className="text-xs text-textMuted truncate max-w-[200px]" title={service.detail}>{service.detail}</p>
                )}
              </div>

              {/* Latency bar */}
              {service.latency !== undefined && service.status !== "checking" && (
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ${
                        service.status === "ok" ? "bg-matcha" :
                        service.status === "warn" ? "bg-gold" : "bg-vermilion"
                      }`}
                      style={{ width: `${Math.max(6, 100 - Math.min(94, (service.latency / 1000) * 100))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-textMuted font-bold">
                    {service.latency < 100 ? t("validation.fast") : service.latency < 500 ? t("validation.normal") : t("validation.slow")}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick fix guide */}
      {errorCount > 0 && (
        <div className="mt-6 brse-card rounded-2xl border border-vermilion/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-vermilion" />
            <h2 className="font-semibold text-ink">{t("validation.quickFixTitle")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.02] p-4">
              <p className="mb-2 text-sm font-semibold text-ink">{t("validation.restartBackend")}</p>
              <pre className="rounded-lg bg-black/40 px-3 py-2 text-xs text-matcha font-mono">cd ~/BrSE && docker compose up -d</pre>
            </div>
            <div className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.02] p-4">
              <p className="mb-2 text-sm font-semibold text-ink">{t("validation.restartAiProxy")}</p>
              <pre className="rounded-lg bg-black/40 px-3 py-2 text-xs text-cyan font-mono">pm2 start 9router || npm start</pre>
            </div>
            <div className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.02] p-4">
              <p className="mb-2 text-sm font-semibold text-ink">{t("validation.checkDocker")}</p>
              <pre className="rounded-lg bg-black/40 px-3 py-2 text-xs text-primary font-mono">docker ps | grep brse</pre>
            </div>
            <div className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.02] p-4">
              <p className="mb-2 text-sm font-semibold text-ink">{t("validation.viewErrorLogs")}</p>
              <pre className="rounded-lg bg-black/40 px-3 py-2 text-xs text-gold font-mono">docker compose logs --tail=50</pre>
            </div>
          </div>
        </div>
      )}

      <EnvironmentInfoPanel apiBaseUrl={apiBaseUrl} environmentInfo={environmentInfo} />
    </main>
  );
}


