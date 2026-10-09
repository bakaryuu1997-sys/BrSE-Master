"use client";

import { ClipboardList, Download, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

interface TodoPageHeaderProps {
  t: any;
  activeProjectName: string;
  progress: number;
  overdueCount: number;
  soonCount: number;
  openItemsCount: number;
  linkedCount: number;
  exportMarkdown: () => void;
  resetChecklist: () => void;
  saveSnapshot: () => void;
}

export function TodoPageHeader({
  t,
  activeProjectName,
  progress,
  overdueCount,
  soonCount,
  openItemsCount,
  linkedCount,
  exportMarkdown,
  resetChecklist,
  saveSnapshot,
}: TodoPageHeaderProps) {
  return (
    <PageHeader
      className="mb-6"
      badge="Workflow cockpit"
      title={t("todo.title")}
      description={`${t("todo.body")}: ${activeProjectName}.`}
      icon={ClipboardList}
      stats={[
        { label: t("todo.overall"), value: `${progress}%`, variant: "primary" },
        { label: t("todo.deadline"), value: `${overdueCount}/${soonCount}`, variant: overdueCount ? "danger" : "warning" },
        { label: "Open items", value: `${openItemsCount}`, variant: "cyan" },
        { label: "Linked", value: `${linkedCount}`, variant: "success" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportMarkdown}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--brse-hairline-border)]/25 bg-surface/50 backdrop-blur-md px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary/40"
          >
            <Download className="h-4 w-4" />
            {t("todo.export")}
          </button>
          <button
            onClick={resetChecklist}
            className="inline-flex items-center gap-2 rounded-lg border border-vermilion/30 bg-vermilion/10 px-4 py-2.5 text-sm font-semibold text-vermilion hover:bg-vermilion/15"
          >
            <RotateCcw className="h-4 w-4" />
            {t("todo.reset")}
          </button>
          <button
            onClick={saveSnapshot}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/25"
          >
            <Save className="h-4 w-4" />
            {t("todo.save")}
          </button>
        </div>
      }
    />
  );
}
