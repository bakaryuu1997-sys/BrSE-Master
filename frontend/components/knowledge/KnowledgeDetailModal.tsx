"use client";

import { Edit3, X } from "lucide-react";
import dynamic from "next/dynamic";
import { type KnowledgeItem } from "@/lib/knowledge";
import type { TranslationKey } from "@/lib/uiLanguage";

const ReactMarkdown = dynamic(
  () => import("react-markdown"),
  { ssr: false }
);

interface KnowledgeDetailModalProps {
  item: KnowledgeItem | null;
  onClose: () => void;
  onEdit: (item: KnowledgeItem) => void;
  selectedReferences: string[];
  t: (key: TranslationKey) => string;
}

export function KnowledgeDetailModal({
  item,
  onClose,
  onEdit,
  selectedReferences,
  t,
}: KnowledgeDetailModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="relative max-h-[82vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--brse-panel-border)] bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--brse-panel-border)] p-5">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              {item.category}
            </div>
            <h2 className="text-xl font-bold text-ink">{item.title}</h2>
            <p className="mt-1 text-xs text-textMuted">
              {item.project_id} · {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--brse-panel-border)] bg-background/70 p-2 text-textMuted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[58vh] overflow-y-auto p-5">
          <div className="prose prose-invert prose-p:text-ink prose-headings:text-ink max-w-none text-sm leading-7 font-sans">
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>
          {selectedReferences.length ? (
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">References / backlinks</p>
              <div className="mt-3 grid gap-2">
                {selectedReferences.map((reference) => (
                  <p key={reference} className="break-all rounded-lg border border-[var(--brse-panel-border)] bg-background/60 px-3 py-2 text-xs text-ink">
                    {reference}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--brse-panel-border)] p-4">
          <button
            onClick={() => {
              onEdit(item);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--brse-panel-border)] px-4 py-2 text-sm font-semibold text-textMuted hover:border-primary/40 hover:text-ink"
          >
            <Edit3 className="h-4 w-4" />
            {t("knowledge.edit")}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            {t("knowledge.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
