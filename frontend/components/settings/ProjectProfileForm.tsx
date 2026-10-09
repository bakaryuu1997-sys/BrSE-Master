"use client";

import React, { FormEvent } from "react";
import { Plus } from "lucide-react";
import { ProjectSettingInput } from "@/lib/projectSettings";
import { type ProjectIntegrations, type ProjectStakeholder } from "@/lib/projectSettingsHelpers";
import { type TranslationKey } from "@/lib/uiLanguage";
import { StakeholdersPanel } from "./StakeholdersPanel";
import { IntegrationSettings } from "./IntegrationSettings";
import { ProjectPresetPanel } from "./ProjectPresetPanel";

type SettingsTranslator = (key: TranslationKey) => string;

interface ProjectProfileFormProps {
  t: SettingsTranslator;
  form: ProjectSettingInput;
  editingId: string;
  updateField: <K extends keyof ProjectSettingInput>(key: K, value: ProjectSettingInput[K]) => void;
  applyPreset: (presetId: string) => void;
  startCreate: () => void;
  submitProject: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  
  stakeholders: ProjectStakeholder[];
  updateStakeholders: (nextStakeholders: ProjectStakeholder[]) => void;
  integrations: ProjectIntegrations;
  updateIntegration: (key: keyof ProjectIntegrations, value: string | boolean) => void;
}

export function ProjectProfileForm({
  t,
  form,
  editingId,
  updateField,
  applyPreset,
  startCreate,
  submitProject,
  stakeholders,
  updateStakeholders,
  integrations,
  updateIntegration
}: ProjectProfileFormProps) {
  return (
    <section className="brse-section p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{editingId ? t("settings.editProject") : t("settings.newProject")}</h2>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("settings.new")}
        </button>
      </div>

      <form onSubmit={submitProject} className="mt-5 grid gap-4">
        <ProjectPresetPanel t={t} applyPreset={applyPreset} />

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">{t("settings.projectName")}</span>
          <input
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="例: BrSE Assistant"
          />
        </label>
        
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">{t("settings.customerName")}</span>
          <input
            value={form.customer_name}
            onChange={(event) => updateField("customer_name", event.target.value)}
            className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="例: ABC株式会社"
          />
        </label>
        
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">{t("settings.customerEmail")}</span>
          <input
            type="email"
            value={form.customer_email ?? ""}
            onChange={(event) => updateField("customer_email", event.target.value)}
            className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="customer@example.co.jp"
          />
          <span className="text-xs leading-5 text-textMuted">
            Dùng để mở Gmail Compose đã điền sẵn người nhận; app không tự gửi mail.
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">{t("settings.brseName")}</span>
            <input
              value={form.brse_name}
              onChange={(event) => updateField("brse_name", event.target.value)}
              className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Nguyễn Văn A"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">{t("settings.pmName")}</span>
            <input
              value={form.pm_name}
              onChange={(event) => updateField("pm_name", event.target.value)}
              className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="PM name"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Timezone</span>
            <select
              value={form.timezone}
              onChange={(event) => updateField("timezone", event.target.value)}
              className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">UI language</span>
            <select
              value={form.language}
              onChange={(event) => updateField("language", event.target.value as "vi" | "ja")}
              className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="ja">日本語</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Current phase</span>
            <select
              value={form.current_phase ?? ""}
              onChange={(event) => updateField("current_phase", event.target.value)}
              className="field-control min-h-11 px-3 py-2 text-sm"
            >
              <option value="">Not set</option>
              <option value="Requirement">Requirement</option>
              <option value="Design">Design</option>
              <option value="Implementation">Implementation</option>
              <option value="Test">Test</option>
              <option value="UAT">UAT</option>
              <option value="Release">Release</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Health status</span>
            <select
              value={form.health_status ?? "Green"}
              onChange={(event) => updateField("health_status", event.target.value)}
              className="field-control min-h-11 px-3 py-2 text-sm"
            >
              <option value="Green">Green</option>
              <option value="Yellow">Yellow</option>
              <option value="Red">Red</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Next milestone</span>
            <input
              type="date"
              value={form.next_milestone_date ?? ""}
              onChange={(event) => updateField("next_milestone_date", event.target.value)}
              className="field-control min-h-11 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <StakeholdersPanel
          stakeholders={stakeholders}
          updateStakeholders={updateStakeholders}
        />

        <IntegrationSettings
          integrations={integrations}
          updateIntegration={updateIntegration}
        />

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Customer style memory</span>
          <textarea
            value={form.customer_style ?? ""}
            onChange={(event) => updateField("customer_style", event.target.value)}
            rows={3}
            className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder={t("settings.customerStylePlaceholder")}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Report rule</span>
            <textarea
              value={form.report_rule ?? ""}
              onChange={(event) => updateField("report_rule", event.target.value)}
              rows={3}
              className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder={t("settings.reportRulePlaceholder")}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Timezone / availability rule</span>
            <textarea
              value={form.timezone_rule ?? ""}
              onChange={(event) => updateField("timezone_rule", event.target.value)}
              rows={3}
              className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder={t("settings.timezoneRulePlaceholder")}
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Communication notes</span>
          <textarea
            value={form.communication_notes ?? ""}
            onChange={(event) => updateField("communication_notes", event.target.value)}
            rows={4}
            className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder={t("settings.communicationNotesPlaceholder")}
          />
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-textMuted">
            {editingId ? t("settings.updateHint") : t("settings.createHint")}
          </p>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-primaryHover"
          >
            {editingId ? t("settings.update") : t("settings.create")}
          </button>
        </div>
      </form>
    </section>
  );
}
