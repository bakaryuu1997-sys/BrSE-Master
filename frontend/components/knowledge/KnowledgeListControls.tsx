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
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--brse-panel-border)]/45 pb-1.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("list")}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "list" ? "text-primary font-bold" : "text-textMuted hover:text-ink"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            {t("knowledge.docs")} ({itemCount})
            {activeTab === "list" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_var(--primary)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("qa")}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "qa" ? "text-primary font-bold" : "text-textMuted hover:text-ink"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            {t("knowledge.aiQa")}
            {activeTab === "qa" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_var(--primary)]" />
            )}
          </button>
        </div>

        {activeTab === "list" ? (
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end max-w-xl">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textMuted" />
              <input
                type="text"
                placeholder={t("knowledge.searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="field-control w-full pl-8 pr-2.5 py-1 text-xs"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="field-control py-1 px-2.5 text-xs shrink-0"
            >
              <option value="all">{t("knowledge.allCategories")}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}