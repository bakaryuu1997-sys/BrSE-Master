"use client";

import { useCallback, useEffect, useState } from "react";

// --- Widget registry ---

export type WidgetId =
  | "morningBrief"
  | "metricCards"
  | "commandIntelligence"
  | "weekPlanner"
  | "todayTimeline"
  | "keigoComposer"
  | "glossarySearch"
  | "activityStream"
  | "communicationPulse"
  | "projectOverview";

export interface WidgetMeta {
  id: WidgetId;
  label: string;
  emoji: string;
  /** Which layout column it naturally belongs to */
  column: "left" | "right" | "top";
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  { id: "metricCards", label: "Metric Cards", emoji: "📊", column: "top" },
  { id: "projectOverview", label: "Project Overview", emoji: "📁", column: "top" },
  { id: "commandIntelligence", label: "Command Intelligence Board", emoji: "🎯", column: "left" },
  { id: "weekPlanner", label: "Week Planner", emoji: "📅", column: "left" },
  { id: "todayTimeline", label: "Today Timeline", emoji: "⏰", column: "left" },
  { id: "morningBrief", label: "Morning Brief", emoji: "☀️", column: "right" },
  { id: "communicationPulse", label: "Communication Pulse", emoji: "💬", column: "right" },
  { id: "activityStream", label: "Activity Stream", emoji: "📋", column: "right" },
  { id: "glossarySearch", label: "Live Glossary Search", emoji: "📖", column: "right" },
  { id: "keigoComposer", label: "Keigo Composer", emoji: "✉️", column: "right" },
];

// --- localStorage keys ---

const LS_VISIBILITY = "brse.dashboard.widgets";
const LS_ORDER = "brse.dashboard.widgetOrder";

// --- Types ---

export type WidgetVisibility = Record<WidgetId, boolean>;

// --- Defaults ---

function defaultVisibility(): WidgetVisibility {
  return WIDGET_REGISTRY.reduce<WidgetVisibility>((visibility, widget) => {
    visibility[widget.id] = true;
    return visibility;
  }, {} as WidgetVisibility);
}

function defaultOrder(): WidgetId[] {
  return WIDGET_REGISTRY.map((w) => w.id);
}

// --- Read helpers ---

function readVisibility(): WidgetVisibility {
  try {
    const raw = localStorage.getItem(LS_VISIBILITY);
    if (!raw) return defaultVisibility();
    const parsed = JSON.parse(raw) as Partial<WidgetVisibility>;
    const result = defaultVisibility();
    for (const key of Object.keys(result) as WidgetId[]) {
      if (typeof parsed[key] === "boolean") result[key] = parsed[key]!;
    }
    return result;
  } catch {
    return defaultVisibility();
  }
}

function readOrder(): WidgetId[] {
  try {
    const raw = localStorage.getItem(LS_ORDER);
    if (!raw) return defaultOrder();
    const parsed = JSON.parse(raw) as WidgetId[];
    // Validate: ensure all known IDs are present
    const known = new Set<WidgetId>(WIDGET_REGISTRY.map((w) => w.id));
    const valid = parsed.filter((id) => known.has(id));
    // Append any missing
    for (const w of WIDGET_REGISTRY) {
      if (!valid.includes(w.id)) valid.push(w.id);
    }
    return valid;
  } catch {
    return defaultOrder();
  }
}

// --- Hook ---

export function useDashboardConfig() {
  const [visibility, setVisibility] = useState<WidgetVisibility>(defaultVisibility);
  const [order, setOrder] = useState<WidgetId[]>(defaultOrder);
  const [loaded, setLoaded] = useState(true);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setVisibility(readVisibility());
    setOrder(readOrder());
    setLoaded(true);
  }, []);

  const toggleWidget = useCallback((id: WidgetId) => {
    setVisibility((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(LS_VISIBILITY, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveWidget = useCallback((id: WidgetId, direction: "up" | "down") => {
    setOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      localStorage.setItem(LS_ORDER, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    const vis = defaultVisibility();
    const ord = defaultOrder();
    setVisibility(vis);
    setOrder(ord);
    localStorage.setItem(LS_VISIBILITY, JSON.stringify(vis));
    localStorage.setItem(LS_ORDER, JSON.stringify(ord));
  }, []);

  const isVisible = useCallback(
    (id: WidgetId) => visibility[id] !== false,
    [visibility]
  );

  /** Return ordered widget metas filtered by column */
  const getOrderedWidgets = useCallback(
    (column: WidgetMeta["column"]) => {
      return order
        .map((id) => WIDGET_REGISTRY.find((w) => w.id === id))
        .filter((w): w is WidgetMeta => Boolean(w))
        .filter((w) => w.column === column);
    },
    [order]
  );

  return {
    visibility,
    order,
    loaded,
    toggleWidget,
    moveWidget,
    resetConfig,
    isVisible,
    getOrderedWidgets,
  };
}
