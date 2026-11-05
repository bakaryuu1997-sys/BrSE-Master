"use client";

import { Sparkles } from "lucide-react";
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
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-primary shrink-0">
        <Sparkles className="h-3.5 w-3.5" />
        Preset mẫu:
      </span>
      <div className="flex flex-wrap gap-1.5">
        {getProjectPresets(t).map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.description}
            onClick={() => applyPreset(preset.id)}
            className="rounded-lg border border-[var(--brse-panel-border)] bg-background/80 px-2.5 py-1 text-xs font-medium text-ink transition hover:border-primary/40 hover:bg-surfaceHover active:scale-95"
          >
            + {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}