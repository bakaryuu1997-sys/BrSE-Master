/**
 * Types, constants, and pure helper functions for the Validation page.
 * Extracted from validation/page.tsx to keep the route file thin.
 */

import type { ReactNode } from "react";
import { apiBaseUrl } from "@/lib/config";
import type { TranslationKey } from "@/lib/uiLanguage";

/* ─── domain types ─── */

export type ServiceStatus = "checking" | "ok" | "warn" | "error";

export interface ServiceCheck {
  id: string;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: ReactNode;
  status: ServiceStatus;
  latency?: number;
  detail?: string;
}

export type DeepHealth = {
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

/* ─── service check logic ─── */

export async function checkService(id: string): Promise<{ status: ServiceStatus; latency: number; detail?: string }> {
  const start = performance.now();
  try {
    if (id === "internet") {
      await fetch("https://www.google.com/favicon.ico", { cache: "no-store", mode: "no-cors", signal: AbortSignal.timeout(4000) });
      return { status: "ok", latency: Math.round(performance.now() - start) };
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
      return { status: "warn", latency, detail: "AI proxy không phản hồi" };
    }
    if (id === "stt") {
      const res = await fetch(`${apiBaseUrl}/stt/status`, { signal: AbortSignal.timeout(5000) });
      const latency = Math.round(performance.now() - start);
      return res.ok ? { status: "ok", latency } : { status: "warn", latency, detail: "STT service chưa sẵn sàng" };
    }
    return { status: "error", latency: 0, detail: "Unknown service" };
  } catch {
    return { status: "error", latency: Math.round(performance.now() - start), detail: "Connection refused / timeout" };
  }
}

export async function fetchDeepHealth(): Promise<DeepHealth> {
  const res = await fetch(`${apiBaseUrl}/health/deep`, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ─── formatting helpers ─── */

export function formatBytes(value?: number | null): string {
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

export function formatPercent(value?: number | null): string {
  return typeof value === "number" ? `${value}%` : "N/A";
}

export function formatTemp(value?: number | null): string {
  return typeof value === "number" ? `${value}°C` : "N/A";
}

export function metricWidth(percent?: number | null): string {
  return `${Math.min(100, Math.max(0, percent ?? 0))}%`;
}

/* ─── status config factory ─── */

export type StatusConfig = {
  color: string;
  bg: string;
  border: string;
  label: string;
  icon: ReactNode;
};
