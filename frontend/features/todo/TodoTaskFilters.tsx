"use client";

import type { FilterMode } from "./useTodoProjectSync";

interface TodoTaskFiltersProps {
  t: any;
  filter: FilterMode;
  setFilter: (filter: FilterMode) => void;
}

export function TodoTaskFilters({ t, filter, setFilter }: TodoTaskFiltersProps) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {(["all", "focus", "todo", "done", "p0", "deadline"] as FilterMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => setFilter(mode)}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
            filter === mode
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-[var(--brse-panel-border)] bg-background text-textMuted hover:text-ink"
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
