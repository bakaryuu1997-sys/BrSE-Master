"use client";

import { useMemo } from "react";

// ─── Pattern banks ──────────────────────────────────────────────────────────
const TEINEIGO_PATTERNS = [
  /です/g,
  /ます/g,
  /ました/g,
  /ません/g,
  /でした/g,
  /でしょう/g,
  /ございます/g,
  /ございました/g,
];

const SONKEIGO_PATTERNS = [
  /いらっしゃ/g,
  /おっしゃ/g,
  /ご覧/g,
  /お～になる/g,
  /くださ/g,
  /なさ/g,
  /お[一-龥ぁ-ゖ]+になる/g,
  /ご[一-龥ぁ-ゖ]+になる/g,
  /ご[一-龥ぁ-ゖ]+くださ/g,
  /お[一-龥ぁ-ゖ]+くださ/g,
  /ご教示/g,
  /ご確認/g,
  /ご検討/g,
  /ご指示/g,
  /ご共有/g,
  /ご報告/g,
  /お忙しい/g,
  /お手数/g,
];

const KENJOUGO_PATTERNS = [
  /参り/g,
  /申し/g,
  /いたし/g,
  /いたします/g,
  /おり/g,        // おります
  /存じ/g,
  /拝見/g,
  /拝読/g,
  /お[一-龥ぁ-ゖ]+する/g,
  /お[一-龥ぁ-ゖ]+いたし/g,
  /ご[一-龥ぁ-ゖ]+いたし/g,
  /させていただ/g,
  /弊社/g,
];

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const p of patterns) {
    const matches = text.match(new RegExp(p.source, p.flags));
    if (matches) count += matches.length;
  }
  return count;
}

interface Breakdown {
  teineigo: number;
  sonkeigo: number;
  kenjougo: number;
  total: number;
  pctTeineigo: number;
  pctSonkeigo: number;
  pctKenjougo: number;
}

function analyse(text: string): Breakdown {
  const teineigo = countMatches(text, TEINEIGO_PATTERNS);
  const sonkeigo = countMatches(text, SONKEIGO_PATTERNS);
  const kenjougo = countMatches(text, KENJOUGO_PATTERNS);
  const total = teineigo + sonkeigo + kenjougo;
  if (total === 0) return { teineigo: 0, sonkeigo: 0, kenjougo: 0, total: 0, pctTeineigo: 0, pctSonkeigo: 0, pctKenjougo: 0 };
  return {
    teineigo,
    sonkeigo,
    kenjougo,
    total,
    pctTeineigo: Math.round((teineigo / total) * 100),
    pctSonkeigo: Math.round((sonkeigo / total) * 100),
    pctKenjougo: Math.round((kenjougo / total) * 100),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
interface PolitenessMeterProps {
  text: string;
}

export function PolitenessMeter({ text }: PolitenessMeterProps) {
  const bd = useMemo(() => analyse(text), [text]);

  if (bd.total === 0) return null;

  const segments: { label: string; jpLabel: string; pct: number; count: number; color: string; glow: string; bg: string }[] = [
    {
      label: "Teineigo",
      jpLabel: "丁寧語",
      pct: bd.pctTeineigo,
      count: bd.teineigo,
      color: "bg-emerald-500",
      glow: "shadow-emerald-500/40",
      bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    {
      label: "Sonkeigo",
      jpLabel: "尊敬語",
      pct: bd.pctSonkeigo,
      count: bd.sonkeigo,
      color: "bg-teal-400",
      glow: "shadow-teal-400/40",
      bg: "bg-teal-400/15 text-teal-300 border-teal-400/30",
    },
    {
      label: "Kenjougo",
      jpLabel: "謙譲語",
      pct: bd.pctKenjougo,
      count: bd.kenjougo,
      color: "bg-orange-500",
      glow: "shadow-orange-500/40",
      bg: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.02] p-4 space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-textMuted">
          Politeness Meter
        </span>
        <span className="text-[10px] text-textMuted">
          {bd.total} pattern{bd.total > 1 ? "s" : ""} detected
        </span>
      </div>

      {/* Stacked bar */}
      <div className="relative h-3 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
        {segments.map((seg) =>
          seg.pct > 0 ? (
            <div
              key={seg.label}
              className={`${seg.color} h-full transition-all duration-700 ease-out shadow-lg ${seg.glow}`}
              style={{ width: `${seg.pct}%` }}
            />
          ) : null
        )}
      </div>

      {/* Legend badges */}
      <div className="flex flex-wrap gap-2">
        {segments.map((seg) =>
          seg.count > 0 ? (
            <span
              key={seg.label}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${seg.bg}`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${seg.color}`} />
              {seg.jpLabel} {seg.pct}%
              <span className="opacity-60">({seg.count})</span>
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}
