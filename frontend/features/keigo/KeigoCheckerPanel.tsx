"use client";

import { Send, Loader2, ListChecks, CheckCircle2, ChevronRight, Sparkles, Lightbulb } from "lucide-react";
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

const QUICK_TEST_SAMPLES = [
  { label: "Xin nghỉ phép", text: "明日休む" },
  { label: "Nhờ gửi spec", text: "仕様書を送ってください。" },
  { label: "Báo có bug", text: "バグが見つかりました。修正してください。" },
  { label: "Từ chối khéo", text: "この機能は実装できません。" },
];

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
    <div className="grid gap-5 lg:grid-cols-2 items-start">
      {/* Left Column: Input & Phrase Library */}
      <div className="space-y-4">
        <div className="brse-section p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-ink">{t("keigo.inputTitle")}</h2>
            <span className="text-xs text-textMuted font-mono">{inputText.length} {t("keigo.charCount")}</span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCheck();
            }}
            placeholder={t("keigo.inputPlaceholder")}
            rows={7}
            maxLength={48000}
            className="w-full rounded-xl border border-[var(--brse-hairline-border)] bg-surface/50 p-3 text-xs sm:text-sm text-ink placeholder-textMuted/60 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 resize-y min-h-[140px] font-mono leading-relaxed"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <button
              onClick={handleCheck}
              disabled={isLoading || !inputText.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {isLoading ? t("keigo.analyzing") : t("keigo.checkWithAi")}
            </button>
            <span className="text-[11px] text-textMuted">{t("keigo.ctrlEnterQuickSend")}</span>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Quick Test Chips */}
          <div className="mt-4 pt-3 border-t border-[var(--brse-hairline-border)]">
            <p className="text-[11px] font-bold text-textMuted mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-amber-400" />
              <span>Thử nhanh mẫu câu tiếng Nhật:</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEST_SAMPLES.map((sample) => (
                <button
                  key={sample.text}
                  type="button"
                  onClick={() => setInputText(sample.text)}
                  className="rounded-md border border-[var(--brse-hairline-border)] bg-surface/80 px-2 py-1 text-[11px] text-textMuted hover:text-ink hover:border-primary/30 transition text-left"
                  title={sample.text}
                >
                  <span className="text-primary font-semibold">{sample.label}:</span>{" "}
                  <span className="font-mono text-[10px]">{sample.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BrSE phrase library */}
        <details className="brse-section p-3 sm:p-3.5 group">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-bold uppercase tracking-wider text-primary outline-none select-none">
            <span>BrSE phrase library (Mẫu câu Nhật chuẩn)</span>
            <span className="text-[10px] text-textMuted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="grid gap-2 mt-2.5 pt-2 border-t border-[var(--brse-hairline-border)]">
            {KEIGO_EXAMPLE_GROUPS.map((group) => (
              <details
                key={group.title}
                className="group/item rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 p-2 transition-colors hover:bg-surfaceHover/60"
              >
                <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-ink outline-none select-none">
                  <span>{group.title}</span>
                  <span className="text-textMuted group-open/item:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-2 grid gap-1.5 border-t border-[var(--brse-hairline-border)] pt-2">
                  {group.examples.map((ex) => (
                    <div key={ex} className="flex items-start gap-1.5">
                      <TtsButton text={ex} speak={speak} stop={stop} isSpeaking={isSpeaking} className="shrink-0 mt-0.5" />
                      <button
                        type="button"
                        onClick={() => setInputText(ex)}
                        className="text-left text-xs leading-relaxed text-textMuted transition hover:text-primary"
                      >
                        {ex}
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      </div>

      {/* Right Column: AI Analysis Result or Idle Guide */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="brse-section p-8 text-center space-y-4 border-primary/30">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">{t("keigo.analyzing")}</h3>
              <p className="mt-1 text-xs text-textMuted">
                AI đang rà soát kính ngữ, sắc thái đối phương (Sonkeigo / Kenjougo / Teineigo)...
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 w-3/4 mx-auto animate-pulse rounded bg-surfaceHover" />
              <div className="h-3 w-1/2 mx-auto animate-pulse rounded bg-surfaceHover" />
            </div>
          </div>
        ) : result ? (
          <div className="brse-section p-5 sm:p-6 space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-[var(--brse-hairline-border)] pb-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <h3 className="text-base font-bold text-textPrimary">{t("keigo.analysisResult")}</h3>
                </div>
                {levelCfg && (
                  <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold ${levelCfg.bg} ${levelCfg.color}`}>
                    {levelCfg.label}
                  </div>
                )}
                <p className="text-xs leading-relaxed text-textMuted">
                  {result.summary_vi}
                </p>
              </div>
              <div className="shrink-0 flex justify-center">
                <ScoreGauge score={result.score} />
              </div>
            </div>

            {/* Improved Text Preview */}
            {result.improved && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">{t("keigo.polishedByAi")}</p>
                    <TtsButton text={result.improved} speak={speak} stop={stop} isSpeaking={isSpeaking} />
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.improved)}
                    className="rounded border border-[var(--brse-hairline-border)] bg-surface px-2.5 py-1 text-xs font-semibold text-textMuted hover:text-ink hover:border-primary/40 transition"
                  >
                    {t("keigo.copyAll")}
                  </button>
                </div>
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                  <pre className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-textPrimary font-mono">
                    {result.improved}
                  </pre>
                </div>
                <PolitenessMeter text={result.improved} />
              </div>
            )}

            {/* Detailed Changes */}
            {result.changes && result.changes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-bold text-textPrimary">{t("keigo.detailedNotes")} ({result.changes.length})</h4>
                </div>
                <div className="grid gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {result.changes.map((change, idx) => (
                    <div key={idx} className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 p-3 space-y-1.5">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                        <span className="rounded bg-rose-500/10 px-2 py-0.5 text-xs font-mono text-rose-300 line-through">
                          {change.original}
                        </span>
                        <ChevronRight className="hidden h-3.5 w-3.5 text-textMuted sm:block" />
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
                          {change.corrected}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-textMuted">
                        💡 {change.reason_vi}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("keigo.noErrorsFound")}
              </div>
            )}
          </div>
        ) : (
          <div className="brse-section p-6 sm:p-8 space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Bàn kiểm tra Kính ngữ Keigo</h3>
              <p className="mt-1 text-xs text-textMuted leading-relaxed max-w-md mx-auto">
                Nhập hoặc dán đoạn văn bản tiếng Nhật ở khung bên trái rồi bấm <strong className="text-ink">Kiểm tra bằng AI</strong> (hoặc nhấn <kbd className="rounded border border-[var(--brse-hairline-border)] px-1 py-0.5 text-[10px] font-mono">Ctrl+Enter</kbd>).
              </p>
            </div>
            <div className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/40 p-3.5 text-left space-y-2 text-xs text-textMuted">
              <p className="font-bold text-ink flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                <span>AI sẽ đánh giá các yếu tố:</span>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Phân biệt rõ Kính ngữ (尊敬語), Khiêm nhường ngữ (謙譲語) và Lịch sự ngữ (丁寧語).</li>
                <li>Phát hiện câu mệnh lệnh thô lỗ hoặc yêu cầu trực tiếp gây mất lòng khách hàng.</li>
                <li>Gợi ý cách diễn đạt gián tiếp uyển chuyển theo văn hóa thương mại Nhật (クッション言葉).</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
