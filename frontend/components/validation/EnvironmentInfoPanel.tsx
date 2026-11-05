"use client";

import { useState } from "react";
import { Check, Copy, Laptop } from "lucide-react";

type EnvironmentInfo = {
  frontend: string;
  userAgent: string;
  timezone: string;
  browserLanguage: string;
  online: string;
};

interface EnvironmentInfoPanelProps {
  apiBaseUrl: string;
  environmentInfo: EnvironmentInfo;
}

export function EnvironmentInfoPanel({ apiBaseUrl, environmentInfo }: EnvironmentInfoPanelProps) {
  const [copied, setCopied] = useState(false);

  const items = [
    { label: "API Base URL", value: apiBaseUrl },
    { label: "Frontend Origin", value: environmentInfo.frontend },
    { label: "Timezone", value: environmentInfo.timezone },
    { label: "Language", value: environmentInfo.browserLanguage },
    { label: "Network State", value: environmentInfo.online },
    { label: "User Agent", value: environmentInfo.userAgent },
  ];

  const handleCopy = () => {
    const text = items.map(i => `${i.label}: ${i.value}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mt-3.5 brse-card rounded-xl p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Laptop className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink">Thông tin môi trường & Runtime</h2>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--brse-panel-border)] bg-surface/50 text-[11px] font-semibold text-textMuted hover:text-ink hover:border-primary/40 transition"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-matcha" />
              <span className="text-matcha">Đã copy</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy info</span>
            </>
          )}
        </button>
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] px-2.5 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-textMuted">{label}</p>
            <p className="mt-0.5 break-all font-mono text-[11px] text-ink">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
