"use client";

import { useEffect, useState } from "react";

export function DashboardClocks() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date | null, timeZone: string) => {
    if (!date) return "--:--:--";
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(date);
    } catch {
      return "--:--:--";
    }
  };

  const vnTime = mounted ? formatTime(time, "Asia/Ho_Chi_Minh") : "--:--:--";
  const jpTime = mounted ? formatTime(time, "Asia/Tokyo") : "--:--:--";

  return (
    <div
      style={{ WebkitTextFillColor: "initial" }}
      className="flex items-center gap-4 text-xs font-black bg-slate-900/60 border border-white/[0.12] backdrop-blur-lg px-4 py-2 rounded-2xl select-none shadow-[0_0_15px_rgba(255,255,255,0.03)] tracking-normal normal-case"
    >
      <span className="flex items-center gap-2">
        <span className="text-base select-none">🇻🇳</span>
        <span className="text-textMuted uppercase text-[10px] font-bold tracking-wider">VN</span>
        <span className="text-cyan font-mono text-base tracking-wide drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
          {vnTime}
        </span>
      </span>
      <span className="h-4 w-[1px] bg-white/[0.2]" />
      <span className="flex items-center gap-2">
        <span className="text-base select-none">🇯🇵</span>
        <span className="text-textMuted uppercase text-[10px] font-bold tracking-wider">JP</span>
        <span className="text-amber-400 font-mono text-base tracking-wide drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
          {jpTime}
        </span>
      </span>
    </div>
  );
}
