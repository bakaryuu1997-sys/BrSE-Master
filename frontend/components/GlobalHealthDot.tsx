"use client";

import Link from "next/link";
import { Activity, ShieldAlert, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDeepHealth } from "@/lib/health";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useUiLanguage } from "@/components/LanguageProvider";

type HealthState = "ok" | "warn" | "error" | "loading";

export function GlobalHealthDot() {
  const { t } = useUiLanguage();
  const healthQuery = useQuery({
    queryKey: queryKeys.health.deep(),
    queryFn: ({ signal }) => fetchDeepHealth(signal),
    refetchInterval: 10_000,
  });

  const status: HealthState = healthQuery.isPending
    ? "loading"
    : healthQuery.isError
      ? "error"
      : healthQuery.data.status === "warn"
        ? "warn"
        : "ok";

  const tooltip = healthQuery.isPending
    ? t("system.health.loading")
    : healthQuery.isError
      ? t("system.health.offline")
      : healthQuery.data.status === "warn"
        ? t("system.health.warn").replace("{warnings}", healthQuery.data.warnings?.join(", ") || t("system.health.minorIssues"))
        : t("system.health.ok");

  const config = {
    loading: {
      color: "bg-textMuted",
      glow: "shadow-textMuted/20",
      icon: <Activity className="h-3.5 w-3.5 text-textMuted animate-pulse" />,
    },
    ok: {
      color: "bg-matcha",
      glow: "shadow-matcha/40 shadow-glow-sm",
      icon: <ShieldCheck className="h-3.5 w-3.5 text-matcha" />,
    },
    warn: {
      color: "bg-gold",
      glow: "shadow-gold/40 shadow-glow-sm",
      icon: <ShieldAlert className="h-3.5 w-3.5 text-gold animate-bounce" />,
    },
    error: {
      color: "bg-vermilion",
      glow: "shadow-vermilion/50 shadow-glow-md",
      icon: <ShieldAlert className="h-3.5 w-3.5 text-vermilion animate-pulse" />,
    },
  }[status];

  return (
    <Link
      href="/app/validation"
      className={cn(
        "group relative flex items-center justify-center rounded-full p-1.5 transition-all duration-300 hover:bg-white/[0.04] border border-transparent",
        status === "error" && "bg-vermilion/10 animate-pulse border-vermilion/20"
      )}
      title={tooltip}
    >
      <span className="relative flex h-2.5 w-2.5">
        {status !== "loading" && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              status === "ok" ? "bg-matcha" : status === "warn" ? "bg-gold" : "bg-vermilion"
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-2.5 w-2.5 rounded-full transition-colors duration-500",
            config.color
          )}
        />
      </span>
      {/* Tokyo Night Glassmorphic tooltip */}
      <span className="pointer-events-none absolute right-0 top-9 w-60 scale-0 rounded-lg border border-[var(--brse-hairline-border)] bg-[var(--brse-card-bg)] px-3 py-2 text-[10px] font-bold text-textPrimary shadow-glow-sm transition-all duration-300 group-hover:scale-100 z-[999] origin-top-right text-right backdrop-blur-xl">
        <span className="flex items-center justify-between gap-2 border-b border-[var(--brse-hairline-border)] pb-1 mb-1">
          <span className="uppercase tracking-widest text-[8px] text-textMuted">Cockpit Node</span>
          {config.icon}
        </span>
        <span className="text-textSecondary leading-relaxed">{tooltip}</span>
      </span>
    </Link>
  );
}
