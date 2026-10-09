/**
 * Heuristic rules from Project Settings (communication_notes + timezone_rule)
 * for lightweight calendar warnings without calling AI.
 */

const CUTOFF_KEYWORDS =
  /(?:sau|after|以降|より後|no\s+meetings?\s+after|không\s+(?:thích\s+)?(?:họp|meeting)\s+sau|tránh\s+họp\s+sau|avoid\s+meetings?\s+after)/i;

/**
 * Try to extract "no meetings at or after this local hour" (typically JST).
 * Returns hour 0–23 or null if nothing detected.
 */
export function extractMeetingCutoffHour(notes: string, timezoneRule: string): number | null {
  const text = `${notes || ""}\n${timezoneRule || ""}`;
  if (!text.trim()) return null;

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!CUTOFF_KEYWORDS.test(line)) continue;
    const m =
      line.match(/(\d{1,2})\s*[:：]\s*(\d{2})\s*(?:jst|JST|gmt\+9|ICT)?/i) ||
      line.match(/(\d{1,2})\s*(?:時|h|giờ)\b/i) ||
      line.match(/\b(\d{1,2})\s*[:：]\s*00\b/);
    if (!m) continue;
    const hour = Number(m[1]);
    if (Number.isFinite(hour) && hour >= 5 && hour <= 23) return hour;
  }
  return null;
}

/** Approximate "JST wall hour" for warning (ICT ≈ JST−2). */
export function approximateJstDecimalHour(isoDate: string, startTime: string, scheduleTz: string): number {
  const [h, m] = startTime.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  const base = h + m / 60;
  if (scheduleTz === "Asia/Tokyo") return base;
  if (scheduleTz === "Asia/Ho_Chi_Minh") return base + 2;
  return base;
}

export function buildCalendarPreferenceWarnings(input: {
  meetingDate: string;
  startTime: string;
  endTime: string;
  scheduleTimezone: string;
  notes: string;
  timezoneRule: string;
}): string[] {
  const cutoff = extractMeetingCutoffHour(input.notes, input.timezoneRule);
  if (cutoff == null) return [];

  const jstStart = approximateJstDecimalHour(input.meetingDate, input.startTime, input.scheduleTimezone);
  if (!Number.isFinite(jstStart)) return [];

  const warnings: string[] = [];
  if (jstStart >= cutoff) {
    warnings.push(
      `Gợi ý từ Project Settings: tránh họp từ khoảng ${cutoff}:00 JST (tương đương quy tắc trong Communication / Timezone notes). Giờ bắt đầu ~${jstStart.toFixed(2)}h JST.`
    );
  }

  const jstEnd = approximateJstDecimalHour(input.meetingDate, input.endTime, input.scheduleTimezone);
  if (Number.isFinite(jstEnd) && jstEnd > cutoff && jstStart < cutoff) {
    warnings.push(`Buổi họp kéo dài qua mốc ${cutoff}:00 JST — kiểm tra lại với khách.`);
  }

  return warnings;
}
