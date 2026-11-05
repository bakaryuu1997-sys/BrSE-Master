"use client";

import Link from "next/link";
import { Bell, Cpu, FolderGit2, ShieldCheck } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { useUiLanguage } from "@/components/LanguageProvider";
import { AiPromptProfilesPanel } from "@/features/settings/AiPromptProfilesPanel";
import { downloadLocalBackup, pushLocalBackupToPostgres, restoreLocalBackup, restoreLocalBackupFromPostgres } from "@/lib/localBackup";
import { createSystemBackup, downloadSystemBackupBlob, restoreSystemBackup } from "@/lib/settingsBackup";
import {
  deleteProjectSetting,
  deleteProjectSettingFromDb,
  fetchActiveProjectId,
  fetchProjectSettings,
  getActiveProjectId,
  getProjectSettingConflicts,
  getProjectSettings,
  keepLocalProjectSetting,
  saveProjectSetting,
  saveProjectSettingToDb,
  setActiveProjectId,
  setActiveProjectIdToDb,
  acceptServerProjectSetting,
  type ProjectSettingConflict,
  type ProjectSetting,
  type ProjectSettingInput
} from "@/lib/projectSettings";
import {
  emptyForm,
  parseStakeholders,
  parseIntegrations,
  type ProjectIntegrations,
  type ProjectStakeholder,
} from "@/lib/projectSettingsHelpers";

type StatusKind = "success" | "error" | "info";

// Extracted sub-components
import { DataSafetyPanel } from "@/components/settings/DataSafetyPanel";
import { NotificationsPanel } from "@/components/settings/NotificationsPanel";
import { ProjectConflictHandler } from "@/components/settings/ProjectConflictHandler";
import { ProjectListPanel } from "@/components/settings/ProjectListPanel";
import { ProjectProfileForm } from "@/components/settings/ProjectProfileForm";
import { SystemBackupVault } from "@/components/settings/SystemBackupVault";

export default function ProjectSettingsPage() {
  const { t } = useUiLanguage();
  const { confirm } = useConfirm();
  const [projects, setProjects] = useState<ProjectSetting[]>([]);
  const [activeId, setActiveId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<ProjectSettingInput>(emptyForm);
  const [status, setStatus] = useState<{ text: string; kind: StatusKind } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<"projects" | "ai" | "backup" | "notifications">("projects");
  const [conflicts, setConflicts] = useState<ProjectSettingConflict[]>([]);
  const [isSystemBackingUp, setIsSystemBackingUp] = useState(false);

  /* ─── derived state ─── */

  const activeProject = useMemo(() => projects.find((project) => project.id === activeId) ?? null, [activeId, projects]);
  const stakeholders = useMemo(() => parseStakeholders(form.stakeholders_json), [form.stakeholders_json]);
  const integrations = useMemo(() => parseIntegrations(form.integrations_json), [form.integrations_json]);

  /* ─── data loading ─── */

  useEffect(() => {
    setProjects(getProjectSettings());
    setConflicts(getProjectSettingConflicts());
    setActiveId(getActiveProjectId());
    fetchProjectSettings()
      .then(async (nextProjects) => {
        const nextActiveId = await fetchActiveProjectId();
        setProjects(nextProjects);
        setConflicts(getProjectSettingConflicts());
        setActiveId(nextActiveId || getActiveProjectId());
      })
      .catch(() => {
        notify(t("settings.status.usingCache"), "info");
      });
  }, [t]);

  /* ─── shared helpers ─── */

  function notify(text: string, kind: StatusKind = "info") {
    setStatus(text ? { text, kind } : null);
  }

  function switchTab(next: "projects" | "ai" | "backup" | "notifications") {
    setStatus(null);
    setActiveTab(next);
  }

  function refreshState(nextActiveId?: string) {
    const nextProjects = getProjectSettings();
    setProjects(nextProjects);
    setConflicts(getProjectSettingConflicts());
    setActiveId(nextActiveId ?? getActiveProjectId());
  }

  function updateField<K extends keyof ProjectSettingInput>(key: K, value: ProjectSettingInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  function updateStakeholders(nextStakeholders: ProjectStakeholder[]) {
    updateField(
      "stakeholders_json",
      JSON.stringify(nextStakeholders.filter((item) => item.role || item.name || item.email || item.chatId))
    );
  }

  function updateIntegration(key: keyof ProjectIntegrations, value: string | boolean) {
    updateField("integrations_json", JSON.stringify({ ...integrations, [key]: value }));
  }

  /* ─── project CRUD handlers ─── */

  function startCreate() {
    setEditingId("");
    setForm(emptyForm);
    setStatus(null);
  }

  // Presets pre-fill phase/health and rule fields for a project type. They never
  // overwrite identity fields (name/customer) the user already typed.
  function applyPreset(presetId: string) {
    const presets: Record<string, Partial<ProjectSettingInput>> = {
      maintenance: {
        current_phase: "Maintenance",
        health_status: "Green",
        report_rule: "Báo cáo vận hành định kỳ: incident, ticket tồn đọng, tình trạng SLA.",
        communication_notes: "Phản hồi trong giờ làm việc JST; ưu tiên ổn định hệ thống hơn tốc độ.",
      },
      "new-development": {
        current_phase: "Requirement",
        health_status: "Green",
        report_rule: "Báo cáo tiến độ theo sprint; nêu rõ rủi ro yêu cầu và các Q&A còn tồn.",
        communication_notes: "Xác nhận yêu cầu bằng văn bản; chốt scope trước khi bắt đầu code.",
      },
      migration: {
        current_phase: "Design",
        health_status: "Yellow",
        report_rule: "Báo cáo theo từng wave migration; luôn nêu kế hoạch rollback và tính toàn vẹn dữ liệu.",
        communication_notes: "Luôn có phương án rollback; xác nhận cửa sổ downtime với khách trước khi chạy.",
      },
    };
    const preset = presets[presetId];
    if (!preset) return;
    setForm((current) => ({ ...current, ...preset }));
    notify(t("settings.status.appliedPreset").replace("{label}", presetId), "success");
  }

  function startEdit(project: ProjectSetting) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      customer_name: project.customer_name,
      customer_email: project.customer_email ?? "",
      brse_name: project.brse_name,
      pm_name: project.pm_name,
      timezone: project.timezone,
      language: project.language,
      customer_style: project.customer_style ?? "",
      report_rule: project.report_rule ?? "",
      timezone_rule: project.timezone_rule ?? "",
      communication_notes: project.communication_notes ?? "",
      current_phase: project.current_phase ?? "",
      health_status: project.health_status ?? "Green",
      next_milestone_date: project.next_milestone_date ?? "",
      stakeholders_json: project.stakeholders_json ?? "[]",
      integrations_json: project.integrations_json ?? "{}",
    });
    setStatus(null);
  }

  function openNotificationsTab() {
    if (activeProject && editingId !== activeProject.id) {
      startEdit(activeProject);
    }
    switchTab("notifications");
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      notify(t("settings.validation.nameRequired"), "error");
      return;
    }
    if (form.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email.trim())) {
      notify(t("settings.validation.emailInvalid"), "error");
      return;
    }
    try {
      const saved = await saveProjectSettingToDb(form, editingId || undefined);
      try {
        await setActiveProjectIdToDb(saved.id);
      } catch {
        setActiveProjectId(saved.id);
      }
      refreshState(saved.id);
      setEditingId(saved.id);
      notify(t("settings.status.savedPostgres"), "success");
    } catch (error) {
      const saved = saveProjectSetting(form, editingId || undefined);
      setActiveProjectId(saved.id);
      refreshState(saved.id);
      setEditingId(saved.id);
      notify(error instanceof Error ? `${error.message} Đã lưu tạm vào local cache.` : t("settings.status.savedLocal"), "error");
    }
  }

  /* ─── conflict handlers ─── */

  async function keepLocalConflict(projectId: string) {
    setIsSyncing(true);
    try {
      const saved = await keepLocalProjectSetting(projectId);
      refreshState(saved.id);
      notify(`Đã giữ bản local và ghi đè PostgreSQL cho project "${saved.name}".`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không xử lý được conflict Project Settings.", "error");
    } finally {
      setIsSyncing(false);
    }
  }

  function acceptServerConflict(projectId: string) {
    try {
      const serverProject = acceptServerProjectSetting(projectId);
      refreshState(serverProject.id);
      notify(`Đã dùng bản PostgreSQL mới hơn cho project "${serverProject.name}".`, "success");
      if (editingId === projectId) startEdit(serverProject);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không xử lý được conflict Project Settings.", "error");
    }
  }

  /* ─── project list actions ─── */

  async function activateProject(projectId: string) {
    try {
      await setActiveProjectIdToDb(projectId);
    } catch {
      setActiveProjectId(projectId);
    }
    refreshState(projectId);
    notify(t("settings.status.activated"), "success");
  }

  async function removeProject(projectId: string) {
    try {
      await deleteProjectSettingFromDb(projectId);
      notify(t("settings.status.deletedPostgres"), "success");
    } catch (error) {
      deleteProjectSetting(projectId);
      notify(error instanceof Error ? `${error.message} Đã xóa khỏi local cache.` : t("settings.status.deletedLocal"), "error");
    }
    refreshState();
    if (editingId === projectId) startCreate();
  }

  /* ─── data-safety / backup handlers ─── */

  function exportLocalData() {
    const backup = downloadLocalBackup();
    notify(t("settings.status.exported").replace("{count}", String(Object.keys(backup.items).length)), "success");
  }

  async function restoreLocalData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = restoreLocalBackup(await file.text());
      refreshState();
      notify(t("settings.status.restored").replace("{date}", payload.exportedAt), "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : t("settings.status.restoreFailed"), "error");
    } finally {
      event.target.value = "";
    }
  }

  async function syncLocalDataToPostgres() {
    setIsSyncing(true);
    try {
      const snapshot = await pushLocalBackupToPostgres();
      notify(t("settings.status.syncedPostgres").replace("{count}", String(Object.keys(snapshot.items).length)), "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : t("settings.status.syncFailed"), "error");
    } finally {
      setIsSyncing(false);
    }
  }

  async function restoreLocalDataFromPostgres() {
    const ok = await confirm({ type: "warning", message: "Restore snapshot PostgreSQL sẽ ghi đè các nhóm dữ liệu BrSE trong browser hiện tại. Bạn muốn tiếp tục?" });
    if (!ok) return;
    setIsSyncing(true);
    try {
      const snapshot = await restoreLocalBackupFromPostgres();
      refreshState();
      notify(`Đã restore snapshot PostgreSQL lưu lúc ${snapshot.saved_at ?? snapshot.exported_at}.`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Restore PostgreSQL thất bại.", "error");
    } finally {
      setIsSyncing(false);
    }
  }

  /* ─── system backup handlers ─── */

  async function handleSystemBackup() {
    setIsSystemBackingUp(true);
    notify("Hệ thống đang chuẩn bị bản sao lưu mã hóa toàn diện (PostgreSQL + Media files)...", "info");
    try {
      const blob = await createSystemBackup();
      downloadSystemBackupBlob(blob);
      notify("Đã tạo và tải xuống bản sao lưu toàn hệ thống (.brsebackup) thành công! Hãy lưu trữ tệp tin này ở USB hoặc Cloud cá nhân của bạn. 💾", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Tạo bản sao lưu hệ thống thất bại.", "error");
    } finally {
      setIsSystemBackingUp(false);
    }
  }

  async function handleSystemRestore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const ok = await confirm({
      type: "warning",
      message: "Khôi phục toàn bộ hệ thống từ file .brsebackup sẽ ghi đè và thay thế hoàn toàn Database PostgreSQL cùng các tệp tin media hiện tại. Bạn có thực sự muốn tiếp tục?",
    });
    if (!ok) {
      event.target.value = "";
      return;
    }
    setIsSystemBackingUp(true);
    notify("Đang tải lên và phục hồi toàn bộ hệ thống (PostgreSQL + Media files)... Vui lòng không đóng trình duyệt.", "info");
    try {
      const resJson = await restoreSystemBackup(file);
      notify(resJson.message || "Toàn bộ hệ thống BrSE OS đã được phục hồi nguyên vẹn! Hệ thống sẽ tự reload sau 3 giây.", "success");
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Khôi phục hệ thống thất bại.", "error");
    } finally {
      setIsSystemBackingUp(false);
      event.target.value = "";
    }
  }

  /* ─── render ─── */

  return (
    <main className="brse-page">
      <header className="brse-hero mb-4 p-3.5 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Settings</p>
        <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-textPrimary sm:text-2xl">System Settings</h1>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-ink/70">
              Quản lý dự án, cấu hình AI engine và thiết lập thông báo cho BrSE OS.
            </p>
          </div>
          <Link
            href="/app/templates"
            className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold text-white transition hover:bg-primaryHover"
          >
            Dùng template
          </Link>
        </div>
        <div role="tablist" aria-label="Settings sections" className="mt-4 flex border-b border-[var(--brse-panel-border)]/45">
          <button
            role="tab"
            aria-selected={activeTab === "projects"}
            onClick={() => switchTab("projects")}
            className={`px-3 py-2 text-xs font-semibold transition border-b-2 ${
              activeTab === "projects" ? "border-primary text-primary" : "border-transparent text-textMuted hover:text-ink hover:border-[var(--brse-panel-border)]"
            } flex items-center gap-1.5`}
          >
            <FolderGit2 className="h-3.5 w-3.5" />
            {t("settings.tabProjects")}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "ai"}
            onClick={() => switchTab("ai")}
            className={`px-3 py-2 text-xs font-semibold transition border-b-2 ${
              activeTab === "ai" ? "border-primary text-primary" : "border-transparent text-textMuted hover:text-ink hover:border-[var(--brse-panel-border)]"
            } flex items-center gap-1.5`}
          >
            <Cpu className="h-3.5 w-3.5" />
            {t("settings.tabAi")}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "backup"}
            onClick={() => switchTab("backup")}
            className={`px-3 py-2 text-xs font-semibold transition border-b-2 ${
              activeTab === "backup" ? "border-primary text-primary" : "border-transparent text-textMuted hover:text-ink hover:border-[var(--brse-panel-border)]"
            } flex items-center gap-1.5`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("settings.tabBackup")}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "notifications"}
            onClick={openNotificationsTab}
            className={`px-3 py-2 text-xs font-semibold transition border-b-2 ${
              activeTab === "notifications" ? "border-primary text-primary" : "border-transparent text-textMuted hover:text-ink hover:border-[var(--brse-panel-border)]"
            } flex items-center gap-1.5`}
          >
            <Bell className="h-3.5 w-3.5" />
            {t("settings.tabNotifications")}
          </button>
        </div>
      </header>

      {status && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-6 rounded-xl border px-4 py-3 text-sm leading-6 ${
            status.kind === "error"
              ? "border-vermilion/25 bg-vermilion/10 text-vermilion"
              : status.kind === "success"
              ? "border-matcha/25 bg-matcha/10 text-matcha"
              : "border-primary/20 bg-primary/10 text-primary"
          }`}
        >
          {status.text}
        </div>
      )}

      {activeTab === "projects" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeProject ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-matcha/30 bg-matcha/10 px-3.5 py-2 text-xs text-matcha">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-matcha opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-matcha"></span>
                </span>
                <span>
                  Dự án đang kích hoạt: <strong className="font-bold text-ink">{activeProject.name}</strong>
                  {activeProject.customer_name ? <span className="text-textMuted"> ({activeProject.customer_name})</span> : null}
                </span>
              </div>
              <span className="text-[11px] font-medium text-textMuted">
                Phase: {activeProject.current_phase || "N/A"} · Health: {activeProject.health_status || "Green"}
              </span>
            </div>
          ) : null}

          <ProjectConflictHandler
            conflicts={conflicts}
            isSyncing={isSyncing}
            keepLocalConflict={keepLocalConflict}
            acceptServerConflict={acceptServerConflict}
          />

          <div className="grid gap-4 xl:gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <ProjectProfileForm
              t={t}
              form={form}
              editingId={editingId}
              updateField={updateField}
              applyPreset={applyPreset}
              startCreate={startCreate}
              submitProject={submitProject}
              stakeholders={stakeholders}
              updateStakeholders={updateStakeholders}
              integrations={integrations}
              updateIntegration={updateIntegration}
            />

            <ProjectListPanel
              t={t}
              projects={projects}
              activeId={activeId}
              onActivate={activateProject}
              onEdit={startEdit}
              onRemove={removeProject}
            />
          </div>
        </div>
      )}

      {activeTab === "backup" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
          <div className="rounded-xl border border-[var(--brse-panel-border)] bg-surface p-4">
            <h2 className="text-base font-bold text-ink">Trung tâm An toàn &amp; Phục hồi Dữ liệu</h2>
            <p className="mt-1 text-xs text-textMuted leading-relaxed">
              Quản lý sao lưu mã hóa cục bộ (.brsebackup) và đồng bộ snapshot an toàn giữa trình duyệt và PostgreSQL.
            </p>
          </div>

          <SystemBackupVault
            isBusy={isSystemBackingUp || isSyncing}
            onCreateBackup={handleSystemBackup}
            onRestoreBackup={handleSystemRestore}
          />

          <DataSafetyPanel
            t={t}
            isSyncing={isSyncing}
            onSyncLocalToPostgres={syncLocalDataToPostgres}
            onRestoreFromPostgres={restoreLocalDataFromPostgres}
            onExportLocal={exportLocalData}
            onRestoreLocal={restoreLocalData}
          />
        </div>
      )}

      {activeTab === "ai" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AiPromptProfilesPanel projects={projects} activeProjectId={activeId} />
        </div>
      )}

      {activeTab === "notifications" && activeProject && (
        <NotificationsPanel
          t={t}
          integrations={integrations}
          updateIntegration={updateIntegration}
          onSubmit={submitProject}
        />
      )}

      {activeTab === "notifications" && !activeProject && (
        <section className="brse-section p-5">
          <h2 className="text-lg font-black text-ink">Chưa có project active</h2>
          <p className="mt-2 text-sm text-textMuted">
            Hãy tạo hoặc chọn một project trước khi cấu hình Slack/Chatwork notifications.
          </p>
        </section>
      )}
    </main>
  );
}
