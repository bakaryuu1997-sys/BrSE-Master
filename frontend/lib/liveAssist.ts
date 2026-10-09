import type { LiveMeetingAssistResponse } from "@/lib/meetings";
import type { TranslationKey } from "@/lib/uiLanguage";

const LIVE_KEY_PATTERN = /quyết định|chốt|deadline|hạn|cần|phải|xác nhận|đồng ý|todo|action|risk|issue|block|delay|bug|problem|[?？]|決定|対応|確認|お願い|課題|問題|遅延|担当|依頼|期日/i;

export function splitLiveSentences(text: string): string[] {
  // Split into sentences on newlines/terminators but KEEP a trailing ? ! 。！？
  // so question/exclamation detection still works downstream.
  return (text.match(/[^\n。！？!?]+[。！？!?]?/g) ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Distinct, filler-stripped, length-capped sentences (chronological order). */
export function condenseLiveLines(text: string, maxLen = 140): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of splitLiveSentences(text)) {
    const sentence = raw.trim();
    if (sentence.length < 15) continue; // drop filler / acknowledgements
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sentence.length > maxLen ? `${sentence.slice(0, maxLen)}…` : sentence);
  }
  return out;
}

/** Concise real-time memo: prefer decision/action/question lines, cap at 5. */
export function buildLocalLiveMemo(text: string): string[] {
  const distinct = condenseLiveLines(text);
  const keyLines = distinct.filter((line) => LIVE_KEY_PATTERN.test(line));
  const picked = keyLines.length >= 3 ? keyLines : distinct;
  return picked.slice(-5);
}

export function buildLocalLiveAssist(text: string, t?: (key: TranslationKey) => string): LiveMeetingAssistResponse {
  const lines = condenseLiveLines(text).slice(-12);
  const memo = buildLocalLiveMemo(text);
  const questions = lines.filter((line) => /[?？]|why|how|when|what|なぜ|いつ|どう|確認|質問/i.test(line)).slice(-4);
  const risks = lines.filter((line) => /risk|issue|block|delay|bug|problem|課題|問題|遅延|確認|懸念/i.test(line)).slice(-4);
  const actions = lines.filter((line) => /todo|action|対応|確認します|お願いします|deadline|期日|担当|依頼/i.test(line)).slice(-4);
  return {
    memo,
    questions,
    explanations: risks,
    suggestions: [
      ...(questions.length ? [t ? t("recorder.questionsHint") : "Questions hint"] : []),
      ...(risks.length ? [t ? t("recorder.risksHint") : "Risks hint"] : []),
      ...(actions.length ? [t ? t("recorder.actionsHint") : "Actions hint"] : []),
    ].slice(0, 4),
    reply_drafts: questions.length
      ? [
          t ? t("recorder.confirmScope") : "Confirm scope",
          t ? t("recorder.checkEvidence") : "Check evidence",
        ]
      : [],
  };
}
