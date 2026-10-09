"use client";

import { Languages, Loader2, Zap, AlertCircle, CheckCircle2, Copy, Check, SpellCheck, BookOpen } from "lucide-react";
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      {/* Input Panel */}
      <div className="space-y-5">
        <div className="brse-section p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
              <Languages className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-textPrimary">{t("keigo.composeTitle")}</h2>
              <p className="text-xs text-textMuted">{t("keigo.composeSubtitle")}</p>
            </div>
          </div>

          {/* Context Presets */}
          <div className="mb-5">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-textMuted/60">{t("keigo.brseContext")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COMPOSE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setComposeContext(preset.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-3 text-left transition-all duration-200",
                    composeContext === preset.id
                      ? "border-orange-500/40 bg-orange-500/15 text-orange-300"
                      : "border-[var(--brse-panel-border)] bg-white/[0.02] text-textMuted hover:border-[var(--brse-panel-border)] hover:text-textPrimary"
                  )}
                >
                  <span className="text-base leading-none">{preset.emoji}</span>
                  <span className="text-xs font-bold">{getPresetLabel(preset.id, preset.label)}</span>
                </button>
              ))}
            </div>
            {currentPreset && (
              <p className="mt-3 text-[11px] text-textMuted italic">
                💡 {getPresetHint(currentPreset.id, currentPreset.hint)}
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
            rows={8}
            className="w-full rounded-xl border border-[var(--brse-panel-border)] bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 resize-y min-h-[160px]"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleCompose}
              disabled={isComposeLoading || !composeInput.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-500/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              {isComposeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-white" />}
              {isComposeLoading ? t("keigo.generatingEmail") : t("keigo.generateEmail")}
            </button>
            <span className="text-xs text-textMuted">{t("keigo.ctrlEnterToSend")}</span>
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

          {composeError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
              <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-300">{composeError}</p>
            </div>
          )}
        </div>

        {/* Output */}
        {composeOutput && (
          <div className="brse-section border-orange-500/25 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-black text-textPrimary">{t("keigo.japaneseEmailOutput")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyComposeOutput}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-textMuted transition hover:text-textPrimary"
                >
                  {composeCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {composeCopied ? t("keigo.copied") : t("common.copy")}
                </button>
                <button
                  onClick={() => setActiveMode("keigo")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-300 transition hover:bg-orange-500/20"
                >
                  <SpellCheck className="h-3.5 w-3.5" />
                  {t("keigo.checkKeigoAction")}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-textPrimary font-sans">{composeOutput}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar — tips */}
      <div className="space-y-5">
        <div className="brse-section p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-black text-textPrimary">{t("keigo.emailStructureTitle")}</h3>
          </div>
          <div className="space-y-3 text-xs text-textMuted">
            {[
              { label: "1. Mở đầu", text: "お世話になっております。\n(Cảm ơn về sự hợp tác thường ngày)" },
              { label: "2. Mục đích", text: "～についてご確認/ご報告いたします。\n(Nêu mục đích rõ ràng)" },
              { label: "3. Nội dung chính", text: "以下の通りです / ご確認ください\n(Chi tiết ngắn gọn, bullet nếu nhiều)" },
              { label: "4. Action/Request", text: "ご確認のほどよろしくお願いいたします。\n(Request lịch sự, có deadline nếu cần)" },
              { label: "5. Kết thư", text: "引き続きよろしくお願いいたします。\n(Kết thúc chuyên nghiệp)" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[var(--brse-panel-border)] bg-white/[0.02] p-3">
                <p className="font-bold text-textPrimary mb-1">{item.label}</p>
                <pre className="whitespace-pre-wrap text-[11px] text-textMuted/80 font-sans">{item.text}</pre>
              </div>
            ))}
          </div>
        </div>

        <div className="brse-section p-5">
          <h3 className="mb-3 text-sm font-black text-textPrimary">{t("keigo.wordsToNote")}</h3>
          <div className="space-y-2 text-xs">
            {[
              { bad: "お願いします", good: "お願いいたします", note: "thêm いたし lịch sự hơn" },
              { bad: "確認してください", good: "ご確認いただけますでしょうか", note: "dạng câu hỏi lịch sự hơn" },
              { bad: "送ります", good: "ご送付いたします", note: "động từ khiêm nhường" },
              { bad: "分かりました", good: "かしこまりました / 承知いたしました", note: "với khách hàng" },
            ].map((item) => (
              <div key={item.bad} className="rounded-lg border border-[var(--brse-panel-border)] bg-white/[0.02] p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 line-through">{item.bad}</span>
                  <span className="text-textMuted/40">→</span>
                  <span className="text-emerald-400 font-bold">{item.good}</span>
                </div>
                <p className="mt-1 text-[10px] text-textMuted">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
