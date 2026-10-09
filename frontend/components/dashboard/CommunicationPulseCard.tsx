"use client";

import { MessageSquare, Users, Zap, TrendingUp } from "lucide-react";
import type { TranslationKey } from "@/lib/uiLanguage";

interface CommunicationPulseCardProps {
  qnaResponseTime?: string;
  qnaAnsweredTrend?: number;
  meetingFrequency?: string;
  t: (key: TranslationKey) => string;
}

export function CommunicationPulseCard({
  qnaResponseTime = "1.8h",
  qnaAnsweredTrend = 94,
  meetingFrequency,
  t
}: CommunicationPulseCardProps) {
  const meetingFrequencyValue = meetingFrequency ?? t("dashboard.meetingFrequencyDefault");

  return (
    <section className="brse-section p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{t("dashboard.communicationPulse")}</p>
          <h3 className="mt-1 text-sm font-black text-textPrimary">{t("dashboard.communicationPulseSubtitle")}</h3>
        </div>
        <TrendingUp className="h-4 w-4 text-primary" />
      </div>

      <div className="space-y-4">
        {/* Q&A Response Time */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--brse-panel-border)] bg-background/35 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-textPrimary">{t("dashboard.qnaResponseTime")}</p>
              <p className="text-[10px] text-textMuted">{t("dashboard.averageResponseTime")}</p>
            </div>
          </div>
          <span className="text-sm font-black text-emerald-400">{qnaResponseTime}</span>
        </div>

        {/* Q&A Answered Trend */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--brse-panel-border)] bg-background/35 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-textPrimary">{t("dashboard.qnaAnsweredRate")}</p>
              <p className="text-[10px] text-textMuted">{t("dashboard.qnaCompletionRate")}</p>
            </div>
          </div>
          <span className="text-sm font-black text-amber-400">{qnaAnsweredTrend}%</span>
        </div>

        {/* Meeting Frequency */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--brse-panel-border)] bg-background/35 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-textPrimary">{t("dashboard.meetingFrequency")}</p>
              <p className="text-[10px] text-textMuted">{t("dashboard.weeklyAverage")}</p>
            </div>
          </div>
          <span className="text-sm font-black text-cyan">{meetingFrequencyValue}</span>
        </div>
      </div>
    </section>
  );
}
