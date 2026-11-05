import { BookOpen, Edit3, Eye, Trash2 } from "lucide-react";

import { SkeletonCard } from "@/components/PageHeader";
import { useUiLanguage } from "@/components/LanguageProvider";
import type { KnowledgeItem } from "@/lib/knowledge";

type KnowledgeDocumentListProps = {
  isLoading: boolean;
  visibleItemCount: number;
  paginatedItems: KnowledgeItem[];
  searchQuery: string;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (updater: (page: number) => number) => void;
  onCreate: () => void;
  onView: (item: KnowledgeItem) => void;
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (id: number) => void;
  t: ReturnType<typeof useUiLanguage>["t"];
};

function tokenizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9ぁ-んァ-ン一-龥]+/i)
    .filter((token) => token.length >= 2);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(value: string, query: string) {
  const tokens = tokenizeSearch(query);
  if (!tokens.length) return value;
  const matcher = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "ig");
  return value.split(matcher).map((part, index) =>
    tokens.some((token) => token.toLowerCase() === part.toLowerCase()) ? (
      <mark key={`${part}-${index}`} className="rounded bg-primary/20 px-1 text-primary">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function categoryBadgeClass(category: string) {
  if (category === "spec") return "bg-orange-500/20 text-orange-400";
  if (category === "design") return "bg-orange-500/20 text-orange-400";
  if (category === "process") return "bg-emerald-500/20 text-emerald-400";
  return "bg-slate-500/20 text-slate-400";
}

export function KnowledgeDocumentList({
  isLoading,
  visibleItemCount,
  paginatedItems,
  searchQuery,
  currentPage,
  totalPages,
  setCurrentPage,
  onCreate,
  onView,
  onEdit,
  onDelete,
  t,
}: KnowledgeDocumentListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={3} />
        <SkeletonCard rows={5} />
      </div>
    );
  }

  if (visibleItemCount === 0) {
    return (
      <div className="brse-section flex flex-col items-center justify-center border-dashed py-12">
        <BookOpen className="mb-3 h-10 w-10 text-border" />
        <p className="text-sm font-semibold text-ink">{t("knowledge.empty")}</p>
        <p className="mt-1 text-xs text-textMuted">{t("knowledge.emptyHint")}</p>
        <button onClick={onCreate} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all">
          + {t("knowledge.addFirst")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {paginatedItems.map((item) => (
          <div
            key={item.id}
            className="brse-section group relative overflow-hidden p-4 transition-all animate-in fade-in duration-300 hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          >
            <div className={`absolute right-0 top-0 rounded-bl-xl px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryBadgeClass(item.category)}`}>
              {item.category}
            </div>
            <h3 className="mb-1.5 pr-16 line-clamp-1 text-base font-bold text-ink">{highlightMatches(item.title, searchQuery)}</h3>
            <p className="mb-4 line-clamp-3 text-xs leading-relaxed text-textMuted">
              {highlightMatches(item.content, searchQuery)}
            </p>
            <div className="mt-auto flex items-center justify-between border-t border-[var(--brse-hairline-border)] pt-3">
              <span className="font-mono text-[10px] uppercase text-textMuted">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => onView(item)}
                  className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
                  title={t("knowledge.viewDetail")}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onEdit(item)}
                  className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-cyan/10 hover:text-cyan"
                  title={t("knowledge.edit")}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-red-400/10 hover:text-red-400"
                  title={t("knowledge.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="rounded-xl border border-[var(--brse-panel-border)] bg-surface px-4 py-2 text-xs font-semibold text-textMuted transition hover:border-primary/20 hover:text-ink active:scale-95 disabled:opacity-35"
          >
            {t("common.prev")}
          </button>
          <span className="px-3 text-xs font-bold text-textMuted">
            {t("common.pageIndicator").replace("{page}", String(currentPage)).replace("{total}", String(totalPages))}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            className="rounded-xl border border-[var(--brse-panel-border)] bg-surface px-4 py-2 text-xs font-semibold text-textMuted transition hover:border-primary/20 hover:text-ink active:scale-95 disabled:opacity-35"
          >
            {t("common.next")}
          </button>
        </div>
      ) : null}
    </>
  );
}