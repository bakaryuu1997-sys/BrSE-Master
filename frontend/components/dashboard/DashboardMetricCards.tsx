"use client";

import { cn } from "@/lib/utils";
import { Flame, MessageSquare, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

import type { TranslationKey } from "@/lib/uiLanguage";

interface MetricCardProps {
  label: string;
  val: number | string;
  icon: LucideIcon;
  color: "rose" | "amber" | "emerald" | "primary";
  isActive: boolean;
  onClick: () => void;
  t: (key: TranslationKey) => string;
}

function MetricCard({ label, val, icon: Icon, color, isActive, onClick, t }: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "brse-card group relative p-3 text-left transition-all duration-200 hover:-translate-y-0.5 sm:p-3.5",
        color === "rose" ? "tone-card-danger" :
        color === "amber" ? "tone-card-warning" :
        color === "emerald" ? "tone-card-success" :
        "tone-card-primary",
        isActive && "ring-1 ring-primary/40 shadow-glow-sm"
      )}
    >
      {isActive && (
        <div className="absolute right-2.5 top-2.5 flex h-2 w-2 items-center justify-center">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-glow-sm transition-transform duration-300 group-hover:scale-105",
          color === "rose" ? "border-rose/30 bg-rose/10 text-rose shadow-rose/20" :
          color === "amber" ? "border-amber/30 bg-amber/10 text-amber shadow-amber/20" :
          color === "emerald" ? "border-emerald/30 bg-emerald/10 text-emerald shadow-emerald/20" :
          "border-primary/30 bg-primary/10 text-primary shadow-primary/20"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-display text-2xl font-black tracking-tight text-ink sm:text-3xl">
          {val}
        </span>
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-textMuted transition-colors group-hover:text-textPrimary">
          {label}
        </p>
        <p className="mt-0.5 text-[8.5px] font-medium uppercase text-textMuted/60">
          {isActive ? t("dashboard.metricClickClose") : t("dashboard.metricClickView")}
        </p>
      </div>
    </button>
  );
}

interface DashboardMetricCardsProps {
  t: (key: TranslationKey) => string;
  todoRiskCount: number;
  qnaWaitingCount: number;
  pendingCrCount: number;
  meetingActionsCount: number;
  activeDrawer: string;
  onToggleDrawer: (drawer: "todo" | "qna" | "cr" | "meetings") => void;
}

export function DashboardMetricCards({
  t,
  todoRiskCount,
  qnaWaitingCount,
  pendingCrCount,
  meetingActionsCount,
  activeDrawer,
  onToggleDrawer
}: DashboardMetricCardsProps) {
  const metrics = [
    { id: "todo", label: t("dashboard.metricTodoRisk"), val: todoRiskCount, icon: Flame, color: "rose" as const },
    { id: "qna", label: t("dashboard.metricQnaWaiting"), val: qnaWaitingCount, icon: MessageSquare, color: "amber" as const },
    { id: "cr", label: t("dashboard.metricPendingCr"), val: pendingCrCount, icon: ShieldCheck, color: "primary" as const },
    { id: "meetings", label: t("dashboard.metricMeetings"), val: meetingActionsCount, icon: Sparkles, color: "emerald" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard
          key={m.id}
          label={m.label}
          val={m.val}
          icon={m.icon}
          color={m.color}
          isActive={activeDrawer === m.id}
          onClick={() => onToggleDrawer(m.id as any)}
          t={t}
        />
      ))}
    </div>
  );
}
