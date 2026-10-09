"use client";

import React from "react";
import {
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGET_REGISTRY,
  type WidgetId,
  type WidgetVisibility,
} from "./useDashboardConfig";
import type { TranslationKey } from "@/lib/uiLanguage";

interface DashboardCustomizerProps {
  open: boolean;
  onClose: () => void;
  visibility: WidgetVisibility;
  order: WidgetId[];
  onToggle: (id: WidgetId) => void;
  onMove: (id: WidgetId, dir: "up" | "down") => void;
  onReset: () => void;
  t: (key: TranslationKey) => string;
}

const WIDGET_LABEL_KEYS: Record<WidgetId, TranslationKey> = {
  metricCards: "dashboard.widgetMetricCards",
  projectOverview: "dashboard.widgetProjectOverview",
  commandIntelligence: "dashboard.widgetCommandIntelligence",
  weekPlanner: "dashboard.widgetWeekPlanner",
  todayTimeline: "dashboard.widgetTodayTimeline",
  morningBrief: "dashboard.widgetMorningBrief",
  communicationPulse: "dashboard.widgetCommunicationPulse",
  activityStream: "dashboard.widgetActivityStream",
  glossarySearch: "dashboard.widgetGlossarySearch",
  keigoComposer: "dashboard.widgetKeigoComposer",
};

const COLUMN_LABEL_KEYS: Record<string, TranslationKey> = {
  top: "dashboard.columnTop",
  left: "dashboard.columnLeft",
  right: "dashboard.columnRight",
};

export function DashboardCustomizer({
  open,
  onClose,
  visibility,
  order,
  onToggle,
  onMove,
  onReset,
  t,
}: DashboardCustomizerProps) {
  // Sorted list of widgets by order
  const sortedWidgets = order
    .map((id) => WIDGET_REGISTRY.find((w) => w.id === id)!)
    .filter(Boolean);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[280] bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-[290] flex h-full w-full max-w-md flex-col border-l transition-transform duration-300 ease-out",
          "border-[var(--brse-panel-border)]",
          "bg-[linear-gradient(180deg,rgba(15,20,40,0.97),rgba(8,13,28,0.98))]",
          "backdrop-blur-xl",
          open ? "translate-x-0" : "translate-x-full"
        )}
          role="dialog"
          aria-label={t("dashboard.customizerAria")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--brse-panel-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black text-textPrimary">
              {t("dashboard.widgetCustomizer")}
              </h2>
              <p className="text-[10px] font-bold text-textMuted">
              {t("dashboard.customizerSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="brse-button h-8 w-8 !min-h-0 !p-0"
            aria-label={t("dashboard.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-1.5">
            {sortedWidgets.map((widget, index) => {
              const isOn = visibility[widget.id] !== false;
              const widgetLabel = t(WIDGET_LABEL_KEYS[widget.id]);
              const columnLabel = t(COLUMN_LABEL_KEYS[widget.column] ?? "dashboard.columnUnknown");
              return (
                <div
                  key={widget.id}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200",
                    isOn
                      ? "border-[var(--brse-panel-border)] bg-white/[0.03]"
                      : "border-transparent bg-white/[0.01] opacity-50"
                  )}
                >
                  {/* Emoji */}
                  <span className="text-base leading-none select-none">
                    {widget.emoji}
                  </span>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "truncate text-xs font-bold transition-colors",
                        isOn ? "text-textPrimary" : "text-textMuted"
                      )}
                    >
                      {widgetLabel}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-textMuted/60">
                      {columnLabel}
                    </p>
                  </div>

                  {/* Move buttons */}
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => onMove(widget.id, "up")}
                      disabled={index === 0}
                      className="rounded-md p-1 text-textMuted transition hover:bg-white/[0.06] hover:text-textPrimary disabled:opacity-25"
                      aria-label={`${t("dashboard.moveWidgetUp")} ${widgetLabel}`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onMove(widget.id, "down")}
                      disabled={index === sortedWidgets.length - 1}
                      className="rounded-md p-1 text-textMuted transition hover:bg-white/[0.06] hover:text-textPrimary disabled:opacity-25"
                      aria-label={`${t("dashboard.moveWidgetDown")} ${widgetLabel}`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => onToggle(widget.id)}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all",
                      isOn
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-[var(--brse-panel-border)] bg-white/[0.02] text-textMuted"
                    )}
                    aria-label={`${isOn ? t("dashboard.hideWidget") : t("dashboard.showWidget")} ${widgetLabel}`}
                  >
                    {isOn ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--brse-panel-border)] px-5 py-3">
          <button
            onClick={onReset}
            className="brse-button w-full justify-center gap-2 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("dashboard.resetDefault")}
          </button>
        </div>
      </div>
    </>
  );
}
