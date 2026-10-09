"use client";

import { 
  Network, 
  GitFork, 
  Link2, 
  Plus, 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileText,
  HelpCircle,
  FolderOpen,
  Mail,
  CircleDot,
} from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { NodeEditModal, STATUS_CONFIG, type MindMapNode } from "@/components/specs-mindmap/NodeEditModal";
import { useSpecsMindMap, nodeIdToPath } from "@/hooks/useSpecsMindMap";

export default function SpecsMindMapPage() {
  const { t } = useUiLanguage();
  const {
    markdown,
    setMarkdown,
    isLoading,
    isLinkingNode,
    setIsLinkingNode,
    qnaSearchQuery,
    setQnaSearchQuery,
    statusMessage,
    nodeStates,
    editingNode,
    setEditingNode,
    treeNodes,
    allFlatNodes,
    pendingCount,
    clearCount,
    discussingCount,
    handleLinkQna,
    handleUnlinkQna,
    handleNodeStatusSave,
    getNodeQnaStatus,
    filteredQnas,
    handleExportQAEmail,
    handleLoadFromClarifier,
  } = useSpecsMindMap();

  // Render a node recursively
  const renderNode = (node: MindMapNode) => {
    const linkedQna = getNodeQnaStatus(node.id);
    const hasLink = Boolean(linkedQna);
    const isClosed = linkedQna
      ? ["closed", "resolved", "answered"].includes(linkedQna.status.toLowerCase())
      : false;

    const ns = nodeStates[node.id];
    const status = ns?.status;

    // Determine color classes based on node status (takes priority over Q&A link colors)
    let statusBorderClass = "";
    let statusBgClass = "";
    let statusPulseClass = "";
    if (status === "clear") {
      statusBorderClass = "border-matcha/30";
      statusBgClass = "bg-matcha/10";
    } else if (status === "discussing") {
      statusBorderClass = "border-gold/30";
      statusBgClass = "bg-gold/10";
    } else if (status === "pending") {
      statusBorderClass = "border-vermilion/30";
      statusBgClass = "bg-vermilion/10";
      statusPulseClass = "animate-[pulse_3s_infinite]";
    }

    return (
      <div
        key={node.id}
        className="relative pl-6 border-l border-dashed border-white/10 mt-3 group select-none"
      >
        {/* Horizontal guide line connector */}
        <div className="absolute left-0 top-5 w-4 border-t border-dashed border-white/10" />

        <div className="flex items-center gap-2">
          {/* Node Card */}
          <div
            onDoubleClick={() => setEditingNode(node)}
            className={cn(
              "inline-flex items-center justify-between gap-3 min-w-[200px] max-w-[360px] rounded-xl border p-3 transition-all duration-200 shadow-md bg-surface/60 backdrop-blur-md cursor-pointer",
              // Default level colors (lowest priority)
              !status && node.level === 1 && "border-primary/45 bg-primary/5",
              !status && node.level === 2 && "border-cyan/35 bg-cyan/5",
              !status && node.level === 3 && "border-white/15",
              !status && node.level === 4 && "border-white/5 bg-background/25 p-2 text-xs",
              // Q&A link colors (medium priority, only when no status set)
              !status && hasLink && isClosed && "border-matcha/40 bg-matcha/5",
              !status && hasLink && !isClosed && "border-vermilion/50 bg-vermilion/5 animate-[pulse_3s_infinite]",
              // Node status colors (highest priority)
              status && statusBorderClass,
              status && statusBgClass,
              status && statusPulseClass
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase opacity-40">
                  Level {node.level}
                </span>
                {status && (
                  <span
                    className={cn(
                      "inline-flex h-2 w-2 rounded-full shrink-0",
                      STATUS_CONFIG[status].dotClass
                    )}
                  />
                )}
              </div>
              <p className="truncate text-xs font-semibold text-textPrimary">
                {node.title}
              </p>
              {status === "pending" && ns?.question && (
                <p className="text-[10px] text-vermilion/80 truncate mt-0.5">
                  💬 {ns.question}
                </p>
              )}
            </div>

            {/* Q&A status indicator trigger */}
            <div className="flex shrink-0 gap-1.5 items-center">
              {hasLink ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkQna(node.id);
                    }}
                    className="p-1 rounded-md bg-white/5 text-textMuted hover:bg-white/10 hover:text-vermilion transition"
                    title={t("specsMindmap.unlinkQnaTitle")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <span
                    className={cn(
                      "flex h-5 items-center justify-center rounded px-1.5 text-[9px] font-black uppercase tracking-wider",
                      isClosed
                        ? "bg-matcha/10 text-matcha"
                        : "bg-vermilion/10 text-vermilion animate-pulse"
                    )}
                  >
                    {linkedQna?.type.toUpperCase()} #{linkedQna?.id.slice(0, 4)}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLinkingNode(node.id);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-white/5 text-textMuted hover:border-cyan hover:text-cyan transition active:scale-95"
                  title={t("specsMindmap.linkQnaTitle")}
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Children Render */}
        {node.children.length > 0 && (
          <div className="mt-1">
            {node.children.map((child: MindMapNode) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="brse-page">
      <PageHeader
        badge="Quality Check"
        title={t("specsMindmap.title")}
        description={t("specsMindmap.desc")}
        stats={[
          { label: t("specsMindmap.totalNodes"), value: allFlatNodes.length },
          { label: "Clear", value: clearCount, variant: "success" },
          { label: "Discussing", value: discussingCount, variant: "warning" },
          { label: "Pending", value: pendingCount, variant: "danger" },
        ]}
      />

      {statusMessage && (
        <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-all animate-fade-in">
          {statusMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-[50vh] w-full items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[400px_1fr]">
          {/* Sidebar Left: Markdown Spec Input */}
          <section className="brse-section p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold text-textPrimary">
                  {t("specsMindmap.sidebarTitle")}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleLoadFromClarifier}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/25 transition active:scale-95"
                title={t("specsMindmap.loadDraftTooltip")}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {t("specsMindmap.loadDraft")}
              </button>
            </div>

            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={t("specsMindmap.placeholder")}
              className="flex-1 min-h-[500px] w-full rounded-xl border border-[var(--brse-panel-border)] bg-background/45 p-4 font-mono text-xs leading-6 text-textPrimary outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-y"
            />

            <div className="rounded-xl bg-white/5 border border-[var(--brse-panel-border)] p-3 text-[11px] text-textMuted leading-relaxed">
              {"💡 "}
              <span className="font-bold text-textPrimary">{t("specsMindmap.tipTitle")}</span>
              {t("specsMindmap.tipBody")}
              <span className="font-bold text-gold">
                {t("specsMindmap.tipDoubleClick")}
              </span>
              {t("specsMindmap.tipClickNode")}
            </div>
          </section>

          {/* Main Content Area: Mind-Map Visual Tree Canvas */}
          <section className="brse-section p-6 overflow-x-auto min-h-[640px] bg-background/20 backdrop-blur-md relative border border-[var(--brse-panel-border)]">
            {/* Legend & Export Button */}
            <div className="absolute right-6 top-6 z-10 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-surface/90 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px]">
                <div className="h-2 w-2 rounded-full bg-matcha" />
                <span className="text-textMuted">Clear</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface/90 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px]">
                <div className="h-2 w-2 rounded-full bg-gold" />
                <span className="text-textMuted">Discussing</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface/90 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px]">
                <div className="h-2 w-2 rounded-full bg-vermilion animate-pulse" />
                <span className="text-textMuted">Pending</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-b border-[var(--brse-panel-border)] pb-3 mb-4">
              <GitFork className="h-5 w-5 text-cyan" />
              <h2 className="text-base font-black text-textPrimary flex-1">
                Requirement Mind-Map Canvas
              </h2>
              <button
                type="button"
                onClick={handleExportQAEmail}
                className="brse-button text-xs gap-1.5 border-vermilion/20 bg-vermilion/10 text-vermilion hover:bg-vermilion/20 hover:border-vermilion/30"
                title={t("specsMindmap.exportQAEmailTooltip")}
              >
                <Mail className="h-3.5 w-3.5" />
                {t("specsMindmap.exportQAEmail")}
                {pendingCount > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-vermilion/30 px-1.5 text-[10px] font-black text-vermilion">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {treeNodes.length === 0 ? (
              <div className="flex h-[400px] flex-col items-center justify-center text-center text-textMuted gap-3">
                <Network className="h-8 w-8 text-primary" />
                <p className="text-sm">
                  {t("specsMindmap.emptyState")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col select-none pr-6">
                {treeNodes.map((node: MindMapNode) => renderNode(node))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* NODE EDIT MODAL (double-click) */}
      {editingNode && (
        <NodeEditModal
          node={editingNode}
          currentState={nodeStates[editingNode.id]}
          onSave={handleNodeStatusSave}
          onClose={() => setEditingNode(null)}
        />
      )}

      {/* Q&A LINK MODAL */}
      {isLinkingNode && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsLinkingNode(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--brse-panel-border)] bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-4 mb-4">
              <div className="flex items-center gap-2 text-cyan">
                <Link2 className="h-5 w-5" />
                <h3 className="text-base font-black text-textPrimary">
                  {t("specsMindmap.linkModalTitle")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkingNode(null)}
                className="rounded-md border border-[var(--brse-panel-border)] bg-background/50 p-2 text-textMuted hover:text-textPrimary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-textMuted mb-4">
              {t("specsMindmap.linkModalDesc")}
            </p>

            {/* Search inputs */}
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
              <input
                value={qnaSearchQuery}
                onChange={(e) => setQnaSearchQuery(e.target.value)}
                placeholder={t("specsMindmap.searchPlaceholder")}
                className="field-control w-full py-2.5 pl-10 pr-3 text-sm placeholder:text-textMuted"
              />
            </div>

            {/* List */}
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {filteredQnas.length === 0 ? (
                <div className="flex h-24 flex-col items-center justify-center text-textMuted text-xs border border-dashed border-[var(--brse-panel-border)] rounded-xl">
                  <AlertCircle className="h-4 w-4 text-warning mb-1" />
                  {t("specsMindmap.noResults")}
                </div>
              ) : (
                filteredQnas.map((item) => {
                  const isClosed = ["closed", "resolved", "answered"].includes(
                    item.status.toLowerCase()
                  );
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleLinkQna(isLinkingNode, item.id)}
                      className="flex items-center justify-between rounded-xl border border-[var(--brse-panel-border)] bg-background/45 p-3 hover:border-cyan/40 hover:bg-surface/50 cursor-pointer transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[9px] font-black uppercase",
                              item.type === "qna"
                                ? "bg-cyan/15 text-cyan"
                                : "bg-orange-500/15 text-orange-400"
                            )}
                          >
                            {item.type}
                          </span>
                          <span className="text-[10px] font-mono text-textMuted">
                            ID: #{item.id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-textPrimary truncate">
                          {item.title}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "flex h-5 items-center justify-center rounded px-2 text-[9px] font-black uppercase tracking-wider shrink-0",
                          isClosed
                            ? "bg-matcha/10 text-matcha"
                            : "bg-vermilion/10 text-vermilion"
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
