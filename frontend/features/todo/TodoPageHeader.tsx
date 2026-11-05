"use client";

import { ClipboardList, Download, FileCheck, RotateCcw, Save, Settings } from "lucide-react";
import { TodoProject } from "./useTodoProjectSync";

interface TodoPageHeaderProps {
  t: any;
  activeProjectId: string;
  activeProjectName: string;
  activeProjects: TodoProject[];
  switchProject: (id: string) => void;
  progress: number;
  overdueCount: number;
  soonCount: number;
  openItemsCount: number;
  linkedCount: number;
  syncStatus: string;
  exportMarkdown: () => void;
  onExportSignOff?: () => void;
  resetChecklist: () => void;
  saveSnapshot: () => void;
  onOpenConfig: () => void;
}

export function TodoPageHeader({
  t,
  activeProjectId,
  activeProjectName,
  activeProjects,
  switchProject,
  progress,
  overdueCount,
  soonCount,
  openItemsCount,
  syncStatus,
  exportMarkdown,
  onExportSignOff,
  resetChecklist,
  saveSnapshot,
  onOpenConfig,
}: TodoPageHeaderProps) {
  return (
    <div className="brse-section mb-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 lg:pr-56">
      {/* Left: Brand + Project Switcher + Micro Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
            <ClipboardList className="h-4 w-4" />
          </div>
          <h1 className="text-sm font-bold text-ink">BrSE Todo List</h1>
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative">
          <select
            value={activeProjectId}
            onChange={(e) => switchProject(e.target.value)}
            className="field-control h-7.5 py-0.5 pl-2 pr-6 text-xs font-semibold bg-background/60 text-ink border-[var(--brse-panel-border)] hover:border-primary/40 transition cursor-pointer"
            aria-label="Chọn dự án"
          >
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Inline Compact Metric Badges */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary"
            title="Tiến độ tổng thể"
          >
            {progress}%
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-bold text-cyan-300"
            title="Số việc đang mở"
          >
            {openItemsCount} việc
          </span>
          {overdueCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-danger/15 px-2 py-0.5 text-[11px] font-bold text-vermilion"
              title="Quá hạn"
            >
              Quá hạn: {overdueCount}
            </span>
          ) : soonCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-300"
              title="Sắp tới hạn"
            >
              Sắp tới hạn: {soonCount}
            </span>
          ) : null}
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-textMuted ml-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Sync
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenConfig}
          className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-2.5 text-xs font-semibold text-textMuted hover:border-primary/40 hover:text-ink transition"
          title="Cấu hình & quản lý dự án (Clone, Archive, Preset...)"
        >
          <Settings className="h-3.5 w-3.5 text-primary" />
          <span>Cấu hình</span>
        </button>

        {onExportSignOff ? (
          <button
            type="button"
            onClick={onExportSignOff}
            className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-2.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/25 transition shadow-sm"
            title="Xuất báo cáo tiến độ và biên bản xác nhận kiểm thử / nghiệm thu khách hàng Nhật (A4 In / PDF)"
          >
            <FileCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Xuất Khách ký (A4)</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={exportMarkdown}
          className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-2.5 text-xs font-semibold text-textMuted hover:border-primary/40 hover:text-ink transition"
          title={t("todo.export")}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("todo.export")}</span>
        </button>

        <button
          type="button"
          onClick={resetChecklist}
          className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-vermilion/30 bg-vermilion/10 px-2.5 text-xs font-semibold text-vermilion hover:bg-vermilion/15 transition"
          title={t("todo.reset")}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("todo.reset")}</span>
        </button>

        <button
          type="button"
          onClick={saveSnapshot}
          className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-primary/30 bg-primary/20 px-3 text-xs font-bold text-primary hover:bg-primary/30 transition shadow-sm"
          title={t("todo.save")}
        >
          <Save className="h-3.5 w-3.5" />
          <span>{t("todo.save")}</span>
        </button>
      </div>
    </div>
  );
}
