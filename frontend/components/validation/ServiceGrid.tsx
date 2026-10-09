"use client";

import { Activity } from "lucide-react";
import type { ServiceCheck, StatusConfig } from "@/lib/validationHelpers";

interface ServiceGridProps {
  services: ServiceCheck[];
  statusConfigMap: Record<string, StatusConfig>;
  t: (key: string) => string;
}

export function ServiceGrid({ services, statusConfigMap }: ServiceGridProps) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        const cfg = statusConfigMap[service.status];
        return (
          <div
            key={service.id}
            className={`brse-section border p-5 transition-all duration-300 hover:shadow-glow-sm ${cfg.border} ${
              service.status === "ok" ? "hover:shadow-matcha/5" :
              service.status === "error" ? "border-vermilion/45 bg-vermilion/5" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${cfg.border} ${cfg.bg} ${cfg.color}`}>
                  {service.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-ink">{service.nameKey as string}</h3>
                  <p className="text-xs text-textMuted">{service.descriptionKey as string}</p>
                </div>
              </div>

              {/* Status badge with pulsing glow */}
              <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold relative ${cfg.border} ${cfg.bg} ${cfg.color}`}>
                {service.status === "ok" && (
                  <span className="absolute -left-1 -top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-matcha opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-matcha" />
                  </span>
                )}
                {service.status === "error" && (
                  <span className="absolute -left-1 -top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vermilion opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-vermilion" />
                  </span>
                )}
                {service.status === "warn" && (
                  <span className="absolute -left-1 -top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                  </span>
                )}
                {cfg.icon}
                {cfg.label}
              </div>
            </div>

            {/* Latency + detail */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {service.latency !== undefined && (
                <div className="flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.03] px-2.5 py-1.5">
                  <Activity className="h-3.5 w-3.5 text-textMuted" />
                  <span className="text-xs font-mono text-textMuted">{service.latency}ms</span>
                </div>
              )}
              {service.detail && (
                <p className="text-xs text-textMuted truncate max-w-[200px]" title={service.detail}>{service.detail}</p>
              )}
            </div>

            {/* Latency bar */}
            {service.latency !== undefined && service.status !== "checking" && (
              <div className="mt-3">
                <div className="h-1.5 w-full rounded-full bg-white/[0.05]">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-700 ${
                      service.status === "ok" ? "bg-matcha" :
                      service.status === "warn" ? "bg-gold" : "bg-vermilion"
                    }`}
                    style={{ width: `${Math.max(5, Math.min(100, 100 - service.latency / 20))}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-textMuted font-bold">
                  {service.latency < 100 ? "Nhanh" : service.latency < 500 ? "Bình thường" : "Chậm"}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
