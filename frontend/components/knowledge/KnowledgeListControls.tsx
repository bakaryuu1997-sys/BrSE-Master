import type { Dispatch, SetStateAction } from "react";
import { Bot, Layers, Search } from "lucide-react";

import { useUiLanguage } from "@/components/LanguageProvider";

type KnowledgeListControlsProps = {
  activeTab: "list" | "qa";
  setActiveTab: Dispatch<SetStateAction<"list" | "qa">>;
  itemCount: number;
  categories: string[];
  categoryFilter: string;
  setCategoryFilter: Dispatch<SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  t: ReturnType<typeof useUiLanguage>["t"];
};

export function KnowledgeListControls({
  activeTab,
  setActiveTab,
  itemCount,
  categories,
  categoryFilter,
  setCategoryFilter,
  searchQuery,
  setSearchQuery,
  t,
}: KnowledgeListControlsProps) {
  return (
    <>
      <div className="mb-6 mt-6 flex gap-1 border-b border-[var(--brse-panel-border)]">
        <button
          onClick={() => setActiveTab("list")}
          className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
            activeTab === "list" ? "text-primary" : "text-textMuted hover:text-ink"
          }`}
        >
          <Layers className="h-4 w-4" />
          {t("knowledge.docs")} ({itemCount})
          {activeTab === "list" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_var(--primary)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("qa")}
          className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
            activeTab === "qa" ? "text-primary" : "text-textMuted hover:text-ink"
          }`}
        >
          <Bot className="h-4 w-4" />
          {t("knowledge.aiQa")}
          {activeTab === "qa" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_var(--primary)]" />
          )}
        </button>
      </div>

      {activeTab === "list" ? (
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
            <input
              type="text"
              placeholder={t("knowledge.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="field-control w-full px-10 py-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                categoryFilter === "all"
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-[var(--brse-panel-border)] bg-surface text-textMuted hover:text-ink"
              }`}
            >
              {t("knowledge.allCategories")}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  categoryFilter === category
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-[var(--brse-panel-border)] bg-surface text-textMuted hover:text-ink"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}