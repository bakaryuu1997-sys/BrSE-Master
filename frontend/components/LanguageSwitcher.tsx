"use client";

import { Globe2 } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { uiLanguageOptions } from "@/lib/uiLanguage";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useUiLanguage();

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--brse-panel-border)] bg-surface/95 px-3 py-2 text-xs font-semibold text-textMuted shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
      <span className="hidden sm:inline">{t("layout.topLanguage")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as typeof language)}
        className="rounded-md border border-[var(--brse-panel-border)] bg-background px-2 py-1 text-xs font-semibold text-ink outline-none focus:border-primary"
        aria-label={t("layout.globalLanguage")}
      >
        {uiLanguageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
