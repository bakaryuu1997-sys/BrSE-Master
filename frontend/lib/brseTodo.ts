import type { OperationRecord } from "@/lib/operations";
import type { MeetingActionSignal, MeetingRecord } from "@/lib/meetings";
import { apiBaseUrl } from "@/lib/config";
import { fetchClientStateValue, saveClientStateValue } from "@/lib/clientState";
import {
  phaseForOperation,
  phaseRank,
  priorityForMeetingAction,
  priorityForOperation,
  priorityRank,
  isMeetingActionDone,
  todoSlugPart,
} from "@/lib/brseTodoRules";

export type BrseTodoPriority = "P0" | "P1" | "P2";

export type BrseTodoProject = {
  id: string;
  name: string;
  createdAt: string;
  archivedAt?: string;
  preset?: string;
  activePhase?: string;
};

export type BrseTodoItem = {
  id: string;
  phase: string;
  title: string;
  detail: string;
  priority: BrseTodoPriority;
  presets?: string[];
  done: boolean;
  note: string;
  deadline: string;
  evidenceUrl: string;
  operationId: string;
  updatedAt?: string;
  source?: "workflow" | "operation" | "meeting";
  meetingId?: string;
  meetingTitle?: string;
  actionIndex?: number;
};

export type BrseTodoState = {
  preset: string;
  activePhase: string;
  items: BrseTodoItem[];
};

export type BrseTodoOperationLink = {
  projectId: string;
  projectName: string;
  item: BrseTodoItem;
};

export const BRSE_TODO_STORAGE_PREFIX = "brse.workflowTodo.v2";
export const BRSE_TODO_PROJECTS_KEY = `${BRSE_TODO_STORAGE_PREFIX}.projects`;
export const BRSE_TODO_ACTIVE_PROJECT_KEY = `${BRSE_TODO_STORAGE_PREFIX}.activeProjectId`;

export function brseTodoStorageKey(projectId: string) {
  return `${BRSE_TODO_STORAGE_PREFIX}.${projectId || "personal"}`;
}

function sortTodoItems(items: BrseTodoItem[]) {
  return [...items].sort(
    (first, second) =>
      phaseRank(first.phase) - phaseRank(second.phase) ||
      priorityRank(first.priority) - priorityRank(second.priority) ||
      first.title.localeCompare(second.title)
  );
}

export function readBrseTodoProjects(): BrseTodoProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BRSE_TODO_PROJECTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as BrseTodoProject[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readActiveBrseTodoProjectId() {
  if (typeof window === "undefined") return "personal";
  return window.localStorage.getItem(BRSE_TODO_ACTIVE_PROJECT_KEY) || "personal";
}

export function setActiveBrseTodoProjectId(projectId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BRSE_TODO_ACTIVE_PROJECT_KEY, projectId || "personal");
}

export async function fetchActiveBrseTodoProjectId(): Promise<string> {
  const localActiveId = readActiveBrseTodoProjectId();
  try {
    const serverActiveId = await fetchClientStateValue(BRSE_TODO_ACTIVE_PROJECT_KEY);
    if (serverActiveId) setActiveBrseTodoProjectId(serverActiveId);
    return serverActiveId || localActiveId;
  } catch {
    return localActiveId;
  }
}

export async function setActiveBrseTodoProjectIdToDb(projectId: string): Promise<void> {
  setActiveBrseTodoProjectId(projectId);
  await saveClientStateValue(BRSE_TODO_ACTIVE_PROJECT_KEY, projectId || "personal");
}

export function readBrseTodoState(projectId: string): BrseTodoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(brseTodoStorageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BrseTodoState>;
    return {
      preset: parsed.preset || "standard",
      activePhase: parsed.activePhase || "1. Kick-off & Requirement",
      items: Array.isArray(parsed.items) ? sortTodoItems(parsed.items as BrseTodoItem[]) : [],
    };
  } catch {
    return null;
  }
}

export function writeBrseTodoState(projectId: string, state: BrseTodoState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(brseTodoStorageKey(projectId), JSON.stringify(state));
}

type ApiTodoProject = {
  id: string;
  name: string;
  preset?: string;
  active_phase?: string;
  archived_at?: string;
  created_at?: string;
  updated_at?: string;
};

type ApiTodoItem = {
  id: string;
  project_id?: string;
  phase: string;
  title: string;
  detail?: string;
  priority?: BrseTodoPriority;
  presets?: string[];
  done?: boolean;
  note?: string;
  deadline?: string;
  evidence_url?: string;
  operation_id?: string;
  updated_at_client?: string;
  source?: "workflow" | "operation" | "meeting";
  meeting_id?: string;
  meeting_title?: string;
  action_index?: number;
};

function fromApiProject(project: ApiTodoProject): BrseTodoProject {
  return {
    id: project.id,
    name: project.name || "Personal project",
    createdAt: project.created_at || new Date().toISOString(),
    archivedAt: project.archived_at || undefined,
    preset: project.preset || "standard",
    activePhase: project.active_phase || "1. Kick-off & Requirement",
  };
}

function toApiProject(project: BrseTodoProject, state?: BrseTodoState) {
  return {
    id: project.id,
    name: project.name || "Personal project",
    preset: state?.preset || project.preset || "standard",
    active_phase: state?.activePhase || project.activePhase || "1. Kick-off & Requirement",
    archived_at: project.archivedAt || "",
  };
}

function fromApiItem(item: ApiTodoItem): BrseTodoItem {
  return {
    id: item.id,
    phase: item.phase,
    title: item.title,
    detail: item.detail || "",
    priority: item.priority || "P1",
    presets: item.presets || [],
    done: Boolean(item.done),
    note: item.note || "",
    deadline: item.deadline || "",
    evidenceUrl: item.evidence_url || "",
    operationId: item.operation_id || "",
    updatedAt: item.updated_at_client || undefined,
    source: item.source,
    meetingId: item.meeting_id || undefined,
    meetingTitle: item.meeting_title || undefined,
    actionIndex: item.action_index,
  };
}

function toApiItem(item: BrseTodoItem) {
  return {
    id: item.id,
    phase: item.phase,
    title: item.title,
    detail: item.detail || "",
    priority: item.priority || "P1",
    presets: item.presets || [],
    done: Boolean(item.done),
    note: item.note || "",
    deadline: item.deadline || "",
    evidence_url: item.evidenceUrl || "",
    operation_id: item.operationId || "",
    source: item.source || "workflow",
    meeting_id: item.meetingId || "",
    meeting_title: item.meetingTitle || "",
    action_index: item.actionIndex,
    updated_at_client: item.updatedAt || "",
  };
}

export async function fetchBrseTodoProjectsFromDb(): Promise<BrseTodoProject[]> {
  const localBefore = readBrseTodoProjects();
  const response = await fetch(`${apiBaseUrl}/todos/projects`);
  if (!response.ok) throw new Error("Không tải được BrSE Todo projects từ PostgreSQL.");
  const serverProjects = ((await response.json()) as ApiTodoProject[]).map(fromApiProject);
  const serverIds = new Set(serverProjects.map((project) => project.id));
  const localOnlyProjects = localBefore.filter((project) => !serverIds.has(project.id));
  const projects = [...serverProjects, ...localOnlyProjects];
  if (typeof window !== "undefined" && projects.length) {
    window.localStorage.setItem(BRSE_TODO_PROJECTS_KEY, JSON.stringify(projects));
  }
  if (localOnlyProjects.length) {
    void Promise.allSettled(
      localOnlyProjects.map(async (project) => {
        const state = readBrseTodoState(project.id);
        try {
          if (state) await saveBrseTodoStateToDb(project, state);
          else await saveBrseTodoProjectToDb(project);
        } catch {
          /* keep local cache; user can retry when backend is reachable */
        }
      })
    );
  }
  return projects;
}

export async function fetchBrseTodoStateFromDb(projectId: string): Promise<BrseTodoState & { project: BrseTodoProject }> {
  const response = await fetch(`${apiBaseUrl}/todos/projects/${encodeURIComponent(projectId)}/state`);
  if (!response.ok) throw new Error("Không tải được BrSE Todo state từ PostgreSQL.");
  const payload = (await response.json()) as { project: ApiTodoProject; items: ApiTodoItem[] };
  const project = fromApiProject(payload.project);
  const state = {
    preset: project.preset || "standard",
    activePhase: project.activePhase || "1. Kick-off & Requirement",
    items: sortTodoItems((payload.items || []).map(fromApiItem)),
  };
  writeBrseTodoState(project.id, state);
  return { ...state, project };
}

export async function saveBrseTodoProjectToDb(project: BrseTodoProject, state?: BrseTodoState): Promise<BrseTodoProject> {
  const response = await fetch(`${apiBaseUrl}/todos/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiProject(project, state)),
  });
  if (!response.ok) throw new Error("Không lưu được BrSE Todo project vào PostgreSQL.");
  return fromApiProject(await response.json());
}

export async function saveBrseTodoStateToDb(project: BrseTodoProject, state: BrseTodoState) {
  const response = await fetch(`${apiBaseUrl}/todos/projects/${encodeURIComponent(project.id)}/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: toApiProject(project, state),
      items: state.items.map(toApiItem),
    }),
  });
  if (!response.ok) throw new Error("Không sync được BrSE Todo vào PostgreSQL.");
  const payload = (await response.json()) as { project: ApiTodoProject; items: ApiTodoItem[] };
  const savedProject = fromApiProject(payload.project);
  const savedState = {
    preset: savedProject.preset || state.preset,
    activePhase: savedProject.activePhase || state.activePhase,
    items: sortTodoItems((payload.items || []).map(fromApiItem)),
  };
  writeBrseTodoState(savedProject.id, savedState);
  return { ...savedState, project: savedProject };
}

export async function deleteBrseTodoProjectFromDb(projectId: string) {
  const response = await fetch(`${apiBaseUrl}/todos/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Không xóa được BrSE Todo project trong PostgreSQL.");
}

export function readAllBrseTodoLinks(): BrseTodoOperationLink[] {
  const projects = readBrseTodoProjects();
  return projects.flatMap((project) => {
    const state = readBrseTodoState(project.id);
    return (state?.items ?? [])
      .filter((item) => item.operationId)
      .map((item) => ({
        projectId: project.id,
        projectName: project.name,
        item,
      }));
  });
}

export function findBrseTodoLinksByOperation(operationId: string): BrseTodoOperationLink[] {
  if (!operationId) return [];
  return readAllBrseTodoLinks().filter((link) => link.item.operationId === operationId);
}

export function ensureBrseTodoProject(projectName?: string) {
  const projects = readBrseTodoProjects();
  const activeId = readActiveBrseTodoProjectId();
  const activeProject = projects.find((project) => project.id === activeId && !project.archivedAt);
  if (activeProject) return activeProject;

  const fallbackProject = projects.find((project) => !project.archivedAt);
  if (fallbackProject) {
    void setActiveBrseTodoProjectIdToDb(fallbackProject.id).catch(() => {
      setActiveBrseTodoProjectId(fallbackProject.id);
    });
    return fallbackProject;
  }

  const nextProject = {
    id: "personal",
    name: projectName?.trim() || "Personal project",
    createdAt: new Date().toISOString()
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BRSE_TODO_PROJECTS_KEY, JSON.stringify([nextProject]));
    void setActiveBrseTodoProjectIdToDb(nextProject.id).catch(() => {
      setActiveBrseTodoProjectId(nextProject.id);
    });
  }
  return nextProject;
}

export function buildTodoItemFromOperation(record: OperationRecord): BrseTodoItem {
  return {
    id: `op-${record.id}`,
    phase: phaseForOperation(record.type),
    title: `${record.type.toUpperCase()} · ${record.title}`,
    detail: record.fieldA || record.fieldB || record.title,
    priority: priorityForOperation(record.priority),
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
    done: ["Answered", "Closed", "Verified", "Approved", "Implemented"].includes(record.status),
    note: record.fieldE || "",
    deadline: record.dueDate || "",
    evidenceUrl: "",
    operationId: record.id,
    updatedAt: new Date().toISOString(),
    source: "operation",
  };
}

export function upsertOperationTodo(projectId: string, record: OperationRecord) {
  const state = readBrseTodoState(projectId) ?? {
    preset: "standard",
    activePhase: phaseForOperation(record.type),
    items: [],
  };
  const nextItem = buildTodoItemFromOperation(record);
  const exists = state.items.some((item) => item.id === nextItem.id || item.operationId === record.id);
  const nextItems = exists
    ? state.items.map((item) =>
        item.id === nextItem.id || item.operationId === record.id
          ? { ...item, ...nextItem, done: item.done, note: item.note || nextItem.note, evidenceUrl: item.evidenceUrl }
          : item
      )
    : [nextItem, ...state.items];

  writeBrseTodoState(projectId, {
    ...state,
    activePhase: state.activePhase || nextItem.phase,
    items: sortTodoItems(nextItems),
  });
}

export function buildTodoItemFromMeetingAction(meeting: Pick<MeetingRecord, "id" | "title" | "created_at">, action: MeetingActionSignal, index: number): BrseTodoItem {
  const owner = action.owner?.trim();
  const deadline = action.deadline?.trim() ?? "";
  const status = action.status?.trim();
  return {
    id: `meeting-${meeting.id}-action-${index}-${todoSlugPart(action.task || "follow-up")}`,
    phase: "4. Tracking & Reporting",
    title: `Meeting · ${action.task || "Follow-up action"}`,
    detail: [
      `Meeting: ${meeting.title}`,
      owner ? `Owner: ${owner}` : "",
      status ? `Status: ${status}` : ""
    ].filter(Boolean).join("\n"),
    priority: priorityForMeetingAction(action),
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
    done: isMeetingActionDone(action),
    note: meeting.created_at ? `Created from meeting ${new Date(meeting.created_at).toLocaleString("vi-VN")}` : "Created from meeting action item",
    deadline,
    evidenceUrl: `meeting:${meeting.id}`,
    operationId: "",
    updatedAt: new Date().toISOString(),
    source: "meeting",
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    actionIndex: index
  };
}

export function upsertMeetingActionTodos(projectId: string, meeting: Pick<MeetingRecord, "id" | "title" | "created_at">, actions: MeetingActionSignal[]) {
  const state = readBrseTodoState(projectId) ?? {
    preset: "standard",
    activePhase: "4. Tracking & Reporting",
    items: [],
  };
  const nextActionItems = actions
    .filter((action) => action.task?.trim())
    .map((action, index) => buildTodoItemFromMeetingAction(meeting, action, index));
  const nextById = new Map(nextActionItems.map((item) => [item.id, item]));
  const preserved = state.items.map((item) => {
    const next = nextById.get(item.id);
    if (!next) return item;
    nextById.delete(item.id);
    return {
      ...item,
      ...next,
      done: item.done,
      note: item.note || next.note,
      evidenceUrl: item.evidenceUrl || next.evidenceUrl
    };
  });
  const nextItems = sortTodoItems([...Array.from(nextById.values()), ...preserved]);

  writeBrseTodoState(projectId, {
    ...state,
    activePhase: state.activePhase || "4. Tracking & Reporting",
    items: nextItems,
  });

  return nextActionItems.length;
}

export function buildTodoItemFromMinutesAction(
  minutes: { id: string; title: string; projectId: string; createdAt: string },
  action: MeetingActionSignal,
  index: number
): BrseTodoItem {
  const owner = action.owner?.trim();
  const deadline = action.deadline?.trim() ?? "";
  const status = action.status?.trim();
  const minutesLink = minutes.id ? `/app/minutes/new?minutesId=${encodeURIComponent(minutes.id)}` : "/app/minutes/new";
  return {
    id: `minutes-${minutes.id || "draft"}-action-${index}-${todoSlugPart(action.task || "follow-up")}`,
    phase: "4. Tracking & Reporting",
    title: `Minutes · ${action.task || "Follow-up action"}`,
    detail: [
      `Minutes: ${minutes.title}`,
      `Project ID: ${minutes.projectId || "default"}`,
      owner ? `Owner: ${owner}` : "",
      status ? `Status: ${status}` : "",
      `Source: ${minutesLink}`,
    ].filter(Boolean).join("\n"),
    priority: priorityForMeetingAction(action),
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
    done: isMeetingActionDone(action),
    note: minutes.createdAt ? `Created from Meeting Minutes ${new Date(minutes.createdAt).toLocaleString("vi-VN")}` : "Created from Meeting Minutes",
    deadline,
    evidenceUrl: minutesLink,
    operationId: "",
    updatedAt: new Date().toISOString(),
    source: "meeting",
    meetingId: minutes.id,
    meetingTitle: minutes.title,
    actionIndex: index,
  };
}

export function upsertMeetingMinutesActionTodo(
  projectId: string,
  minutes: { id: string; title: string; projectId: string; createdAt: string },
  action: MeetingActionSignal,
  index: number
) {
  const state = readBrseTodoState(projectId) ?? {
    preset: "standard",
    activePhase: "4. Tracking & Reporting",
    items: [],
  };
  const nextItem = buildTodoItemFromMinutesAction(minutes, action, index);
  const exists = state.items.some((item) => item.id === nextItem.id);
  const nextItems = exists
    ? state.items.map((item) => (item.id === nextItem.id ? { ...item, ...nextItem, done: item.done, note: item.note || nextItem.note } : item))
    : [nextItem, ...state.items];

  const nextState = {
    ...state,
    activePhase: state.activePhase || "4. Tracking & Reporting",
    items: sortTodoItems(nextItems),
  };
  writeBrseTodoState(projectId, nextState);
  return { item: nextItem, state: nextState, created: !exists };
}

export type BrseTodoCommandSummary = {
  activeProject: BrseTodoProject | undefined;
  doneToday: BrseTodoItem[];
  deadlineRisk: BrseTodoItem[];
  nextFocus: BrseTodoItem[];
  total: number;
  done: number;
};

export const EMPTY_BRSE_TODO_COMMAND_SUMMARY: BrseTodoCommandSummary = {
  activeProject: undefined,
  doneToday: [],
  deadlineRisk: [],
  nextFocus: [],
  total: 0,
  done: 0,
};

export function getBrseTodoCommandSummary(): BrseTodoCommandSummary {
  const projects = readBrseTodoProjects();
  const today = new Date().toISOString().slice(0, 10);
  const activeProjectId = readActiveBrseTodoProjectId();
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects.find((project) => !project.archivedAt);
  const state = activeProject ? readBrseTodoState(activeProject.id) : null;
  const items = state?.items ?? [];
  const doneToday = items.filter((item) => item.done && item.updatedAt?.slice(0, 10) === today);
  const deadlineRisk = items.filter((item) => item.deadline && !item.done && item.deadline <= today);
  const nextFocus = items
    .filter((item) => !item.done)
    .sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        phaseRank(a.phase) - phaseRank(b.phase) ||
        (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31")
    )
    .slice(0, 5);

  return {
    activeProject,
    doneToday,
    deadlineRisk,
    nextFocus,
    total: items.length,
    done: items.filter((item) => item.done).length,
  };
}
