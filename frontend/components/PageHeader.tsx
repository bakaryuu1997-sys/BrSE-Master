"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
  variant?: "default" | "primary" | "success" | "cyan" | "warning" | "danger";
}

interface PageHeaderProps {
  badge?: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  stats?: StatItem[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** Extra section rendered below stats (e.g. search bar row) */
  toolbar?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<NonNullable<StatItem["variant"]>, string> = {
  default:  "border-cyan/15       bg-cyan/[0.06]    text-cyan",
  primary:  "border-primary/25    bg-primary/10     text-primary",
  success:  "border-matcha/25     bg-matcha/10      text-matcha",
  cyan:     "border-cyan/25       bg-cyan/10        text-cyan",
  warning:  "border-gold/25       bg-gold/10        text-gold",
  danger:   "border-vermilion/25  bg-vermilion/10   text-vermilion",
};

export function PageHeader({
  badge,
  title,
  description,
  icon: Icon,
  iconColor = "text-primary",
  stats,
  actions,
  children,
  toolbar,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("brse-hero", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_28%,transparent_70%,rgba(255,255,255,0.03))]" />
      <div className="hero-mesh" />
      <div className="prism-orbit right-[-3rem] top-[-4rem] h-52 w-52 rotate-12 opacity-80" />
      <div className="prism-orbit bottom-[-5rem] right-24 h-40 w-40 -rotate-12 opacity-60" />
      <div className="relative flex flex-col gap-8 p-5 sm:p-6 lg:p-8">
        {/* Top section: badge + title + description */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-20">
          <div className="flex-1">
            {badge && (
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-primary transition-all duration-300">
                {badge}
              </div>
            )}
            
            <h1 className="text-h1 max-w-4xl select-none">
              {title}
            </h1>

            {description && (
              <p className="mt-4 max-w-3xl text-sm font-medium leading-6 text-textMuted lg:text-base">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {actions}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        {stats && stats.length > 0 && (
          <div className={cn(
            "grid gap-4",
            stats.length === 2 ? "sm:grid-cols-2" :
            stats.length === 3 ? "sm:grid-cols-3" :
            stats.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" :
            "sm:grid-cols-3"
          )}>
            {stats.map((stat) => {
              const variant = stat.variant ?? "default";
              return (
                <div
                  key={stat.label}
                  className={cn(
                    "metric-pill group relative overflow-hidden",
                    variantStyles[variant]
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted/60 transition-colors group-hover:text-primary">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-black tracking-tighter text-textPrimary lg:text-4xl">
                    {stat.value}
                  </p>
                  <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-full bg-current/10 blur-2xl transition-all group-hover:bg-current/20" />
                </div>
              );
            })}
          </div>
        )}

        {toolbar && (
          <div className="border-t soft-divider pt-5">
            {toolbar}
          </div>
        )}
      </div>

      {children}
    </header>
  );
}

/* ─── EmptyState component ─── */
interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, emoji, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("brse-empty", className)}>
      {/* Illustration / icon */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/[0.07] shadow-[0_0_30px_rgba(255,180,84,0.12)]">
        {emoji ? (
          <span className="text-3xl" role="img" aria-hidden="true">{emoji}</span>
        ) : Icon ? (
          <Icon className="h-7 w-7 text-textMuted/60" aria-hidden="true" />
        ) : null}
      </div>

      <p className="text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-textMuted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ─── SkeletonCard component ─── */
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3", "w-3/4"];
  return (
    <div className="brse-card p-5">
      <div className="skeleton mb-3 h-4 w-2/3" />
      <div className="skeleton mb-2 h-3 w-full" />
      {Array.from({ length: rows - 1 }, (_, i) => (
        <div key={i} className={cn("skeleton mb-2 h-3 last:mb-0", widths[i % widths.length])} />
      ))}
    </div>
  );
}

/* ─── Section header ─── */
export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-textMuted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
