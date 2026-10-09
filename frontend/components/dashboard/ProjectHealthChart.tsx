"use client";

import React from "react";

interface ProjectHealthChartProps {
  todoPercent: number;
  qnaCount: number;
  crCount: number;
  overdueCount: number;
}

export function ProjectHealthChart({
  todoPercent,
  qnaCount,
  crCount,
  overdueCount,
}: ProjectHealthChartProps) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (todoPercent / 100) * circumference;
  const health = todoPercent >= 70 ? "good" : todoPercent >= 40 ? "warn" : "bad";
  const healthColor = health === "good" ? "#34d399" : health === "warn" ? "#fbbf24" : "#f87171";

  return (
    <div className="flex items-center gap-5">
      {/* Donut */}
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke={healthColor}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <span className="relative text-sm font-black text-textPrimary">{todoPercent}%</span>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 flex-1">
        <div className="text-center">
          <p className="text-xs font-black text-rose-400">{overdueCount}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-textMuted">Overdue</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-amber-400">{qnaCount}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-textMuted">Q&A</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-primary">{crCount}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-textMuted">CR</p>
        </div>
      </div>
    </div>
  );
}
