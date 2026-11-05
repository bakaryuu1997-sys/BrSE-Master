import type { BrseTodoItem, BrseTodoProjectStat } from "@/lib/brseTodo";
import type { ProjectSetting } from "@/lib/projectSettings";

export function exportProjectSignOffHtml(
  project: ProjectSetting | null,
  items: BrseTodoItem[],
  stats?: BrseTodoProjectStat
) {
  const today = new Date().toISOString().slice(0, 10);
  const projName = project?.name || "Sensei Hub";
  const customerName = project?.customer_name || "Client PIC";
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>業務進捗・検収確認書 - ${projName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif; font-size: 11pt; color: #111; line-height: 1.5; margin: 0; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; }
    .title { font-size: 18pt; font-weight: bold; margin: 0; }
    .subtitle { font-size: 10pt; color: #555; margin-top: 4px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .meta-table td { padding: 6px 10px; border: 1px solid #ddd; font-size: 10pt; }
    .meta-label { background: #f5f5f5; font-weight: bold; width: 22%; }
    .summary-box { background: #f8f9fa; border: 1px solid #ccc; padding: 12px; margin-bottom: 20px; border-radius: 4px; }
    .task-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 9.5pt; }
    .task-table th, .task-table td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
    .task-table th { background: #eaeaea; font-weight: bold; }
    .status-done { color: #15803d; font-weight: bold; }
    .status-open { color: #b45309; }
    .stamp-container { display: flex; justify-content: flex-end; margin-top: 30px; }
    .stamp-table { border-collapse: collapse; text-align: center; font-size: 9pt; }
    .stamp-table th { border: 1px solid #333; background: #f0f0f0; width: 70px; padding: 4px; }
    .stamp-table td { border: 1px solid #333; height: 70px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; border: 0; border-radius: 4px; font-weight: bold; cursor: pointer;">
      🖨️ 印刷 / PDF保存 (Print / Save PDF)
    </button>
  </div>

  <div class="header">
    <h1 class="title">プロジェクト業務進捗および検収確認書</h1>
    <p class="subtitle">PROJECT PROGRESS & ACCEPTANCE SIGN-OFF REPORT</p>
  </div>

  <table class="meta-table">
    <tr>
      <td class="meta-label">プロジェクト名</td>
      <td><strong>${projName}</strong></td>
      <td class="meta-label">作成日</td>
      <td>${today}</td>
    </tr>
    <tr>
      <td class="meta-label">お客様企業名</td>
      <td>${customerName} 様</td>
      <td class="meta-label">担当 BrSE</td>
      <td>システム開発推進チーム</td>
    </tr>
    <tr>
      <td class="meta-label">総合進捗率</td>
      <td colspan="3">
        <strong style="font-size: 13pt; color: ${percent === 100 ? '#15803d' : '#2563eb'};">${percent}% 完了</strong>
        (${done}/${total} タスク完了)
      </td>
    </tr>
  </table>

  <div class="summary-box">
    <strong>■ 業務実施概況 (Executive Summary)</strong><br />
    本報告書は、BrSE業務プロセスにおける全フェーズの実施状況、エビデンスリンク、および成果物をまとめたものです。
  </div>

  <table class="task-table">
    <thead>
      <tr>
        <th style="width: 25%;">フェーズ (Phase)</th>
        <th style="width: 40%;">タスク名 (Task Title)</th>
        <th style="width: 15%;">状態</th>
        <th style="width: 20%;">エビデンス / 参照</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item) => `
        <tr>
          <td>${item.phase}</td>
          <td><strong>${item.title}</strong></td>
          <td>${item.done ? '<span class="status-done">✓ 完了 (Done)</span>' : '<span class="status-open">進行中 (Open)</span>'}</td>
          <td style="word-break: break-all; font-size: 8.5pt;">
            ${
              item.evidences && item.evidences.length > 0
                ? item.evidences.map((e) => `<a href="${e.url}" target="_blank">${e.url}</a>`).join("<br />")
                : item.evidenceUrl
                ? `<a href="${item.evidenceUrl}" target="_blank">${item.evidenceUrl}</a>`
                : "—"
            }
          </td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <!-- Stamp Box for Japanese Client Acceptance -->
  <div class="stamp-container">
    <table class="stamp-table">
      <thead>
        <tr>
          <th>検収確認</th>
          <th>PM確認</th>
          <th>BrSE担当</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    // If pop-up blocked, trigger download
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Project_SignOff_${projName.replace(/\s+/g, "_")}_${today}.html`;
    anchor.click();
  }
}
