"use client";

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
  const items = [
    { label: "API Base URL", value: apiBaseUrl },
    { label: "Frontend", value: environmentInfo.frontend },
    { label: "User Agent", value: environmentInfo.userAgent },
    { label: "Timezone", value: environmentInfo.timezone },
    { label: "Language", value: environmentInfo.browserLanguage },
    { label: "Online", value: environmentInfo.online },
  ];

  return (
    <div className="mt-5 brse-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Thông tin môi trường</h2>
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-textMuted">{label}</p>
            <p className="mt-0.5 break-all font-mono text-ink">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
