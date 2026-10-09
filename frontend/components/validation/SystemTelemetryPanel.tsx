"use client";

import type { ReactNode } from "react";
import { Activity } from "lucide-react";
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
  if (!data || data.length < 2) return null;

  const width = 110;
  const height = 28;
  const padding = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return { x, y };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;
  const colors = {
    primary: { stroke: "#7aa2f7", gradStart: "rgba(122,162,247,0.2)" },
    cyan: { stroke: "#0db9d7", gradStart: "rgba(13,185,215,0.2)" },
    matcha: { stroke: "#9ece6a", gradStart: "rgba(158,206,106,0.2)" },
    gold: { stroke: "#e0af68", gradStart: "rgba(224,175,104,0.2)" },
    vermilion: { stroke: "#f7768e", gradStart: "rgba(247,118,142,0.2)" },
  }[tone];
  const lastPoint = points[points.length - 1];
  const gradId = `sparkline-grad-${tone}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
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
          r="2.5"
          fill={colors.stroke}
          className="animate-pulse"
          style={{ filter: `drop-shadow(0 0 2px ${colors.stroke})` }}
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
  const toneClass = {
    primary: "text-primary bg-primary",
    cyan: "text-cyan bg-cyan",
    matcha: "text-matcha bg-matcha",
    gold: "text-gold bg-gold",
    vermilion: "text-vermilion bg-vermilion",
  }[tone];
  const [textClass, barClass] = toneClass.split(" ");

  return (
    <div className="brse-card rounded-2xl p-4 flex flex-col justify-between h-full min-h-[150px] transition-all duration-300 hover:translate-y-[-2px] hover:shadow-glow-sm">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-textMuted">{label}</p>
          <span className={textClass}>{icon}</span>
        </div>
        <p className="mt-3 text-2xl font-black text-ink">{value}</p>
        <p className="mt-1 truncate text-xs text-textMuted">{description}</p>
      </div>

      <div className="mt-3">
        {sparklineData && sparklineData.length >= 2 ? (
          <div className="flex items-center justify-between gap-2 border-t border-[var(--brse-hairline-border)] pt-2 mt-2">
            <span className="text-[9px] text-textMuted font-bold uppercase tracking-widest">Live</span>
            <TelemetrySparkline data={sparklineData} tone={tone} />
          </div>
        ) : typeof percent === "number" ? (
          <div className="mt-2 h-1.5 rounded-full bg-black/30">
            <div className={`h-1.5 rounded-full ${barClass}`} style={{ width: metricWidth(percent) }} />
          </div>
        ) : null}
      </div>
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
  return (
    <section className="mt-5 brse-section p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="brse-label">{t("validation.systemStatusLabel")}</p>
          <h2 className="mt-1 text-xl font-black text-ink">{t("validation.systemStatusTitle")}</h2>
          <p className="mt-1 text-sm text-textMuted">{t("validation.systemStatusDesc")}</p>
        </div>
        <span className="rounded-full border border-[var(--brse-hairline-border)] bg-surface/55 px-3 py-1 text-xs font-black uppercase text-textMuted">
          {checkedAt ? formatAppTime(new Date(checkedAt), language) : t("validation.waitingForDeepHealth")}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <HealthMetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  );
}
