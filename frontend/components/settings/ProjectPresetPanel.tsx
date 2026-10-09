"use client";

import { type TranslationKey } from "@/lib/uiLanguage";

type SettingsTranslator = (key: TranslationKey) => string;

type ProjectPreset = {
  id: string;
  label: string;
  description: string;
};

function getProjectPresets(t: SettingsTranslator): ProjectPreset[] {
  return [
    {
      id: "maintenance",
      label: t("settings.presets.maintenance.label"),
      description: t("settings.presets.maintenance.desc"),
    },
    {
      id: "new-development",
      label: t("settings.presets.newDev.label"),
      description: t("settings.presets.newDev.desc"),
    },
    {
      id: "migration",
      label: t("settings.presets.migration.label"),
      description: t("settings.presets.migration.desc"),
    },
  ];
}

type ProjectPresetPanelProps = {
  t: SettingsTranslator;
  applyPreset: (presetId: string) => void;
};

export function ProjectPresetPanel({ t, applyPreset }: ProjectPresetPanelProps) {
  return (
    <div className="rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/15">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Project preset</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {getProjectPresets(t).map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            className="rounded-2xl border border-[var(--brse-panel-border)]/55 bg-background/60 p-3 text-left transition hover:border-primary/35 hover:bg-surfaceHover"
          >
            <span className="text-sm font-semibold text-ink">{preset.label}</span>
            <span className="mt-1 block text-xs leading-5 text-textMuted">{preset.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}