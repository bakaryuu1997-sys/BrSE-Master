"use client";

import { useState } from "react";
import { CircleDot, X, MessageSquareWarning, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiLanguage } from "@/components/LanguageProvider";

export interface MindMapNode {
  id: string;
  title: string;
  level: number;
  children: MindMapNode[];
}

export type NodeStatusType = "clear" | "discussing" | "pending";

export interface NodeState {
  status: NodeStatusType;
  question?: string;
}

export const STATUS_CONFIG: Record<
  NodeStatusType,
  {
    label: string;
    labelJa: string;
    color: string;
    bgClass: string;
    borderClass: string;
    dotClass: string;
  }
> = {
  clear: {
    label: "Clear ✅",
    labelJa: "確認済み",
    color: "emerald",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    dotClass: "bg-emerald-400",
  },
  discussing: {
    label: "Discussing 💬",
    labelJa: "検討中",
    color: "amber",
    bgClass: "bg-amber-400/10",
    borderClass: "border-amber-400/30",
    dotClass: "bg-amber-400",
  },
  pending: {
    label: "Pending ❓",
    labelJa: "要確認",
    color: "rose",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/30",
    dotClass: "bg-rose-500",
  },
};

export function NodeEditModal({
  node,
  currentState,
  onSave,
  onClose,
}: {
  node: MindMapNode;
  currentState: NodeState | undefined;
  onSave: (nodeId: string, state: NodeState) => void;
  onClose: () => void;
}) {
  const { t } = useUiLanguage();
  const [selectedStatus, setSelectedStatus] = useState<NodeStatusType>(
    currentState?.status ?? "clear"
  );
  const [question, setQuestion] = useState(currentState?.question ?? "");

  const handleSave = () => {
    onSave(node.id, {
      status: selectedStatus,
      question: selectedStatus === "pending" ? question : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--brse-panel-border)] bg-surface p-6 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.022)), var(--brse-panel-bg)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-4 mb-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <CircleDot className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-black text-textPrimary truncate">
                {t("specsMindmap.updateNodeStatus")}
              </h3>
              <p className="text-[11px] text-textMuted truncate mt-0.5">
                {node.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--brse-panel-border)] bg-background/50 p-2 text-textMuted hover:text-textPrimary transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status buttons */}
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-wider text-textMuted mb-3">
            {t("specsMindmap.selectStatus")}
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {(Object.keys(STATUS_CONFIG) as NodeStatusType[]).map((key) => {
              const cfg = STATUS_CONFIG[key];
              const isActive = selectedStatus === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedStatus(key)}
                  className={cn(
                    "relative rounded-xl border p-3 text-center transition-all duration-200 cursor-pointer",
                    cfg.borderClass,
                    cfg.bgClass,
                    isActive && "ring-2 ring-offset-1 ring-offset-transparent",
                    isActive && key === "clear" && "ring-emerald-400/60",
                    isActive && key === "discussing" && "ring-amber-400/60",
                    isActive && key === "pending" && "ring-rose-500/60",
                    !isActive && "opacity-50 hover:opacity-80"
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto mb-2 h-3 w-3 rounded-full",
                      cfg.dotClass
                    )}
                  />
                  <span className="text-[11px] font-bold text-textPrimary block">
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Q&A question textarea - only for Pending */}
        {selectedStatus === "pending" && (
          <div className="mb-5 animate-[page-in_0.2s_ease-out]">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareWarning className="h-4 w-4 text-rose-400" />
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                {t("specsMindmap.qnaQuestionForClient")}
              </p>
            </div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("specsMindmap.qnaQuestionPlaceholder")}
              rows={4}
              className="w-full rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 font-mono text-xs leading-6 text-textPrimary outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20 resize-y placeholder:text-textMuted"
            />
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="brse-button text-xs"
          >
            {t("notes.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="brse-button brse-button-primary text-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("specsMindmap.saveStatusBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
