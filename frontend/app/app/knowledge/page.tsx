"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { KnowledgeDocumentList } from "@/components/knowledge/KnowledgeDocumentList";
import { KnowledgeInsightRail } from "@/components/knowledge/KnowledgeInsightRail";
import { KnowledgeListControls } from "@/components/knowledge/KnowledgeListControls";
import { KnowledgeQaPanel } from "@/components/knowledge/KnowledgeQaPanel";
import { KnowledgeEditorModal } from "@/components/knowledge/KnowledgeEditorModal";
import { KnowledgeDetailModal } from "@/components/knowledge/KnowledgeDetailModal";
import { PageHeader } from "@/components/PageHeader";
import {
  askKnowledge,
  deleteKnowledgeItem,
  listKnowledge,
  saveKnowledgeItem,
  type KnowledgeItem,
} from "@/lib/knowledge";
import { ACTIVE_PROJECT_CHANGED_EVENT, getActiveProject, type ProjectSetting } from "@/lib/projectSettings";
import { extractReferences, sortKnowledgeByRank } from "@/lib/knowledgeSearch";

export default function KnowledgePage() {
  const { t } = useUiLanguage();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"list" | "qa">("list");
  const [notice, setNotice] = useState<{ text: string; kind: "success" | "error" | "info" } | null>(null);

  // Q&A State
  const [qaInput, setQaInput] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("spec");

  const [activeProject, setActiveProject] = useState<ProjectSetting | null>(() => getActiveProject());
  const activeProjectId = activeProject?.id;
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items]);
  const visibleItems = useMemo(() => {
    const filtered = categoryFilter === "all" ? items : items.filter((item) => item.category === categoryFilter);
    const query = searchQuery.trim();
    if (!query) {
      return [...filtered].sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime());
    }
    return sortKnowledgeByRank(filtered, query);
  }, [categoryFilter, items, searchQuery]);
  const backlinkCount = useMemo(() => {
    return items.reduce((count, item) => count + (item.content.match(/\[\[[^\]]+\]\]|https?:\/\/\S+/g)?.length ?? 0), 0);
  }, [items]);
  const selectedReferences = useMemo(() => selectedItem ? extractReferences(selectedItem.content) : [], [selectedItem]);

  // Pagination
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(
    () => visibleItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [visibleItems, currentPage]
  );
  // Reset to page 1 when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const notify = useCallback((text: string, kind: "success" | "error" | "info" = "success") => {
    setNotice(text ? { text, kind } : null);
  }, []);

  // Auto-dismiss the notice so it doesn't linger forever.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const loadKnowledge = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listKnowledge(activeProjectId);
      setItems(data);
    } catch (err) {
      console.error("Failed to load knowledge:", err);
      notify(err instanceof Error ? err.message : t("knowledge.loadFailed"), "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, notify, t]);

  function resetModal() {
    setEditingId(null);
    setNewTitle("");
    setNewContent("");
    setNewCategory("spec");
  }

  function openCreateModal() {
    resetModal();
    setIsModalOpen(true);
  }

  function openEditModal(item: KnowledgeItem) {
    setEditingId(item.id);
    setNewTitle(item.title);
    setNewContent(item.content);
    setNewCategory(item.category);
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!newTitle.trim() || !newContent.trim()) return;
    
    try {
      await saveKnowledgeItem({
        id: editingId ?? undefined,
        title: newTitle,
        content: newContent,
        category: newCategory,
        projectId: activeProjectId || "default",
      });
      setIsModalOpen(false);
      resetModal();
      notify(editingId ? t("knowledge.updated") : t("knowledge.saved"), "success");
      loadKnowledge();
    } catch (err) {
      console.error("Failed to add knowledge:", err);
      notify(err instanceof Error ? err.message : t("knowledge.saveFailed"), "error");
    }
  }

  useEffect(() => {
    loadKnowledge();
  }, [loadKnowledge]);

  useEffect(() => {
    function handleProjectChange() {
      setActiveProject(getActiveProject());
      setSelectedItem(null);
      setCategoryFilter("all");
    }

    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
  }, []);

  async function handleDelete(id: number) {
    const ok = await confirm({ type: "danger", message: t("knowledge.deleteConfirm") });
    if (!ok) return;
    try {
      await deleteKnowledgeItem(id);
      setSelectedItem((current) => (current?.id === id ? null : current));
      notify(t("knowledge.deleted"), "success");
      loadKnowledge();
    } catch (err) {
      console.error("Failed to delete knowledge:", err);
      notify(err instanceof Error ? err.message : t("knowledge.deleteFailed"), "error");
    }
  }

  async function handleAskAi() {
    if (!qaInput.trim()) return;
    setIsAnswering(true);
    setQaAnswer("");
    try {
      const answer = await askKnowledge(qaInput, activeProject?.id);
      setQaAnswer(answer);
    } catch (err) {
      console.error("AI Q&A failed:", err);
      notify(err instanceof Error ? err.message : t("knowledge.askAiFailed"), "error");
    } finally {
      setIsAnswering(false);
    }
  }

  async function handleSaveQaAnswer() {
    if (!qaAnswer.trim()) return;
    try {
      await saveKnowledgeItem({
        title: qaInput.trim() || t("knowledge.aiAnswerTitle"),
        content: qaAnswer,
        category: "qa",
        projectId: activeProjectId || "default",
      });
      notify(t("knowledge.aiSaved"), "success");
      setActiveTab("list");
      loadKnowledge();
    } catch (err) {
      console.error("Failed to save AI answer:", err);
      notify(err instanceof Error ? err.message : t("knowledge.saveAiAnswerFailed"), "error");
    }
  }

  return (
    <main className="brse-page">
      <PageHeader
        badge="Knowledge"
        title={t("knowledge.title")}
        description={t("knowledge.body")}
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {t("knowledge.add")}
          </button>
        }
        stats={[
          { label: t("knowledge.docs"), value: items.length },
          { label: t("knowledge.categories"), value: categories.length, variant: "primary" },
          { label: t("knowledge.links"), value: backlinkCount, variant: "success" },
        ]}
      >
        <div className="scene-art hidden lg:block">
          <div className="scene-link right-24 top-16 w-40 rotate-[22deg]" />
          <div className="scene-link right-28 top-28 w-36 -rotate-[18deg]" />
          <div className="scene-link right-10 top-24 w-28 rotate-[12deg]" />
          <span className="scene-node right-64 top-12" />
          <span className="scene-node right-28 top-24" />
          <span className="scene-node right-10 top-16" />
          <span className="scene-node right-20 top-36" />
          <div className="scene-panel right-8 bottom-6 w-56 p-4">
            <span className="scene-kicker">{t("knowledge.graph")}</span>
            <p className="mt-3 text-sm font-semibold text-ink">{backlinkCount} {t("knowledge.backlinks")}</p>
            <p className="mt-1 text-xs leading-5 text-textMuted">{t("knowledge.graphDesc")}</p>
          </div>
        </div>
      </PageHeader>

      <KnowledgeInsightRail
        itemCount={items.length}
        categoryCount={categories.length}
        backlinkCount={backlinkCount}
        visibleItemCount={visibleItems.length}
        searchQuery={searchQuery}
        t={t}
      />

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
            notice.kind === "error"
              ? "border-vermilion/25 bg-vermilion/10 text-vermilion"
              : notice.kind === "success"
              ? "border-matcha/25 bg-matcha/10 text-matcha"
              : "border-primary/25 bg-primary/10 text-primary"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <KnowledgeListControls
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        itemCount={items.length}
        categories={categories}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        t={t}
      />

      {activeTab === "list" && (
        <div className="space-y-6">
          <KnowledgeDocumentList
            isLoading={isLoading}
            visibleItemCount={visibleItems.length}
            paginatedItems={paginatedItems}
            searchQuery={searchQuery}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            onCreate={openCreateModal}
            onView={setSelectedItem}
            onEdit={openEditModal}
            onDelete={handleDelete}
            t={t}
          />
        </div>
      )}

      {activeTab === "qa" && (
        <KnowledgeQaPanel
          qaInput={qaInput}
          setQaInput={setQaInput}
          qaAnswer={qaAnswer}
          isAnswering={isAnswering}
          onAskAi={handleAskAi}
          onSaveQaAnswer={handleSaveQaAnswer}
          t={t}
        />
      )}

      <KnowledgeEditorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetModal();
        }}
        editingId={editingId}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newContent={newContent}
        setNewContent={setNewContent}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        activeProjectName={activeProject?.name || "Global"}
        onSave={handleSave}
        t={t}
      />

      <KnowledgeDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => {
          openEditModal(item);
          setSelectedItem(null);
        }}
        selectedReferences={selectedReferences}
        t={t}
      />
    </main>
  );
}
