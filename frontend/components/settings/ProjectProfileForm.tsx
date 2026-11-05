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
    <section className="brse-section p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">{editingId ? t("settings.editProject") : t("settings.newProject")}</h2>
          <p className="text-[11px] text-textMuted">Thông tin định danh và bối cảnh vận hành dự án.</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-background/70 px-2.5 text-xs font-semibold text-ink transition hover:border-primary/40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t("settings.new")}
        </button>
      </div>

      <form onSubmit={submitProject} className="mt-4 grid gap-3.5">
        <ProjectPresetPanel t={t} applyPreset={applyPreset} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">{t("settings.projectName")} <span className="text-primary">*</span></span>
            <input
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="field-control w-full text-xs"
              placeholder="例: BrSE Assistant"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">{t("settings.customerName")}</span>
            <input
              value={form.customer_name}
              onChange={(event) => updateField("customer_name", event.target.value)}
              className="field-control w-full text-xs"
              placeholder="例: ABC株式会社"
            />
          </label>
        </div>
        
        <label className="grid gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textMuted">{t("settings.customerEmail")}</span>
            <span className="text-[11px] text-textMuted">Tự điền khi bấm soạn mail</span>
          </div>
          <input
            type="email"
            value={form.customer_email ?? ""}
            onChange={(event) => updateField("customer_email", event.target.value)}
            className="field-control w-full text-xs"
            placeholder="customer@example.co.jp"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">{t("settings.brseName")}</span>
            <input
              value={form.brse_name}
              onChange={(event) => updateField("brse_name", event.target.value)}
              className="field-control w-full text-xs"
              placeholder="Nguyễn Văn A"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">{t("settings.pmName")}</span>
            <input
              value={form.pm_name}
              onChange={(event) => updateField("pm_name", event.target.value)}
              className="field-control w-full text-xs"
              placeholder="PM name"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">Timezone</span>
            <select
              value={form.timezone}
              onChange={(event) => updateField("timezone", event.target.value)}
              className="field-control w-full text-xs"
            >
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (ICT)</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">UI language</span>
            <select
              value={form.language}
              onChange={(event) => updateField("language", event.target.value as "vi" | "ja")}
              className="field-control w-full text-xs"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="ja">日本語</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">Current phase</span>
            <select
              value={form.current_phase ?? ""}
              onChange={(event) => updateField("current_phase", event.target.value)}
              className="field-control w-full text-xs"
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
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">Health status</span>
            <select
              value={form.health_status ?? "Green"}
              onChange={(event) => updateField("health_status", event.target.value)}
              className="field-control w-full text-xs"
            >
              <option value="Green">Green (Bình thường)</option>
              <option value="Yellow">Yellow (Chú ý)</option>
              <option value="Red">Red (Rủi ro)</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">Next milestone</span>
            <input
              type="date"
              value={form.next_milestone_date ?? ""}
              onChange={(event) => updateField("next_milestone_date", event.target.value)}
              className="field-control w-full text-xs"
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

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-textMuted">Customer style memory</span>
          <textarea
            value={form.customer_style ?? ""}
            onChange={(event) => updateField("customer_style", event.target.value)}
            rows={2}
            className="field-control w-full min-h-[56px] text-xs leading-relaxed"
            placeholder={t("settings.customerStylePlaceholder")}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">Report rule</span>
            <textarea
              value={form.report_rule ?? ""}
              onChange={(event) => updateField("report_rule", event.target.value)}
              rows={2}
              className="field-control w-full min-h-[56px] text-xs leading-relaxed"
              placeholder={t("settings.reportRulePlaceholder")}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-textMuted">Timezone / availability rule</span>
            <textarea
              value={form.timezone_rule ?? ""}
              onChange={(event) => updateField("timezone_rule", event.target.value)}
              rows={2}
              className="field-control w-full min-h-[56px] text-xs leading-relaxed"
              placeholder={t("settings.timezoneRulePlaceholder")}
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-textMuted">Communication notes</span>
          <textarea
            value={form.communication_notes ?? ""}
            onChange={(event) => updateField("communication_notes", event.target.value)}
            rows={3}
            className="field-control w-full min-h-[64px] text-xs leading-relaxed"
            placeholder={t("settings.communicationNotesPlaceholder")}
          />
        </label>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--brse-hairline-border)] pt-3">
          <p className="text-[11px] text-textMuted">
            {editingId ? t("settings.updateHint") : t("settings.createHint")}
          </p>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-xs font-bold text-white shadow transition hover:bg-primaryHover active:scale-95"
          >
            {editingId ? t("settings.update") : t("settings.create")}
          </button>
        </div>
      </form>
    </section>
  );
}
