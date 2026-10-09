import { vi } from "./i18n/vi";
import { en } from "./i18n/en";
import { ja } from "./i18n/ja";

export type UiLanguage = "vi" | "en" | "ja";
export const UI_LANGUAGE_STORAGE_KEY = "brse.ui-language.v1";
export const uiLanguageOptions: Array<{ value: UiLanguage; label: string }> = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];
const translations = {
  vi,
  en,
  ja,
} as const;

export type TranslationKey = keyof typeof translations.vi;
export function translateUi(lang: UiLanguage, key: TranslationKey) {
  return (translations[lang] as any)[key] ?? translations.vi[key] ?? key;
}
