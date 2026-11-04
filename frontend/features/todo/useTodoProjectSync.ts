"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { useNotify } from "@/components/ToastProvider";
import { apiBaseUrl } from "@/lib/config";
import {
  BRSE_TODO_ACTIVE_PROJECT_KEY,
  BRSE_TODO_PROJECTS_KEY,
  BRSE_TODO_STORAGE_PREFIX,
  brseTodoStorageKey,
  deleteBrseTodoProjectFromDb,
  fetchActiveBrseTodoProjectId,
  fetchBrseTodoProjectsFromDb,
  fetchBrseTodoStateFromDb,
  saveBrseTodoProjectToDb,
  saveBrseTodoStateToDb,
  setActiveBrseTodoProjectId,
} from "@/lib/brseTodo";
import { useSaveTodoProjectStateMutation } from "@/lib/todo-hooks";
import { getOperationRecords, type OperationRecord } from "@/lib/operations";
import {
  ACTIVE_PROJECT_CHANGED_EVENT,
  ensureProjectSettingsForTodoProjects,
  fetchProjectSettings,
  getActiveProject,
  getActiveProjectId,
  getProjectSettings,
  type ProjectSetting,
} from "@/lib/projectSettings";

export type Priority = "P0" | "P1" | "P2";
export type FilterMode = "all" | "todo" | "done" | "p0" | "deadline" | "focus";
export type PresetKey = "standard" | "web" | "mobile" | "migration" | "maintenance";

export type WorkflowItemTemplate = {
  id: string;
  phase: string;
  title: string;
  detail: string;
  priority: Priority;
  presets: PresetKey[];
};

export type WorkflowItem = WorkflowItemTemplate & {
  done: boolean;
  note: string;
  deadline: string;
  evidenceUrl: string;
  evidences?: Array<{ type: string; url: string; quote?: string }>;
  operationId: string;
  updatedAt?: string;
  source?: "workflow" | "operation" | "meeting";
  meetingId?: string;
  meetingTitle?: string;
  actionIndex?: number;
};

export type TodoProject = {
  id: string;
  name: string;
  createdAt: string;
  archivedAt?: string;
};

export const presetLabels: Record<PresetKey, string> = {
  standard: "Standard",
  web: "Web app",
  mobile: "Mobile app",
  migration: "Migration",
  maintenance: "Maintenance",
};

export const defaultPhase = "1. Kick-off & Requirement";

export const phaseOrder = [
  "1. Kick-off & Requirement",
  "2. Communication Setup",
  "3. Requirement Analysis",
  "4. Tracking & Reporting",
  "5. Q&A & Change",
  "6. Testing & UAT",
  "7. Closure & Knowledge",
];

export const workflowTemplate: WorkflowItemTemplate[] = [
  {
    id: "p1-read-input-docs",
    phase: "1. Kick-off & Requirement",
    title: "Đọc tài liệu đầu vào",
    detail: "RD, SRS, Proposal, Contract, tài liệu hệ thống cũ nếu có.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p1-create-qna-first",
    phase: "1. Kick-off & Requirement",
    title: "Lập Q&A ban đầu",
    detail: "Ghi ngay các điểm chưa rõ, không tự suy đoán yêu cầu.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p1-internal-kickoff",
    phase: "1. Kick-off & Requirement",
    title: "Kick-off nội bộ",
    detail: "Xác định RACI, vai trò BrSE/PM/Dev/Comtor, timezone JST/ICT.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p1-customer-kickoff",
    phase: "1. Kick-off & Requirement",
    title: "Kick-off với khách hàng Nhật",
    detail: "Xác nhận scope, timeline, Done definition, report method, contact channel, holiday, CR/incident process.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p1-input-checklist",
    phase: "1. Kick-off & Requirement",
    title: "Checklist tài liệu đầu vào",
    detail: "RD/SRS, wireframe, DB schema, API spec, UI kit, server env, credential, legacy docs.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration"],
  },
  {
    id: "p2-communication-channels",
    phase: "2. Communication Setup",
    title: "Thiết lập kênh giao tiếp",
    detail: "Slack/Chatwork, Zoom/Meet, Notion/Confluence, Git, Jira/Backlog/Redmine.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p2-task-workflow",
    phase: "2. Communication Setup",
    title: "Thống nhất workflow task",
    detail: "Backlog -> Todo -> In Progress -> Review BrSE -> Testing -> Done.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p2-working-agreement",
    phase: "2. Communication Setup",
    title: "Working Agreement",
    detail: "Daily, weekly review, sprint planning, SLA phản hồi, ngôn ngữ họp/tài liệu/commit.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p2-git-rules",
    phase: "2. Communication Setup",
    title: "Git repository & commit rules",
    detail: "Branch main/develop/feature/bugfix/hotfix và commit message chuẩn.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p3-read-requirements",
    phase: "3. Requirement Analysis",
    title: "Phân tích RD/SRS chi tiết",
    detail: "Đọc tổng quan, đọc từng màn hình, đánh dấu thuật ngữ, kiểm tra mâu thuẫn.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p3-qna-list",
    phase: "3. Requirement Analysis",
    title: "Q&A List chuẩn",
    detail: "Có màn hình, câu hỏi JP/VI, deadline, người trả lời, trạng thái, câu trả lời.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p3-basic-design",
    phase: "3. Requirement Analysis",
    title: "Basic Design",
    detail: "Screen flow, DB schema, API spec, UI components, business rules.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration"],
  },
  {
    id: "p3-wireframe-signoff",
    phase: "3. Requirement Analysis",
    title: "Wireframe / Mockup sign-off",
    detail: "Lo-fi -> hi-fi, khách xác nhận bằng văn bản trước khi code.",
    priority: "P1",
    presets: ["standard", "web", "mobile"],
  },
  {
    id: "p3-estimation",
    phase: "3. Requirement Analysis",
    title: "Ước lượng công sức",
    detail: "Story point/man-day, buffer 50%, man-month = man-day / 20.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p4-wbs",
    phase: "4. Tracking & Reporting",
    title: "Lập WBS",
    detail: "Epic -> Story -> Task, mỗi task level 3 tối đa 8 giờ.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p4-sprint-planning",
    phase: "4. Tracking & Reporting",
    title: "Sprint planning",
    detail: "Capacity, load 80%, danh sách story đã chọn.",
    priority: "P1",
    presets: ["standard", "web", "mobile"],
  },
  {
    id: "p4-daily-report",
    phase: "4. Tracking & Reporting",
    title: "Daily report gửi Nhật",
    detail: "Hoàn thành, đang làm, ngày mai, vấn đề/cần hỏi.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p4-weekly-report",
    phase: "4. Tracking & Reporting",
    title: "Weekly report",
    detail: "Kết quả tuần, kế hoạch tuần tới, rủi ro/vấn đề, ghi chú đặc biệt.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p4-risk-management",
    phase: "4. Tracking & Reporting",
    title: "Risk management",
    detail: "Theo dõi thay đổi yêu cầu, dev nghỉ, staging lỗi, khách trả lời Q&A chậm.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p5-qna-process",
    phase: "5. Q&A & Change",
    title: "Quy trình xử lý Q&A",
    detail: "Dev phát hiện -> BrSE ghi/dịch -> gửi batch -> cập nhật câu trả lời -> báo team.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p5-cr-process",
    phase: "5. Q&A & Change",
    title: "Change Request process",
    detail: "Không nhận miệng ngay, phân tích impact, CR document, PM review, sign-off bằng văn bản.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p5-cr-document",
    phase: "5. Q&A & Change",
    title: "CR document",
    detail: "Thông tin chung, nội dung thay đổi, impact, phương án, quyết định khách hàng.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p6-internal-testing",
    phase: "6. Testing & UAT",
    title: "Testing nội bộ",
    detail: "Unit, integration, system/QA, BrSE review, demo PM VN.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p6-test-case",
    phase: "6. Testing & UAT",
    title: "Test case",
    detail: "Happy path 100%, edge cases quan trọng, test case JP nếu khách review.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration"],
  },
  {
    id: "p6-bug-management",
    phase: "6. Testing & UAT",
    title: "Bug management",
    detail: "Blocker/Critical/Major/Minor, SLA, bug report đủ env/repro/expected/actual.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p6-uat-support",
    phase: "6. Testing & UAT",
    title: "UAT support",
    detail: "UAT script JP, test data, BrSE online, ghi feedback, phân loại fix ngay/backlog.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration"],
  },
  {
    id: "p7-handover-docs",
    phase: "7. Closure & Knowledge",
    title: "Bàn giao tài liệu",
    detail: "RD/SRS, BD/DD, API, DB, source README, deployment, operation manual, test case, bug/Q&A list, acceptance.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p7-retrospective",
    phase: "7. Closure & Knowledge",
    title: "Retrospective KPT",
    detail: "Keep, Problem, Try cho dự án tiếp theo.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p7-knowledge-base",
    phase: "7. Closure & Knowledge",
    title: "Lưu tri thức dự án",
    detail: "Customer glossary, quyết định thiết kế, bug lesson, template hiệu quả, phong cách khách.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
];

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
      title: (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title || "Linked operation todo",
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

export function useTodoProjectSync() {
  const { t } = useUiLanguage();
  const { confirm } = useConfirm();
  const { notify, notifyWithUndo } = useNotify();
  const { mutate: saveTodoProjectState } = useSaveTodoProjectStateMutation();
  const [items, setItems] = useState<WorkflowItem[]>(() => mergeSavedItems([], "standard"));
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [projects, setProjects] = useState<TodoProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("personal");
  const [preset, setPreset] = useState<PresetKey>("standard");
  const [activePhase, setActivePhase] = useState(defaultPhase);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");
  const [expandedItemId, setExpandedItemId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [reportCopied, setReportCopied] = useState(false);
  const [deadlineNotice, setDeadlineNotice] = useState("");
  const [syncStatus, setSyncStatus] = useState("Local cache");
  const [externalChangeNotice, setExternalChangeNotice] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const defaultProject = createDefaultProject();
      const rawProjects = window.localStorage.getItem(BRSE_TODO_PROJECTS_KEY);
      const parsedProjects = rawProjects ? (JSON.parse(rawProjects) as TodoProject[]) : [];
      const nextProjects = mergeProjectSettingsIntoTodoProjects(parsedProjects.length ? parsedProjects : [defaultProject]);
      const activeProjectsList = nextProjects.filter((project) => !project.archivedAt);
      const activeId = window.localStorage.getItem(BRSE_TODO_ACTIVE_PROJECT_KEY);
      const activeProjectSettingId = getActiveProjectId();
      const params = new URLSearchParams(window.location.search);
      const projectParam = params.get("projectId");
      const nextActiveId = projectParam && activeProjectsList.some((project) => project.id === projectParam)
        ? projectParam
        : activeProjectsList.some((project) => project.id === activeProjectSettingId)
        ? activeProjectSettingId
        : activeProjectsList.some((project) => project.id === activeId)
        ? activeId ?? defaultProject.id
        : activeProjectsList[0]?.id ?? nextProjects[0].id;
      const projectState = readProjectState(nextActiveId);
      const phaseParam = params.get("phase");
      const itemParam = params.get("itemId");
      const filterParam = params.get("filter") as FilterMode | null;
      const nextPhase = phaseParam && projectState.items.some((item) => item.phase === phaseParam)
        ? phaseParam
        : projectState.activePhase;

      setProjects(nextProjects);
      setActiveProjectId(nextActiveId);
      setPreset(projectState.preset);
      setItems(projectState.items);
      setActivePhase(nextPhase);
      setExpandedItemId(itemParam && projectState.items.some((item) => item.id === itemParam) ? itemParam : "");
      if (filterParam && ["all", "todo", "done", "p0", "deadline", "focus"].includes(filterParam)) {
        setFilter(filterParam);
      }
    } catch {
      const defaultProject = createDefaultProject();
      setProjects([defaultProject]);
      setActiveProjectId(defaultProject.id);
      setPreset("standard");
      setItems(mergeSavedItems([], "standard"));
      setActivePhase(defaultPhase);
    } finally {
      setIsLoaded(true);
    }

    getOperationRecords().then(setOperations);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    async function hydrateFromDb() {
      try {
        const [dbProjects, projectSettings] = await Promise.all([
          fetchBrseTodoProjectsFromDb().catch(() => []),
          fetchProjectSettings().catch(() => getProjectSettings()),
        ]);
        if (cancelled) return;

        const cachedRawProjects = window.localStorage.getItem(BRSE_TODO_PROJECTS_KEY);
        const cachedProjects = cachedRawProjects ? (JSON.parse(cachedRawProjects) as TodoProject[]) : [];
        const mergedProjects = mergeProjectSettingsIntoTodoProjects(dbProjects.length ? dbProjects : cachedProjects, projectSettings);
        if (!mergedProjects.length) {
          setSyncStatus(t("todo.syncStatus.empty"));
          return;
        }

        await Promise.allSettled(
          projectSettings.map((setting) =>
            saveBrseTodoProjectToDb({
              id: setting.id,
              name: setting.name || "Untitled project",
              createdAt: setting.createdAt || new Date().toISOString(),
            })
          )
        );

        const activeDbProjects = mergedProjects.filter((project) => !project.archivedAt);
        const cachedActiveId = await fetchActiveBrseTodoProjectId();
        const activeProjectSettingId = getActiveProjectId();
        const preferredId = activeDbProjects.some((project) => project.id === activeProjectSettingId)
          ? activeProjectSettingId
          : activeDbProjects.some((project) => project.id === cachedActiveId)
          ? cachedActiveId
          : activeDbProjects[0]?.id ?? mergedProjects[0].id;
        const dbState = await fetchBrseTodoStateFromDb(preferredId);
        if (cancelled) return;
        const mergedItems = mergeSavedItems(dbState.items as Partial<WorkflowItem>[], (dbState.preset as PresetKey) || "standard");
        setProjects(mergedProjects);
        setActiveProjectId(preferredId);
        setPreset((dbState.preset as PresetKey) || "standard");
        setItems(mergedItems);
        setActivePhase(mergedItems.some((item) => item.phase === dbState.activePhase) ? dbState.activePhase : mergedItems[0]?.phase ?? defaultPhase);
        setSyncStatus(t("todo.syncStatus.synced"));
      } catch {
        if (!cancelled) setSyncStatus(t("todo.syncStatus.usingLocal"));
      }
    }

    hydrateFromDb();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, t]);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(BRSE_TODO_PROJECTS_KEY, JSON.stringify(projects));
  }, [isLoaded, projects]);

  useEffect(() => {
    if (!isLoaded) return;
    setActiveBrseTodoProjectId(activeProjectId);
    writeProjectState(activeProjectId, { preset, activePhase, items });
    const activeProject = projects.find((project) => project.id === activeProjectId);
    if (!activeProject) return;
    const timeout = window.setTimeout(() => {
      saveTodoProjectState(
        { activeProjectId, project: activeProject, state: { preset, activePhase, items } },
        {
          onSuccess: () => setSyncStatus(t("todo.syncStatus.synced")),
          onError: () => setSyncStatus(t("todo.syncStatus.offline")),
        }
      );
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [activePhase, activeProjectId, isLoaded, items, preset, projects, saveTodoProjectState, t]);

  useEffect(() => {
    if (!isLoaded) return;
    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey(activeProjectId) || !event.newValue) return;
      const currentSnapshot = JSON.stringify({ preset, activePhase, items });
      if (event.newValue !== currentSnapshot) {
        setExternalChangeNotice("Phát hiện thay đổi từ tab khác. Hãy tải lại dữ liệu trước khi tiếp tục sửa để tránh ghi đè.");
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [activePhase, activeProjectId, isLoaded, items, preset]);

  const activeProjectName = projects.find((project) => project.id === activeProjectId)?.name ?? "Personal project";
  const activeProjects = projects.filter((project) => !project.archivedAt);
  const archivedProjects = projects.filter((project) => project.archivedAt);
  const phases = useMemo(() => {
    const itemPhases = new Set(items.map((item) => item.phase));
    const orderedKnownPhases = phaseOrder.filter((phase) => itemPhases.has(phase));
    const customPhases = Array.from(itemPhases).filter((phase) => !phaseOrder.includes(phase)).sort();
    return [...orderedKnownPhases, ...customPhases];
  }, [items]);
  const doneCount = items.filter((item) => item.done).length;
  const p0Items = items.filter((item) => item.priority === "P0");
  const p0Done = p0Items.filter((item) => item.done).length;
  const overdueCount = items.filter(isOverdue).length;
  const soonCount = items.filter(isDeadlineSoon).length;
  const linkedCount = items.filter((item) => item.operationId).length;
  const evidenceCount = items.filter((item) => item.evidenceUrl).length;
  const progress = percentage(doneCount, items.length);
  const p0Progress = percentage(p0Done, p0Items.length);

  const phaseStats = phases.map((phase) => {
    const phaseItems = items.filter((item) => item.phase === phase);
    const phaseDone = phaseItems.filter((item) => item.done).length;
    return {
      phase,
      done: phaseDone,
      total: phaseItems.length,
      progress: percentage(phaseDone, phaseItems.length),
    };
  });

  const selectedPhaseStat = phaseStats.find((stat) => stat.phase === activePhase) ?? phaseStats[0];
  const activePhaseIndex = phases.findIndex((phase) => phase === activePhase);
  const previousPhase = activePhaseIndex > 0 ? phases[activePhaseIndex - 1] : "";
  const nextPhaseName = activePhaseIndex >= 0 && activePhaseIndex < phases.length - 1 ? phases[activePhaseIndex + 1] : "";
  const deadlineRiskItems = items.filter((item) => isOverdue(item) || isDeadlineSoon(item));
  const currentPhaseNumber = Math.max(1, activePhaseIndex + 1);
  const currentPhaseOpenCount = items.filter((item) => item.phase === activePhase && !item.done).length;
  const previousPhaseBlockers = items.filter((item) => !item.done && item.priority === "P0" && phaseRank(item.phase) < phaseRank(activePhase));
  const openItemsCount = Math.max(0, items.length - doneCount);

  const filteredItems = items.filter((item) => {
    const inPhaseColumn =
      filter === "focus"
        ? item.phase === activePhase || (!item.done && item.priority === "P0" && item.phase !== activePhase)
        : item.phase === activePhase;
    const hideStaleDone = isStaleDone(item) && filter !== "done";
    if (!inPhaseColumn || hideStaleDone) return false;
    const matchesFilter =
      filter === "all" ||
      (filter === "focus" && !item.done) ||
      (filter === "todo" && !item.done) ||
      (filter === "done" && item.done) ||
      (filter === "p0" && item.priority === "P0") ||
      (filter === "deadline" && (isOverdue(item) || isDeadlineSoon(item)));
    const matchesQuery =
      !query.trim() ||
      `${(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title} ${(t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) !== `todo.workflow.${item.id}.detail` ? (t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) : item.detail} ${item.phase} ${item.note} ${item.evidenceUrl}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const staleDoneItems = useMemo(() => items.filter(isStaleDone), [items]);

  const nextFocus = items
    .filter((item) => !item.done)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 5);

  const dailyReport = useMemo(() => {
    const today = todayIso();
    const doneToday = items.filter((item) => item.done && item.updatedAt?.slice(0, 10) === today);
    const activeTodo = items
      .filter((item) => !item.done)
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
      .slice(0, 5);
    const risks = items.filter((item) => isOverdue(item) || (item.priority === "P0" && !item.done)).slice(0, 5);

    return `【本日の作業報告】${today.replaceAll("-", "/")}

■ 完了した作業
${doneToday.length ? doneToday.map((item) => `  - ${(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}: 完了`).join("\n") : "  - なし"}

■ 進行中の作業
${activeTodo.length ? activeTodo.map((item) => `  - ${(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}: ${item.phase} / ${item.priority}`).join("\n") : "  - なし"}

■ 明日の予定
${activeTodo.length ? activeTodo.slice(0, 3).map((item) => `  - ${(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}`).join("\n") : "  - 未定"}

■ 課題・相談事項
${risks.length ? risks.map((item) => `  - ${(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}${item.deadline ? ` / Deadline: ${item.deadline}` : ""}`).join("\n") : "  - なし"}`;
  }, [items, t]);

  const selectPhase = useCallback((nextPhase: string) => {
    setActivePhase(nextPhase);
    setExpandedItemId("");
  }, []);

  const switchProject = useCallback((projectId: string) => {
    if (projectId === activeProjectId) return;
    writeProjectState(activeProjectId, { preset, activePhase, items });
    const projectState = readProjectState(projectId);
    setActiveProjectId(projectId);
    setPreset(projectState.preset);
    setItems(projectState.items);
    setActivePhase(projectState.activePhase);
    setFilter("all");
    setQuery("");
    setExpandedItemId("");
    setSavedAt("");
  }, [activePhase, activeProjectId, items, preset]);

  useEffect(() => {
    if (!isLoaded) return;

    function handleProjectContextChange() {
      const nextProjectId = getActiveProjectId();
      if (!nextProjectId || nextProjectId === activeProjectId) return;
      const mergedProjects = mergeProjectSettingsIntoTodoProjects(
        projects.length ? projects : [createDefaultProject()],
        getProjectSettings()
      );
      setProjects(mergedProjects);
      if (mergedProjects.some((project) => project.id === nextProjectId && !project.archivedAt)) {
        switchProject(nextProjectId);
      }
    }

    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectContextChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectContextChange);
  }, [activeProjectId, isLoaded, projects, switchProject]);

  function addProject() {
    const trimmedName = newProjectName.trim();
    if (!trimmedName) return;
    const nextProject = {
      id: createProjectId(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
    };
    const nextItems = mergeSavedItems([], "standard");
    // Keep the sidebar project switcher in sync with Todo projects.
    if (ensureProjectSettingsForTodoProjects([nextProject]) > 0) {
      window.dispatchEvent(
        new CustomEvent(ACTIVE_PROJECT_CHANGED_EVENT, { detail: { projectId: getActiveProjectId() } })
      );
    }
    setProjects((current) => [...current, nextProject]);
    setActiveProjectId(nextProject.id);
    setPreset("standard");
    setItems(nextItems);
    setActivePhase(nextItems[0]?.phase ?? defaultPhase);
    setFilter("all");
    setQuery("");
    setExpandedItemId("");
    setNewProjectName("");
    setSavedAt("");
    writeProjectState(nextProject.id, {
      preset: "standard",
      activePhase: nextItems[0]?.phase ?? defaultPhase,
      items: nextItems,
    });
    saveBrseTodoStateToDb(nextProject, {
      preset: "standard",
      activePhase: nextItems[0]?.phase ?? defaultPhase,
      items: nextItems,
    }).then(() => setSyncStatus(t("todo.syncStatus.synced"))).catch(() => setSyncStatus(t("todo.syncStatus.offline")));
  }

  function cloneActiveProject() {
    const sourceProject = projects.find((project) => project.id === activeProjectId);
    const nextProject = {
      id: createProjectId(),
      name: `${sourceProject?.name ?? activeProjectName} Copy`,
      createdAt: new Date().toISOString(),
    };
    const clonedItems = items.map((item) => ({
      ...item,
      done: false,
      updatedAt: undefined,
    }));
    setProjects((current) => [...current, nextProject]);
    setActiveProjectId(nextProject.id);
    setItems(clonedItems);
    setExpandedItemId("");
    setSavedAt("");
    writeProjectState(nextProject.id, { preset, activePhase, items: clonedItems });
    saveBrseTodoStateToDb(nextProject, { preset, activePhase, items: clonedItems })
      .then(() => setSyncStatus(t("todo.syncStatus.synced")))
      .catch(() => setSyncStatus(t("todo.syncStatus.offline")));
  }

  async function archiveActiveProject() {
    if (activeProjects.length <= 1) {
      notify(t("todo.alert.minProject"), "error");
      return;
    }
    const ok = await confirm({ message: t("todo.confirm.archive").replace("{name}", activeProjectName) });
    if (!ok) return;
    const archivedAt = new Date().toISOString();
    const nextProjects = projects.map((project) => (project.id === activeProjectId ? { ...project, archivedAt } : project));
    const nextActiveProject = nextProjects.find((project) => !project.archivedAt && project.id !== activeProjectId);
    setProjects(nextProjects);
    saveBrseTodoProjectToDb({ id: activeProjectId, name: activeProjectName, createdAt: new Date().toISOString(), archivedAt }, { preset, activePhase, items })
      .then(() => setSyncStatus(t("todo.syncStatus.synced")))
      .catch(() => setSyncStatus(t("todo.syncStatus.offline")));
    if (nextActiveProject) switchProject(nextActiveProject.id);
  }

  function restoreProject(projectId: string) {
    setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, archivedAt: undefined } : project)));
    const target = projects.find((project) => project.id === projectId);
    if (target) {
      saveBrseTodoProjectToDb({ ...target, archivedAt: undefined })
        .then(() => setSyncStatus(t("todo.syncStatus.synced")))
        .catch(() => setSyncStatus(t("todo.syncStatus.offline")));
    }
  }

  async function deleteActiveProject() {
    if (activeProjects.length <= 1) {
      notify(t("todo.alert.minProject"), "error");
      return;
    }
    const ok = await confirm({ type: "danger", message: t("todo.confirm.delete").replace("{name}", activeProjectName) });
    if (!ok) return;
    const nextProjects = projects.filter((project) => project.id !== activeProjectId);
    window.localStorage.removeItem(storageKey(activeProjectId));
    deleteBrseTodoProjectFromDb(activeProjectId)
      .then(() => setSyncStatus(t("todo.syncStatus.synced")))
      .catch(() => setSyncStatus(t("todo.syncStatus.cleared")));
    setProjects(nextProjects);
    const nextActiveProject = nextProjects.find((project) => !project.archivedAt);
    if (nextActiveProject) {
      const projectState = readProjectState(nextActiveProject.id);
      setActiveProjectId(nextActiveProject.id);
      setPreset(projectState.preset);
      setItems(projectState.items);
      setActivePhase(projectState.activePhase);
      setFilter("all");
      setQuery("");
      setExpandedItemId("");
      setSavedAt("");
    }
  }

  function renameActiveProject(nextName: string) {
    setProjects((current) =>
      current.map((project) => (project.id === activeProjectId ? { ...project, name: nextName || "Untitled project" } : project))
    );
  }

  function persistItems(updater: (current: WorkflowItem[]) => WorkflowItem[]) {
    setItems((current) => {
      const nextItems = updater(current);
      writeProjectState(activeProjectId, { preset, activePhase, items: nextItems });
      return nextItems;
    });
  }

  async function toggleItem(itemId: string) {
    const target = items.find((item) => item.id === itemId);
    if (!target) return;
    const nextDone = !target.done;
    if (nextDone) {
      const blockers = items.filter((item) => !item.done && item.priority === "P0" && phaseRank(item.phase) < phaseRank(target.phase));
      if (blockers.length) {
        const ok = await confirm({ type: "warning", message: t("todo.confirm.blocker").replace("{count}", String(blockers.length)) });
        if (!ok) return;
      }
      let evidenceUrl = target.evidenceUrl;
      persistItems((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, done: true, evidenceUrl, updatedAt: new Date().toISOString() } : item
        )
      );
      if (target.operationId) {
        const opStatus = target.phase.includes("Testing") || target.phase.includes("UAT")
          ? "Resolved"
          : target.phase.includes("Q&A")
            ? "Answered"
            : "Closed";
        fetch(`${apiBaseUrl}/operations/${target.operationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: opStatus }),
        }).catch(() => {});
      }
      notify(
        target.operationId
          ? `Đã hoàn thành và tự động đồng bộ sang Operations Board (${target.title})`
          : `Đã hoàn thành: ${target.title}`,
        "success",
        {
          label: "Hoàn tác (Undo)",
          onClick: () => {
            persistItems((current) =>
              current.map((item) =>
                item.id === itemId ? { ...item, done: false, updatedAt: new Date().toISOString() } : item
              )
            );
            if (target.operationId) {
              fetch(`${apiBaseUrl}/operations/${target.operationId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Open" }),
              }).catch(() => {});
            }
          },
        },
        6000
      );
      return;
    }
    persistItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, done: false, updatedAt: new Date().toISOString() } : item
      )
    );
    if (target.operationId) {
      fetch(`${apiBaseUrl}/operations/${target.operationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Open" }),
      }).catch(() => {});
    }
  }

  function updateItem(itemId: string, patch: Partial<WorkflowItem>) {
    persistItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item))
    );
  }

  function addNewItem(title: string, priority: Priority = "P1", phase = activePhase) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newItem: WorkflowItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      phase: phase || activePhase,
      title: trimmed,
      detail: "Công việc phát sinh do BrSE thêm vào quy trình.",
      priority,
      presets: [preset],
      done: false,
      note: "",
      deadline: "",
      evidenceUrl: "",
      operationId: "",
      updatedAt: new Date().toISOString(),
      source: "workflow",
    };
    persistItems((current) => [newItem, ...current]);
    notify(`Đã thêm việc mới: ${trimmed}`, "success");
  }

  function deleteItem(itemId: string) {
    const itemToDelete = items.find((item) => item.id === itemId);
    if (!itemToDelete) return;
    persistItems((current) => current.filter((item) => item.id !== itemId));
    notifyWithUndo(
      `Đã xóa việc: "${itemToDelete.title.slice(0, 32)}${itemToDelete.title.length > 32 ? "..." : ""}"`,
      () => {
        persistItems((current) => [itemToDelete, ...current]);
        notify("Đã hoàn tác và khôi phục công việc thành công!", "success");
      },
      5000
    );
  }

  function addSubtask(item: WorkflowItem) {
    const text = (subtaskDrafts[item.id] || "").trim();
    if (!text) return;
    updateItem(item.id, { note: appendChecklistLine(item.note, text) });
    setSubtaskDrafts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  }

  function toggleSubtask(item: WorkflowItem, lineIndex: number) {
    updateItem(item.id, { note: toggleChecklistLine(item.note, lineIndex) });
  }

  async function attachEvidenceImageFromClipboard(itemId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${apiBaseUrl}/memos/images`, { method: "POST", body: formData });
      if (!response.ok) {
        notify("Tải tài liệu thất bại. Định dạng không được hỗ trợ hoặc vượt quá dung lượng.", "error");
        return;
      }
      const payload = (await response.json()) as { url?: string };
      const path = payload.url || "";
      const absolute = path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
      const isImg = file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);

      setItems((prev) => {
        const item = prev.find((it) => it.id === itemId);
        const currentList = item?.evidences ? [...item.evidences] : [];
        if (item?.evidenceUrl && !currentList.some((ev) => ev.url === item.evidenceUrl)) {
          currentList.unshift({ type: "link", url: item.evidenceUrl, quote: item.evidenceUrl });
        }
        currentList.push({
          type: isImg ? "image" : "file",
          url: absolute,
          quote: file.name || (isImg ? "Screenshot" : "Document"),
        });
        const next = prev.map((it) =>
          it.id === itemId
            ? { ...it, evidenceUrl: absolute, evidences: currentList, updatedAt: new Date().toISOString() }
            : it
        );
        writeProjectState(activeProjectId, { preset, activePhase, items: next });
        return next;
      });
      notify(`Đã đính kèm tài liệu: ${file.name}`, "success");
    } catch {
      notify("Có lỗi khi kết nối tới máy chủ tải tệp.", "error");
    }
  }

  function saveSnapshot() {
    writeProjectState(activeProjectId, { preset, activePhase, items });
    setSavedAt(new Date().toLocaleTimeString());
  }

  async function resetChecklist() {
    const ok = await confirm({ type: "danger", message: t("todo.confirm.reset") });
    if (!ok) return;
    const nextItems = mergeSavedItems([], preset, t);
    setItems(nextItems);
    const nextPhase = nextItems[0]?.phase ?? defaultPhase;
    setActivePhase(nextPhase);
    setExpandedItemId("");
    writeProjectState(activeProjectId, { preset, activePhase: nextPhase, items: nextItems });
    setSavedAt("");
  }

  async function changePreset(nextPreset: PresetKey) {
    const ok = await confirm({ type: "warning", message: t("todo.confirm.changePreset").replace("{preset}", presetLabels[nextPreset]) });
    if (!ok) return;
    const nextItems = mergeSavedItems(items, nextPreset, t);
    const nextPhase = nextItems[0]?.phase ?? defaultPhase;
    setPreset(nextPreset);
    setItems(nextItems);
    setActivePhase(nextPhase);
    setExpandedItemId("");
    writeProjectState(activeProjectId, { preset: nextPreset, activePhase: nextPhase, items: nextItems });
  }

  async function copyDailyReport() {
    await navigator.clipboard.writeText(dailyReport);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 1800);
  }

  async function remindDeadlines() {
    if (!deadlineRiskItems.length) {
      setDeadlineNotice(t("todo.noDeadlineRisk"));
      return;
    }

    const body = deadlineRiskItems
      .slice(0, 5)
      .map((item) => `${(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}${item.deadline ? ` - ${item.deadline}` : ""}`)
      .join("\n");

    if ("Notification" in window) {
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission === "granted") {
        new Notification(`BrSE Todo - ${activeProjectName}`, {
          body,
          tag: `brse-todo-${activeProjectId}`,
        });
        setDeadlineNotice(t("todo.notificationReady"));
        return;
      }
      setDeadlineNotice(t("todo.notificationBlocked"));
      return;
    }

    setDeadlineNotice(body);
  }

  function exportMarkdown() {
    const lines = [
      `# BrSE Todo List - ${activeProjectName}`,
      "",
      `Generated: ${new Date().toISOString()}`,
      `Preset: ${presetLabels[preset]}`,
      `Progress: ${doneCount}/${items.length} (${progress}%)`,
      `P0 Progress: ${p0Done}/${p0Items.length} (${p0Progress}%)`,
      `Deadline Alerts: overdue ${overdueCount}, soon ${soonCount}`,
      "",
      "## Daily Report",
      dailyReport,
      "",
      "## Phase Progress",
      ...phaseStats.map((stat) => `- ${stat.phase}: ${stat.done}/${stat.total} (${stat.progress}%)`),
      "",
      "## Checklist",
      ...items.map((item) => {
        const status = item.done ? "x" : " ";
        const note = item.note ? `\n  - Note: ${item.note.replaceAll("\n", " ")}` : "";
        const deadline = item.deadline ? `\n  - Deadline: ${item.deadline}` : "";
        const evidence = item.evidenceUrl ? `\n  - Evidence: ${item.evidenceUrl}` : "";
        const operation = item.operationId ? `\n  - Operation: ${item.operationId}` : "";
        return `- [${status}] ${item.phase} / ${item.priority} / ${(t ? t(`todo.workflow.${item.id}.title` as any) : item.title) !== `todo.workflow.${item.id}.title` ? (t ? t(`todo.workflow.${item.id}.title` as any) : item.title) : item.title}: ${(t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) !== `todo.workflow.${item.id}.detail` ? (t ? t(`todo.workflow.${item.id}.detail` as any) : item.detail) : item.detail}${deadline}${evidence}${operation}${note}`;
      }),
      "",
    ];
    downloadText(`brse-todo-${activeProjectName.replaceAll(" ", "-").toLowerCase()}.md`, lines.join("\n"));
  }

  const reloadState = useCallback(() => {
    const projectState = readProjectState(activeProjectId);
    setPreset(projectState.preset);
    setActivePhase(projectState.activePhase);
    setItems(projectState.items);
    setExternalChangeNotice("");
  }, [activeProjectId]);

  return {
    t,
    confirm,
    items,
    setItems,
    operations,
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    preset,
    setPreset,
    activePhase,
    setActivePhase,
    filter,
    setFilter,
    query,
    setQuery,
    expandedItemId,
    setExpandedItemId,
    newProjectName,
    setNewProjectName,
    savedAt,
    setSavedAt,
    reportCopied,
    setReportCopied,
    deadlineNotice,
    setDeadlineNotice,
    syncStatus,
    setSyncStatus,
    externalChangeNotice,
    setExternalChangeNotice,
    isLoaded,
    subtaskDrafts,
    setSubtaskDrafts,
    activeProjectName,
    activeProjects,
    archivedProjects,
    phases,
    doneCount,
    p0Items,
    p0Done,
    overdueCount,
    soonCount,
    linkedCount,
    evidenceCount,
    progress,
    p0Progress,
    phaseStats,
    selectedPhaseStat,
    previousPhase,
    nextPhaseName,
    deadlineRiskItems,
    currentPhaseNumber,
    currentPhaseOpenCount,
    previousPhaseBlockers,
    openItemsCount,
    filteredItems,
    staleDoneItems,
    nextFocus,
    dailyReport,
    selectPhase,
    switchProject,
    addProject,
    cloneActiveProject,
    archiveActiveProject,
    restoreProject,
    deleteActiveProject,
    renameActiveProject,
    toggleItem,
    updateItem,
    addNewItem,
    deleteItem,
    addSubtask,
    toggleSubtask,
    attachEvidenceImageFromClipboard,
    saveSnapshot,
    resetChecklist,
    changePreset,
    copyDailyReport,
    remindDeadlines,
    exportMarkdown,
    reloadState,
  };
}
