"use client";

import { useState, useEffect } from "react";
import { Clock, ExternalLink, Video, X, BellRing } from "lucide-react";
import type { PersonalSchedule } from "@/lib/personalCalendar";

interface DualTimezoneSmartPingProps {
  todaySchedules: PersonalSchedule[];
}

// Pure helper (React Compiler memoizes the call; a manual useMemo here made it bail out).
function findUpcomingMeeting(currentTime: Date | null, schedules: PersonalSchedule[], dismissedIds: string[]) {
  if (!currentTime || !schedules.length) return null;

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  for (const schedule of schedules) {
    if (dismissedIds.includes(schedule.id)) continue;
    if (!schedule.startTime) continue;

    const [hours, mins] = schedule.startTime.split(":").map(Number);
    if (isNaN(hours) || isNaN(mins)) continue;

    const diff = hours * 60 + mins - currentMinutes;

    // Event is between 30 minutes before start and 15 minutes after start
    if (diff <= 30 && diff >= -15) {
      const vnHour = String(hours).padStart(2, "0");
      const vnMin = String(mins).padStart(2, "0");
      // JST is UTC+9, ICT is UTC+7 (JST = ICT + 2h)
      const jpHour = String((hours + 2) % 24).padStart(2, "0");

      return {
        schedule,
        minutesLeft: diff,
        isLive: diff <= 0,
        vnTime: `${vnHour}:${vnMin}`,
        jpTime: `${jpHour}:${vnMin}`,
      };
    }
  }
  return null;
}

export function DualTimezoneSmartPing({ todaySchedules }: DualTimezoneSmartPingProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const upcomingMeeting = findUpcomingMeeting(currentTime, todaySchedules, dismissedIds);

  if (!upcomingMeeting) return null;

  const { schedule, minutesLeft, isLive, vnTime, jpTime } = upcomingMeeting;

  // Extract link if present in notes or title
  const linkMatch = (schedule.note || "").match(/https?:\/\/[^\s]+/);
  const meetingUrl = linkMatch ? linkMatch[0] : null;

  return (
    <div className="relative mb-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/35 bg-[linear-gradient(90deg,rgba(6,182,212,0.12),rgba(59,130,246,0.08))] p-3 px-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-md animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
          <BellRing className="h-4 w-4 animate-bounce" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-cyan-300 border border-cyan-500/30">
              {isLive ? "Đang diễn ra" : `Sắp họp trong ${minutesLeft} phút`}
            </span>
            <span className="text-xs font-black text-textPrimary truncate">
              {schedule.title}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-bold text-textMuted mt-0.5">
            <span className="flex items-center gap-1 text-cyan-300">
              <span>🇻🇳 {vnTime} ICT</span>
              <span className="text-white/20">|</span>
              <span>🇯🇵 {jpTime} JST</span>
            </span>
            {schedule.note && (
              <span className="hidden sm:inline truncate max-w-xs text-textMuted/80">
                · {schedule.note}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {meetingUrl && (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-cyan-500 px-3 text-xs font-black text-slate-950 transition hover:bg-cyan-400 active:scale-95 shadow-sm"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Vào họp ngay ↗</span>
          </a>
        )}
        <button
          onClick={() => setDismissedIds((prev) => [...prev, schedule.id])}
          className="rounded-lg p-1 text-textMuted hover:bg-white/10 hover:text-textPrimary transition"
          title="Bỏ qua nhắc nhở này"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
