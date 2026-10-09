"use client";

import { X, Bot, Loader2, Sparkles } from "lucide-react";

interface ReportsAiRefinerModalProps {
  t: any;
  isAiModalOpen: boolean;
  setIsAiModalOpen: (open: boolean) => void;
  aiBulletPoints: string;
  setAiBulletPoints: (val: string) => void;
  generateWithAI: () => void;
  isGeneratingAi: boolean;
}

export function ReportsAiRefinerModal({
  t,
  isAiModalOpen,
  setIsAiModalOpen,
  aiBulletPoints,
  setAiBulletPoints,
  generateWithAI,
  isGeneratingAi,
}: ReportsAiRefinerModalProps) {
  if (!isAiModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="brse-section relative w-full max-w-lg p-6 shadow-2xl bg-surface border border-[var(--brse-panel-border)] rounded-xl">
        <button
          onClick={() => setIsAiModalOpen(false)}
          className="absolute right-4 top-4 text-textMuted hover:text-ink transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/15 border border-orange-500/30">
            <Bot className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-display font-semibold text-ink">{t("reports.aiModalTitle")}</h3>
            <p className="text-xs text-textMuted">{t("reports.aiModalBody")}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">
              {t("reports.aiMemo")}
            </label>
            <textarea
              rows={5}
              placeholder={t("reports.aiMemoPlaceholder")}
              value={aiBulletPoints}
              onChange={(e) => setAiBulletPoints(e.target.value)}
              className="w-full rounded-md border border-[var(--brse-panel-border)] bg-background px-3 py-2 text-sm text-ink focus:border-orange-500/50 focus:outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsAiModalOpen(false)}
              className="rounded-md border border-[var(--brse-panel-border)] px-4 py-2 text-sm font-semibold text-textMuted hover:text-ink transition-colors"
            >
              {t("reports.cancel")}
            </button>
            <button
              onClick={generateWithAI}
              disabled={!aiBulletPoints.trim() || isGeneratingAi}
              className="flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50 transition-colors"
            >
              {isGeneratingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("reports.aiRun")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
