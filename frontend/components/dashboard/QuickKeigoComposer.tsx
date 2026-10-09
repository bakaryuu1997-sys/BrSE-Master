"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { apiBaseUrl } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/uiLanguage";

interface QuickKeigoComposerProps {
  t: (key: TranslationKey) => string;
  onNotify?: (message: string, tone?: "success" | "warning" | "error") => void;
}

const KEIGO_PRESETS = [
  { labelKey: "dashboard.keigoPresetQna", value: "qna", emoji: "🔍" },
  { labelKey: "dashboard.keigoPresetReport", value: "report", emoji: "📊" },
  { labelKey: "dashboard.keigoPresetApology", value: "apology", emoji: "🙏" },
  { labelKey: "dashboard.keigoPresetCr", value: "cr", emoji: "🔄" },
  { labelKey: "dashboard.keigoPresetThanks", value: "thanks", emoji: "🌸" },
];

export function QuickKeigoComposer({ t, onNotify }: QuickKeigoComposerProps) {
  const [input, setInput] = useState("");
  const [context, setContext] = useState("qna");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const keigoPresetLabels: Record<string, string> = Object.fromEntries(
    KEIGO_PRESETS.map((preset) => [preset.value, t(preset.labelKey as TranslationKey)])
  );

  async function generate() {
    if (!input.trim()) return;
    setIsLoading(true);
    setOutput("");
    try {
      const res = await fetch(`${apiBaseUrl}/ai/keigo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `ベトナム語の意図を、日本のお客様向けの自然な敬語メールにしてください。\n用途: ${
            keigoPresetLabels[context] || context
          }\n\n${input}`,
          communication_notes: `Dashboard Quick Keigo Composer / context: ${
            keigoPresetLabels[context] || context
          }`,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = (await res.json()) as { improved?: string; improved_text?: string };
      setOutput(data.improved_text || data.improved || "");
      onNotify?.(t("dashboard.keigoGenerated"), "success");
    } catch {
      // Fallback: show a template message when API is unavailable
      setOutput(
        `【${t("dashboard.keigoFallbackTitle")}】\n${t("dashboard.keigoFallbackContent")}: ${input}\n${t("dashboard.keigoFallbackRetry")}`
      );
      onNotify?.(t("dashboard.keigoApiFallbackNotice"), "warning");
    } finally {
      setIsLoading(false);
    }
  }

  async function copy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    onNotify?.(t("dashboard.keigoCopied"), "success");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {/* Context selector */}
      <div className="flex flex-wrap gap-1.5">
        {KEIGO_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setContext(p.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all",
              context === p.value
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-[var(--brse-panel-border)] bg-white/[0.02] text-textMuted hover:border-[var(--brse-panel-border)] hover:text-textPrimary"
            )}
          >
            {p.emoji} {t(p.labelKey as TranslationKey)}
          </button>
        ))}
      </div>

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t("dashboard.keigoPlaceholder")}
        className="field-control w-full resize-none text-sm placeholder:text-textMuted/60"
        rows={3}
        id="dashboard-keigo-input"
      />

      <button
        onClick={generate}
        disabled={!input.trim() || isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primaryHover active:scale-95 disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {isLoading ? t("dashboard.keigoGenerating") : t("dashboard.keigoGenerate")}
      </button>

      {/* Output */}
      {output && (
        <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-3">
          <pre className="whitespace-pre-wrap text-[11px] leading-5 text-textPrimary font-sans">{output}</pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-textMuted transition hover:text-textPrimary"
            >
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? t("dashboard.copiedBang") : t("dashboard.copy")}
            </button>
            <Link
              href="/app/keigo"
              className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("dashboard.openFullKeigo")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
