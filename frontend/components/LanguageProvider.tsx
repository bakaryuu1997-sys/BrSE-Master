"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  UI_LANGUAGE_STORAGE_KEY,
  translateUi,
  type TranslationKey,
  type UiLanguage,
} from "@/lib/uiLanguage";

type LanguageContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>("vi");

  useEffect(() => {
    const stored = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY) as UiLanguage | null;
    if (stored === "vi" || stored === "en" || stored === "ja") {
      setLanguageState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage: (nextLanguage) => {
        setLanguageState(nextLanguage);
        window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, nextLanguage);
        document.documentElement.lang = nextLanguage;
      },
      t: (key) => translateUi(language, key),
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useUiLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useUiLanguage must be used inside LanguageProvider");
  }
  return context;
}

export function LocalizedText({ k }: { k: TranslationKey }) {
  const { t } = useUiLanguage();
  return <>{t(k)}</>;
}
