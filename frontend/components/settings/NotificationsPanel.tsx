"use client";

import { FormEvent } from "react";
import { type ProjectIntegrations } from "@/lib/projectSettingsHelpers";
import { type TranslationKey } from "@/lib/uiLanguage";

interface NotificationsPanelProps {
  t: (key: TranslationKey) => string;
  integrations: ProjectIntegrations;
  updateIntegration: (key: keyof ProjectIntegrations, value: string | boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function NotificationsPanel({
  t,
  integrations,
  updateIntegration,
  onSubmit,
}: NotificationsPanelProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <form onSubmit={onSubmit} className="brse-section p-5 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("settings.notification.title")}</h2>
          <p className="mt-1 text-sm text-textMuted font-sans">
            {t("settings.notification.desc")}
          </p>
        </div>

        {/* Slack Integration */}
        <div className="rounded-xl border border-primary/20 bg-slate-900/40 p-4 space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            💬 Slack Integration
          </h3>
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-textMuted" htmlFor="slack-webhook-url">
              Slack Webhook URL
            </label>
            <input
              id="slack-webhook-url"
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              value={integrations.slackWebhookUrl || ""}
              onChange={(e) => updateIntegration("slackWebhookUrl", e.target.value)}
              className="field-control w-full py-2 px-3 text-sm placeholder:text-textMuted/45 font-sans"
            />
          </div>
        </div>

        {/* Chatwork Integration */}
        <div className="rounded-xl border border-cyan/20 bg-slate-900/40 p-4 space-y-4">
          <h3 className="text-sm font-bold text-cyan uppercase tracking-wider flex items-center gap-2">
            💬 Chatwork Integration
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-textMuted" htmlFor="chatwork-token">
                Chatwork API Token
              </label>
              <input
                id="chatwork-token"
                type="password"
                placeholder={t("settings.chatworkTokenPlaceholder")}
                value={integrations.chatworkToken || ""}
                onChange={(e) => updateIntegration("chatworkToken", e.target.value)}
                className="field-control w-full py-2 px-3 text-sm placeholder:text-textMuted/45 font-sans"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-textMuted" htmlFor="chatwork-room-id">
                Chatwork Room ID
              </label>
              <input
                id="chatwork-room-id"
                type="text"
                placeholder={t("settings.chatworkRoomPlaceholder")}
                value={integrations.chatworkRoomId || ""}
                onChange={(e) => updateIntegration("chatworkRoomId", e.target.value)}
                className="field-control w-full py-2 px-3 text-sm placeholder:text-textMuted/45 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Trigger Rules */}
        <div className="rounded-xl border border-[var(--brse-panel-border)] bg-slate-900/20 p-4 space-y-3">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
            🔔 {t("settings.notification.rules")}
          </h3>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 text-sm font-semibold text-textPrimary cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(integrations.notifyOnQna)}
                onChange={(e) => updateIntegration("notifyOnQna", e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-slate-950/45 text-primary focus:ring-primary/20"
              />
              <span>{t("settings.notification.qna")}</span>
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-textPrimary cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(integrations.notifyOnCr)}
                onChange={(e) => updateIntegration("notifyOnCr", e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-slate-950/45 text-primary focus:ring-primary/20"
              />
              <span>{t("settings.notification.cr")}</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primaryHover active:scale-95 shadow-glow-sm cursor-pointer"
          >
            {t("settings.notification.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
