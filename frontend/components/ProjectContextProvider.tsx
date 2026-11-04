"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ACTIVE_PROJECT_CHANGED_EVENT,
  getActiveProjectId,
  getProjectSettings,
  setActiveProjectId as persistActiveProjectId,
  type ProjectSetting,
} from "@/lib/projectSettings";

/**
 * Single source of truth for "which project is the user working in".
 * Screens read `activeProjectId` from here instead of each re-deriving it from
 * localStorage + the active-project event (which is how scopes drifted apart before).
 */
type ProjectContextValue = {
  projects: ProjectSetting[];
  activeProjectId: string;
  activeProject: ProjectSetting | null;
  setActiveProject: (projectId: string) => void;
  refresh: () => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectContextProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectSetting[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");

  const refresh = useCallback(() => {
    setProjects(getProjectSettings());
    setActiveProjectId(getActiveProjectId());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh); // another tab switched project
    return () => {
      window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const setActiveProject = useCallback((projectId: string) => {
    persistActiveProjectId(projectId); // persists + broadcasts; refresh() picks it up
  }, []);

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProjectId,
      activeProject: projects.find((project) => project.id === activeProjectId) ?? null,
      setActiveProject,
      refresh,
    }),
    [projects, activeProjectId, setActiveProject, refresh]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext must be used inside <ProjectContextProvider>");
  return ctx;
}
