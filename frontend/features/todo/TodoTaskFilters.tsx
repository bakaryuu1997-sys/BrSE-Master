"use client";

import type { FilterMode } from "./useTodoProjectSync";

interface TodoTaskFiltersProps {
  t: any;
  filter: FilterMode;
  setFilter: (filter: FilterMode) => void;
}

export function TodoTaskFilters({ t, filter, setFilter }: TodoTaskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {(["all", "focus", "todo", "done", "p0", "deadline"] as FilterMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => setFilter(mode)}
          className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
            filter === mode
              ? "border-primary/40 bg-primary/20 text-primary font-bold shadow-sm"
              : "border-[var(--brse-panel-border)] bg-background/50 text-textMuted hover:text-ink hover:border-primary/30"
          }`}
        >
          {mode === "all"
            ? t("todo.all")
            : mode === "focus"
              ? "Focus"
              : mode === "todo"
                ? t("todo.todo")
                : mode === "done"
                  ? t("todo.done")
                  : mode === "deadline"
                    ? t("todo.deadline")
                    : "P0"}
        </button>
      ))}
    </div>
  );
}
