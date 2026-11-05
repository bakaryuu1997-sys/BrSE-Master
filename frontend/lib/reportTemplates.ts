import type { ReportLanguage } from "@/features/reports/useReportsState";

export const DEFAULT_DAILY_TEMPLATES: Record<string, string> = {
  vi: `【Báo cáo ngày】 {reportDate}

Dự án: {projectName}
Người phụ trách: {owner}
Tiến độ: {progressPercent}

Đã hoàn thành hôm nay:
{tasksDone}

Đang thực hiện:
{tasksInProgress}

Kế hoạch ngày mai:
{tasksTomorrow}

Vấn đề / Cần xác nhận:
{blockers}

Ưu tiên tiếp theo:
- Tập trung các Todo có nguy cơ trễ hạn.
- Theo sát Q&A đang chờ phản hồi từ khách hàng.
- Xử lý các Change Request (CR) pending.{customerMemory}`,

  en: `Daily Report - {reportDate}

Project: {projectName}
Owner: {owner}
Progress: {progressPercent}

Completed today:
{tasksDone}

In progress:
{tasksInProgress}

Tomorrow plan:
{tasksTomorrow}

Blockers / decisions needed:
{blockers}

Priority will be handled in order of Todo, Q&A waiting customer, and pending CR impact.{customerMemory}`,

  ja: `【日次報告】 {reportDate}

プロジェクト: {projectName}
担当者: {owner}
進捗率: {progressPercent}

本日完了タスク:
{tasksDone}

進行中タスク:
{tasksInProgress}

明日の予定:
{tasksTomorrow}

課題・相談事項:
{blockers}{customerMemory}`,

  "jp-business": `【日次報告】 {reportDate}

プロジェクト: {projectName}
担当者: {owner}
進捗状況: {progressPercent}

本日完了タスク:
{tasksDone}

進行中タスク:
{tasksInProgress}

明日の予定:
{tasksTomorrow}

課題・確認事項:
{blockers}{customerMemory}`,
};

export const DEFAULT_WEEKLY_TEMPLATES: Record<string, string> = {
  vi: `【Báo cáo tuần】 {start} đến {end}

Số lượng daily report đã tổng hợp: {count}

Việc đã hoàn thành:
{tasksDone}

Rủi ro / Vấn đề tồn đọng:
{blockers}

Trọng tâm tuần sau:
- Tiếp tục xử lý Todo theo mức độ ưu tiên.
- Follow sát Q&A đang chờ khách hàng phản hồi.
- Xác nhận phạm vi và phê duyệt cho các CR pending.`,

  en: `Weekly Summary - {start} to {end}

Daily reports included: {count}

Completed work:
{tasksDone}

Risks / blockers:
{blockers}

Next week focus:
- Continue open Todo items by priority.
- Follow up Q&A waiting customer response.
- Confirm pending CR impact and approval.`,

  ja: `【週次報告】 {start} 〜 {end}

集計日報件数: {count} 件

今週完了したタスク:
{tasksDone}

課題・リスク・ブロッカー:
{blockers}

来週の重点目標:
- 優先度の高いオープンTodoの消化
- 回答待ちQ&Aのフォロー
- 承認待ちCRの影響度確認`,

  "jp-business": `【週次報告】 {start} 〜 {end}

集計日報件数: {count} 件

今週完了したタスク:
{tasksDone}

課題・リスク・ブロッカー:
{blockers}

来週の重点目標:
- 優先度の高いオープンTodoの消化
- 回答待ちQ&Aのフォロー
- 承認待ちCRの影響度確認`,
};

const STORAGE_PREFIX = "brse_custom_report_template";

export function getCustomReportTemplate(type: "daily" | "weekly", lang: ReportLanguage): string {
  if (typeof window === "undefined") {
    return type === "daily" ? DEFAULT_DAILY_TEMPLATES[lang] || DEFAULT_DAILY_TEMPLATES.vi : DEFAULT_WEEKLY_TEMPLATES[lang] || DEFAULT_WEEKLY_TEMPLATES.vi;
  }
  const key = `${STORAGE_PREFIX}_${type}_${lang}`;
  const stored = localStorage.getItem(key);
  if (stored && stored.trim()) {
    return stored;
  }
  return type === "daily" ? DEFAULT_DAILY_TEMPLATES[lang] || DEFAULT_DAILY_TEMPLATES.vi : DEFAULT_WEEKLY_TEMPLATES[lang] || DEFAULT_WEEKLY_TEMPLATES.vi;
}

export function saveCustomReportTemplate(type: "daily" | "weekly", lang: ReportLanguage, template: string): void {
  if (typeof window === "undefined") return;
  const key = `${STORAGE_PREFIX}_${type}_${lang}`;
  localStorage.setItem(key, template);
}

export function resetCustomReportTemplate(type: "daily" | "weekly", lang: ReportLanguage): void {
  if (typeof window === "undefined") return;
  const key = `${STORAGE_PREFIX}_${type}_${lang}`;
  localStorage.removeItem(key);
}

export function renderReportTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, val);
  }
  return result;
}
