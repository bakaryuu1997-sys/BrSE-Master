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
    <section className="brse-section p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-ink">{t("settings.projectsList")}</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {projects.length}
          </span>
        </div>
      </div>
      <div className="mt-3.5 grid gap-2.5">
        {projects.length === 0 ? (
          <p className="text-xs text-textMuted py-4 text-center">{t("settings.noProjects")}</p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "rounded-xl border border-[var(--brse-panel-border)] p-3 sm:p-3.5 transition-all",
                project.id === activeId
                  ? "bg-primary/5 border-primary/45 ring-1 ring-primary/20"
                  : "bg-surface hover:border-ink/20"
              )}
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-xs text-ink truncate">{project.name}</h3>
                    {project.id === activeId && (
                      <span className="rounded bg-matcha/15 px-1.5 py-0.5 text-[10px] font-bold text-matcha">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-textMuted truncate">
                    {project.customer_name ? `${project.customer_name} · ` : ""}
                    {project.brse_name ? `BrSE: ${project.brse_name} · ` : ""}
                    PIC: {parseStakeholders(project.stakeholders_json).length} · Tools: {countIntegrations(project.integrations_json)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void onActivate(project.id)}
                    disabled={project.id === activeId}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--brse-panel-border)] bg-background/80 px-2 py-1 text-[11px] font-bold text-ink transition hover:border-primary/40 disabled:cursor-not-allowed disabled:bg-primary/10 disabled:border-primary/25 disabled:text-primary"
                  >
                    {project.id === activeId ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Đang chọn
                      </>
                    ) : (
                      "Kích hoạt"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(project)}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--brse-panel-border)] bg-background/80 px-2 py-1 text-[11px] font-bold text-ink transition hover:border-primary/40"
                  >
                    <Pencil className="h-3 w-3" />
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRemove(project.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-500/25 bg-background/80 px-2 py-1 text-[11px] font-bold text-vermilion transition hover:border-red-500/45 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    Xóa
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
