"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Database,
  Globe,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  Table as TableIcon,
  Thermometer,
  Wifi,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { formatAppTime } from "@/lib/dateUtils";
import { apiBaseUrl } from "@/lib/config";
import { PageHeader } from "@/components/PageHeader";
import { SectionErrorBoundary } from "@/components/ErrorBoundary";
import { EnvironmentInfoPanel } from "@/components/validation/EnvironmentInfoPanel";
import { SystemTelemetryPanel, type HealthMetric } from "@/components/validation/SystemTelemetryPanel";
import { LatencyHistoryModal } from "@/components/validation/LatencyHistoryModal";
import { TableInspectorModal } from "@/components/validation/TableInspectorModal";
import { SelfHealingModal } from "@/components/validation/SelfHealingModal";
import { recordServicePing } from "@/lib/latencyHistory";
import { formatBytes, formatPercent, formatTemp } from "@/lib/validationHelpers";
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
  { id: "backend",  nameKey: "validation.backendName",  descriptionKey: "validation.backendDesc",  icon: <Server className="h-4 w-4" /> },
  { id: "db",       nameKey: "validation.dbName",       descriptionKey: "validation.dbDesc",       icon: <Database className="h-4 w-4" /> },
  { id: "ai",       nameKey: "validation.aiName",       descriptionKey: "validation.aiDesc",       icon: <Cpu className="h-4 w-4" /> },
  { id: "internet", nameKey: "validation.internetName", descriptionKey: "validation.internetDesc", icon: <Wifi className="h-4 w-4" /> },
  { id: "stt",      nameKey: "validation.sttName",      descriptionKey: "validation.sttDesc",      icon: <Activity className="h-4 w-4" /> },
];

const statusConfig = (t: (key: TranslationKey) => string) => ({
  checking: { color: "text-textMuted",  bg: "bg-textMuted/10",  border: "border-textMuted/20", label: t("validation.statusChecking"), icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  ok:       { color: "text-matcha",     bg: "bg-matcha/10",     border: "border-matcha/25",    label: "Online",           icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  warn:     { color: "text-gold",       bg: "bg-gold/10",       border: "border-gold/25",      label: t("validation.warn"), icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  error:    { color: "text-vermilion",  bg: "bg-vermilion/10",  border: "border-vermilion/25", label: "Offline",          icon: <XCircle className="h-3.5 w-3.5" /> },
});

async function checkService(
  id: string,
  t: (key: TranslationKey) => string
): Promise<{ status: ServiceStatus; latency: number; detail?: string }> {
  const start = performance.now();
  try {
    if (id === "internet") {
      const isOnline = typeof navigator !== "undefined" && navigator.onLine;
      return isOnline
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
          return { status: "warn", latency, detail: data.runtime_error || "9router runtime unreachable" };
        }
        if (typeof data.runtime_status_code === "number" && data.runtime_status_code >= 400) {
          return { status: "warn", latency, detail: `9router HTTP ${data.runtime_status_code}: check key` };
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
  const [copiedReport, setCopiedReport] = useState(false);
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

  // Modals state (Strategic & Killer Moat features)
  const [pingModalOpen, setPingModalOpen] = useState(false);
  const [pingModalService, setPingModalService] = useState("backend");
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectTable, setInspectTable] = useState("");
  const [healModalOpen, setHealModalOpen] = useState(false);

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
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRefreshing(true);
    setDeepHealthError("");
    setServices((current) => current.map((s) => ({ ...s, status: "checking" as ServiceStatus, latency: undefined, detail: undefined })));

    const [results, deepResult] = await Promise.all([
      Promise.allSettled(SERVICES.map((s) => checkService(s.id, t))),
      fetchDeepHealth()
        .then((payload) => ({ ok: true as const, payload }))
        .catch((error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : "Deep health check failed" })),
    ]);

    setServices((current) =>
      current.map((s, i) => {
        const result = results[i];
        if (result.status === "fulfilled") {
          const val = result.value;
          // Record into rolling Ping History for 24h anomaly detection
          recordServicePing(s.id, val.latency, val.status, val.detail);
          return { ...s, ...val };
        }
        recordServicePing(s.id, 0, "error", "Check failed");
        return { ...s, status: "error" as ServiceStatus, detail: "Check failed" };
      })
    );

    if (deepResult.ok) {
      const payload = deepResult.payload;
      setDeepHealth(payload);
      
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
      setDeepHealthError(deepResult.error || t("validation.deepHealthUnavailable"));
    }

    setLastChecked(new Date());
    setIsRefreshing(false);
    runningRef.current = false;
  }, [t]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEnvironmentInfo({
        frontend: window.location.origin,
        userAgent: `${navigator.userAgent.slice(0, 50)}...`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "N/A",
        browserLanguage: navigator.language || "N/A",
        online: navigator.onLine ? "Yes" : "No",
      });
    }
    void runChecks();

    const interval = setInterval(() => {
      if (!document.hidden) void runChecks();
    }, 6000);
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
      isAvailable: typeof cpu?.usage_percent === "number",
    },
    {
      label: t("validation.memUsed"),
      value: formatBytes(memory?.used_bytes),
      description: `${t("validation.of")} ${formatBytes(memory?.total_bytes)} (${formatPercent(memory?.used_percent)})`,
      icon: <Server className="h-4 w-4" />,
      tone: "cyan" as const,
      percent: memory?.used_percent,
      sparklineData: memHistory,
      isAvailable: typeof memory?.used_bytes === "number",
    },
    {
      label: "System Load",
      value: load?.load_1m !== undefined && load?.load_1m !== null ? String(load.load_1m) : "N/A",
      description: `5m: ${load?.load_5m ?? "--"} · 15m: ${load?.load_15m ?? "--"}`,
      icon: <Activity className="h-4 w-4" />,
      tone: "gold" as const,
      sparklineData: loadHistory,
      isAvailable: typeof load?.load_1m === "number",
    },
    {
      label: "Disk Used",
      value: disk?.used_percent !== undefined && disk?.used_percent !== null ? formatPercent(disk.used_percent) : "N/A",
      description: `${formatBytes(disk?.free_bytes)} free / ${formatBytes(disk?.total_bytes)}`,
      icon: <Server className="h-4 w-4" />,
      tone: "matcha" as const,
      percent: disk?.used_percent,
      sparklineData: diskHistory,
      isAvailable: typeof disk?.used_percent === "number",
    },
    {
      label: t("validation.cpuTemp"),
      value: formatTemp(cpu?.temperature_c),
      description: cpu?.detail || t("validation.thermalSensor"),
      icon: <Thermometer className="h-4 w-4" />,
      tone: "vermilion" as const,
      sparklineData: cpuTempHistory,
      isAvailable: typeof cpu?.temperature_c === "number",
    },
    {
      label: t("validation.gpu"),
      value: gpu?.utilization_percent !== undefined && gpu?.utilization_percent !== null ? formatPercent(gpu.utilization_percent) : "N/A",
      description: gpu?.name || gpu?.detail || t("validation.sensorUnavailable"),
      icon: <Activity className="h-4 w-4" />,
      tone: "primary" as const,
      percent: gpu?.utilization_percent,
      sparklineData: gpuHistory,
      isAvailable: typeof gpu?.utilization_percent === "number",
    },
    {
      label: t("validation.gpuTemp"),
      value: gpu?.temperature_c !== undefined && gpu?.temperature_c !== null ? formatTemp(gpu.temperature_c) : "N/A",
      description: gpu?.source || t("validation.sensorUnavailable"),
      icon: <Thermometer className="h-4 w-4" />,
      tone: "vermilion" as const,
      sparklineData: gpuTempHistory,
      isAvailable: typeof gpu?.temperature_c === "number",
    },
  ];

  // 1-Click Diagnostic Copy for BrSE troubleshooting
  const copyDiagnosticSummary = () => {
    const lines = [
      `# BrSE OS System Health Report`,
      `Time: ${new Date().toISOString()}`,
      `Status: ${overallStatus.toUpperCase()} (${okCount}/${services.length} services online)`,
      ``,
      `## Core Services`,
      ...services.map(s => `- ${t(s.nameKey)}: ${s.status.toUpperCase()} (${s.latency ?? "--"}ms) ${s.detail ? `[${s.detail}]` : ""}`),
      ``,
      `## System Vitals`,
      `- CPU: ${formatPercent(cpu?.usage_percent)} (${cpu?.cpu_count ?? "--"} cores)`,
      `- RAM: ${formatBytes(memory?.used_bytes)} / ${formatBytes(memory?.total_bytes)} (${formatPercent(memory?.used_percent)})`,
      `- Disk: ${formatBytes(disk?.used_bytes)} / ${formatBytes(disk?.total_bytes)} (${formatPercent(disk?.used_percent)})`,
      `- Load: 1m=${load?.load_1m ?? "--"}, 5m=${load?.load_5m ?? "--"}, 15m=${load?.load_15m ?? "--"}`,
      ``,
      `## Database Tables`,
      ...Object.entries(tableCounts).map(([k, v]) => `- ${k}: ${v}`),
      ``,
      `## Glossary Health: Total=${glossary?.total_count ?? 0}, Duplicates=${glossary?.potential_duplicates ?? 0}`,
      `## Meeting Jobs: Active=${jobs?.active_count ?? 0}, Failed=${jobs?.failed_with_error ?? 0}`,
    ];
    if (deepWarnings.length) {
      lines.push(``, `## Warnings:`, ...deepWarnings.map(w => `- ${w}`));
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    });
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHealModalOpen(true)}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-matcha/40 bg-matcha/15 px-3 text-xs font-semibold text-matcha hover:bg-matcha/25 transition shadow-sm"
              title="Kích hoạt Self-Healing Recovery Daemon để tự khắc phục lỗi kết nối và tiến trình treo"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tự phục hồi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPingModalService("backend");
                setPingModalOpen(true);
              }}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-cyan/40 bg-cyan/15 px-3 text-xs font-semibold text-cyan hover:bg-cyan/25 transition"
              title="Xem lịch sử đo ping và phát hiện nghẽn mạng 24h"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Lịch sử Ping</span>
            </button>
            <button
              type="button"
              onClick={copyDiagnosticSummary}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-surface/50 px-3 text-xs font-semibold text-textMuted hover:text-ink hover:border-primary/40 transition"
              title="Sao chép báo cáo chẩn đoán toàn hệ thống dạng Markdown"
            >
              {copiedReport ? (
                <>
                  <Check className="h-3.5 w-3.5 text-matcha" />
                  <span className="text-matcha">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Chép chẩn đoán</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => void runChecks()}
              disabled={isRefreshing}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-3 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? t("validation.checkingShort") : t("validation.recheck")}
            </button>
          </div>
        }
      />

      {/* Overall status hero capsule (compact, single sleek row) */}
      <div className={`mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${statuses[overallStatus].border} ${statuses[overallStatus].bg}`}>
        <div className="flex items-center gap-2.5">
          <span className={statuses[overallStatus].color}>{statuses[overallStatus].icon}</span>
          <div>
            <p className={`text-xs font-bold ${statuses[overallStatus].color}`}>
              {overallStatus === "ok" && t("validation.statusReady")}
              {overallStatus === "warn" && t("validation.statusWarn")}
              {overallStatus === "error" && t("validation.statusError")}
              {overallStatus === "checking" && t("validation.statusChecking")}
            </p>
            {lastChecked && (
              <p className="text-[10px] text-textMuted">
                {t("validation.lastUpdated")} {formatAppTime(lastChecked, language)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-current/20 bg-black/20 px-2 py-0.5 text-[11px] font-mono font-bold text-textMuted">
            {okCount}/{services.length} Online
          </span>
          {overallStatus === "ok" && <Zap className="h-4 w-4 text-matcha" aria-hidden="true" />}
        </div>
      </div>

      {/* Core services strip (Immediately visible, sleek horizontal cards, Click to see ping history) */}
      <SectionErrorBoundary label="Core Services">
        <section className="mt-3.5">
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {services.map((service) => {
              const cfg = statuses[service.status] || statuses.checking;
              return (
                <div
                  key={service.id}
                  onClick={() => {
                    setPingModalService(service.id);
                    setPingModalOpen(true);
                  }}
                  className={`brse-card rounded-xl p-3 border transition-all duration-200 cursor-pointer hover:border-primary/60 hover:shadow-glow-sm ${cfg.border} ${
                    service.status === "error" ? "border-vermilion/45 bg-vermilion/5" : ""
                  }`}
                  title="Nhấn để xem biểu đồ và lịch sử độ trễ ping 24h"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${cfg.border} ${cfg.bg} ${cfg.color}`}>
                        {service.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-ink truncate">{t(service.nameKey)}</h3>
                        <p className="text-[10px] text-textMuted truncate">{t(service.descriptionKey)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-[var(--brse-hairline-border)] pt-2 text-[11px]">
                    <div className="flex items-center gap-1 font-mono text-textMuted">
                      <Activity className="h-3 w-3" />
                      <span>{service.latency !== undefined ? `${service.latency}ms` : "--"}</span>
                    </div>

                    <div className={`flex items-center gap-1 font-semibold ${cfg.color}`}>
                      <span className="relative flex h-1.5 w-1.5">
                        {service.status === "ok" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-matcha opacity-75" />}
                        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                          service.status === "ok" ? "bg-matcha" : service.status === "warn" ? "bg-gold" : "bg-vermilion"
                        }`} />
                      </span>
                      <span>{cfg.label}</span>
                    </div>
                  </div>

                  {service.detail && (
                    <p className="mt-1 text-[10px] text-textMuted/80 font-mono truncate" title={service.detail}>
                      {service.detail}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </SectionErrorBoundary>

      {/* System Telemetry Panel (Compact vitals + Auto-collapsible N/A sensors) */}
      <SectionErrorBoundary label="System Telemetry">
        <SystemTelemetryPanel checkedAt={deepHealth?.checked_at} language={language} metrics={systemMetrics} t={t} />
      </SectionErrorBoundary>

      {/* Segment B: Workspace Productivity & DB Health (Click table card to open Inspector!) */}
      <SectionErrorBoundary label="Workspace & DB Health">
        <section className="mt-3.5 brse-section p-3.5 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan" aria-hidden="true" />
                <h2 className="text-base font-bold text-ink">{t("validation.workspaceTitle")}</h2>
              </div>
              <p className="mt-0.5 text-xs text-textMuted">{t("validation.workspaceDesc")} · Nhấn vào bảng bất kỳ để xem dữ liệu</p>
            </div>
            <div className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase self-start sm:self-center ${
              deepHealth?.status === "ok"
                ? "border-matcha/30 bg-matcha/10 text-matcha"
                : deepHealth
                ? "border-gold/30 bg-gold/10 text-gold"
                : "border-vermilion/30 bg-vermilion/10 text-vermilion"
            }`}>
              {deepHealth ? deepHealth.status : "Unavailable"}
            </div>
          </div>

          {deepHealthError ? (
            <div className="mt-3 rounded-lg border border-vermilion/25 bg-vermilion/10 p-3 text-xs text-vermilion">
              {t("validation.deepHealthUnavailable")}: {deepHealthError}
            </div>
          ) : null}

          {deepWarnings.length ? (
            <div className="mt-2.5 grid gap-1.5">
              {deepWarnings.map((warning) => (
                <div key={warning} className="flex items-center gap-2 rounded-lg border border-gold/25 bg-gold/10 px-2.5 py-1.5 text-xs text-gold">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          ) : deepHealth ? (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-matcha/25 bg-matcha/10 px-2.5 py-1.5 text-xs text-matcha">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{t("validation.deepHealthNoWarnings")}</span>
            </div>
          ) : null}

          <div className="mt-3.5 grid gap-3 lg:grid-cols-3">
            {/* DB table counts with TableInspector click handler! */}
            <div className="rounded-xl border border-[var(--brse-hairline-border)] bg-background/35 p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <p className="text-xs font-bold text-ink">{t("validation.dbRecordsTitle")}</p>
                  <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-cyan">
                    {deepHealth?.database?.dialect ?? "postgresql"}
                  </span>
                </div>
                <div className="grid gap-1.5 grid-cols-2">
                  {Object.entries(tableCounts).map(([key, value]) => (
                    <div
                      key={key}
                      onClick={() => {
                        setInspectTable(key);
                        setInspectModalOpen(true);
                      }}
                      className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 px-2.5 py-1.5 cursor-pointer transition-all hover:border-cyan/50 hover:bg-surface/70 group"
                      title="Nhấn để thanh tra trực tiếp dữ liệu bảng này"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-textMuted truncate group-hover:text-cyan transition-colors">
                          {key.replaceAll("_", " ")}
                        </p>
                        <TableIcon className="h-2.5 w-2.5 text-textMuted/40 group-hover:text-cyan transition-colors" />
                      </div>
                      <p className="mt-0.5 text-base font-black text-ink">{value ?? "0"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Meeting queue phases */}
            <div className="rounded-xl border border-[var(--brse-hairline-border)] bg-background/35 p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <p className="text-xs font-bold text-ink">{t("validation.meetingQueueTitle")}</p>
                  <Activity className="h-3.5 w-3.5 text-gold" />
                </div>
                <div className="grid gap-1.5">
                  {Object.entries(jobs?.by_phase ?? {}).length ? (
                    Object.entries(jobs?.by_phase ?? {}).map(([phase, count]) => (
                      <div key={phase} className="flex items-center justify-between rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 px-2.5 py-1 text-xs">
                        <span className="font-medium text-textMuted">{phase}</span>
                        <span className="font-mono font-bold text-ink">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 px-2.5 py-3 text-center text-xs text-textMuted italic">
                      {t("validation.noMeetingJobs")}
                    </p>
                  )}
                </div>
              </div>
              {jobs?.active_count !== undefined && (
                <div className="mt-2.5 pt-2 border-t border-[var(--brse-hairline-border)] flex items-center justify-between text-[11px] text-textMuted">
                  <span>{t("validation.activeJobs")}: <b>{jobs.active_count}</b></span>
                  <span>{t("validation.failedJobs")}: <b>{jobs.failed_with_error ?? 0}</b></span>
                </div>
              )}
            </div>

            {/* Glossary Analytics */}
            <div className="rounded-xl border border-[var(--brse-hairline-border)] bg-background/35 p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <p className="text-xs font-bold text-ink">{t("validation.glossaryAnalyticsTitle")}</p>
                  <Globe className="h-3.5 w-3.5 text-cyan" />
                </div>
                <div className="grid gap-1.5 text-xs">
                  <div
                    onClick={() => {
                      setInspectTable("glossary");
                      setInspectModalOpen(true);
                    }}
                    className="flex items-center justify-between rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 px-2.5 py-1 cursor-pointer hover:border-cyan/40 transition"
                    title="Xem bảng Glossary"
                  >
                    <span className="text-textMuted">{t("validation.glossaryTotal")}</span>
                    <span className="font-mono font-bold text-ink">{glossary?.total_count ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 px-2.5 py-1">
                    <span className="text-textMuted">{t("validation.glossaryAuto")}</span>
                    <span className={`font-mono font-bold ${glossary?.auto_extracted_count ? 'text-gold' : 'text-ink'}`}>
                      {glossary?.auto_extracted_count ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 px-2.5 py-1">
                    <span className="text-textMuted">{t("validation.glossaryDuplicates")}</span>
                    <span className={`font-mono font-bold ${glossary?.potential_duplicates ? 'text-vermilion' : 'text-ink'}`}>
                      {glossary?.potential_duplicates ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--brse-hairline-border)] text-[10px] text-textMuted italic leading-tight">
                {t("validation.glossaryFootnote")}
              </div>
            </div>
          </div>
        </section>
      </SectionErrorBoundary>

      {/* Quick fix guide (Only shown when a service is offline or degraded) */}
      {errorCount > 0 && (
        <SectionErrorBoundary label="Quick Fix Guide">
          <div className="mt-3.5 brse-card rounded-xl border border-vermilion/30 p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <Wrench className="h-4 w-4 text-vermilion" />
              <h2 className="text-sm font-bold text-ink">{t("validation.quickFixTitle")}</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] p-2.5">
                <p className="mb-1 text-xs font-semibold text-ink">{t("validation.restartBackend")}</p>
                <pre className="rounded bg-black/40 px-2 py-1 text-[11px] text-matcha font-mono">cd ~/BrSE && docker compose up -d</pre>
              </div>
              <div className="rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] p-2.5">
                <p className="mb-1 text-xs font-semibold text-ink">{t("validation.restartAiProxy")}</p>
                <pre className="rounded bg-black/40 px-2 py-1 text-[11px] text-cyan font-mono">pm2 start 9router || npm start</pre>
              </div>
              <div className="rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] p-2.5">
                <p className="mb-1 text-xs font-semibold text-ink">{t("validation.checkDocker")}</p>
                <pre className="rounded bg-black/40 px-2 py-1 text-[11px] text-primary font-mono">docker ps | grep brse</pre>
              </div>
              <div className="rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] p-2.5">
                <p className="mb-1 text-xs font-semibold text-ink">{t("validation.viewErrorLogs")}</p>
                <pre className="rounded bg-black/40 px-2 py-1 text-[11px] text-gold font-mono">docker compose logs --tail=50</pre>
              </div>
            </div>
          </div>
        </SectionErrorBoundary>
      )}

      {/* Environment info & Runtime variables */}
      <SectionErrorBoundary label="Environment Info">
        <EnvironmentInfoPanel apiBaseUrl={apiBaseUrl} environmentInfo={environmentInfo} />
      </SectionErrorBoundary>

      {/* Strategic & Killer Moat Modals */}
      <LatencyHistoryModal
        isOpen={pingModalOpen}
        onClose={() => setPingModalOpen(false)}
        services={SERVICES}
        initialServiceId={pingModalService}
      />

      <TableInspectorModal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        tableName={inspectTable}
        totalRecords={tableCounts[inspectTable] ?? 0}
      />

      <SelfHealingModal
        isOpen={healModalOpen}
        onClose={() => setHealModalOpen(false)}
        onCompleted={() => void runChecks()}
      />
    </main>
  );
}
