"use client";

import { Send, Loader2, ListChecks, CheckCircle2, ChevronRight } from "lucide-react";
import { KeigoResult, KEIGO_EXAMPLE_GROUPS, LEVEL_CONFIG } from "./useKeigoState";
import { ScoreGauge } from "./HelperComponents";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { TtsButton } from "./TtsButton";
import { PolitenessMeter } from "./PolitenessMeter";

interface KeigoCheckerPanelProps {
  t: any;
  inputText: string;
  setInputText: (val: string) => void;
  isLoading: boolean;
  handleCheck: () => void;
  result: KeigoResult | null;
  error: string;
}

export function KeigoCheckerPanel({
  t,
  inputText,
  setInputText,
  isLoading,
  handleCheck,
  result,
  error,
}: KeigoCheckerPanelProps) {
  const levelCfg = result ? (LEVEL_CONFIG[result.level] ?? { label: result.level, color: "text-white/70", bg: "bg-white/5 border-[var(--brse-panel-border)]" }) : null;
  const { speak, stop, isSpeaking } = useSpeechSynthesis();

  return (
    <div className="space-y-5">
      {/* Input Panel */}
      <div className="brse-section p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-ink">{t("keigo.inputTitle")}</h2>
          <span className="text-xs text-white/40">{inputText.length} {t("keigo.charCount")}</span>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCheck();
          }}
          placeholder={t("keigo.inputPlaceholder")}
          rows={10}
          maxLength={48000}
          className="w-full rounded-xl border border-[var(--brse-panel-border)] bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 resize-y min-h-[160px] font-mono"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3">
          <button
            onClick={handleCheck}
            disabled={isLoading || !inputText.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isLoading ? t("keigo.analyzing") : t("keigo.checkWithAi")}
          </button>
          <span className="text-xs text-white/45">{t("keigo.ctrlEnterQuickSend")}</span>
        </div>

        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">BrSE phrase library</p>
          <div className="grid gap-2">
            {KEIGO_EXAMPLE_GROUPS.map((group) => (
              <details key={group.title} className="group rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.015] p-3 transition-colors hover:bg-white/[0.03]">
                <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-ink outline-none select-none">
                  <span>{group.title}</span>
                  <span className="text-textMuted group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-2.5 grid gap-2 border-t border-[var(--brse-panel-border)] pt-2.5">
                  {group.examples.map((ex) => (
                    <div key={ex} className="flex items-start gap-1.5">
                      <TtsButton text={ex} speak={speak} stop={stop} isSpeaking={isSpeaking} className="shrink-0 mt-0.5" />
                      <button
                        type="button"
                        onClick={() => setInputText(ex)}
                        className="text-left text-xs leading-5 text-textMuted transition-all duration-200 hover:text-primary hover:translate-x-1"
                      >
                        {ex}
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Result Panel */}
      {result && (
        <div className="brse-section p-6 space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b border-[var(--brse-panel-border)] pb-6">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <h3 className="text-lg font-black text-textPrimary">{t("keigo.analysisResult")}</h3>
              </div>
              {levelCfg && (
                <div className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-bold ${levelCfg.bg} ${levelCfg.color}`}>
                  {levelCfg.label}
                </div>
              )}
              <p className="text-sm leading-7 text-textMuted">
                {result.summary_vi}
              </p>
            </div>
            <div className="shrink-0 flex justify-center">
              <ScoreGauge score={result.score} />
            </div>
          </div>

          {/* Improved Text Preview */}
          {result.improved && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{t("keigo.polishedByAi")}</p>
                  <TtsButton text={result.improved} speak={speak} stop={stop} isSpeaking={isSpeaking} />
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(result.improved)}
                  className="rounded border border-[var(--brse-panel-border)] bg-white/5 px-2.5 py-1 text-xs font-semibold text-textMuted transition hover:text-white"
                >
                  {t("keigo.copyAll")}
                </button>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <pre className="whitespace-pre-wrap text-sm leading-7 text-textPrimary font-sans">
                  {result.improved}
                </pre>
              </div>
              <PolitenessMeter text={result.improved} />
            </div>
          )}

          {/* Detailed Changes */}
          {result.changes && result.changes.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-black text-textPrimary">{t("keigo.detailedNotes")} ({result.changes.length})</h4>
              </div>
              <div className="grid gap-4">
                {result.changes.map((change, idx) => (
                  <div key={idx} className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.015] p-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="rounded bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-300 line-through">
                        {change.original}
                      </span>
                      <ChevronRight className="hidden h-4 w-4 text-textMuted sm:block" />
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
                        {change.corrected}
                      </span>
                    </div>
                    <p className="text-xs leading-5 text-textMuted">
                      💡 {change.reason_vi}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t("keigo.noErrorsFound")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
