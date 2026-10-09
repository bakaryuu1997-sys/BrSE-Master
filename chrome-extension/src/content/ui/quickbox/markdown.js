"use strict";

import { escapeHtml, sanitizeAiHtml, sanitizeAiText } from "../../../shared/sanitizer.js";

export { escapeHtml } from "../../../shared/sanitizer.js";

export function formatMarkdown(text) {
  if (!text) return "";
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const formattedLines = lines.map((line) => {
    const cleanLine = sanitizeAiText(line.trim());
    if (cleanLine.startsWith("### ")) {
      return `<h3 style="color:var(--brse-accent); font-size:16.5px; margin:8px 0 4px 0; font-weight:bold;">${cleanLine.slice(4)}</h3>`;
    }
    if (cleanLine.startsWith("## ")) {
      return `<h2 style="color:var(--brse-secondary); font-size:19px; margin:10px 0 6px 0; font-weight:bold; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:2px;">${cleanLine.slice(3)}</h2>`;
    }
    if (cleanLine.startsWith("# ")) {
      return `<h1 style="color:var(--brse-primary); font-size:21px; margin:12px 0 8px 0; font-weight:bold; border-bottom:1px solid rgba(255, 107, 94,0.3); padding-bottom:3px;">${cleanLine.slice(2)}</h1>`;
    }
    if (cleanLine.startsWith("- ")) {
      return `<div style="margin-left:10px; color:var(--brse-text); display:flex; align-items:flex-start; gap:6px; margin-bottom:4px; font-size:17px;"><span>•</span><span>${cleanLine.slice(2)}</span></div>`;
    }
    if (cleanLine === "") return '<div style="height:6px;"></div>';

    const formatted = cleanLine
      .replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--brse-primary)">$1</b>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 4px; border-radius:3px; font-family:monospace; color:var(--brse-secondary)">$1</code>');
    return `<div style="font-size:17px; margin-bottom:4px;">${formatted}</div>`;
  });
  return sanitizeAiHtml(formattedLines.join(""));
}

export { splitContentAndDictionary } from "./proposedDictionaryParser.js";
export { renderProposedDictionaryHtml } from "./proposedDictionaryRenderer.js";
