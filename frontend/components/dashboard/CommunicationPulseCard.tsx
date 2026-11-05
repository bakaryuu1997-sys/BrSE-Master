"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Users, Zap, TrendingUp, Edit3, Check, X, RotateCcw } from "lucide-react";
import type { TranslationKey } from "@/lib/uiLanguage";

interface StoredPulse {
  responseTime: string;
  answeredTrend: string;
  meetingFrequency: string;
}

interface CommunicationPulseCardProps {
  projectId?: string;
  qnaResponseTime?: string;
  qnaAnsweredTrend?: number;
  meetingFrequency?: string;
  t: (key: TranslationKey) => string;
}

export function CommunicationPulseCard({
  projectId,
  qnaResponseTime = "1.8h",
  qnaAnsweredTrend = 94,
  meetingFrequency,
  t,
}: CommunicationPulseCardProps) {
  const defaultMeetingFreq = meetingFrequency ?? t("dashboard.meetingFrequencyDefault");
  const storageKey = `brse.commPulse.${projectId || "default"}`;

  const defaultValues: StoredPulse = {
    responseTime: qnaResponseTime,
    answeredTrend: String(qnaAnsweredTrend),
    meetingFrequency: defaultMeetingFreq,
  };

  const [pulse, setPulse] = useState<StoredPulse>(defaultValues);
  const [draft, setDraft] = useState<StoredPulse>(defaultValues);
  const [isEditing, setIsEditing] = useState(false);

  // Load from localStorage on mount or when projectId changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            const loaded = {
              responseTime: parsed.responseTime || defaultValues.responseTime,
              answeredTrend: parsed.answeredTrend !== undefined ? String(parsed.answeredTrend) : defaultValues.answeredTrend,
              meetingFrequency: parsed.meetingFrequency || defaultValues.meetingFrequency,
            };
            setPulse(loaded);
            setDraft(loaded);
            return;
          }
        }
      }
    } catch {
      // Fallback to defaults on error
    }
    setPulse(defaultValues);
    setDraft(defaultValues);
  }, [storageKey, defaultMeetingFreq]);

  function handleStartEdit() {
    setDraft({ ...pulse });
    setIsEditing(true);
  }

  function handleSave() {
    const updated: StoredPulse = {
      responseTime: draft.responseTime.trim() || defaultValues.responseTime,
      answeredTrend: draft.answeredTrend.trim() || defaultValues.answeredTrend,
      meetingFrequency: draft.meetingFrequency.trim() || defaultValues.meetingFrequency,
    };
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
    setPulse(updated);
    setIsEditing(false);
  }

  function handleResetDefault() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      // ignore
    }
    setPulse(defaultValues);
    setDraft(defaultValues);
    setIsEditing(false);
  }

  function handleCancel() {
    setDraft({ ...pulse });
    setIsEditing(false);
  }

  return (
    <section className="brse-section p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            {t("dashboard.communicationPulse")}
          </p>
          <h3 className="mt-0.5 text-xs font-black text-textPrimary">
            {t("dashboard.communicationPulseSubtitle")}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-1 rounded-lg border border-[var(--brse-hairline-border)] bg-surface/60 px-2 py-0.5 text-[10px] font-bold text-textMuted transition hover:border-primary/40 hover:text-primary"
              title="Chỉnh sửa nhịp độ"
            >
              <Edit3 className="h-3 w-3" />
              <span>Sửa</span>
            </button>
          ) : null}
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
      </div>

      {!isEditing ? (
        <div className="space-y-2.5">
          {/* Q&A Response Time */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--brse-panel-border)] bg-background/35 p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-textPrimary">{t("dashboard.qnaResponseTime")}</p>
                <p className="text-[9.5px] text-textMuted">{t("dashboard.averageResponseTime")}</p>
              </div>
            </div>
            <span className="text-sm font-black text-emerald-400">{pulse.responseTime}</span>
          </div>

          {/* Q&A Answered Trend */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--brse-panel-border)] bg-background/35 p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-textPrimary">{t("dashboard.qnaAnsweredRate")}</p>
                <p className="text-[9.5px] text-textMuted">{t("dashboard.qnaCompletionRate")}</p>
              </div>
            </div>
            <span className="text-sm font-black text-amber-400">
              {pulse.answeredTrend.endsWith("%") ? pulse.answeredTrend : `${pulse.answeredTrend}%`}
            </span>
          </div>

          {/* Meeting Frequency */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--brse-panel-border)] bg-background/35 p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-textPrimary">{t("dashboard.meetingFrequency")}</p>
                <p className="text-[9.5px] text-textMuted">{t("dashboard.weeklyAverage")}</p>
              </div>
            </div>
            <span className="text-sm font-black text-cyan">{pulse.meetingFrequency}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-primary/20 bg-background/50 p-2.5">
          <div>
            <label className="text-[10px] font-bold text-textMuted">{t("dashboard.qnaResponseTime")}</label>
            <input
              type="text"
              value={draft.responseTime}
              onChange={(e) => setDraft({ ...draft, responseTime: e.target.value })}
              placeholder="1.8h"
              className="mt-0.5 h-7 w-full rounded-lg border border-[var(--brse-panel-border)] bg-surface px-2 py-0.5 text-xs font-bold text-ink outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-textMuted">{t("dashboard.qnaAnsweredRate")} (%)</label>
            <input
              type="text"
              value={draft.answeredTrend}
              onChange={(e) => setDraft({ ...draft, answeredTrend: e.target.value })}
              placeholder="94"
              className="mt-0.5 h-7 w-full rounded-lg border border-[var(--brse-panel-border)] bg-surface px-2 py-0.5 text-xs font-bold text-ink outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-textMuted">{t("dashboard.meetingFrequency")}</label>
            <input
              type="text"
              value={draft.meetingFrequency}
              onChange={(e) => setDraft({ ...draft, meetingFrequency: e.target.value })}
              placeholder={defaultMeetingFreq}
              className="mt-0.5 h-7 w-full rounded-lg border border-[var(--brse-panel-border)] bg-surface px-2 py-0.5 text-xs font-bold text-ink outline-none focus:border-primary"
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-1 pt-1">
            <button
              type="button"
              onClick={handleResetDefault}
              className="flex items-center gap-1 text-[9.5px] font-bold text-textMuted transition hover:text-amber"
              title={t("dashboard.resetDefault")}
            >
              <RotateCcw className="h-3 w-3" />
              <span>{t("dashboard.resetDefault")}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1 rounded-lg border border-[var(--brse-hairline-border)] px-2 py-0.5 text-[10px] font-bold text-textMuted hover:text-textPrimary"
              >
                <X className="h-3 w-3" />
                <span>{t("dashboard.cancel")}</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/30"
              >
                <Check className="h-3 w-3" />
                <span>Lưu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
