"use strict";

import { safeSendMessage, wrapWords } from "../../utils/dom.js";
import { romajiToKana } from "../../utils/kana.js";
import { MESSAGE_TYPES } from "../../../shared/messageTypes.js";
import { showToast } from "../Toast.js";
import { renderDictionaryError } from "./dictionaryError.js";
import { prependMatchedGlossaryCard } from "./glossaryCard.js";
import { escapeHtml } from "./markdown.js";

export function renderSupremeDictionaryView(shadow, data, options) {
  const div = shadow.getElementById("brse-content");
  if (!div) return;

  const {
    addActionsToBubble,
    executeQuickAdd,
    getIpaData,
    openGlossaryDrawer,
    renderIpaElements,
    setLastSourceLang,
    switchTabInShadow,
  } = options;

  if (data.error) {
    renderDictionaryError(shadow, div, data, switchTabInShadow);
    return;
  }

  const sourceLang = data.sourceLang || "en";
  const hasVietnameseTranslation = data.translationLanguage !== "en";
  setLastSourceLang(sourceLang);

  let html = "";

  html += `
    <div id="brse-dict-standard-content">
      <div style="margin-bottom:8px;">
        <div class="word-title-row">
          <h2 class="word-title">${wrapWords(escapeHtml(data.originalText))}</h2>
          <span class="copy-btn" id="copy-trans" title="Copy bản dịch">📋 Sao chép</span>
          ${hasVietnameseTranslation ? `<span class="copy-btn" id="quick-add-glossary-btn" style="margin-left: 6px; background: rgba(78, 201, 165, 0.15); color: var(--brse-success); border: 1px solid rgba(78, 201, 165, 0.3);" title="Thêm nhanh vào Glossary không cần mở bảng">${getI18nMessage("quickAddBtn", "⚡ Thêm nhanh")}</span>` : ""}
          <span class="copy-btn" id="edit-add-glossary-btn" style="margin-left: 6px; background: rgba(255, 107, 94, 0.15); color: var(--brse-primary); border: 1px solid rgba(255, 107, 94, 0.3);" title="Chỉnh sửa chi tiết trước khi thêm">${getI18nMessage("editBtn", "✏️ Chỉnh sửa")}</span>
        </div>
  `;

  if (sourceLang === "ja" && data.transliteration) {
    const kanaReading = romajiToKana(data.transliteration, data.originalText);
    html += `
      <div class="jp-reading-row" id="brse-spk-ja-btn" title="Phát âm tiếng Nhật">
        <span class="jp-reading-badge">Cách đọc</span>
        <span class="jp-reading-text">${escapeHtml(kanaReading)}</span>
        <span class="spk-icon-ja">🔊</span>
      </div>
    `;
  }

  if (sourceLang === "en") {
    html += `<div class="ipa-row" id="brse-qb-ipa-container">
      <span class="ipa-item" style="opacity: 0.6; pointer-events: none;">⏳ Đang tìm phiên âm...</span>
    </div>`;
  }

  html += `
        <div style="margin-top: 6px; background: rgba(255, 107, 94,0.05); padding: 8px; border-radius: 8px; border-left: 3px solid var(--brse-primary);">
          <span style="color:var(--brse-text-dim); font-size:10px; font-weight:bold; text-transform:uppercase; display:block; margin-bottom:2px;">${hasVietnameseTranslation ? "Ý NGHĨA CHÍNH (VIỆT)" : "ĐỊNH NGHĨA CHÍNH (EN FALLBACK)"}</span>
          <div style="font-size:14px; font-weight:bold; color:#fff;">${escapeHtml(data.translation)}</div>
        </div>
      </div>
  `;

  if (data.japaneseTranslation) {
    html += `
      <div style="margin-top: 8px; background: rgba(255, 138, 125,0.06); padding: 8px; border-radius: 8px; border-left: 3px solid var(--brse-secondary);">
        <span style="color:var(--brse-text-dim); font-size:10px; font-weight:bold; text-transform:uppercase; display:block; margin-bottom:2px;">DỊCH NHẬT (JA)</span>
        <div style="font-size:14px; font-weight:700; color:#ffb9af;">${escapeHtml(data.japaneseTranslation)}</div>
      </div>
    `;
  }

  if (data.dictionary?.length > 0) {
    html += `
      <div class="accordion">
        <div class="accordion-header" data-acc="dict">
          <span>Các từ liên quan / Đồng nghĩa</span>
          <span class="accordion-icon open" id="icon-acc-dict">▲</span>
        </div>
        <div class="accordion-content" id="content-acc-dict">
    `;

    data.dictionary.forEach((e) => {
      html += `
        <div class="dict-item">
          <span class="dict-type-badge">${escapeHtml(e.type)}</span>
          <span class="dict-terms">${escapeHtml(e.terms.slice(0, 5).join(", "))}</span>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  }

  if (data.definitions?.length > 0) {
    html += `
      <div class="accordion">
        <div class="accordion-header" data-acc="def">
          <span>Định nghĩa & Ví dụ</span>
          <span class="accordion-icon open" id="icon-acc-def">▲</span>
        </div>
        <div class="accordion-content" id="content-acc-def">
    `;

    data.definitions.slice(0, 5).forEach((def) => {
      const entries = (def.entries || []).filter((entry) => entry?.desc).slice(0, 5);
      if (entries.length > 0) {
        html += `
          <div class="def-item">
            <div style="font-weight:800; color:var(--brse-accent); margin-bottom:6px; text-transform:capitalize;">${escapeHtml(def.type)}</div>
            ${entries.map((entry) => `
              <div class="def-desc" style="margin: 0 0 6px 0;">
                <span style="color:var(--brse-text);">• ${escapeHtml(entry.desc)}</span>
                ${entry.example ? `<div class="def-ex" style="margin-left:13px; margin-top:2px;">${escapeHtml(entry.example)}</div>` : ""}
              </div>
            `).join("")}
          </div>
        `;
      }
    });

    html += `
        </div>
      </div>
    `;
  }

  div.innerHTML = html;

  appendDictionaryChatBubbles(shadow, data, sourceLang, addActionsToBubble);
  bindDictionaryActions(shadow, div, data, sourceLang, {
    executeQuickAdd,
    getIpaData,
    openGlossaryDrawer,
    renderIpaElements,
  });
  prependMatchedGlossaryCard(shadow, data);
}

function appendDictionaryChatBubbles(shadow, data, sourceLang, addActionsToBubble) {
  const chatHistoryEl = shadow.getElementById("brse-qb-chat-history");
  if (!chatHistoryEl) return;

  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.innerHTML = `Dịch cụm từ: "<b>${escapeHtml(data.originalText)}</b>" <span class="bubble-delete-btn" title="Xóa tin nhắn này">✕</span>`;
  userBubble.querySelector(".bubble-delete-btn").onclick = (e) => {
    e.stopPropagation();
    userBubble.remove();
  };
  chatHistoryEl.appendChild(userBubble);

  const aiBubble = document.createElement("div");
  aiBubble.className = "chat-bubble ai";

  let jaReading = "";
  if (sourceLang === "ja" && data.transliteration) {
    const kanaReading = romajiToKana(data.transliteration, data.originalText);
    jaReading = `<div style="font-size: 13px; color: var(--brse-secondary); font-style: italic; margin-bottom: 4px;">Cách đọc: ${escapeHtml(kanaReading)}</div>`;
  }

  aiBubble.innerHTML = `
    ${jaReading}
    <div style="font-weight: 700; color: #fff; font-size: 15px;">${escapeHtml(data.translation)}</div>
    ${data.japaneseTranslation ? `<div style="font-size: 13px; color: var(--brse-secondary); margin-top: 4px;">JA: ${escapeHtml(data.japaneseTranslation)}</div>` : ""}
    <span class="bubble-delete-btn" title="Xóa tin nhắn này">✕</span>
  `;
  aiBubble.querySelector(".bubble-delete-btn").onclick = (e) => {
    e.stopPropagation();
    aiBubble.remove();
  };

  addActionsToBubble(shadow, aiBubble, data.translation);
  chatHistoryEl.appendChild(aiBubble);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function bindDictionaryActions(shadow, div, data, sourceLang, options) {
  setTimeout(() => {
    const btnCopy = shadow.getElementById("copy-trans");
    if (btnCopy) {
      btnCopy.onclick = () => {
        navigator.clipboard.writeText(data.translation).then(() => showToast("📋 Đã copy bản dịch!"));
      };
    }

    const btnQuickAdd = shadow.getElementById("quick-add-glossary-btn");
    if (btnQuickAdd) {
      btnQuickAdd.onclick = () => {
        options.executeQuickAdd(shadow, data, btnQuickAdd);
      };
    }
    const btnEditAdd = shadow.getElementById("edit-add-glossary-btn");
    if (btnEditAdd) {
      btnEditAdd.onclick = () => {
        options.openGlossaryDrawer(shadow, data);
      };
    }

    const btnJa = shadow.getElementById("brse-spk-ja-btn");
    if (btnJa) {
      btnJa.onclick = () => {
        safeSendMessage({ type: MESSAGE_TYPES.BRSE_SPEAK, text: data.originalText, lang: "ja-JP" });
      };
    }

    shadow.querySelectorAll(".accordion-header").forEach((header) => {
      header.onclick = () => {
        const type = header.getAttribute("data-acc");
        const content = shadow.getElementById(`content-acc-${type}`);
        const icon = shadow.getElementById(`icon-acc-${type}`);

        if (content.classList.contains("collapsed")) {
          content.classList.remove("collapsed");
          icon.classList.add("open");
          icon.innerText = "▲";
        } else {
          content.classList.add("collapsed");
          icon.classList.remove("open");
          icon.innerText = "▼";
        }
      };
    });

    div.querySelectorAll(".brse-word").forEach((w) => {
      w.onclick = (e) => {
        e.stopPropagation();
        const cleanW = w.innerText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
        div.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--brse-text-muted); font-size: 14px; font-family: inherit;">⏳ Đang lấy dữ liệu từ điển chuyên sâu...</div>';
        div.style.opacity = "1";
        safeSendMessage({ type: MESSAGE_TYPES.BRSE_GOOGLE_TRANSLATE, text: cleanW });
      };
    });

    const cleanWord = data.originalText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    const ipaData = options.getIpaData();
    if (sourceLang === "en" && ipaData) {
      options.renderIpaElements(shadow, cleanWord, ipaData);
    }

    div.style.opacity = "1";
  }, 50);
}

function getI18nMessage(key, fallback) {
  return (typeof chrome !== "undefined" && chrome.i18n?.getMessage?.(key)) || fallback;
}
