"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, UploadCloud, FileUp, Loader2 } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { KnowledgeDocumentList } from "@/components/knowledge/KnowledgeDocumentList";
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
import { apiBaseUrl } from "@/lib/config";
import { useProjectContext } from "@/components/ProjectContextProvider";
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
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

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

  const { activeProject } = useProjectContext();
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

  // Reset selection/filter when the user switches project (not on first mount).
  const lastProjectId = useRef(activeProject?.id);
  useEffect(() => {
    if (lastProjectId.current === activeProject?.id) return;
    lastProjectId.current = activeProject?.id;
    setSelectedItem(null);
    setCategoryFilter("all");
  }, [activeProject?.id]);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    setIsUploadingFiles(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const category = ["sql", "db"].includes(ext)
          ? "database"
          : ["api", "json", "yaml", "yml"].includes(ext)
          ? "api"
          : ["qa", "faq"].includes(ext)
          ? "qa"
          : categoryFilter !== "all"
          ? categoryFilter
          : "spec";

        let content = "";
        if (file.type.startsWith("text/") || ["md", "txt", "json", "yaml", "yml", "sql", "csv", "ts", "js", "py"].includes(ext)) {
          content = await file.text();
        } else {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch(`${apiBaseUrl}/memos/images`, { method: "POST", body: formData });
          if (res.ok) {
            const data = await res.json();
            content = `File đính kèm: [${file.name}](${data.url})\n\nKích thước: ${(file.size / 1024).toFixed(1)} KB\nĐịnh dạng: ${file.type || ext.toUpperCase()}`;
          } else {
            content = `Tài liệu: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
          }
        }

        await saveKnowledgeItem({
          title: file.name.replace(/\.[^/.]+$/, ""),
          content: content || `Tài liệu ${file.name}`,
          category,
          projectId: activeProjectId || "default",
        });
        successCount++;
      } catch (err) {
        console.error("Drop file error:", err);
      }
    }

    setIsUploadingFiles(false);
    if (successCount > 0) {
      notify(`Đã nhập thành công ${successCount} tài liệu vào Kho Tri thức!`, "success");
      loadKnowledge();
    } else {
      notify("Không thể nhập tệp đính kèm.", "error");
    }
  };

  return (
    <main
      className="brse-page relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md border-4 border-dashed border-primary pointer-events-none">
          <UploadCloud className="h-16 w-16 text-primary animate-bounce mb-3" />
          <p className="text-xl font-bold text-ink">Thả tệp vào đây để tải vào Kho Tri thức</p>
          <p className="text-xs text-textMuted mt-1">Hỗ trợ đa tệp Markdown, Text, PDF, Docs, Code, Database Spec...</p>
        </div>
      )}
      {isUploadingFiles && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
          <p className="text-sm font-bold text-ink">Đang tải và xử lý các tệp tài liệu...</p>
        </div>
      )}
      <PageHeader
        compact
        badge="Knowledge"
        title={t("knowledge.title")}
        className="mb-2"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              {items.length} {t("knowledge.docs")}
            </span>
            <span className="rounded-lg border border-cyan/25 bg-cyan/10 px-2.5 py-1 text-xs font-bold text-cyan">
              {categories.length} {t("knowledge.categories")}
            </span>
            <span className="rounded-lg border border-matcha/25 bg-matcha/10 px-2.5 py-1 text-xs font-bold text-matcha">
              {backlinkCount} {t("knowledge.links")}
            </span>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-primary/20 hover:bg-primaryHover transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("knowledge.add")}
            </button>
          </div>
        }
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
