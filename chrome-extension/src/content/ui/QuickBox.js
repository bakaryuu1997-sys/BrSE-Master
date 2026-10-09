"use strict";

import { QUICK_BOX_STYLE } from "./QuickBoxStyles.js";
import { makeDraggable, safeSendMessage } from '../utils/dom.js';
import { showToast } from './Toast.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { sanitizeAiHtml } from '../../shared/sanitizer.js';
import { getModelLabel } from '../../shared/modelConfig.js';
import { injectThemeTokens } from '../../shared/theme.js';
import { bindInlineChatComposer } from './quickbox/chatComposer.js';
import { renderSupremeDictionaryView } from './quickbox/dictionaryRenderer.js';
import { executeQuickAdd, makeSafeSlug, openGlossaryDrawer } from './quickbox/glossaryActions.js';
import { bindQuickBoxHeaderActions } from './quickbox/headerActions.js';
import { bindQuickBoxModelSelector, refreshQuickBoxModelOptions } from './quickbox/modelSelector.js';
import {
  applyQuickBoxBaseStyle,
  getInitialQuickBoxFrame,
  repositionQuickBoxNearSelection,
} from './quickbox/position.js';
import { appendQuickBoxResizeHandles, bindQuickBoxResize } from './quickbox/resize.js';
import { bindQuickBoxSyncBadge } from './quickbox/syncBadge.js';
import { bindQuickBoxTabs, switchTabInShadow } from './quickbox/tabs.js';
import { renderBubbleTimestampHtml } from './quickbox/chatTime.js';
import {
  escapeHtml,
  formatMarkdown,
  renderProposedDictionaryHtml,
  splitContentAndDictionary,
} from './quickbox/markdown.js';

// Imported modularized chunks
import { handleQuickBoxReuse } from './quickbox/orchestrator.js';
import { injectGlossaryOverlay } from './quickbox/glossaryOverlay.js';
import { renderIpaElements, playPronunciation } from './quickbox/ipa.js';
import { addActionsToBubble, renderErrorCardWithRetry } from './quickbox/responseActions.js';
import { t } from '../../shared/i18n.js';

export { splitContentAndDictionary } from './quickbox/markdown.js';
export { switchTabInShadow } from './quickbox/tabs.js';
export { addActionsToBubble } from './quickbox/responseActions.js';

let quickBox = null;
let lastSelectionText = "";
let lastSourceLang = "en";
let ipaData = null;
let proposedGlossarySnapshot = [];
let latestAiRuntimeMeta = null;
let quickBoxCleanup = [];

function notifyGlossaryUpdated(savedTerm = null) {
  if (savedTerm) {
    const idx = proposedGlossarySnapshot.findIndex(term => term.id === savedTerm.id);
    if (idx >= 0) {
      proposedGlossarySnapshot[idx] = savedTerm;
    } else {
      proposedGlossarySnapshot.push(savedTerm);
    }
  }
  document.dispatchEvent(new CustomEvent('brse-glossary-updated-local', { detail: { term: savedTerm } }));
}

function refreshProposedGlossarySnapshot() {
  safeSendMessage({ type: MESSAGE_TYPES.BRSE_GET_GLOSSARY })
    .then((response) => {
      if (response && response.ok && Array.isArray(response.terms)) {
        proposedGlossarySnapshot = response.terms;
      }
    })
    .catch(() => {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(["brseGlossaryCache"], (res) => {
          proposedGlossarySnapshot = Array.isArray(res.brseGlossaryCache) ? res.brseGlossaryCache : [];
        });
      }
    });
}

export function showRichQuickBox(selectionRect, options = { tab: 'dict' }) {
  refreshProposedGlossarySnapshot();
  const selectedText = window.getSelection().toString().trim() || lastSelectionText;
  lastSelectionText = selectedText;

  if (quickBox) {
    return handleQuickBoxReuse({
      quickBox,
      shadow: quickBox.shadowRoot,
      selectedText,
      options,
      selectionRect,
      switchTabInShadow,
      repositionQuickBoxNearSelection,
      safeSendMessage,
      MESSAGE_TYPES,
      refreshQuickBoxModelOptions,
      renderIpaElements: (sh, wd, ip) => renderIpaElements(sh, wd, ip, safeSendMessage, MESSAGE_TYPES),
      setIpaData: (val) => { ipaData = val; }
    });
  }
  
  ipaData = null;
  
  quickBox = document.createElement('div');
  quickBox.id = 'brse-qb-root';
  
  applyQuickBoxBaseStyle(quickBox, getInitialQuickBoxFrame(selectionRect, options));

  const activeTab = options.tab || (options.action ? 'chat' : 'dict');

  const shadow = quickBox.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = QUICK_BOX_STYLE;

  const card = document.createElement('div');
  card.className = 'card';

  let chatHistoryHtml = `
    <div class="chat-bubble ai">
      ${t("qbAssistantWelcome", [escapeHtml(selectedText)])}
      <span class="bubble-delete-btn" title="${t("qbDeleteMsgTitle")}">✕</span>
      ${renderBubbleTimestampHtml()}
    </div>
  `;
  if (options.action) {
    const actionTitles = {
      explain: t("qbExplainAi"),
      grammar: t("qbCheckGrammar"),
      polish: t("qbPolishKeigo"),
      summary: options.lang === 'ja' ? t("qbSummaryJp") : t("qbSummaryVi")
    };
    const title = actionTitles[options.action] || t("qbTitleAiRequest");
    chatHistoryHtml += `
      <div class="chat-bubble user">
        ${t("qbTitleAiRequestPage", [title])}
        <span class="bubble-delete-btn" title="${t("qbDeleteMsgTitle")}">✕</span>
        ${renderBubbleTimestampHtml()}
      </div>
      <div class="chat-bubble ai" id="brse-qb-active-ai-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
  }

  const isMemo = !!options.memo;
  const memoTitle = isMemo ? (options.memo.title || t("qbNote")) : t("qbDictionary");
  const memoContent = isMemo ? formatMarkdown(options.memo.body || '') : t("qbLoadingDict");

  card.innerHTML = `
    <div class="tabs-header">
      <div class="tab-item ${activeTab === 'dict' ? 'active' : ''}" id="qb-tab-dict" data-tab="dict">${memoTitle}</div>
      <div class="tab-item ${activeTab === 'chat' ? 'active' : ''}" id="qb-tab-chat" data-tab="chat">${t("qbReferMore")}</div>
      <div class="drag-spacer" id="brse-drag-handle"></div>
      <div id="brse-sync-badge" class="sync-badge" title="${t("qbSyncBadgeTitle")}">
        <span class="sync-icon">☁️</span> <span class="sync-text">${t("qbSyncChecking")}</span>
      </div>
      <span class="header-icon" id="qb-settings" title="${t("qbSettings")}">⚙️</span>
      <span class="header-icon" id="qb-feedback" title="${t("qbFeedback")}">💬</span>
      <span class="header-icon" id="qb-clear-chat" title="${t("qbClearChat")}" style="display: inline-flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </span>
      <span class="header-icon" id="brse-minimize" title="${t("qbMinimize")}">➖</span>
      <span class="header-icon close-icon" id="brse-close">✕</span>
    </div>
    
    <!-- Tab 1: Dictionary -->
    <div id="brse-tab-content-dict" class="content ${activeTab === 'dict' ? 'active' : ''}">
      <div id="brse-content">${memoContent}</div>
    </div>
    
    <!-- Tab 2: AI Chat -->
    <div id="brse-tab-content-chat" class="content ${activeTab === 'chat' ? 'active' : ''}">
      <div class="chat-history" id="brse-qb-chat-history">
        ${chatHistoryHtml}
      </div>
      <!-- Quick Action Pills -->
      <div class="quick-actions-bar">
        <button class="pill-btn" data-prompt="Hãy dịch toàn bộ nội dung tóm tắt trên sang Tiếng Việt chuẩn xác nhất, dùng văn phong IT/BrSE mượt mà, tự nhiên nhất.">${t("qbTranslateViPill")}</button>
        <button class="pill-btn" data-prompt="Hãy soạn thảo một email tiếng Nhật kính ngữ Keigo chuyên nghiệp, trang trọng gửi cho đối tác/khách hàng dựa trên thông tin tóm tắt trên.">${t("qbEmailJpPill")}</button>
        <button class="pill-btn" data-prompt="Hãy tìm, trích xuất và giải thích chi tiết các chữ Kanji khó hoặc thuật ngữ IT chuyên ngành xuất hiện trong văn bản trên.">${t("qbKanjiItPill")}</button>
        <button class="pill-btn" data-prompt="Hãy phân tích Action Items ở trên và lập thành một danh sách công việc (Task list) chi tiết dưới dạng bảng Markdown có phân vai và mức độ ưu tiên.">${t("qbTaskPill")}</button>
        <button class="pill-btn" data-prompt="Nếu văn bản trên chứa log lỗi hoặc mô tả bug, hãy phân tích nguyên nhân sâu xa và đề xuất phương án sửa lỗi chi tiết.">${t("qbBugPill")}</button>
      </div>
    </div>
    
    <!-- Image Preview Container for Ctrl+V Pastes -->
    <div id="brse-qb-image-preview" style="
      display: none;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: rgba(35, 37, 41, 0.4);
      border-top: 1px dashed rgba(255, 107, 94, 0.2);
      flex-shrink: 0;
      box-sizing: border-box;
    "></div>
    
    <!-- Bottom Chat Input -->
    <div class="chat-input-container">
      <select id="brse-persona-select" class="persona-select" title="${t("qbPersonaLabel")}">
        <option value="brse">💻 BrSE</option>
        <option value="keigo">🇯🇵 Keigo</option>
        <option value="writer">✍️ Soạn</option>
        <option value="coder">⚡ Code</option>
      </select>
      <select id="brse-model-select" class="model-select" title="${t("qbModelLabel")}">
        <option value="openrouter/nvidia/nemotron-3-super-120b-a12b:free">🤖 Nemotron 3 Super Free</option>
        <option value="cx/gpt-5.5">🤖 ChatGPT 5.5 Codex</option>
        <option value="qwen2.5-coder:7b-instruct">💻 Qwen 2.5 Coder (Ollama)</option>
        <option value="gemini/gemma-4-31b-it">🤖 Gemma 4 31B</option>
        <option value="nvidia/google/gemma-4-31b-it">🤖 NVIDIA Gemma 4 31B</option>
        <option value="free-logic">✨ 9router Free Logic</option>
      </select>
      <input type="text" id="brse-qb-chat-input" class="chat-input" placeholder="${t("qbInputPlaceholder")}" />
      <button id="brse-qb-chat-send" class="chat-send-btn" title="${t("qbSendBtnTitle")}">➔</button>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(card);

  injectGlossaryOverlay(
    card,
    shadow,
    makeSafeSlug,
    safeSendMessage,
    MESSAGE_TYPES,
    showToast,
    notifyGlossaryUpdated
  );

  appendQuickBoxResizeHandles(shadow);
  
  document.body.appendChild(quickBox);
  
  makeDraggable(quickBox, shadow.getElementById('brse-drag-handle'));

  bindQuickBoxHeaderActions(shadow, {
    quickBox,
    hideQuickBox,
    safeSendMessage,
    showToast,
  });

  const unbindSyncBadge = bindQuickBoxSyncBadge(shadow, { safeSendMessage, showToast });
  if (typeof unbindSyncBadge === "function") quickBoxCleanup.push(unbindSyncBadge);

  bindQuickBoxResize(quickBox, shadow);

  bindQuickBoxTabs(shadow, activeTab);
  const onQuickBoxEscape = (event) => {
    if (event.key === "Escape") hideQuickBox();
  };
  document.addEventListener("keydown", onQuickBoxEscape);
  quickBoxCleanup.push(() => document.removeEventListener("keydown", onQuickBoxEscape));
  
  const triggerInlineChat = bindInlineChatComposer({
    shadow,
    getLastSelectionText: () => lastSelectionText,
    switchTabInShadow,
  });

  shadow.querySelectorAll('.pill-btn').forEach(btn => {
    btn.onclick = () => {
      const prompt = btn.getAttribute('data-prompt');
      const chatInput = shadow.getElementById('brse-qb-chat-input');
      if (chatInput) {
        chatInput.value = prompt;
        triggerInlineChat();
      }
    };
  });
  
  if (!isMemo) {
    const cleanWord = selectedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
    const isEnglishWord = /^[a-zA-Z\s\-]+$/.test(cleanWord) && cleanWord.split(' ').length <= 2;
    
    if (isEnglishWord) {
      safeSendMessage({ type: MESSAGE_TYPES.BRSE_GET_IPA, text: cleanWord }).then(response => {
        if (response && response.ok) {
          ipaData = response;
          renderIpaElements(shadow, cleanWord, response, safeSendMessage, MESSAGE_TYPES);
        }
      });
    }
  }
  
  const unbindModelSelector = bindQuickBoxModelSelector(shadow, { safeSendMessage, showToast });
  if (typeof unbindModelSelector === "function") quickBoxCleanup.push(unbindModelSelector);

  return shadow;
}

export function renderSupremeDictionary(shadow, data) {
  renderSupremeDictionaryView(shadow, data, {
    addActionsToBubble: (sh, bub, txt) => addActionsToBubble(sh, bub, txt, showToast),
    executeQuickAdd: (targetShadow, termData, btnElement) => executeQuickAdd(targetShadow, termData, btnElement, { onSavedTerm: notifyGlossaryUpdated }),
    getIpaData: () => ipaData,
    openGlossaryDrawer,
    renderIpaElements: (sh, wd, ip) => renderIpaElements(sh, wd, ip, safeSendMessage, MESSAGE_TYPES),
    setLastSourceLang: (sourceLang) => { lastSourceLang = sourceLang; },
    switchTabInShadow,
  });
}

export function updateAiContent(shadow, text) {
  const { content, parsedTerms } = splitContentAndDictionary(text, proposedGlossarySnapshot);
  
  const activeBubble = shadow.getElementById('brse-qb-active-ai-bubble');
  const targetEl = activeBubble || shadow.getElementById('brse-content');
  
  const isError = text.trim().startsWith("❌ Lỗi") || text.trim().startsWith("❌ Cài đặt");
  
  if (isError && targetEl) {
    renderErrorCardWithRetry(targetEl, text, safeSendMessage, showToast);
    return;
  }

  const formattedContent = renderAiRuntimeMetaHtml(latestAiRuntimeMeta) + formatMarkdown(content) + renderBubbleTimestampHtml();
  const proposedDictHtml = renderProposedDictionaryHtml(parsedTerms);
  
  if (targetEl) {
    targetEl.innerHTML = sanitizeAiHtml(formattedContent + proposedDictHtml);
  }
  
  if (parsedTerms.length > 0) {
    bindProposedGlossaryActions(shadow, parsedTerms);
  }
  
  window.brseLastSummaryText = text;
  
  const chatHistoryEl = shadow.getElementById('brse-qb-chat-history');
  if (chatHistoryEl) {
    const threshold = 80;
    const isAtBottom = (chatHistoryEl.scrollHeight - chatHistoryEl.scrollTop - chatHistoryEl.clientHeight) < threshold;
    if (isAtBottom) {
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }
  }
}

function bindProposedGlossaryActions(shadow, parsedTerms) {
  shadow.querySelectorAll('.quick-add-to-glossary-btn-pro').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'));
      if (!isNaN(idx) && parsedTerms[idx]) {
        executeQuickAdd(shadow, { isProposed: true, ...parsedTerms[idx] }, btn, {
          onSavedTerm: notifyGlossaryUpdated,
        });
      }
    };
  });
  shadow.querySelectorAll('.add-to-glossary-btn-pro').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'));
      if (!isNaN(idx) && parsedTerms[idx]) {
        openGlossaryDrawer(shadow, { isProposed: true, ...parsedTerms[idx] });
      }
    };
  });
}

export function updateAiRuntimeMeta(shadow, meta = {}) {
  latestAiRuntimeMeta = {
    ...latestAiRuntimeMeta,
    ...meta,
    updatedAt: Date.now(),
  };

  const activeBubble = shadow?.getElementById?.('brse-qb-active-ai-bubble');
  if (!activeBubble) return;

  const existing = activeBubble.querySelector('.brse-qb-ai-meta');
  const html = sanitizeAiHtml(renderAiRuntimeMetaHtml(latestAiRuntimeMeta));
  if (!html) return;
  if (existing) {
    existing.outerHTML = html;
  } else {
    activeBubble.insertAdjacentHTML('afterbegin', html);
  }
}

export function renderAiRuntimeMetaHtml(meta) {
  if (!meta || !meta.model) return "";
  const modelLabel = getModelLabel(meta.model);
  const statusLabel = meta.status === "done"
    ? `Done${typeof meta.elapsedMs === "number" ? ` · ${(meta.elapsedMs / 1000).toFixed(1)}s` : ""}`
    : meta.status === "streaming"
      ? "Streaming"
      : "Connecting";
  return `
    <div class="brse-qb-ai-meta" style="
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 8px 0;
      padding: 3px 7px;
      border-radius: 999px;
      border: 1px solid rgba(255, 107, 94, 0.28);
      background: rgba(255, 107, 94, 0.1);
      color: var(--brse-text-muted);
      font-size: 11px;
      font-weight: 700;
    ">
      <span style="color:var(--brse-primary);">${escapeHtml(modelLabel)}</span>
      <span style="opacity:.65;">${escapeHtml(statusLabel)}</span>
    </div>
  `;
}

export function removeQuickBox() {
  if (quickBox) {
    quickBoxCleanup.forEach((cleanup) => cleanup());
    quickBoxCleanup = [];
    quickBox.remove();
    quickBox = null;
  }
}

export function hideQuickBox() {
  if (quickBox) {
    quickBox.style.display = 'none';
  }
}

export function containsQuickBox(target) {
  return quickBox && quickBox.contains(target);
}
