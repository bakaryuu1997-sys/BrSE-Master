"use client";

import { X } from "lucide-react";
import type { TranslationKey } from "@/lib/uiLanguage";

interface KnowledgeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId: number | null;
  newTitle: string;
  setNewTitle: (val: string) => void;
  newContent: string;
  setNewContent: (val: string) => void;
  newCategory: string;
  setNewCategory: (val: string) => void;
  activeProjectName: string;
  onSave: () => void;
  t: (key: TranslationKey) => string;
}

export function KnowledgeEditorModal({
  isOpen,
  onClose,
  editingId,
  newTitle,
  setNewTitle,
  newContent,
  setNewContent,
  newCategory,
  setNewCategory,
  activeProjectName,
  onSave,
  t,
}: KnowledgeEditorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--brse-panel-border)] bg-surface p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-textMuted hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-bold text-ink mb-6">
          {editingId ? t("knowledge.editDocument") : t("knowledge.newDocument")}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-textMuted mb-1.5 tracking-wider">{t("knowledge.docTitle")}</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t("knowledge.titleExample")}
              className="w-full rounded-lg border border-[var(--brse-panel-border)] bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-textMuted mb-1.5 tracking-wider">{t("knowledge.category")}</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-lg border border-[var(--brse-panel-border)] bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-primary/50"
              >
                <option value="spec">Specification</option>
                <option value="design">Design</option>
                <option value="process">Process</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-textMuted mb-1.5 tracking-wider">{t("knowledge.project")}</label>
              <input
                type="text"
                disabled
                value={activeProjectName || "Global"}
                className="w-full rounded-lg border border-[var(--brse-panel-border)] bg-background/50 px-4 py-2.5 text-sm text-textMuted outline-none"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase text-textMuted mb-1.5 tracking-wider">{t("knowledge.content")}</label>
            <textarea
              rows={8}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t("knowledge.contentPlaceholder")}
              className="w-full rounded-lg border border-[var(--brse-panel-border)] bg-background px-4 py-3 text-sm text-ink outline-none focus:border-primary/50 resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-textMuted hover:text-ink"
            >
              {t("knowledge.cancel")}
            </button>
            <button
              onClick={onSave}
              className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
              {editingId ? t("knowledge.update") : t("knowledge.saveDocument")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
