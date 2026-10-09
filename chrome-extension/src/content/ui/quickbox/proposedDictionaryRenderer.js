"use strict";

import { escapeHtml } from "../../../shared/sanitizer.js";

export function renderProposedDictionaryHtml(parsedTerms) {
  if (!parsedTerms || parsedTerms.length === 0) return "";

  let html = `
    <div class="proposed-dict-container" style="
      margin-top: 16px;
      padding: 12px;
      background: rgba(30, 32, 48, 0.65);
      border: 1px solid rgba(255, 138, 125, 0.3);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      font-family: inherit;
    ">
      <h3 style="
        margin: 0 0 12px 0;
        color: var(--brse-secondary);
        font-size: 15px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 6px;
        border-bottom: 1px solid rgba(255, 138, 125, 0.15);
        padding-bottom: 6px;
      ">
        📖 Từ vựng đề xuất cho Glossary
        <span style="
          font-size: 10px;
          background: rgba(255, 138, 125, 0.15);
          color: var(--brse-secondary);
          padding: 1.5px 6px;
          border-radius: 10px;
          font-weight: 600;
        ">${parsedTerms.length} từ</span>
      </h3>
      <div class="proposed-dict-list" style="
        display: flex;
        flex-direction: column;
        gap: 10px;
      ">
  `;

  parsedTerms.forEach((term, index) => {
    const category = escapeHtml(term.category || "System Design");
    const bg = getCategoryBg(category);
    const border = getCategoryBorder(category);
    const color = getCategoryColor(category);

    const enText = escapeHtml(term.english || "---");
    const jpText = term.japanese ? `${escapeHtml(term.japanese)} ${term.kana ? `(${escapeHtml(term.kana)})` : ""}` : "";
    const jpSection = jpText ? `<div style="font-size: 12.5px; color: var(--brse-text-muted); margin-top: 2px;">🇯🇵 ${jpText}</div>` : "";
    const viText = escapeHtml(term.vietnamese || "Chưa có nghĩa");
    const noteText = term.note ? `<div style="font-size: 12px; color: var(--brse-text-dim); font-style: italic; margin-top: 4px;">💡 ${escapeHtml(term.note)}</div>` : "";
    const exampleText = term.example ? `<div style="font-size: 12px; color: var(--brse-success); background: rgba(78, 201, 165, 0.04); border-left: 2px solid rgba(78, 201, 165, 0.3); padding-left: 6px; margin-top: 4px;">📝 ${escapeHtml(term.example)}</div>` : "";

    html += `
      <div class="proposed-term-card" style="
        background: rgba(29, 30, 34, 0.8);
        border: 1px solid rgba(255, 107, 94, 0.15);
        border-radius: 6px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        position: relative;
        transition: all 0.2s ease;
      ">
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-weight: 700; color: #fff; font-size: 14.5px;">${enText}</span>
              <span style="
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                background: ${bg};
                color: ${color};
                border: 1px solid ${border};
                border-radius: 3px;
                padding: 1px 5px;
                letter-spacing: 0.5px;
              ">${category}</span>
            </div>
            ${jpSection}
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
            <span class="quick-add-to-glossary-btn-pro" data-index="${index}" style="
              background: rgba(78, 201, 165, 0.15);
              border: 1px solid rgba(78, 201, 165, 0.3);
              color: var(--brse-success);
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 4px;
              font-family: inherit;
              white-space: nowrap;
            ">
              ${getI18nMessage("quickAddBtn", "⚡ Thêm nhanh")}
            </span>
            <span class="add-to-glossary-btn-pro" data-index="${index}" style="
              background: rgba(255, 107, 94, 0.15);
              border: 1px solid rgba(255, 107, 94, 0.3);
              color: var(--brse-primary);
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 4px;
              font-family: inherit;
              white-space: nowrap;
            ">
              ${getI18nMessage("editBtn", "✏️ Chỉnh sửa")}
            </span>
          </div>
        </div>
        
        <div style="
          margin-top: 6px;
          font-size: 13.5px;
          color: var(--brse-text);
          font-weight: 500;
        ">🇻🇳 ${viText}</div>
        
        ${noteText}
        ${exampleText}
        
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  return html;
}

function getI18nMessage(key, fallback) {
  return (typeof chrome !== "undefined" && chrome.i18n?.getMessage?.(key)) || fallback;
}

function getCategoryColor(cat) {
  const colors = {
    Cloud: "var(--brse-secondary)",
    Database: "#4ec9a5",
    Security: "var(--brse-error)",
    "System Design": "var(--brse-accent)",
    Agile: "var(--brse-success)",
    Frontend: "var(--brse-primary)",
    Backend: "var(--brse-accent-cyan)",
    Technical: "var(--brse-primary)",
    Infrastructure: "var(--brse-secondary)",
    Process: "var(--brse-success)",
    Business: "var(--brse-accent)",
    Quality: "var(--brse-error)",
  };
  return colors[cat] || "var(--brse-primary)";
}

function getCategoryBg(cat) {
  const colors = {
    Cloud: "rgba(255, 138, 125, 0.12)",
    Database: "rgba(42, 195, 222, 0.12)",
    Security: "rgba(255, 85, 85, 0.12)",
    "System Design": "rgba(255, 180, 84, 0.12)",
    Agile: "rgba(78, 201, 165, 0.12)",
    Frontend: "rgba(255, 107, 94, 0.12)",
    Backend: "rgba(180, 249, 248, 0.12)",
    Technical: "rgba(255, 107, 94, 0.12)",
    Infrastructure: "rgba(255, 138, 125, 0.12)",
    Process: "rgba(78, 201, 165, 0.12)",
    Business: "rgba(255, 180, 84, 0.12)",
    Quality: "rgba(255, 93, 108, 0.12)",
  };
  return colors[cat] || "rgba(255, 107, 94, 0.12)";
}

function getCategoryBorder(cat) {
  const colors = {
    Cloud: "rgba(255, 138, 125, 0.3)",
    Database: "rgba(42, 195, 222, 0.3)",
    Security: "rgba(255, 85, 85, 0.3)",
    "System Design": "rgba(255, 180, 84, 0.3)",
    Agile: "rgba(78, 201, 165, 0.3)",
    Frontend: "rgba(255, 107, 94, 0.3)",
    Backend: "rgba(180, 249, 248, 0.3)",
    Technical: "rgba(255, 107, 94, 0.3)",
    Infrastructure: "rgba(255, 138, 125, 0.3)",
    Process: "rgba(78, 201, 165, 0.3)",
    Business: "rgba(255, 180, 84, 0.3)",
    Quality: "rgba(255, 93, 108, 0.3)",
  };
  return colors[cat] || "rgba(255, 107, 94, 0.3)";
}
