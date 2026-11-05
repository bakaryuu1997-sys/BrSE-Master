"use client";

import { useState, type ReactNode } from "react";
import { Activity, ChevronDown, ChevronUp, Cpu, Info, Thermometer } from "lucide-react";
import { formatAppTime } from "@/lib/dateUtils";
import type { TranslationKey, UiLanguage } from "@/lib/uiLanguage";

export type HealthMetric = {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone?: "primary" | "cyan" | "matcha" | "gold" | "vermilion";
  percent?: number | null;
  sparklineData?: number[];
  isAvailable?: boolean;
};

function metricWidth(percent?: number | null) {
  return `${Math.min(100, Math.max(0, percent ?? 0))}%`;
}

function TelemetrySparkline({
  data,
  tone = "primary",
}: {
  data: number[];
  tone?: "primary" | "cyan" | "matcha" | "gold" | "vermilion";
}) {
  const valid = (data || []).filter((n) => typeof n === "number" && !isNaN(n) && isFinite(n));
  if (valid.length < 2) return null;

  const width = 84;
  const height = 22;
  const padding = 2;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min === 0 ? 1 : max - min;
  const points = valid.map((val, i) => {
    const x = (i / (valid.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? height / 2 : y };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1]?.x.toFixed(1) ?? width} ${height} L ${points[0]?.x.toFixed(1) ?? 0} ${height} Z`;
  
  const toneMap = {
    primary: { stroke: "#7aa2f7", gradStart: "rgba(122,162,247,0.25)" },
    cyan: { stroke: "#0db9d7", gradStart: "rgba(13,185,215,0.25)" },
    matcha: { stroke: "#9ece6a", gradStart: "rgba(158,206,106,0.25)" },
    gold: { stroke: "#e0af68", gradStart: "rgba(224,175,104,0.25)" },
    vermilion: { stroke: "#f7768e", gradStart: "rgba(247,118,142,0.25)" },
  };
  const colors = toneMap[tone] || toneMap.primary;
  const lastPoint = points[points.length - 1];
  const gradId = `sparkline-grad-${tone}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.gradStart} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={colors.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="2"
          fill={colors.stroke}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

function HealthMetricCard({
  label,
  value,
  description,
  icon,
  tone = "primary",
  percent,
  sparklineData,
}: HealthMetric) {
  const toneMap = {
    primary: "text-primary bg-primary",
    cyan: "text-cyan bg-cyan",
    matcha: "text-matcha bg-matcha",
    gold: "text-gold bg-gold",
    vermilion: "text-vermilion bg-vermilion",
  };
  const toneClass = toneMap[tone] || toneMap.primary;
  const [textClass, barClass] = toneClass.split(" ");

  return (
    <div className="brse-card rounded-xl p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-primary/40 hover:shadow-glow-sm">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-textMuted truncate">{label}</p>
          <span className={`shrink-0 ${textClass}`}>{icon}</span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <p className="text-xl font-black text-ink tracking-tight">{value}</p>
          {sparklineData && sparklineData.length >= 2 ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] text-textMuted font-bold uppercase">Live</span>
              <TelemetrySparkline data={sparklineData} tone={tone} />
            </div>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-textMuted" title={description}>{description}</p>
      </div>

      {typeof percent === "number" && (
        <div className="mt-2.5 h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: metricWidth(percent) }} />
        </div>
      )}
    </div>
  );
}

export function SystemTelemetryPanel({
  checkedAt,
  language,
  metrics,
  t,
}: {
  checkedAt?: string;
  language: UiLanguage;
  metrics: HealthMetric[];
  t: (key: TranslationKey) => string;
}) {
  const [showUnavailable, setShowUnavailable] = useState(false);

  // Split into active (has real value) and unavailable (N/A)
  const activeMetrics = metrics.filter(m => m.isAvailable !== false && m.value !== "N/A");
  const unavailableMetrics = metrics.filter(m => m.isAvailable === false || m.value === "N/A");

  return (
    <section className="mt-3.5 brse-section p-3.5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-base font-bold text-ink">{t("validation.systemStatusTitle")}</h2>
          </div>
          <p className="mt-0.5 text-xs text-textMuted">{t("validation.systemStatusDesc")}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="rounded-full border border-[var(--brse-hairline-border)] bg-surface/55 px-2.5 py-0.5 text-[11px] font-semibold text-textMuted">
            {checkedAt ? formatAppTime(new Date(checkedAt), language) : t("validation.waitingForDeepHealth")}
          </span>
          {unavailableMetrics.length > 0 && (
            <button
              type="button"
              onClick={() => setShowUnavailable(prev => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-textMuted hover:text-ink transition px-2 py-0.5 rounded border border-transparent hover:border-[var(--brse-panel-border)]"
            >
              <span>{unavailableMetrics.length} sensor N/A</span>
              {showUnavailable ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Active metrics grid (compact 4 columns) */}
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {activeMetrics.map((metric) => (
          <HealthMetricCard key={metric.label} {...metric} />
        ))}
      </div>

      {/* Subtle indicator or collapsible drawer for unavailable sensors */}
      {unavailableMetrics.length > 0 && (
        <div className="mt-2.5">
          {showUnavailable ? (
            <div className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/30 p-2.5 grid gap-2 sm:grid-cols-3 text-xs">
              {unavailableMetrics.map(m => (
                <div key={m.label} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-black/20 text-textMuted">
                  <span className="font-semibold">{m.label}:</span>
                  <span className="font-mono text-xs opacity-75">{m.description || m.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-textMuted/70 px-1">
              <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>Sensors chưa kích hoạt trên container: {unavailableMetrics.map(m => m.label).join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
