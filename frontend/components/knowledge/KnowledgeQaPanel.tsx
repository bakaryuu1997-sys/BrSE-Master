"use client";

import { Bot, Loader2, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import type { TranslationKey } from "@/lib/uiLanguage";

const ReactMarkdown = dynamic(
  () => import("react-markdown"),
  { ssr: false }
);

interface KnowledgeQaPanelProps {
  qaInput: string;
  setQaInput: (val: string) => void;
  qaAnswer: string;
  isAnswering: boolean;
  onAskAi: () => void;
  onSaveQaAnswer: () => void;
  t: (key: TranslationKey) => string;
}

export function KnowledgeQaPanel({
  qaInput,
  setQaInput,
  qaAnswer,
  isAnswering,
  onAskAi,
  onSaveQaAnswer,
  t,
}: KnowledgeQaPanelProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl border border-[var(--brse-panel-border)] bg-surface p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bot className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-ink">{t("knowledge.askAiTitle")}</h2>
        </div>
        
        <div className="relative">
          <textarea
            rows={4}
            value={qaInput}
            onChange={(e) => setQaInput(e.target.value)}
            placeholder={t("knowledge.askPlaceholder")}
            className="w-full rounded-xl border border-[var(--brse-panel-border)] bg-background px-4 py-4 text-sm text-ink outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none"
          />
          <button
            onClick={onAskAi}
            disabled={!qaInput.trim() || isAnswering}
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
          >
            {isAnswering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("knowledge.askAi")}
          </button>
        </div>
      </div>

      {qaAnswer && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <Bot className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-wider">AI Assistant</span>
          </div>
          <div className="prose prose-invert max-w-none text-ink leading-relaxed whitespace-pre-wrap">
            <ReactMarkdown>{qaAnswer}</ReactMarkdown>
          </div>
          <button
            type="button"
            onClick={onSaveQaAnswer}
            className="mt-5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15"
          >
            {t("knowledge.saveAiAnswer")}
          </button>
        </div>
      )}
    </div>
  );
}
