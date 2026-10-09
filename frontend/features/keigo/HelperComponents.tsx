"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";

// ─── Score Circular Gauge ───────────────────────────────────────────────────
interface ScoreGaugeProps {
  score: number;
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const { t } = useUiLanguage();
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (score / 100) * circumference;
  const isGood = score >= 80;
  const isOk = score >= 60;
  const color = isGood ? "#34d399" : isOk ? "#fbbf24" : "#f87171";
  const label = isGood ? t("keigo.scoreExcellent") : isOk ? t("keigo.scoreGood") : t("keigo.scoreNeedsWork");
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)",
              filter: `drop-shadow(0 0 6px ${color}80)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black" style={{ color }}>
            {score}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-textMuted">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-bold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

// ─── Score Horizontal Progress Bar ───────────────────────────────────────────
interface ScoreBarProps {
  score: number;
}

export function ScoreBar({ score }: ScoreBarProps) {
  const color =
    score >= 80
      ? "from-emerald-500 to-teal-400"
      : score >= 60
        ? "from-orange-500 to-teal-400"
        : score >= 40
          ? "from-yellow-500 to-orange-400"
          : "from-rose-500 to-pink-400";

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/50">Keigo Score</span>
        <span className="text-lg font-bold text-white">
          {score}
          <span className="text-xs text-white/50">/100</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── One-click Copy Button ───────────────────────────────────────────────────
interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const { t } = useUiLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-white/50 hover:text-white/90 hover:bg-white/5 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? t("keigo.copied") : t("dashboard.copy")}
    </button>
  );
}
