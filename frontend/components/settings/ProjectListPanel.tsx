"use client";

import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ProjectSetting } from "@/lib/projectSettings";
import { parseStakeholders, countIntegrations } from "@/lib/projectSettingsHelpers";
import { type TranslationKey } from "@/lib/uiLanguage";

interface ProjectListPanelProps {
  t: (key: TranslationKey) => string;
  projects: ProjectSetting[];
  activeId: string;
  onActivate: (projectId: string) => void;
  onEdit: (project: ProjectSetting) => void;
  onRemove: (projectId: string) => void;
}

export function ProjectListPanel({
  t,
  projects,
  activeId,
  onActivate,
  onEdit,
  onRemove,
}: ProjectListPanelProps) {
  return (
    <section className="brse-section p-5">
      <h2 className="text-lg font-semibold text-ink">{t("settings.projectsList")}</h2>
      <div className="mt-5 grid gap-3">
        {projects.length === 0 ? (
          <p className="text-sm text-textMuted">{t("settings.noProjects")}</p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "rounded-xl border border-[var(--brse-panel-border)] p-4 transition-all",
                project.id === activeId
                  ? "bg-primary/5 border-primary/45 ring-1 ring-primary/20"
                  : "bg-surface hover:border-ink/20"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink truncate">{project.name}</h3>
                  <p className="mt-1 text-xs text-textMuted truncate">
                    {project.customer_name ? `${project.customer_name} · ` : ""}
                    {project.brse_name ? `BrSE: ${project.brse_name} · ` : ""}
                    Stakeholders: {parseStakeholders(project.stakeholders_json).length} · Integrations: {countIntegrations(project.integrations_json)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onActivate(project.id)}
                    disabled={project.id === activeId}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--brse-panel-border)] bg-background/80 px-2.5 py-1.5 text-xs font-bold text-ink transition hover:border-primary/40 disabled:cursor-not-allowed disabled:bg-primary/10 disabled:border-primary/25 disabled:text-primary"
                  >
                    {project.id === activeId ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active
                      </>
                    ) : (
                      "Activate"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(project)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--brse-panel-border)] bg-background/80 px-2.5 py-1.5 text-xs font-bold text-ink transition hover:border-primary/40"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRemove(project.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-500/25 bg-background/80 px-2.5 py-1.5 text-xs font-bold text-vermilion transition hover:border-red-500/45 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
