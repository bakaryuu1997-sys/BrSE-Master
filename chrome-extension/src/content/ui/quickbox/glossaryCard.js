"use strict";

import { escapeHtml } from "./markdown.js";

export function prependMatchedGlossaryCard(shadow, data) {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;

  chrome.storage.local.get(["brseGlossaryCache"], (res) => {
    const glossary = res.brseGlossaryCache || [];
    const cleanWord = data.originalText.trim().toLowerCase();

    const matchedTerm = glossary.find((term) => {
      const enSynonyms = (term.english || "").toLowerCase().split(/[\/\s;,]+/).map((s) => s.trim());
      const jpSynonyms = (term.japanese || "").toLowerCase().split(/[\/\s;,]+/).map((s) => s.trim());
      return enSynonyms.includes(cleanWord) || jpSynonyms.includes(cleanWord);
    });

    if (!matchedTerm) return;

    const enList = (matchedTerm.english || "").split(" / ").filter((s) => s);
    const jpList = (matchedTerm.japanese || "").split(" / ").filter((s) => s);
    const viList = (matchedTerm.vietnamese || "").split(" / ").filter((s) => s);

    const cardHtml = `
      <div class="brse-premium-glossary-card" style="
        background: rgba(35, 37, 41, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 138, 125, 0.6);
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.35), 0 0 10px rgba(255, 138, 125,0.15);
        font-family: inherit;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255, 138, 125, 0.3); padding-bottom: 6px;">
          <span style="font-size: 13px; font-weight: 800; color: var(--brse-secondary); display: flex; align-items: center; gap: 4px;">
            💎 THUẬT NGỮ GLOSSARY DỰ ÁN
          </span>
          <span style="font-size: 10px; font-weight: bold; background: rgba(255, 107, 94, 0.2); color: var(--brse-primary); padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
            ${escapeHtml(matchedTerm.category || "System Design")}
          </span>
        </div>
        
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 10px; font-size: 12.5px; line-height: 1.4;">
          <div style="color: var(--brse-primary); font-weight: bold;">🇬🇧 EN:</div>
          <div style="color: var(--brse-text); font-weight: 600;">${enList.map((s) => `<code>${escapeHtml(s)}</code>`).join(", ")}</div>
          
          <div style="color: var(--brse-accent); font-weight: bold;">🇯🇵 JP:</div>
          <div style="color: var(--brse-text); font-weight: 600;">
            ${jpList.join(" / ")} 
            ${matchedTerm.kana ? `<span style="color:var(--brse-text-dim); font-size:11px; font-weight: normal;">(${escapeHtml(matchedTerm.kana)})</span>` : ""}
          </div>
          
          <div style="color: var(--brse-success); font-weight: bold;">🇻🇳 VN:</div>
          <div style="color: var(--brse-success); font-weight: 700;">${viList.join(" / ")}</div>
        </div>
        
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(110, 112, 121, 0.3); font-size: 12px; color: var(--brse-text-muted); line-height: 1.4;">
          ${escapeHtml(matchedTerm.note)}
        </div>
        ${matchedTerm.example ? `
          <div style="margin-top: 6px; background: rgba(255, 107, 94, 0.08); border: 1px solid rgba(255, 107, 94, 0.15); border-radius: 4px; padding: 6px; font-size: 11px; color: var(--brse-primary); font-style: italic; line-height: 1.3;">
            例: ${escapeHtml(matchedTerm.example)}
          </div>
        ` : ""}
      </div>
    `;

    const standardContent = shadow.getElementById("brse-dict-standard-content");
    if (standardContent) {
      const cardWrapper = document.createElement("div");
      cardWrapper.innerHTML = cardHtml;
      standardContent.parentNode.insertBefore(cardWrapper.firstElementChild, standardContent);
    }
  });
}

