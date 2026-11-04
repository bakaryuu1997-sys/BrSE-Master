import { apiBaseUrl } from "@/lib/config";

export type ProjectSetting = {
  id: string;
  name: string;
  customer_name: string;
  customer_email?: string;
  brse_name: string;
  pm_name: string;
  timezone: string;
  language: "vi" | "ja";
  customer_style?: string;
  report_rule?: string;
  timezone_rule?: string;
  communication_notes?: string;
  current_phase?: string;
  health_status?: "Green" | "Yellow" | "Red" | string;
  next_milestone_date?: string;
  stakeholders_json?: string;
  integrations_json?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSettingInput = Omit<ProjectSetting, "id" | "createdAt" | "updatedAt">;

const PROJECTS_KEY = "brse.projectSettings.v1";
const ACTIVE_PROJECT_KEY = "brse.activeProjectId.v1";
const PROJECT_DIRTY_KEY = "brse.projectSettings.localDirty.v1";
const PROJECT_CONFLICTS_KEY = "brse.projectSettings.conflicts.v1";
export const ACTIVE_PROJECT_CHANGED_EVENT = "brse:active-project-changed";

export type ActiveProjectChangedDetail = {
  projectId: string;
};

export type ProjectSettingConflict = {
  projectId: string;
  detectedAt: string;
  localProject: ProjectSetting;
  serverProject: ProjectSetting;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function broadcastActiveProjectChanged(projectId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ActiveProjectChangedDetail>(ACTIVE_PROJECT_CHANGED_EVENT, {
      detail: { projectId },
    })
  );
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
}

function cacheProjectSettings(projects: ProjectSetting[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function readJsonArray<T>(key: string): T[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as T[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, value: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getDirtyProjectIds() {
  return new Set(readJsonArray<string>(PROJECT_DIRTY_KEY));
}

function markProjectDirty(projectId: string) {
  const dirtyIds = getDirtyProjectIds();
  dirtyIds.add(projectId);
  writeJsonArray(PROJECT_DIRTY_KEY, [...dirtyIds]);
}

function clearProjectDirty(projectId: string) {
  const dirtyIds = [...getDirtyProjectIds()].filter((id) => id !== projectId);
  writeJsonArray(PROJECT_DIRTY_KEY, dirtyIds);
}

function cacheProjectSettingConflicts(conflicts: ProjectSettingConflict[]) {
  writeJsonArray(PROJECT_CONFLICTS_KEY, conflicts);
}

export function getProjectSettingConflicts(): ProjectSettingConflict[] {
  return readJsonArray<ProjectSettingConflict>(PROJECT_CONFLICTS_KEY);
}

export function clearProjectSettingConflict(projectId: string) {
  cacheProjectSettingConflicts(getProjectSettingConflicts().filter((conflict) => conflict.projectId !== projectId));
}

function fromApiProject(project: ProjectSetting & { created_at?: string; updated_at?: string }): ProjectSetting {
  return {
    id: project.id,
    name: project.name,
    customer_name: project.customer_name ?? "",
    customer_email: project.customer_email ?? "",
    brse_name: project.brse_name ?? "",
    pm_name: project.pm_name ?? "",
    timezone: project.timezone ?? "Asia/Tokyo",
    language: project.language === "ja" ? "ja" : "vi",
    customer_style: project.customer_style ?? "",
    report_rule: project.report_rule ?? "",
    timezone_rule: project.timezone_rule ?? "",
    communication_notes: project.communication_notes ?? "",
    current_phase: project.current_phase ?? "",
    health_status: project.health_status ?? "Green",
    next_milestone_date: project.next_milestone_date ?? "",
    stakeholders_json: project.stakeholders_json ?? "[]",
    integrations_json: project.integrations_json ?? "{}",
    createdAt: project.created_at ?? project.createdAt ?? new Date().toISOString(),
    updatedAt: project.updated_at ?? project.updatedAt ?? new Date().toISOString(),
  };
}

export function getProjectSettings(): ProjectSetting[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as ProjectSetting[]) : [];
    return parsed.map((project) => ({
      ...project,
      customer_style: project.customer_style ?? "",
      report_rule: project.report_rule ?? "",
      timezone_rule: project.timezone_rule ?? "",
      communication_notes: project.communication_notes ?? "",
      current_phase: project.current_phase ?? "",
      health_status: project.health_status ?? "Green",
      next_milestone_date: project.next_milestone_date ?? "",
      stakeholders_json: project.stakeholders_json ?? "[]",
      integrations_json: project.integrations_json ?? "{}",
    }));
  } catch {
    return [];
  }
}

/**
 * Todo projects and Project Settings are stored separately, so a project created on the Todo
 * page never reached the sidebar switcher. This adds a minimal Project Setting (same id) for any
 * Todo project that lacks one. Idempotent; returns how many were created. The default
 * "personal" Todo placeholder is skipped. New rows are marked dirty so they sync to the DB.
 */
export function ensureProjectSettingsForTodoProjects(entries: Array<{ id: string; name: string }>): number {
  if (!canUseStorage()) return 0;
  const existing = getProjectSettings();
  const knownIds = new Set(existing.map((project) => project.id));
  const missing = entries.filter((entry) => entry.id && entry.id !== "personal" && !knownIds.has(entry.id));
  if (!missing.length) return 0;

  const now = new Date().toISOString();
  const created: ProjectSetting[] = missing.map((entry) => ({
    id: entry.id,
    name: entry.name?.trim() || "Untitled project",
    customer_name: "",
    brse_name: "",
    pm_name: "",
    timezone: "Asia/Tokyo",
    language: "ja",
    createdAt: now,
    updatedAt: now,
  }));
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify([...existing, ...created]));
  created.forEach((project) => markProjectDirty(project.id));
  return created.length;
}

function parseUpdatedAt(value: string | undefined): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Load projects from PostgreSQL and merge with any newer or server-only local rows.
 * Pushes merged "newer local" rows back to the API so DB catches up without forcing Sync.
 */
export async function fetchProjectSettings(): Promise<ProjectSetting[]> {
  const localBefore = getProjectSettings();
  const dirtyProjectIds = getDirtyProjectIds();
  const response = await fetch(`${apiBaseUrl}/projects`);
  if (!response.ok) throw new Error("Không tải được Project Settings từ PostgreSQL.");
  const serverProjects = (
    (await response.json()) as Array<ProjectSetting & { created_at?: string; updated_at?: string }>
  ).map(fromApiProject);
  const serverById = new Map(serverProjects.map((project) => [project.id, project]));
  const merged: ProjectSetting[] = [];
  const toPush: ProjectSetting[] = [];
  const conflicts: ProjectSettingConflict[] = [];

  for (const server of serverProjects) {
    const local = localBefore.find((project) => project.id === server.id);
    if (!local) {
      merged.push(server);
      continue;
    }
    const localTs = parseUpdatedAt(local.updatedAt);
    const serverTs = parseUpdatedAt(server.updatedAt);
    if (dirtyProjectIds.has(local.id) && serverTs > localTs) {
      merged.push(local);
      conflicts.push({
        projectId: local.id,
        detectedAt: new Date().toISOString(),
        localProject: local,
        serverProject: server,
      });
    } else if (localTs > serverTs) {
      merged.push(local);
      toPush.push(local);
    } else {
      merged.push(server);
      clearProjectDirty(server.id);
    }
  }

  for (const local of localBefore) {
    if (!serverById.has(local.id)) {
      merged.push(local);
      toPush.push(local);
    }
  }

  cacheProjectSettings(merged);
  cacheProjectSettingConflicts(conflicts);

  if (toPush.length) {
    void Promise.allSettled(
      toPush.map(async (project) => {
        const input: ProjectSettingInput = {
          name: project.name,
          customer_name: project.customer_name,
          customer_email: project.customer_email,
          brse_name: project.brse_name,
          pm_name: project.pm_name,
          timezone: project.timezone,
          language: project.language,
          customer_style: project.customer_style,
          report_rule: project.report_rule,
          timezone_rule: project.timezone_rule,
          communication_notes: project.communication_notes,
          current_phase: project.current_phase,
          health_status: project.health_status,
          next_milestone_date: project.next_milestone_date,
          stakeholders_json: project.stakeholders_json,
          integrations_json: project.integrations_json,
        };
        try {
          await saveProjectSettingToDb(input, project.id);
        } catch {
          /* keep merged local cache; user can Sync manually */
        }
      })
    );
  }

  return getProjectSettings();
}

export function getActiveProjectId(): string {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem(ACTIVE_PROJECT_KEY) ?? "";
}

export function setActiveProjectId(projectId: string) {
  if (canUseStorage()) {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  }
  broadcastActiveProjectChanged(projectId);
}

async function requestClientStateEntry(key: string, init?: RequestInit) {
  return fetch(`${apiBaseUrl}/client-state/entry/${encodeURIComponent(key)}`, init);
}

export async function fetchActiveProjectId(): Promise<string> {
  const localActiveId = getActiveProjectId();
  try {
    const response = await requestClientStateEntry(ACTIVE_PROJECT_KEY);
    if (!response.ok) return localActiveId;
    const payload = (await response.json()) as { value?: string };
    const serverActiveId = typeof payload.value === "string" ? payload.value : "";
    if (serverActiveId) setActiveProjectId(serverActiveId);
    return serverActiveId || localActiveId;
  } catch {
    return localActiveId;
  }
}

export async function setActiveProjectIdToDb(projectId: string): Promise<void> {
  setActiveProjectId(projectId);
  const response = await requestClientStateEntry(ACTIVE_PROJECT_KEY, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: ACTIVE_PROJECT_KEY,
      value: projectId,
    }),
  });
  if (!response.ok) {
    throw new Error("Không lưu được active project lên PostgreSQL.");
  }
}

export function getActiveProject(): ProjectSetting | null {
  const activeId = getActiveProjectId();
  return getProjectSettings().find((project) => project.id === activeId) ?? null;
}

export function saveProjectSetting(input: ProjectSettingInput, existingId?: string): ProjectSetting {
  const now = new Date().toISOString();
  const projects = getProjectSettings();
  const existing = existingId ? projects.find((project) => project.id === existingId) : null;
  const nextProject: ProjectSetting = {
    id: existing?.id ?? createId(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...input
  };

  const nextProjects = existing
    ? projects.map((project) => (project.id === existing.id ? nextProject : project))
    : [nextProject, ...projects];

  if (canUseStorage()) {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(nextProjects));
    markProjectDirty(nextProject.id);
    if (!getActiveProjectId()) {
      setActiveProjectId(nextProject.id);
    }
  }

  return nextProject;
}

export async function saveProjectSettingToDb(input: ProjectSettingInput, existingId?: string): Promise<ProjectSetting> {
  const response = await fetch(`${apiBaseUrl}/projects${existingId ? `/${encodeURIComponent(existingId)}` : ""}`, {
    method: existingId ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(existingId ? "Không cập nhật được project trong PostgreSQL." : "Không tạo được project trong PostgreSQL.");
  }
  const saved = fromApiProject(await response.json());
  const projects = getProjectSettings();
  const nextProjects = projects.some((project) => project.id === saved.id)
    ? projects.map((project) => (project.id === saved.id ? saved : project))
    : [saved, ...projects];
  cacheProjectSettings(nextProjects);
  clearProjectDirty(saved.id);
  clearProjectSettingConflict(saved.id);
  if (!getActiveProjectId()) setActiveProjectId(saved.id);
  return saved;
}

export async function keepLocalProjectSetting(projectId: string): Promise<ProjectSetting> {
  const conflict = getProjectSettingConflicts().find((item) => item.projectId === projectId);
  if (!conflict) throw new Error("Không tìm thấy conflict Project Settings.");
  const input: ProjectSettingInput = {
    name: conflict.localProject.name,
    customer_name: conflict.localProject.customer_name,
    customer_email: conflict.localProject.customer_email,
    brse_name: conflict.localProject.brse_name,
    pm_name: conflict.localProject.pm_name,
    timezone: conflict.localProject.timezone,
    language: conflict.localProject.language,
    customer_style: conflict.localProject.customer_style,
    report_rule: conflict.localProject.report_rule,
    timezone_rule: conflict.localProject.timezone_rule,
    communication_notes: conflict.localProject.communication_notes,
    current_phase: conflict.localProject.current_phase,
    health_status: conflict.localProject.health_status,
    next_milestone_date: conflict.localProject.next_milestone_date,
    stakeholders_json: conflict.localProject.stakeholders_json,
    integrations_json: conflict.localProject.integrations_json,
  };
  return saveProjectSettingToDb(input, projectId);
}

export function acceptServerProjectSetting(projectId: string): ProjectSetting {
  const conflict = getProjectSettingConflicts().find((item) => item.projectId === projectId);
  if (!conflict) throw new Error("Không tìm thấy conflict Project Settings.");
  const projects = getProjectSettings();
  const nextProjects = projects.some((project) => project.id === projectId)
    ? projects.map((project) => (project.id === projectId ? conflict.serverProject : project))
    : [conflict.serverProject, ...projects];
  cacheProjectSettings(nextProjects);
  clearProjectDirty(projectId);
  clearProjectSettingConflict(projectId);
  return conflict.serverProject;
}

export function deleteProjectSetting(projectId: string) {
  if (!canUseStorage()) return;

  const nextProjects = getProjectSettings().filter((project) => project.id !== projectId);
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(nextProjects));

  if (getActiveProjectId() === projectId) {
    if (nextProjects[0]) {
      setActiveProjectId(nextProjects[0].id);
    } else {
      window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }
}

export async function deleteProjectSettingFromDb(projectId: string) {
  const response = await fetch(`${apiBaseUrl}/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Không xóa được project trong PostgreSQL.");
  deleteProjectSetting(projectId);
}

export function getProjectTemplateValues(project: ProjectSetting | null): Record<string, string> {
  if (!project) return {};

  return {
    project_name: project.name,
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
  };
}

export function getProjectMemorySummary(project: ProjectSetting | null) {
  if (!project) {
    return {
      customerStyle: "",
      reportRule: "",
      timezoneRule: "",
      communicationNotes: "",
      currentPhase: "",
      healthStatus: "",
      nextMilestoneDate: "",
      hasMemory: false,
    };
  }

  const customerStyle = project.customer_style ?? "";
  const reportRule = project.report_rule ?? "";
  const timezoneRule = project.timezone_rule ?? "";
  const communicationNotes = project.communication_notes ?? "";
  const currentPhase = project.current_phase ?? "";
  const healthStatus = project.health_status ?? "";
  const nextMilestoneDate = project.next_milestone_date ?? "";

  return {
    customerStyle,
    reportRule,
    timezoneRule,
    communicationNotes,
    currentPhase,
    healthStatus,
    nextMilestoneDate,
    hasMemory: Boolean(customerStyle || reportRule || timezoneRule || communicationNotes || currentPhase || healthStatus || nextMilestoneDate),
  };
}
