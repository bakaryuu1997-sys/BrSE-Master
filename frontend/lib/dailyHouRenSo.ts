import type { BrseTodoCommandSummary, BrseTodoItem } from "@/lib/brseTodo";
import type { OperationRecord } from "@/lib/operations";
import type { ProjectSetting } from "@/lib/projectSettings";

export const PHASE_NAME_JA_MAP: Record<string, string> = {
  "1. Kick-off & Requirement": "キックオフ・要件定義工程",
  "2. Communication Setup": "開発・連絡体制構築工程",
  "3. Requirement Analysis": "要件詳細分析・基本設計工程",
  "4. Tracking & Reporting": "進捗管理・日次報告工程",
  "5. Q&A & Change": "Q&A・仕様変更管理工程",
  "6. Testing & UAT": "テスト検証・受入検収工程",
  "7. Closure & Knowledge": "運用保守引継・ナレッジ完了工程",
};

export const TASK_TITLE_JA_MAP: Record<string, string> = {
  // Phase 1
  "Đọc tài liệu đầu vào": "受領資料・インプット文書の精読・確認",
  "Lập Q&A ban đầu": "初期Q&A一覧の作成および仕様疑問点の整理",
  "Kick-off nội bộ": "開発チーム内部キックオフの実施",
  "Kick-off với khách hàng Nhật": "対日顧客キックオフ会議の実施・合意形成",
  "Checklist tài liệu đầu vào": "受領入力ドキュメントの網羅性チェックリスト作成",
  // Phase 2
  "Thiết lập kênh liên lạc": "コミュニケーションチャネルおよび連絡網の整備",
  "Quy chuẩn Git & Commit": "Gitリポジトリ運用方針およびコミットルールの定義",
  "Quy trình xử lý task": "タスク管理フローおよびステータス遷移の合意",
  "Working Agreement": "開発チーム基本合意書（Working Agreement）の締結",
  // Phase 3
  "Thiết kế cơ bản": "基本設計（画面フロー・DB・API仕様・業務ロジック）の策定",
  "Phân tích RD/SRS chi tiết": "要求仕様書（RD/SRS）の詳細分析および仕様精査",
  "Q&A List chuẩn": "顧客確認用Q&A一覧表の作成および仕様確定",
  "Ước lượng công sức": "開発工数見積もり（Story point / Man-month）の算出",
  "Wireframe / Mockup sign-off": "UIワイヤーフレーム／モックアップの作成および顧客承認受領",
  // Phase 4
  "Daily report gửi Nhật": "日次進捗報告書（日報）の作成および顧客提出",
  "Lập WBS": "詳細WBS（作業分解構成図）およびマイルストーン策定",
  "Risk management": "プロジェクトリスク管理表の更新および予防策検討",
  "Burn-down chart tracking": "進捗バーンダウンチャートの集計および分析",
  // Phase 5
  "Q&A process": "Q&A運用フローに基づく質疑管理・顧客エスカレーション",
  "Change Request process": "仕様変更（Change Request）の受付・影響分析・工数試算",
  // Phase 6
  "Test plan & Test cases": "単体・結合テスト計画書およびテストケースの作成",
  "Bug tracking": "不具合管理表（Bug Defect List）の起票・対応状況トラッキング",
  // Phase 7
  "Handover document": "システム運用保守引継書および環境情報の整備",
  "Sign-off & Acceptance": "プロジェクト業務完了検収書の受領手続き",
  "Knowledge base": "プロジェクトナレッジおよび教訓の蓄積",
};

export const TASK_DETAIL_JA_MAP: Record<string, string> = {
  "Checklist tài liệu đầu vào": "受領したRD/SRS、ワイヤーフレーム、DB、API、UI定義等の網羅性確認を完了いたしました。",
  "Đọc tài liệu đầu vào": "提案書、要件定義書、既存システム資料の精読および全体構成の把握を行いました。",
  "Thiết kế cơ bản": "画面遷移図、テーブル定義、APIインターフェース、業務ロジックの設計を完了いたしました。",
  "Phân tích RD/SRS chi tiết": "画面ごとの機能要件を精査し、仕様の曖昧さや矛盾点の洗い出しを行いました。",
  "Q&A List chuẩn": "顧客確認用の標準Q&Aフォーマットを作成し、初期質疑事項を整理・記載いたしました。",
  "Lập WBS": "機能要件に基づきタスクを分解し、担当者・期日・依存関係を反映したWBSを策定いたしました。",
  "Daily report gửi Nhật": "本日の業務実績、進捗率、課題事項、明日の予定をまとめた日次報告書を作成いたしました。",
};

/** Clean phase string: remove raw internal numbers like '1.', '3.' */
export function formatPhaseNameJa(rawPhase: string): string {
  if (PHASE_NAME_JA_MAP[rawPhase]) {
    return PHASE_NAME_JA_MAP[rawPhase];
  }
  // Strip numbers like '1. ', '2- '
  const cleaned = rawPhase.replace(/^\d+[\.\-\s]+/, "").trim();
  return cleaned ? `${cleaned}工程` : "開発工程";
}

/** Translate or clean task title into professional Japanese */
export function formatTaskTitleJa(rawTitle: string): string {
  if (TASK_TITLE_JA_MAP[rawTitle]) {
    return TASK_TITLE_JA_MAP[rawTitle];
  }

  // Common phrase heuristics for Vietnamese -> Japanese
  let translated = rawTitle;
  if (/bổ sung logic/i.test(translated) || /thêm logic/i.test(translated)) {
    translated = translated.replace(/(bổ sung|thêm)\s+logic/gi, "ロジック追加");
  }
  if (/sso với azure ad/i.test(translated) || /azure ad/i.test(translated)) {
    translated = translated.replace(/sso với azure ad/gi, "Azure AD連携におけるSSO認証");
  }
  if (/khách hàng yêu cầu/i.test(translated)) {
    translated = translated.replace(/khách hàng yêu cầu/gi, "お客様ご要望の");
  }
  if (/thiết kế/i.test(translated)) {
    translated = translated.replace(/thiết kế/gi, "設計");
  }
  if (/phân tích/i.test(translated)) {
    translated = translated.replace(/phân tích/gi, "分析");
  }
  if (/báo cáo/i.test(translated)) {
    translated = translated.replace(/báo cáo/gi, "報告");
  }
  if (/tạo/i.test(translated) || /lập/i.test(translated)) {
    translated = translated.replace(/(tạo|lập)/gi, "策定・作成");
  }
  if (/fix bug|sửa lỗi/i.test(translated)) {
    translated = translated.replace(/(fix bug|sửa lỗi)/gi, "不具合修正");
  }

  return translated;
}

/** Translate ticket type */
export function formatTicketTypeJa(type: string): string {
  switch (type.toLowerCase()) {
    case "qna":
      return "Q&A確認";
    case "bug":
      return "不具合対応";
    case "cr":
      return "仕様変更 (CR)";
    default:
      return "業務課題";
  }
}

/** Translate ticket status */
export function formatTicketStatusJa(status: string): string {
  switch (status.toLowerCase()) {
    case "answered":
      return "回答確認済 (Answered)";
    case "resolved":
    case "closed":
      return "対応完了・クローズ済 (Resolved)";
    case "in progress":
    case "inprogress":
      return "対応進行中 (In Progress)";
    case "open":
    case "sent":
      return "顧客確認待ち (Open)";
    case "draft":
      return "起票・作成中 (Draft)";
    default:
      return status;
  }
}

const JAPANESE_DAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** Formats date as '2026年11月03日 (火)' */
export function formatJapaneseDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dayStr = JAPANESE_DAYS[date.getDay()];
  return `${y}年${m}月${d}日 (${dayStr})`;
}

function groupTasksByPhase(tasks: BrseTodoItem[]): Map<string, BrseTodoItem[]> {
  const map = new Map<string, BrseTodoItem[]>();
  for (const t of tasks) {
    const phase = t.phase || "Chung";
    if (!map.has(phase)) map.set(phase, []);
    map.get(phase)!.push(t);
  }
  return map;
}

export interface BuildHouRenSoOptions {
  todoCommand: BrseTodoCommandSummary;
  operations: OperationRecord[];
  activeProject: ProjectSetting | null;
  reporterName?: string;
}

/**
 * Builds a 100% Japanese Enterprise Daily Hou-Ren-So Report (日次進捗報告書)
 * strictly adhering to Japanese business etiquette:
 * - Grouped by Phase (no repetitive phase mentions per task)
 * - Concise, single-line task bullets (箇条書き)
 * - Zero raw internal codes (no '1.', '2.', 'A1', 'B1')
 * - Full Keigo greeting and closing
 * - Explicit evidence URLs
 */
export function buildJapaneseHouRenSoReport({
  todoCommand,
  operations,
  activeProject,
  reporterName = "BrSEチーム",
}: BuildHouRenSoOptions): string {
  const dateStr = formatJapaneseDate();
  const projName = activeProject?.name || "Sensei Hub";
  const doneTasks = todoCommand.doneToday;
  const pendingTasks = todoCommand.nextFocus.slice(0, 4);
  const todayIso = new Date().toISOString().slice(0, 10);
  const resolvedOps = operations.filter((op) => op.updatedAt?.slice(0, 10) === todayIso);
  const risks = todoCommand.deadlineRisk.slice(0, 3);

  const total = todoCommand.total || 0;
  const done = todoCommand.done || 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const lines: string[] = [
    `お世話になっております。${reporterName}でございます。`,
    `本日（${dateStr}）の業務進捗および明日の予定を下記の通りご報告申し上げます。`,
    ``,
    `【日次進捗報告】${dateStr}`,
    `プロジェクト: ${projName}`,
    `進捗率: ${percent}% (完了: ${done} / 全体: ${total} タスク)`,
    ``,
    `■ 本日の作業実績 (Completed Work)`,
  ];

  if (doneTasks.length === 0) {
    lines.push(`・本日の完了タスクなし（進行中タスクおよび仕様精査に注力）`);
  } else {
    const grouped = groupTasksByPhase(doneTasks);
    grouped.forEach((taskList, phase) => {
      const phaseJa = formatPhaseNameJa(phase);
      lines.push(`【${phaseJa}】`);
      taskList.forEach((task) => {
        const titleJa = formatTaskTitleJa(task.title);
        lines.push(`・${titleJa} (完了)`);
        if (task.evidences && task.evidences.length > 0) {
          task.evidences.forEach((ev) => {
            lines.push(`  └ エビデンス: ${ev.url}`);
          });
        } else if (task.evidenceUrl) {
          lines.push(`  └ エビデンス: ${task.evidenceUrl}`);
        }
      });
    });
  }

  lines.push(``, `■ 本日対応したチケット (Q&A / 課題 / CR)`);
  if (resolvedOps.length === 0) {
    lines.push(`・特記事項なし（新規起票・対応チケットなし）`);
  } else {
    resolvedOps.forEach((op) => {
      const typeJa = formatTicketTypeJa(op.type);
      const statusJa = formatTicketStatusJa(op.status);
      const titleJa = formatTaskTitleJa(op.title);
      lines.push(`・[${typeJa}] ${titleJa}（ステータス: ${statusJa}）`);
      if (op.fieldA) {
        lines.push(`  └ 詳細: ${op.fieldA}`);
      }
    });
  }

  lines.push(``, `■ 課題・懸念事項 (Risks & Blockers)`);
  if (risks.length === 0) {
    lines.push(`・特記事項なし（重大なブロッカーはなく、順調に進捗しております）`);
  } else {
    risks.forEach((r) => {
      const titleJa = formatTaskTitleJa(r.title);
      const phaseJa = formatPhaseNameJa(r.phase);
      lines.push(`・【要注意】${titleJa}（${phaseJa} · 期日: ${r.deadline || "未定"}）`);
      lines.push(`  └ 対策: 開発リソースを優先配分し、早期解消を推進しております。`);
    });
  }

  lines.push(``, `■ 進行中および明日の予定 (Next Actions)`);
  if (pendingTasks.length === 0) {
    lines.push(`・次期タスクの仕様精査および準備作業`);
  } else {
    const groupedPending = groupTasksByPhase(pendingTasks);
    groupedPending.forEach((taskList, phase) => {
      const phaseJa = formatPhaseNameJa(phase);
      lines.push(`【${phaseJa}】`);
      taskList.forEach((task) => {
        const titleJa = formatTaskTitleJa(task.title);
        const deadlineStr = task.deadline ? ` (期日: ${task.deadline})` : "";
        lines.push(`・${titleJa}${deadlineStr}`);
      });
    });
  }

  lines.push(``, `以上でございます。引き続き、何卒よろしくお願い申し上げます。`);

  return lines.join("\n");
}

/**
 * Builds an Internal Vietnamese Report for the local BrSE and dev team
 * - Grouped by phase to eliminate redundant phase mentions
 * - Single-line task items
 */
export function buildVietnameseHouRenSoReport({
  todoCommand,
  operations,
  activeProject,
}: BuildHouRenSoOptions): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const projName = activeProject?.name || "Sensei Hub";
  const doneTasks = todoCommand.doneToday;
  const pendingTasks = todoCommand.nextFocus.slice(0, 4);
  const todayIso = new Date().toISOString().slice(0, 10);
  const resolvedOps = operations.filter((op) => op.updatedAt?.slice(0, 10) === todayIso);
  const risks = todoCommand.deadlineRisk.slice(0, 3);

  const total = todoCommand.total || 0;
  const done = todoCommand.done || 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const lines: string[] = [
    `【BÁO CÁO TIẾN ĐỘ TRONG NGÀY】${dateStr}`,
    `Dự án: ${projName} · Phụ trách: BrSE`,
    `Tiến độ tổng thể: ${percent}% (Đã xong ${done}/${total} task)`,
    ``,
    `■ 1. Công việc đã hoàn thành hôm nay:`,
  ];

  if (doneTasks.length === 0) {
    lines.push(`- Chưa hoàn thành task mới (tập trung xử lý các task đang làm)`);
  } else {
    const grouped = groupTasksByPhase(doneTasks);
    grouped.forEach((taskList, phase) => {
      const cleanPhase = phase.replace(/^\d+[\.\-\s]+/, "").trim();
      lines.push(`[${cleanPhase}]`);
      taskList.forEach((task) => {
        lines.push(`- ${task.title} (Hoàn thành)`);
        if (task.evidences && task.evidences.length > 0) {
          task.evidences.forEach((ev) => lines.push(`  └ Bằng chứng: ${ev.url}`));
        } else if (task.evidenceUrl) {
          lines.push(`  └ Bằng chứng: ${task.evidenceUrl}`);
        }
      });
    });
  }

  lines.push(``, `■ 2. Ticket đã xử lý (Q&A / Bug / CR):`);
  if (resolvedOps.length === 0) {
    lines.push(`- Không có ticket mới xử lý hôm nay.`);
  } else {
    resolvedOps.forEach((op) => {
      const statusVi =
        op.status === "closed" ? "Đã đóng" : op.status === "answered" ? "Đã trả lời" : "Đang xử lý";
      lines.push(`- [${op.type.toUpperCase()}] ${op.title} (Trạng thái: ${statusVi})`);
      if (op.fieldA) lines.push(`  └ Nội dung: ${op.fieldA}`);
    });
  }

  lines.push(``, `■ 3. Rủi ro / Blocker cần lưu ý:`);
  if (risks.length === 0) {
    lines.push(`- Không có blocker nghiêm trọng (Tiến độ đúng hạn).`);
  } else {
    risks.forEach((r) => {
      const cleanPhase = (r.phase || "").replace(/^\d+[\.\-\s]+/, "").trim();
      lines.push(`- [CẢNH BÁO] ${r.title} (${cleanPhase} · Hạn chót: ${r.deadline || "Chưa đặt"})`);
    });
  }

  lines.push(``, `■ 4. Kế hoạch ngày mai:`);
  if (pendingTasks.length === 0) {
    lines.push(`- Tiếp tục rà soát yêu cầu và hỗ trợ dev team.`);
  } else {
    const groupedPending = groupTasksByPhase(pendingTasks);
    groupedPending.forEach((taskList, phase) => {
      const cleanPhase = phase.replace(/^\d+[\.\-\s]+/, "").trim();
      lines.push(`[${cleanPhase}]`);
      taskList.forEach((task) => {
        const deadlineStr = task.deadline ? ` (Hạn: ${task.deadline})` : "";
        lines.push(`- ${task.title}${deadlineStr}`);
      });
    });
  }

  return lines.join("\n");
}
