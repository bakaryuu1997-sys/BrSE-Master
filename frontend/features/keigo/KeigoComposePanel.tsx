"use client";

import { Languages, Loader2, Zap, AlertCircle, CheckCircle2, Copy, Check, SpellCheck, BookOpen, Send, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPOSE_PRESETS } from "./useKeigoState";

interface KeigoComposePanelProps {
  t: any;
  composeInput: string;
  setComposeInput: (val: string) => void;
  composeContext: string;
  setComposeContext: (val: string) => void;
  composeOutput: string;
  setComposeOutput: (val: string) => void;
  isComposeLoading: boolean;
  composeError: string;
  composeCopied: boolean;
  handleCompose: () => void;
  copyComposeOutput: () => void;
  setActiveMode: (mode: "keigo" | "compose" | "requirement") => void;
}

export function KeigoComposePanel({
  t,
  composeInput,
  setComposeInput,
  composeContext,
  setComposeContext,
  composeOutput,
  setComposeOutput,
  isComposeLoading,
  composeError,
  composeCopied,
  handleCompose,
  copyComposeOutput,
  setActiveMode,
}: KeigoComposePanelProps) {
  const currentPreset = COMPOSE_PRESETS.find((p) => p.id === composeContext);

  const getPresetLabel = (id: string, fallback: string) => {
    switch (id) {
      case "qna": return t("keigo.presetQna") || fallback;
      case "report": return t("keigo.presetReport") || fallback;
      case "apology": return t("keigo.presetApology") || fallback;
      case "cr": return t("keigo.presetCr") || fallback;
      case "escalate": return t("keigo.presetEscalate") || fallback;
      case "other": return t("keigo.presetOther") || fallback;
      default: return fallback;
    }
  };

  const getPresetPlaceholder = (id: string, fallback: string) => {
    switch (id) {
      case "qna": return t("keigo.presetQnaPlaceholder") || fallback;
      case "report": return t("keigo.presetReportPlaceholder") || fallback;
      case "apology": return t("keigo.presetApologyPlaceholder") || fallback;
      case "cr": return t("keigo.presetCrPlaceholder") || fallback;
      case "escalate": return t("keigo.presetEscalatePlaceholder") || fallback;
      case "other": return t("keigo.presetOtherPlaceholder") || fallback;
      default: return fallback;
    }
  };

  const getPresetHint = (id: string, fallback: string) => {
    switch (id) {
      case "qna": return t("keigo.presetQnaHint") || fallback;
      case "report": return t("keigo.presetReportHint") || fallback;
      case "apology": return t("keigo.presetApologyHint") || fallback;
      case "cr": return t("keigo.presetCrHint") || fallback;
      case "escalate": return t("keigo.presetEscalateHint") || fallback;
      case "other": return t("keigo.presetOtherHint") || fallback;
      default: return fallback;
    }
  };

  const handleOpenGmail = () => {
    if (!composeOutput) return;
    const lines = composeOutput.split("\n");
    const subject = lines[0]?.startsWith("Subject:") || lines[0]?.startsWith("件名:")
      ? lines[0].replace(/^(Subject:|件名:)\s*/, "")
      : "【ご連絡】";
    const body = lines.slice(1).join("\n").trim();
    const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body || composeOutput)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2 items-start">
      {/* Left Column: Vietnamese Input & Context Presets */}
      <div className="space-y-4">
        <div className="brse-section p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Languages className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-textPrimary">{t("keigo.composeTitle")}</h2>
                <p className="text-[11px] text-textMuted">{t("keigo.composeSubtitle")}</p>
              </div>
            </div>
            {composeInput && (
              <button
                onClick={() => {
                  setComposeInput("");
                  setComposeOutput("");
                }}
                className="text-xs text-textMuted hover:text-rose-400 transition-colors"
              >
                {t("keigo.clear")}
              </button>
            )}
          </div>

          {/* Context Presets */}
          <div className="mb-3.5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-textMuted">
              {t("keigo.brseContext")}
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {COMPOSE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setComposeContext(preset.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border p-2 text-left transition text-xs font-semibold",
                    composeContext === preset.id
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-[var(--brse-hairline-border)] bg-surface/50 text-textMuted hover:border-primary/30 hover:text-ink"
                  )}
                >
                  <span className="text-sm leading-none">{preset.emoji}</span>
                  <span className="truncate">{getPresetLabel(preset.id, preset.label)}</span>
                </button>
              ))}
            </div>
            {currentPreset && (
              <p className="mt-2 text-[11px] text-textMuted flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-amber-400 shrink-0" />
                <span>{getPresetHint(currentPreset.id, currentPreset.hint)}</span>
              </p>
            )}
          </div>

          {/* Text input */}
          <textarea
            value={composeInput}
            onChange={(e) => setComposeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCompose();
            }}
            placeholder={currentPreset ? getPresetPlaceholder(currentPreset.id, currentPreset.placeholder) : t("keigo.presetOtherPlaceholder")}
            rows={7}
            className="w-full rounded-xl border border-[var(--brse-hairline-border)] bg-surface/50 p-3 text-xs sm:text-sm text-ink placeholder-textMuted/60 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 resize-y min-h-[140px] leading-relaxed"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <button
              onClick={handleCompose}
              disabled={isComposeLoading || !composeInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              {isComposeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {isComposeLoading ? t("keigo.generatingEmail") : t("keigo.generateEmail")}
            </button>
            <span className="text-[11px] text-textMuted">{t("keigo.ctrlEnterToSend")}</span>
          </div>

          {composeError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
              <p>{composeError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: AI Output or Structure Guide */}
      <div className="space-y-4">
        {isComposeLoading ? (
          <div className="brse-section p-8 text-center space-y-4 border-primary/30">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">{t("keigo.generatingEmail")}</h3>
              <p className="mt-1 text-xs text-textMuted">
                AI đang chuyển ý tiếng Việt sang tiếng Nhật theo cấu trúc thương mại chuẩn mực...
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 w-3/4 mx-auto animate-pulse rounded bg-surfaceHover" />
              <div className="h-3 w-1/2 mx-auto animate-pulse rounded bg-surfaceHover" />
            </div>
          </div>
        ) : composeOutput ? (
          <div className="brse-section p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--brse-hairline-border)] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-textPrimary">{t("keigo.japaneseEmailOutput")}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={copyComposeOutput}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--brse-hairline-border)] bg-surface px-2.5 py-1.5 text-xs font-semibold text-textMuted hover:text-ink hover:border-primary/40 transition"
                >
                  {composeCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {composeCopied ? t("keigo.copied") : t("common.copy")}
                </button>
                <button
                  type="button"
                  onClick={handleOpenGmail}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                >
                  Gmail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("keigo")}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                  title="Chuyển văn bản này sang bàn kiểm tra Kính ngữ để soi sâu hơn"
                >
                  <SpellCheck className="h-3 w-3" />
                  {t("keigo.checkKeigoAction")}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
              <pre className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-textPrimary font-mono">
                {composeOutput}
              </pre>
            </div>
          </div>
        ) : (
          <div className="brse-section p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-textPrimary">{t("keigo.emailStructureTitle")}</h3>
            </div>
            <div className="space-y-2.5 text-xs text-textMuted">
              <div className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 p-2.5">
                <p className="font-bold text-ink">1. Tiêu đề (件名 - Subject)</p>
                <p className="mt-0.5 text-[11px]">Nêu bật mục đích trong dấu ngoặc vuông: <code className="text-primary font-mono">【ご質問】</code>, <code className="text-primary font-mono">【進捗報告】</code>, <code className="text-primary font-mono">【仕様確認】</code>.</p>
              </div>
              <div className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 p-2.5">
                <p className="font-bold text-ink">2. Lời chào mở đầu (宛名・挨拶)</p>
                <p className="mt-0.5 text-[11px]">Tên khách + chức danh + <code className="text-primary font-mono">お世話になっております</code>.</p>
              </div>
              <div className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 p-2.5">
                <p className="font-bold text-ink">3. Nội dung cốt lõi & Thời hạn (本文・期限)</p>
                <p className="mt-0.5 text-[11px]">Viết súc tích, gạch đầu dòng rõ ràng, nêu rõ deadline cần phản hồi.</p>
              </div>
              <div className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 p-2.5">
                <p className="font-bold text-ink">4. Lời kết (結び)</p>
                <p className="mt-0.5 text-[11px]"><code className="text-primary font-mono">ご確認のほど、よろしくお願い申し上げます。</code></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
