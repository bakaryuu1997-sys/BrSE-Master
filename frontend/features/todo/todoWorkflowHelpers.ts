import { brseTodoStorageKey } from "@/lib/brseTodo";
import { getActiveProject, getProjectSettings, type ProjectSetting } from "@/lib/projectSettings";
import {
  defaultPhase,
  phaseOrder,
  workflowTemplate,
  type Priority,
  type PresetKey,
  type WorkflowItemTemplate,
  type WorkflowItem,
  type TodoProject,
} from "./todoWorkflowModel";

export function storageKey(projectId: string) {
  return brseTodoStorageKey(projectId);
}

export function createProjectId() {
  return `todo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultProject(): TodoProject {
  const activeProject = getActiveProject();
  return {
    id: activeProject?.id ?? "personal",
    name: activeProject?.name || "Personal project",
    createdAt: new Date().toISOString(),
  };
}

export function mergeProjectSettingsIntoTodoProjects(projects: TodoProject[], projectSettings: ProjectSetting[] = getProjectSettings()) {
  const now = new Date().toISOString();
  const byId = new Map(projects.map((project) => [project.id, project]));

  for (const setting of projectSettings) {
    const existing = byId.get(setting.id);
    byId.set(setting.id, {
      id: setting.id,
      name: setting.name || existing?.name || "Untitled project",
      createdAt: existing?.createdAt || setting.createdAt || now,
      archivedAt: existing?.archivedAt,
    });
  }

  const settingsIds = new Set(projectSettings.map((project) => project.id));
  const settingsProjects = projectSettings
    .map((setting) => byId.get(setting.id))
    .filter((project): project is TodoProject => Boolean(project));
  const remainingProjects = projects.filter((project) => !settingsIds.has(project.id));
  return [...settingsProjects, ...remainingProjects];
}

export function percentage(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function phaseRank(phase: string) {
  const index = phaseOrder.indexOf(phase);
  return index >= 0 ? index : phaseOrder.length;
}

export function priorityRank(priority: Priority) {
  return priority === "P0" ? 0 : priority === "P1" ? 1 : 2;
}

export function sortWorkflowItems(items: WorkflowItem[]) {
  return [...items].sort(
    (first, second) =>
      phaseRank(first.phase) - phaseRank(second.phase) ||
      priorityRank(first.priority) - priorityRank(second.priority) ||
      first.title.localeCompare(second.title)
  );
}

export function readProjectState(projectId: string) {
  const raw = window.localStorage.getItem(storageKey(projectId));
  const parsed = raw ? JSON.parse(raw) : null;
  const nextPreset = (parsed?.preset as PresetKey | undefined) ?? "standard";
  const nextItems = mergeSavedItems(parsed?.items ?? [], nextPreset);
  const nextPhases = new Set(nextItems.map((item) => item.phase));

  return {
    preset: nextPreset,
    activePhase: parsed?.activePhase && nextPhases.has(parsed.activePhase) ? parsed.activePhase : nextItems[0]?.phase ?? defaultPhase,
    items: nextItems,
  };
}

export function writeProjectState(projectId: string, state: { preset: PresetKey; activePhase: string; items: WorkflowItem[] }) {
  window.localStorage.setItem(storageKey(projectId), JSON.stringify(state));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function createWorkflowItem(template: WorkflowItemTemplate): WorkflowItem {
  return {
    ...template,
    done: false,
    note: "",
    deadline: "",
    evidenceUrl: "",
    evidences: [],
    operationId: "",
  };
}

export function mergeSavedItems(saved: Partial<WorkflowItem>[], preset: PresetKey, t?: any) {
  const savedMap = new Map(saved.map((item) => [item.id, item]));
  const templateIds = new Set(workflowTemplate.map((item) => item.id));
  const templateItems = workflowTemplate
    .filter((item) => item.presets.includes(preset))
    .map((item) => {
      const existing = savedMap.get(item.id);
      return {
        ...createWorkflowItem(item),
        done: existing?.done ?? false,
        note: existing?.note ?? "",
        deadline: existing?.deadline ?? "",
        evidenceUrl: existing?.evidenceUrl ?? "",
        evidences: existing?.evidences ?? [],
        operationId: existing?.operationId ?? "",
        updatedAt: existing?.updatedAt,
      };
    });
  const customItems = saved
    .filter((item): item is Partial<WorkflowItem> & { id: string } => Boolean(item.id && !templateIds.has(item.id)))
    .map((item) => ({
      id: item.id,
      phase: item.phase || "5. Q&A & Change",
      // B-022: without a translator and without a title the result used to be undefined (crash in sort).
      title: ((t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title) || "Linked operation todo",
      detail: (t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) !== `todo.workflow.${item.id}.detail` ? (t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) : item.detail || "",
      priority: item.priority ?? "P1",
      presets: item.presets ?? ["standard", "web", "mobile", "migration", "maintenance"],
      done: item.done ?? false,
      note: item.note ?? "",
      deadline: item.deadline ?? "",
      evidenceUrl: item.evidenceUrl ?? "",
      evidences: item.evidences ?? [],
      operationId: item.operationId ?? "",
      updatedAt: item.updatedAt,
      source: item.source,
      meetingId: item.meetingId,
      meetingTitle: item.meetingTitle,
      actionIndex: item.actionIndex,
    }));
  return sortWorkflowItems([...templateItems, ...customItems]);
}

export function downloadText(filename: string, content: string) {
  const element = document.createElement("a");
  const file = new Blob([content], { type: "text/markdown" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}

export function isDeadlineSoon(item: WorkflowItem) {
  if (!item.deadline || item.done) return false;
  const today = todayIso();
  const soon = new Date();
  soon.setDate(soon.getDate() + 2);
  return item.deadline <= soon.toISOString().slice(0, 10) && item.deadline >= today;
}

export function isOverdue(item: WorkflowItem) {
  return Boolean(item.deadline && !item.done && item.deadline < todayIso());
}

export function isStaleDone(item: WorkflowItem) {
  if (!item.done || !item.updatedAt) return false;
  const ts = Date.parse(item.updatedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts > 7 * 86400000;
}

export function parseNoteChecklist(note: string) {
  return note
    .split("\n")
    .map((line, lineIndex) => {
      const match = line.match(/^\s*-\s*\[(x|X| )\]\s+(.+)$/);
      if (!match) return null;
      return {
        lineIndex,
        done: match[1].toLowerCase() === "x",
        text: match[2].trim(),
      };
    })
    .filter((item): item is { lineIndex: number; done: boolean; text: string } => Boolean(item));
}

export function appendChecklistLine(note: string, text: string) {
  const trimmedText = text.trim();
  if (!trimmedText) return note;
  const prefix = note.trimEnd() ? `${note.trimEnd()}\n` : "";
  return `${prefix}- [ ] ${trimmedText}`;
}

export function toggleChecklistLine(note: string, lineIndex: number) {
  return note
    .split("\n")
    .map((line, index) => {
      if (index !== lineIndex) return line;
      const match = line.match(/^(\s*-\s*\[)(x|X| )(\]\s+.+)$/);
      if (!match) return line;
      return `${match[1]}${match[2].toLowerCase() === "x" ? " " : "x"}${match[3]}`;
    })
    .join("\n");
}
