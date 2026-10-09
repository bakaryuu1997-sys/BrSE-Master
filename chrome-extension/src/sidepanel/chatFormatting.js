"use strict";

import { escapeHtml, sanitizeAiHtml } from "../shared/sanitizer.js";

export function formatChatMessage(div) {
  const text = div.innerText || "";
  const html = formatTables(formatLists(formatInlineMarkdown(text)));
  div.innerHTML = sanitizeAiHtml(html);
}

function formatInlineMarkdown(text) {
  const sanitizedText = String(text || "").replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  return escapeHtml(sanitizedText)
    .replace(/```(?:[a-zA-Z0-9]+)?([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

function formatLists(text) {
  const lines = text.split("\n");
  const result = [];
  let inList = false;

  for (const line of lines) {
    const listMatch = line.match(/^\s*[\*-]\s+(.*)$/);
    if (listMatch) {
      if (!inList) {
        result.push('<ul style="margin: 8px 0; padding-left: 20px;">');
        inList = true;
      }
      result.push(`<li style="margin-bottom: 4px; line-height: 1.5;">${listMatch[1]}</li>`);
      continue;
    }
    if (inList) {
      result.push("</ul>");
      inList = false;
    }
    result.push(line);
  }

  if (inList) result.push("</ul>");
  return result.join("\n");
}

function formatTables(text) {
  const lines = text.split("\n");
  const result = [];
  let inTable = false;
  let tableRows = [];

  for (const line of lines) {
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line.split("|").slice(1, -1).map((cell) => cell.trim()));
      continue;
    }

    if (inTable) {
      result.push(buildTableHtml(tableRows));
      inTable = false;
    }
    result.push(line);
  }

  if (inTable) result.push(buildTableHtml(tableRows));
  return result.join("<br>");
}

function buildTableHtml(rows) {
  let tableHtml = '<div class="message-table-wrapper"><table class="premium-table">';
  rows.forEach((row, rowIndex) => {
    if (rowIndex === 1 && row.every((cell) => /^[\-\s:]+$/.test(cell))) return;
    tableHtml += "<tr>";
    row.forEach((cell) => {
      tableHtml += rowIndex === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`;
    });
    tableHtml += "</tr>";
  });
  tableHtml += "</table></div>";
  return tableHtml;
}
