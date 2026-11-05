"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { useNotify } from "@/components/ToastProvider";
import { useProjectContext } from "@/components/ProjectContextProvider";
import { apiBaseUrl } from "@/lib/config";
import {
  BRSE_TODO_ACTIVE_PROJECT_KEY,
  BRSE_TODO_PROJECTS_KEY,
  deleteBrseTodoProjectFromDb,
  fetchActiveBrseTodoProjectId,
  fetchBrseTodoProjectsFromDb,
  fetchBrseTodoStateFromDb,
  mergeTodoItemsByRecency,
  saveBrseTodoProjectToDb,
  saveBrseTodoStateToDb,
  setActiveBrseTodoProjectId,
  type BrseTodoItem,
} from "@/lib/brseTodo";
import { useSaveTodoProjectStateMutation } from "@/lib/todo-hooks";
import { getOperationRecords, type OperationRecord } from "@/lib/operations";
import {
  ACTIVE_PROJECT_CHANGED_EVENT,
  ensureProjectSettingsForTodoProjects,
  fetchProjectSettingsWithFallback,
  getActiveProjectId,
  getProjectSettings,
} from "@/lib/projectSettings";

import {
  presetLabels,
  defaultPhase,
  phaseOrder,
  type Priority,
  type FilterMode,
  type PresetKey,
  type WorkflowItem,
  type TodoProject,
} from "./todoWorkflowModel";
import {
  storageKey,
  createProjectId,
  createDefaultProject,
  mergeProjectSettingsIntoTodoProjects,
  percentage,
  phaseRank,
  priorityRank,
  readProjectState,
  writeProjectState,
  todayIso,
  mergeSavedItems,
  downloadText,
  isDeadlineSoon,
  isOverdue,
  isStaleDone,
  appendChecklistLine,
  toggleChecklistLine,
} from "./todoWorkflowHelpers";

// Public API is unchanged: everything that used to live in this file is still exported from here.
export * from "./todoWorkflowModel";
export * from "./todoWorkflowHelpers";

export function useTodoProjectSync() {
  const { t } = useUiLanguage();
  const { confirm } = useConfirm();
  const { notify, notifyWithUndo } = useNotify();
  const { mutate: saveTodoProjectState } = useSaveTodoProjectStateMutation();
  const { activeProjectId: contextProjectId, setActiveProject: setSidebarProject } = useProjectContext();
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
        // Don't let a failed Project Settings fetch pass silently: remember it so the final
        // sync status says "using local cache" instead of "synced".
        let settingsFellBack = false;
        const [dbProjects, projectSettings] = await Promise.all([
          fetchBrseTodoProjectsFromDb().catch(() => []),
          fetchProjectSettingsWithFallback(() => {
            settingsFellBack = true;
          }),
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
          // Only create Todo projects the server does not have yet. Re-saving existing ones with
          // no state reset their preset/active phase to the defaults on every page load.
          projectSettings
            .filter((setting) => !dbProjects.some((project) => project.id === setting.id))
            .map((setting) =>
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
        const dbState = await fetchBrseTodoStateFromDb(preferredId, { persistLocal: false });
        if (cancelled) return;
        // Merge with what is stored locally instead of letting the server copy win outright;
        // an empty/older server copy used to replace local tasks with the default template.
        const localState = readProjectState(preferredId);
        const serverHasItems = dbState.items.length > 0;
        const nextPreset = ((serverHasItems ? dbState.preset : localState.preset) as PresetKey) || "standard";
        const mergedItems = mergeSavedItems(
          mergeTodoItemsByRecency(
            localState.items as BrseTodoItem[],
            dbState.items
          ) as Partial<WorkflowItem>[],
          nextPreset
        );
        const nextPhase = serverHasItems ? dbState.activePhase : localState.activePhase;
        setProjects(mergedProjects);
        setActiveProjectId(preferredId);
        setPreset(nextPreset);
        setItems(mergedItems);
        setActivePhase(mergedItems.some((item) => item.phase === nextPhase) ? nextPhase : mergedItems[0]?.phase ?? defaultPhase);
        setSyncStatus(settingsFellBack ? t("settings.status.usingCache") : t("todo.syncStatus.synced"));
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
    // Keep the sidebar switcher in step with a switch made inside the Todo page. Batched with
    // the state updates above, so the follow-context effect sees a consistent pair.
    if (projectId !== contextProjectId && getProjectSettings().some((setting) => setting.id === projectId)) {
      setSidebarProject(projectId);
    }
  }, [activePhase, activeProjectId, items, preset, contextProjectId, setSidebarProject]);

  // Follow the sidebar project (ProjectContext). The reverse direction lives in
  // `switchProject`, which pushes a Todo-page switch back to the sidebar.
  const lastContextProjectId = useRef(contextProjectId);
  useEffect(() => {
    if (!isLoaded) return;
    // React only to a change of the sidebar project, never to a mismatch the Todo page created
    // itself (e.g. right after creating/selecting a project here).
    if (lastContextProjectId.current === contextProjectId) return;
    lastContextProjectId.current = contextProjectId;
    if (!contextProjectId || contextProjectId === activeProjectId) return;
    const mergedProjects = mergeProjectSettingsIntoTodoProjects(
      projects.length ? projects : [createDefaultProject()],
      getProjectSettings()
    );
    if (mergedProjects.some((project) => project.id === contextProjectId && !project.archivedAt)) {
      setProjects(mergedProjects);
      switchProject(contextProjectId);
    }
  }, [contextProjectId, activeProjectId, isLoaded, projects, switchProject]);

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
      setSidebarProject(nextProject.id); // the new project becomes active everywhere
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
