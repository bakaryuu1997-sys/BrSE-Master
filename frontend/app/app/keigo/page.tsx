"use client";

import { useState } from "react";
import { SpellCheck, Languages, ClipboardCheck, History, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeigoState } from "@/features/keigo/useKeigoState";
import { KeigoComposePanel } from "@/features/keigo/KeigoComposePanel";
import { KeigoCheckerPanel } from "@/features/keigo/KeigoCheckerPanel";
import { KeigoRequirementPanel } from "@/features/keigo/KeigoRequirementPanel";
import { KeigoHistoryPanel } from "@/features/keigo/KeigoHistoryPanel";
import { Drawer } from "@/components/Drawer";

export default function KeigoCheckerPage() {
  const state = useKeigoState();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <main className="brse-page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="print-hidden spectral-panel mb-4 rounded-xl p-3.5 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                AI Workspace
              </span>
              <span className="flex items-center gap-1.5 text-xs text-textMuted">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {state.t("keigo.aiActive")}
              </span>
            </div>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight text-textPrimary sm:text-2xl">
              <SpellCheck className="h-6 w-6 text-primary shrink-0" />
              {state.t("keigo.labTitle")}
            </h1>
            <p className="mt-0.5 max-w-4xl text-xs text-ink/70">
              {state.t("keigo.labDesc")}
            </p>
          </div>

          {state.activeMode === "keigo" && (
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--brse-hairline-border)] bg-surface/70 px-3 py-1.5 text-xs font-semibold text-textMuted hover:border-primary/40 hover:text-ink transition active:scale-95"
            >
              <History className="h-4 w-4 text-primary" />
              {state.t("keigo.checkHistory")}
            </button>
          )}
        </div>

        {state.projectMemory.hasMemory && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {state.t("keigo.customerMemory")}
            </p>
            <div className="mt-1 grid gap-1 text-[11px] text-ink/80 sm:grid-cols-3">
              {state.projectMemory.customerStyle ? (
                <p>
                  <span className="font-semibold text-ink">{state.t("keigo.style")}:</span>{" "}
                  {state.projectMemory.customerStyle}
                </p>
              ) : null}
              {state.projectMemory.reportRule ? (
                <p>
                  <span className="font-semibold text-ink">{state.t("keigo.reportRule")}:</span>{" "}
                  {state.projectMemory.reportRule}
                </p>
              ) : null}
              {state.projectMemory.communicationNotes ? (
                <p>
                  <span className="font-semibold text-ink">{state.t("keigo.notes")}:</span>{" "}
                  {state.projectMemory.communicationNotes}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* Unified Mode Switcher */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--brse-hairline-border)] pt-3">
          <button
            type="button"
            onClick={() => state.setActiveMode("keigo")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
              state.activeMode === "keigo"
                ? "bg-primary text-white shadow-sm"
                : "border border-[var(--brse-hairline-border)] bg-surface/60 text-textMuted hover:text-ink hover:border-primary/30"
            )}
          >
            <SpellCheck className="h-3.5 w-3.5" />
            {state.t("keigo.keigoCheck")}
          </button>
          <button
            type="button"
            onClick={() => state.setActiveMode("compose")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
              state.activeMode === "compose"
                ? "bg-primary text-white shadow-sm"
                : "border border-[var(--brse-hairline-border)] bg-surface/60 text-textMuted hover:text-ink hover:border-primary/30"
            )}
          >
            <Languages className="h-3.5 w-3.5" />
            {state.t("keigo.composeVietnamese")}
          </button>
          <button
            type="button"
            onClick={() => state.setActiveMode("requirement")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
              state.activeMode === "requirement"
                ? "bg-primary text-white shadow-sm"
                : "border border-[var(--brse-hairline-border)] bg-surface/60 text-textMuted hover:text-ink hover:border-primary/30"
            )}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            {state.t("keigo.requirement")}
          </button>
        </div>
      </header>

      {/* ── Mode View Container ─────────────────────────────────────────── */}
      {state.activeMode === "compose" && (
        <KeigoComposePanel
          t={state.t}
          composeInput={state.composeInput}
          setComposeInput={state.setComposeInput}
          composeContext={state.composeContext}
          setComposeContext={state.setComposeContext}
          composeOutput={state.composeOutput}
          setComposeOutput={state.setComposeOutput}
          isComposeLoading={state.isComposeLoading}
          composeError={state.composeError}
          composeCopied={state.composeCopied}
          handleCompose={state.handleCompose}
          copyComposeOutput={state.copyComposeOutput}
          setActiveMode={state.setActiveMode}
        />
      )}

      {state.activeMode === "keigo" && (
        <div className="w-full">
          <KeigoCheckerPanel
            t={state.t}
            inputText={state.inputText}
            setInputText={state.setInputText}
            isLoading={state.isLoading}
            handleCheck={state.handleCheck}
            result={state.result}
            error={state.error}
          />
        </div>
      )}

      {state.activeMode === "requirement" && (
        <KeigoRequirementPanel
          t={state.t}
          requirementContext={state.requirementContext}
          setRequirementContext={state.setRequirementContext}
          requirementQuestion={state.requirementQuestion}
          setRequirementQuestion={state.setRequirementQuestion}
          requirementReply={state.requirementReply}
          isRequirementLoading={state.isRequirementLoading}
          requirementError={state.requirementError}
          handleRequirementAsk={state.handleRequirementAsk}
          setInputText={state.setInputText}
          setActiveMode={state.setActiveMode}
        />
      )}

      {/* Premium History Drawer */}
      <Drawer
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={state.t("keigo.drawerTitle")}
        subtitle={state.t("keigo.drawerSubtitle")}
        width="md"
      >
        <KeigoHistoryPanel
          t={state.t}
          language={state.language}
          historyLoading={state.historyLoading}
          historyQuery={state.historyQuery}
          setHistoryQuery={state.setHistoryQuery}
          historyFilter={state.historyFilter}
          setHistoryFilter={state.setHistoryFilter}
          filteredHistory={state.filteredHistory}
          expandedHistory={state.expandedHistory}
          setExpandedHistory={state.setExpandedHistory}
          handleDelete={state.handleDelete}
          setInputText={state.setInputText}
          setResult={(res) => {
            state.setResult(res);
            setIsHistoryOpen(false);
          }}
          setActiveMode={state.setActiveMode}
        />
      </Drawer>
    </main>
  );
}
