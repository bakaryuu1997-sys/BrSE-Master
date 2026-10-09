"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { apiBaseUrl } from "@/lib/config";
import {
  ACTIVE_PROJECT_CHANGED_EVENT,
  getActiveProject,
  getProjectMemorySummary,
  type ProjectSetting,
} from "@/lib/projectSettings";

export interface KeigoChange {
  original: string;
  corrected: string;
  reason_vi: string;
}

export interface KeigoResult {
  id?: number;
  level: string;
  score: number;
  improved: string;
  improved_text?: string;
  changes: KeigoChange[];
  summary_vi: string;
  created_at?: string;
  original_text?: string;
  error?: string;
}

export const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  謙譲語: { label: "謙譲語 (Khiêm nhường)", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  敬語: { label: "敬語 (Kính ngữ)", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  "敬語（オフライン辞書）": {
    label: "Offline / rule engine",
    color: "text-slate-300",
    bg: "bg-slate-500/10 border-slate-500/30",
  },
  丁寧語: { label: "丁寧語 (Lịch sự)", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  カジュアル: { label: "カジュアル (Thường ngày)", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" },
};

export const KEIGO_EXAMPLE_GROUPS = [
  {
    title: "Q&A / xác nhận",
    examples: [
      "お忙しいところ恐れ入りますが、下記の点 về sự xác nhận.",
      "認識に相違がございましたら、ご指摘いただけますと幸いです。",
      "念のため、仕様の前提について確認させていただけますでしょうか。"
    ]
  },
  {
    title: "Báo cáo tiến độ",
    examples: [
      "本日の進捗について、下記の通りご報告いたします。",
      "現在、影響範囲を確認しており、確認でき次第あらためてご報告いたします。",
      "予定より少し遅延しておりますが、本日中に対応方針をご共有いたします。"
    ]
  },
  {
    title: "Nhờ review / phản hồi",
    examples: [
      "お手数をおかけいたしますが、〇月〇日中にレビューいただくことは可能でしょうか。",
      "ご都合のよろしいタイミングでご確認いただけますと幸いです。",
      "修正方針について問題がないか、ご確認のほどよろしくお願いいたします。"
    ]
  },
  {
    title: "Bug / delay / escalation",
    examples: [
      "ご迷惑をおかけしており、誠に申し訳ございません。",
      "本件はリリース影響がある可能性があるため、優先度を上げて確認しております。",
      "原因と暫定対応、恒久対応について整理し、追ってご報告いたします。"
    ]
  },
  {
    title: "Meeting / BrSE work",
    examples: [
      "本日の打ち合わせ内容について、議事録を共有いたします。",
      "次回までの宿題事項として、下記を対応予定です。",
      "関係者間で認識を合わせるため、短時間のお打ち合わせを設定させていただけますでしょうか。"
    ]
  }
];

export const REQUIREMENT_CHECKLIST_GROUPS = [
  {
    title: "Business rule",
    color: "cyan",
    items: [
      "Mục tiêu nghiệp vụ thật sự là gì?",
      "Ai là user chính, ai được xem/sửa/xóa?",
      "Điều kiện thành công và acceptance criteria là gì?",
    ],
  },
  {
    title: "UI / Flow",
    color: "primary",
    items: [
      "Entry point ở đâu, luồng trước/sau màn hình này là gì?",
      "Có empty state, error state, loading state không?",
      "Mobile/responsive, thao tác hàng loạt, export cần gì?",
    ],
  },
  {
    title: "Data / API",
    color: "success",
    items: [
      "Nguồn dữ liệu, format, required/optional field là gì?",
      "Khi sửa/xóa thì audit/history cần lưu tới đâu?",
      "API/DB nào bị ảnh hưởng, có migration không?",
    ],
  },
  {
    title: "Edge case / UAT",
    color: "warning",
    items: [
      "Khi thiếu dữ liệu, trùng dữ liệu, timeout thì xử lý thế nào?",
      "Non-functional: SLA, performance, security có yêu cầu gì?",
      "Khách sẽ test case nào để chấp nhận chức năng?",
    ],
  },
] as const;

export const REQUIREMENT_PROMPTS = [
  "Hãy giúp tôi bóc tách những điểm chưa rõ của requirement này.",
  "Tạo danh sách câu hỏi nên gửi khách Nhật để làm rõ spec này.",
  "Phân tích impact UI / API / DB / test case của thay đổi này.",
  "Viết lại requirement này thành acceptance criteria dễ test.",
];

export const REQUIREMENT_PLAYBOOKS = [
  {
    title: "Before asking customer",
    tone: "tone-card-primary",
    prompt: "Hãy cho tôi checklist những gì phải tự xác nhận nội bộ trước khi hỏi khách.",
    helper: "Tránh hỏi khách những điều team có thể tự suy ra hoặc tự kiểm chứng.",
  },
  {
    title: "Question design",
    tone: "tone-card-cyan",
    prompt: "Hãy biến requirement này thành các câu hỏi ngắn, rõ, khách Nhật dễ trả lời.",
    helper: "Tập trung vào câu hỏi đóng/mở đúng chỗ và tránh hỏi quá mơ hồ.",
  },
  {
    title: "Impact review",
    tone: "tone-card-warning",
    prompt: "Phân tích impact của requirement này theo UI, API, DB, test case, schedule và risk.",
    helper: "Dùng trước khi chốt CR hoặc estimate để không bỏ sót ảnh hưởng.",
  },
  {
    title: "Acceptance criteria",
    tone: "tone-card-success",
    prompt: "Chuyển requirement này thành acceptance criteria rõ, có thể test được.",
    helper: "Hợp khi chuẩn bị UAT, test case hoặc handoff cho dev.",
  },
] as const;

export const REQUIREMENT_JP_EXAMPLES = [
  "本件の想定利用者と、閲覧・登録・更新・削除の権限範囲をご教示いただけますでしょうか。",
  "正常系に加えて、未入力・重複・上限超過時の期待動作についても確認させてください。",
  "受入条件として、どの状態になれば完了と判断されるかをご共有いただけますと幸いです。",
];

export const HISTORY_FILTERS = [
  { id: "all", label: "All" },
  { id: "excellent", label: "80+" },
  { id: "needs-work", label: "< 60" },
  { id: "qna", label: "Q&A" },
  { id: "report", label: "Report" },
  { id: "apology", label: "Apology" },
] as const;

export const COMPOSE_PRESETS: Array<{ id: string; label: string; emoji: string; placeholder: string; hint: string }> = [
  {
    id: "qna",
    label: "Hỏi Q&A",
    emoji: "🔍",
    placeholder: "Vd: Hỏi khách xác nhận quy tắc validate của trường email trong form đăng ký",
    hint: "Câu hỏi đóng, rõ ràng, kèm background ngắn gọn"
  },
  {
    id: "report",
    label: "Báo cáo ngày",
    emoji: "📊",
    placeholder: "Vd: Hôm nay hoàn thành API login, đang test, ngày mai sẽ gửi PR. Có 1 blocker về OAuth token.",
    hint: "Tình trạng hôm nay, kế hoạch ngày mai, vấn đề nếu có"
  },
  {
    id: "apology",
    label: "Xin lỗi / delay",
    emoji: "🙏",
    placeholder: "Vd: Xin lỗi vì PR bị delay 1 ngày do phát hiện bug trong test, sẽ hoàn thành vào chiều mai",
    hint: "Nguyên nhân cụ thể + thời điểm hoàn thành mới"
  },
  {
    id: "cr",
    label: "Đề xuất CR",
    emoji: "🔄",
    placeholder: "Vd: Đề xuất thêm pagination cho API list users vì hiện tại response quá lớn (>5000 records)",
    hint: "Lý do business rõ ràng, impact assessment, phương án giải quyết"
  },
  {
    id: "thanks",
    label: "Cảm ơn",
    emoji: "🌸",
    placeholder: "Vd: Cảm ơn khách đã confirm spec nhanh, giúp team bắt đầu development đúng schedule",
    hint: "Cụ thể điều gì được giúp đỡ, tác động thực tế"
  },
  {
    id: "reminder",
    label: "Nhắc hạn",
    emoji: "⏰",
    placeholder: "Vd: Nhắc khách trả lời Q&A số 5-8 trước thứ 6 vì ảnh hưởng đến sprint planning tuần sau",
    hint: "Lịch sự nhưng rõ deadline và impact nếu không có phản hồi"
  },
];

export function historyTags(item: KeigoResult) {
  const haystack = `${item.original_text || ""} ${item.improved_text || ""} ${item.summary_vi || ""} ${item.level || ""}`.toLowerCase();
  const tags: string[] = [];
  if (item.score >= 80) tags.push("excellent");
  if (item.score < 60) tags.push("needs-work");
  if (/確認|question|q&a|qa|仕様|spec|ご確認|質問/.test(haystack)) tags.push("qna");
  if (/報告|report|進捗|horenso|ホウレンソウ/.test(haystack)) tags.push("report");
  if (/申し訳|sorry|遅延|delay|謝/.test(haystack)) tags.push("apology");
  return tags;
}

export function useKeigoState() {
  const { t, language } = useUiLanguage();
  const [activeMode, setActiveMode] = useState<"keigo" | "compose" | "requirement">("keigo");

  // Compose mode state
  const [composeInput, setComposeInput] = useState("");
  const [composeContext, setComposeContext] = useState("qna");
  const [composeOutput, setComposeOutput] = useState("");
  const [isComposeLoading, setIsComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState("");
  const [composeCopied, setComposeCopied] = useState(false);

  // Checker mode state
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<KeigoResult | null>(null);
  const [error, setError] = useState("");

  // History state
  const [history, setHistory] = useState<KeigoResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<(typeof HISTORY_FILTERS)[number]["id"]>("all");
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);

  // Project state
  const [activeProject, setActiveProject] = useState<ProjectSetting | null>(null);
  const [lastCheckedInput, setLastCheckedInput] = useState("");

  // Requirement mode state
  const [requirementContext, setRequirementContext] = useState("");
  const [requirementQuestion, setRequirementQuestion] = useState("");
  const [requirementReply, setRequirementReply] = useState("");
  const [isRequirementLoading, setIsRequirementLoading] = useState(false);
  const [requirementError, setRequirementError] = useState("");

  const projectMemory = useMemo(() => getProjectMemorySummary(activeProject), [activeProject]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/ai/keigo/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
    setActiveProject(getActiveProject());
    function handleProjectChange() {
      setActiveProject(getActiveProject());
    }

    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
  }, [fetchHistory]);

  const filteredHistory = useMemo(() => {
    const normalizedQuery = historyQuery.trim().toLowerCase();
    return history.filter((item) => {
      const tags = historyTags(item);
      const matchesFilter = historyFilter === "all" || tags.includes(historyFilter);
      const matchesQuery =
        !normalizedQuery ||
        `${item.original_text || ""} ${item.improved_text || ""} ${item.summary_vi || ""} ${item.level || ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [history, historyFilter, historyQuery]);

  async function handleCheck() {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${apiBaseUrl}/ai/keigo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          customer_style: projectMemory.customerStyle,
          communication_notes: projectMemory.communicationNotes,
          report_rule: projectMemory.reportRule,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "API Error");
      }
      const data: KeigoResult = await res.json();
      if (data.error) {
        setError(`AI parse error: ${data.error}`);
      } else {
        setResult(data);
        setLastCheckedInput(inputText);
        fetchHistory(); // Refresh history
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompose() {
    if (!composeInput.trim()) return;
    setIsComposeLoading(true);
    setComposeError("");
    setComposeOutput("");
    try {
      const res = await fetch(`${apiBaseUrl}/ai/keigo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: composeInput,
          context: composeContext,
          mode: "compose",
          customer_style: projectMemory.customerStyle,
          communication_notes: projectMemory.communicationNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "API Error");
      }
      const data = await res.json() as { improved?: string; improved_text?: string; error?: string };
      if (data.error) {
        setComposeError(`AI error: ${data.error}`);
      } else {
        setComposeOutput(data.improved_text || data.improved || "");
      }
    } catch (e: unknown) {
      setComposeError(e instanceof Error ? e.message : "Connection error");
    } finally {
      setIsComposeLoading(false);
    }
  }

  async function copyComposeOutput() {
    if (!composeOutput) return;
    await navigator.clipboard.writeText(composeOutput);
    setComposeCopied(true);
    setTimeout(() => setComposeCopied(false), 2000);
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`${apiBaseUrl}/ai/keigo/history/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silent
    }
  }

  async function handleRequirementAsk(questionOverride?: string) {
    const question = (questionOverride ?? requirementQuestion).trim();
    if (!question) return;
    setIsRequirementLoading(true);
    setRequirementError("");
    try {
      const res = await fetch(`${apiBaseUrl}/ai/requirements/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          requirement_context: requirementContext,
          customer_style: projectMemory.customerStyle,
          communication_notes: projectMemory.communicationNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Requirement AI error");
      }
      const data = (await res.json()) as { reply?: string };
      setRequirementQuestion(question);
      setRequirementReply(data.reply ?? "");
    } catch (e: unknown) {
      setRequirementError(e instanceof Error ? e.message : "Connection error");
    } finally {
      setIsRequirementLoading(false);
    }
  }

  return {
    t,
    language,
    activeMode,
    setActiveMode,
    composeInput,
    setComposeInput,
    composeContext,
    setComposeContext,
    composeOutput,
    setComposeOutput,
    isComposeLoading,
    composeError,
    composeCopied,
    inputText,
    setInputText,
    isLoading,
    result,
    setResult,
    error,
    history,
    historyLoading,
    historyQuery,
    setHistoryQuery,
    historyFilter,
    setHistoryFilter,
    expandedHistory,
    setExpandedHistory,
    activeProject,
    lastCheckedInput,
    requirementContext,
    setRequirementContext,
    requirementQuestion,
    setRequirementQuestion,
    requirementReply,
    setRequirementReply,
    isRequirementLoading,
    requirementError,
    projectMemory,
    filteredHistory,
    handleCheck,
    handleCompose,
    copyComposeOutput,
    handleDelete,
    handleRequirementAsk,
  };
}
