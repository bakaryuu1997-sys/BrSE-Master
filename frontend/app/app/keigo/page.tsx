"use client";

import { useState } from "react";
import { SpellCheck, Languages, ClipboardCheck, History } from "lucide-react";
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
      <header className="print-hidden spectral-panel mb-8 rounded-2xl p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
          AI Feature · Phase 3
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-h1 flex items-center gap-3">
              <SpellCheck className="h-9 w-9 text-primary shrink-0" />
              {state.t("keigo.labTitle")}
            </h1>
            <p className="mt-3 max-w-5xl text-ink/70">
              {state.t("keigo.labDesc")}
            </p>
            {state.projectMemory.hasMemory ? (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {state.t("keigo.customerMemory")}
                </p>
                <div className="mt-2 grid gap-1 text-ink/80">
                  {state.projectMemory.customerStyle ? (
                    <p>
                      <span className="font-semibold text-ink">{state.t("keigo.style")}</span>{" "}
                      {state.projectMemory.customerStyle}
                    </p>
                  ) : null}
                  {state.projectMemory.reportRule ? (
                    <p>
                      <span className="font-semibold text-ink">{state.t("keigo.reportRule")}</span>{" "}
                      {state.projectMemory.reportRule}
                    </p>
                  ) : null}
                  {state.projectMemory.communicationNotes ? (
                    <p>
                      <span className="font-semibold text-ink">{state.t("keigo.notes")}</span>{" "}
                      {state.projectMemory.communicationNotes}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="hidden lg:flex flex-col items-end gap-1 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> 
              {state.t("keigo.aiActive")}
            </span>
            <span>{state.t("keigo.smartAssistant")}</span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl border border-[var(--brse-panel-border)] bg-background/55 p-1 gap-1">
            <button
              type="button"
              onClick={() => state.setActiveMode("keigo")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                state.activeMode === "keigo" ? "bg-primary text-white shadow-glow-indigo" : "text-textMuted hover:text-ink"
              )}
            >
              <SpellCheck className="h-4 w-4" />
              {state.t("keigo.keigoCheck")}
            </button>
            <button
              type="button"
              onClick={() => state.setActiveMode("compose")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                state.activeMode === "compose"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_10px_24px_rgba(255,107,94,0.3)]"
                  : "text-textMuted hover:text-ink"
              )}
            >
              <Languages className="h-4 w-4" />
              {state.t("keigo.composeVietnamese")}
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider">NEW</span>
            </button>
            <button
              type="button"
              onClick={() => state.setActiveMode("requirement")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                state.activeMode === "requirement" ? "bg-cyan text-slate-950 shadow-[0_10px_24px_rgba(255,180,84,0.25)]" : "text-textMuted hover:text-ink"
              )}
            >
              <ClipboardCheck className="h-4 w-4" />
              {state.t("keigo.requirement")}
            </button>
          </div>

          {state.activeMode === "keigo" && (
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--brse-panel-border)] bg-background/35 px-4 py-2 text-sm font-semibold text-textMuted hover:border-primary/40 hover:text-ink transition active:scale-95 animate-fade-in"
            >
              <History className="h-4 w-4 text-primary" />
              {state.t("keigo.checkHistory")}
            </button>
          )}
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
