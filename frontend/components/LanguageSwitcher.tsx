"use client";

import { Globe2 } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { uiLanguageOptions } from "@/lib/uiLanguage";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useUiLanguage();

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-textMuted">
      <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
      <span className="hidden text-[11px] text-textMuted sm:inline">{t("layout.topLanguage")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as typeof language)}
        className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/80 px-2 py-0.5 text-xs font-semibold text-ink outline-none transition focus:border-primary"
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
