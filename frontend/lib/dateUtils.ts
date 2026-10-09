import { type UiLanguage } from "./uiLanguage";

/**
 * Chuyển đổi từ mã ngôn ngữ nội bộ sang mã BCP 47 chuẩn cho Intl.
 */
export function getLocaleString(lang: UiLanguage): string {
  switch (lang) {
    case "vi":
      return "vi-VN";
    case "ja":
      return "ja-JP";
    case "en":
      return "en-US";
    default:
      return "vi-VN";
  }
}

/**
 * Centralized Date Formatter
 */
export function formatAppDate(
  date: Date | string | number,
  lang: UiLanguage,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  
  return new Intl.DateTimeFormat(getLocaleString(lang), options).format(d);
}

/**
 * Format thời gian (HH:mm)
 */
export function formatAppTime(
  date: Date | string | number,
  lang: UiLanguage
): string {
  return formatAppDate(date, lang, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format đầy đủ cả ngày và giờ
 */
export function formatAppDateTime(
  date: Date | string | number,
  lang: UiLanguage
): string {
  return formatAppDate(date, lang, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
