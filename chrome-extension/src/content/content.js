/**
 * BrSE OS local extension bootloader.
 */

import { showSupremeToolbar, removeToolbar, isToolbarActive, containsToolbar } from './ui/Toolbar.js';
import { showRichQuickBox, renderSupremeDictionary, updateAiContent, updateAiRuntimeMeta, removeQuickBox, hideQuickBox, containsQuickBox, addActionsToBubble } from './ui/QuickBox.js';
import { showToast } from './ui/Toast.js';
import { safeSendMessage } from './utils/dom.js';
import { showCommandPalette, removePalette } from './ui/CommandPalette.js';
import { showInlineWriter, removeInlineWriter, isInlineWriterActive, updateInlineWriterStream } from './ui/InlineWriter.js';
import { startOcrCapture } from './ui/OCR.js';
import { createFloatingBButton } from './ui/FloatingTrigger.js';
import { insertBilingualTranslation } from './ui/Bilingual.js';
import { MESSAGE_TYPES } from '../shared/messageTypes.js';
import { getStorageItem, STORAGE_KEYS } from '../shared/storage.js';
import { getNormalizedUrl } from './utils/url.js';
import { t } from '../shared/i18n.js';
import { escapeHtml } from '../shared/sanitizer.js';
import { initKeigoChecker } from './ui/KeigoChecker.js';
import { initGlossaryHighlighter, refreshGlossaryHighlighter } from './ui/GlossaryHighlighter.js';
import { initShadowReply } from './ui/ShadowReply.js';
import { initMeetingRecorder } from './ui/MeetingRecorder.js';
import { initFuriganaHover } from './ui/FuriganaHover.js';
import { containsQuickNote, showQuickNotePanel, updateQuickNoteAiStream } from './ui/QuickNote.js';
import { installBrseLayerVars } from './ui/layers.js';
import {
  collectGenericPageSummarySource,
  collectYouTubeSummarySource,
} from './summarySource.js';
import {
  appendAiFailureNotice,
  buildAiSummaryInput,
  buildFastPageSummary,
  buildLocalizedFastSummary,
  isAiErrorText,
} from './summaryEngine.js';
import { renderBubbleTimestampHtml } from './ui/quickbox/chatTime.js';
import {
  createSelectionMouseState,
  recordSelectionMouseDown,
  shouldShowSelectionToolbar,
} from './selectionTrigger.js';

// Content scripts can't fetch translate.googleapis.com directly (page CORS), so
// translate through the background service worker which holds the host
// permission. Used to localize the extractive summary fallback into VI/JA.
function translateViaBackground(text, lang) {
  return safeSendMessage({
    type: MESSAGE_TYPES.BRSE_TRANSLATE_TEXT,
    text,
    targetLang: lang,
  })
    .then((res) => (res && res.ok ? res.translation || "" : ""))
    .catch(() => "");
}

let selectedText = "";
let currentQuickBoxShadow = null;
let lastBilingualTarget = null;
let currentAction = "";
let lastActiveInput = null;
let currentSummaryLang = "vi";
let currentSummaryDraft = "";
// True once the AI summary reply has rendered, so the async fallback-localizer
// never overwrites a real AI summary with the extractive draft.
let summaryAiTextRendered = false;
const selectionMouseState = createSelectionMouseState();
const SELECTION_TOOLBAR_Y_OFFSET_PX = 12;

function decorateSummaryText(text) {
  return text || "";
}

function isWeakSummaryCache(text) {
  const value = String(text || "");
  return /Không lấy được đủ nội dung|このページから十分な本文を取得できませんでした/.test(value);
}

function init() {
  console.log("%c[BrSE OS] Local extension bootloader active", "color: #ff6b5e; font-weight: 800; font-size: 16px;");
  installBrseLayerVars();

  // HMR / Reload Cleanup is handled dynamically in host-specific bootstrap

  const existingRoot = document.getElementById('brse-trigger-root');
  if (existingRoot) existingRoot.remove();
  
  const existingToolbar = document.getElementById('brse-toolbar-root');
  if (existingToolbar) existingToolbar.remove();

  const existingQuickBox = document.getElementById('brse-qb-root');
  if (existingQuickBox) existingQuickBox.remove();

  const existingPalette = document.getElementById('brse-palette-root');
  if (existingPalette) existingPalette.remove();

  const existingWriter = document.getElementById('brse-iw-root');
  if (existingWriter) existingWriter.remove();
  
  const existingBilingualStyle = document.getElementById('brse-bilingual-style');
  if (existingBilingualStyle) existingBilingualStyle.remove();

  const existingKeigoBadge = document.getElementById('brse-keigo-badge');
  if (existingKeigoBadge) existingKeigoBadge.remove();

  const existingKeigoPopover = document.getElementById('brse-keigo-popover-root');
  if (existingKeigoPopover) existingKeigoPopover.remove();

  const existingGlossaryTooltip = document.getElementById('brse-glossary-tooltip');
  if (existingGlossaryTooltip) existingGlossaryTooltip.remove();

  const existingMeetingTrigger = document.getElementById('brse-meeting-trigger-root');
  if (existingMeetingTrigger) existingMeetingTrigger.remove();

  const existingMeetingRecorder = document.getElementById('brse-meeting-recorder-root');
  if (existingMeetingRecorder) existingMeetingRecorder.remove();

  const existingShadowReply = document.getElementById('brse-shadow-reply-widget');
  if (existingShadowReply) existingShadowReply.remove();

  removeToolbar();
  removeQuickBox();

  // Load modular floating trigger button
  createFloatingBButton({
    onOpenChat: () => {
      safeSendMessage({ type: MESSAGE_TYPES.BRSE_OPEN_SIDEPANEL });
    },
    onRestoreSummary: () => {
      const existing = document.getElementById('brse-qb-root');
      const normalized = getNormalizedUrl(window.location.href);
      const cacheKeyVi = 'brse_summary_vi_' + normalized;
      const cacheKeyJa = 'brse_summary_ja_' + normalized;
      
      chrome.storage.local.get([cacheKeyVi, cacheKeyJa], (res) => {
        const cachedText = res[cacheKeyVi] || res[cacheKeyJa] || window.brseLastSummaryText;
        if (cachedText) {
          window.brseLastSummaryText = cachedText;
          const dummyRect = { bottom: window.innerHeight / 2, left: window.innerWidth / 2 - 290 };
          
          if (existing) {
            existing.style.display = 'block';
            const shadow = existing.shadowRoot;
            if (shadow) {
              const chatTab = shadow.getElementById('qb-tab-chat');
              if (chatTab) chatTab.click();
              
              const chatHistoryEl = shadow.getElementById('brse-qb-chat-history');
              if (chatHistoryEl && chatHistoryEl.children.length <= 1) {
                const userBubble = document.createElement('div');
                userBubble.className = 'chat-bubble user';
                userBubble.innerHTML = `${t("toastSummaryRestore")} <span class="bubble-delete-btn" title="${t("qbDeleteMsgTitle")}">✕</span>${renderBubbleTimestampHtml()}`;
                userBubble.querySelector('.bubble-delete-btn').onclick = (e) => { e.stopPropagation(); userBubble.remove(); };
                chatHistoryEl.appendChild(userBubble);

                const aiBubble = document.createElement('div');
                aiBubble.className = 'chat-bubble ai';
                aiBubble.id = 'brse-qb-active-ai-bubble';
                chatHistoryEl.appendChild(aiBubble);

                updateAiContent(shadow, decorateSummaryText(cachedText));
                const active = shadow.getElementById('brse-qb-active-ai-bubble');
                if (active) {
                  addActionsToBubble(shadow, active, cachedText);
                  active.removeAttribute('id');
                }
              }
            }
          } else {
            currentQuickBoxShadow = showRichQuickBox(dummyRect, { tab: 'chat' });
            // Add gorgeous page metadata context bubble
            // escapeHtml applied to both hostname and pageTitle to prevent XSS from malicious page titles
            const safeHostname = escapeHtml(window.location.hostname);
            const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${safeHostname}`;
            const rawTitle = document.title.length > 40 ? document.title.slice(0, 37) + '...' : document.title;
            const safePageTitle = escapeHtml(rawTitle);
            const chatHistoryEl = currentQuickBoxShadow.getElementById('brse-qb-chat-history');
            if (chatHistoryEl) {
              chatHistoryEl.innerHTML = `
                <div class="chat-bubble user" style="display: flex; align-items: center; gap: 6px; background: rgba(255, 107, 94,0.06); border-color: rgba(255, 107, 94,0.15);">
                  <img src="${faviconUrl}" style="width: 14px; height: 14px; border-radius: 2px;" />
                    <span style="font-weight: 600; color: var(--brse-primary);">${t("summaryPageLabel")}</span>
                  <span style="color: var(--brse-text-muted); font-style: italic;">${safePageTitle}</span>
                  ${renderBubbleTimestampHtml()}
                </div>
                <div class="chat-bubble ai" id="brse-qb-active-ai-bubble"></div>
              `;
            }
            updateAiContent(currentQuickBoxShadow, decorateSummaryText(cachedText));
            const active = currentQuickBoxShadow.getElementById('brse-qb-active-ai-bubble');
            if (active) {
              addActionsToBubble(currentQuickBoxShadow, active, cachedText);
              active.removeAttribute('id');
            }
          }
        } else {
          showToast(t("toastNoSummaryFound"));
        }
      });
    },
    onSummarize: async (lang = 'vi') => {
      currentSummaryLang = lang;
      currentAction = "summary";
      currentSummaryDraft = "";
      const isYouTube = window.location.host.includes('youtube.com') && window.location.search.includes('v=');
      const dummyRect = { bottom: window.innerHeight / 2, left: window.innerWidth / 2 - 290 };
      
      const cacheKey = 'brse_summary_' + lang + '_' + getNormalizedUrl(window.location.href);
      chrome.storage.local.get([cacheKey], async (res) => {
        const cachedText = res[cacheKey];
        if (cachedText && !isAiErrorText(cachedText) && !isWeakSummaryCache(cachedText)) {
          window.brseLastSummaryText = cachedText;
          currentQuickBoxShadow = showRichQuickBox(dummyRect, { action: 'summary', lang });
          updateAiContent(currentQuickBoxShadow, decorateSummaryText(cachedText));
          const active = currentQuickBoxShadow.getElementById('brse-qb-active-ai-bubble');
          if (active) {
            addActionsToBubble(currentQuickBoxShadow, active, cachedText);
            active.removeAttribute('id');
          }
          return;
        }
        if (cachedText) {
          chrome.storage.local.remove(cacheKey);
        }

        currentQuickBoxShadow = showRichQuickBox(dummyRect, { action: 'summary', lang });

        const source = isYouTube
          ? await collectYouTubeSummarySource(window.location, document)
          : collectGenericPageSummarySource(document);
        currentSummaryDraft = buildFastPageSummary(source, {
          lang,
          title: document.title,
          url: window.location.href,
        });
        window.brseLastSummaryText = currentSummaryDraft;
        updateAiContent(currentQuickBoxShadow, decorateSummaryText(`${currentSummaryDraft}\n\n_${t("summaryLoading")}_`));

        // Localize the extractive fallback into VI/JA via the background
        // translator. If AI refine fails or times out, the fallback then reads in
        // the target language instead of the page's original (often English)
        // sentences. Only refreshes the visible draft while the AI reply has not
        // rendered yet, so it never clobbers a real AI summary.
        summaryAiTextRendered = false;
        buildLocalizedFastSummary(source, { lang, title: document.title, url: window.location.href }, translateViaBackground)
          .then((localized) => {
            if (!localized) return;
            currentSummaryDraft = localized;
            window.brseLastSummaryText = localized;
            if (!summaryAiTextRendered && currentAction === 'summary' && currentSummaryLang === lang && currentQuickBoxShadow) {
              updateAiContent(currentQuickBoxShadow, decorateSummaryText(`${localized}\n\n_${t("summaryLoading")}_`));
            }
          })
          .catch(() => {});
        safeSendMessage({
          type: MESSAGE_TYPES.BRSE_AI_REQUEST,
          action: 'summary',
          lang: lang,
          text: source.promptText,
          promptOverride: buildAiSummaryInput(source, {
            lang,
            title: document.title,
            localSummary: currentSummaryDraft,
          }),
          quick: true
        }).then((res) => {
          if (res && (res.ok === false || res.success === false)) {
            updateAiContent(
              currentQuickBoxShadow,
              decorateSummaryText(appendAiFailureNotice(currentSummaryDraft, res.error || "Unknown error", lang))
            );
          }
        });
      });
    },
    onQuickNote: () => {
      const selection = window.getSelection()?.toString()?.trim() || "";
      showQuickNotePanel(selection);
    }
  });

  // Dynamic Host-Specific Adapter Import and Bootstrapping
  const host = window.location.hostname;
  if (host.includes('atlassian.net')) {
    import('./adapters/jira.js').then(({ cleanupJiraAdapter, initJiraAdapter }) => {
      cleanupJiraAdapter();
      initJiraAdapter();
    }).catch(err => console.error("[BrSE] Failed to load Jira adapter:", err));
  } else if (host.includes('mail.google.com')) {
    import('./adapters/gmail.js').then(({ cleanupGmailAdapter, initGmailAdapter }) => {
      cleanupGmailAdapter();
      initGmailAdapter();
    }).catch(err => console.error("[BrSE] Failed to load Gmail adapter:", err));
  } else if (host.includes('chatwork.com')) {
    import('./adapters/chatwork.js').then(({ cleanupChatworkAdapter, initChatworkAdapter }) => {
      cleanupChatworkAdapter();
      initChatworkAdapter();
    }).catch(err => console.error("[BrSE] Failed to load Chatwork adapter:", err));
  }
  
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('focusin', handleFocusIn);
  document.removeEventListener('mousedown', handleMousedownForInput);
  document.removeEventListener('brse-insert-text', handleInsertTextEvent);
  document.removeEventListener('brse-glossary-updated-local', refreshGlossaryHighlighter);
  
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('mousedown', handleMousedownForInput);
  document.addEventListener('brse-insert-text', handleInsertTextEvent);
  document.addEventListener('brse-glossary-updated-local', refreshGlossaryHighlighter);
  
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === MESSAGE_TYPES.BRSE_PING) {
      if (typeof sendResponse === "function") sendResponse({ ok: true });
      return false;
    }
    if (msg.type === MESSAGE_TYPES.BRSE_GLOSSARY_UPDATED) {
      refreshGlossaryHighlighter(msg.term || null);
    }
    if (msg.type === MESSAGE_TYPES.BRSE_GOOGLE_RESULT) {
      if (currentQuickBoxShadow) {
        renderSupremeDictionary(currentQuickBoxShadow, msg.data);
      } else if (lastBilingualTarget) {
        insertBilingualTranslation(lastBilingualTarget, msg.data.translation);
        lastBilingualTarget = null;
      }
    }
    if (msg.type === MESSAGE_TYPES.BRSE_QUICK_AI_RESULT) {
      if (currentQuickBoxShadow) {
        const incomingText = String(msg.text || "");
        // Never blank a summary on an empty AI reply — keep the local draft visible.
        if (currentAction === 'summary' && !incomingText.trim() && !isAiErrorText(incomingText)) {
          return;
        }
        const renderedText = currentAction === 'summary' && isAiErrorText(incomingText)
          ? appendAiFailureNotice(currentSummaryDraft, incomingText, currentSummaryLang)
          : incomingText;
        // Real AI summary arrived — block the async localizer from overwriting it.
        if (currentAction === 'summary' && !isAiErrorText(incomingText)) {
          summaryAiTextRendered = true;
        }
        updateAiContent(currentQuickBoxShadow, currentAction === 'summary' ? decorateSummaryText(renderedText) : renderedText);
        // Progressive caching: Save partially streamed summary to chrome.storage
        if (currentAction === 'summary' && renderedText && !isAiErrorText(incomingText)) {
          const cacheKey = 'brse_summary_' + currentSummaryLang + '_' + getNormalizedUrl(window.location.href);
          chrome.storage.local.set({ [cacheKey]: renderedText });
        }
      }
    }
    if (msg.type === MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK) {
      if (isInlineWriterActive()) {
        updateInlineWriterStream(msg);
      }
      updateQuickNoteAiStream(msg);
      if (currentQuickBoxShadow && (msg.status || msg.model)) {
        updateAiRuntimeMeta(currentQuickBoxShadow, msg);
      }
      if (msg.done && currentQuickBoxShadow) {
        if (currentAction === 'summary' && msg.error && currentSummaryDraft) {
          updateAiContent(
            currentQuickBoxShadow,
            decorateSummaryText(appendAiFailureNotice(currentSummaryDraft, msg.error, currentSummaryLang))
          );
        }
        const active = currentQuickBoxShadow.getElementById('brse-qb-active-ai-bubble');
        if (active) {
          addActionsToBubble(currentQuickBoxShadow, active, window.brseLastSummaryText || "");
          active.removeAttribute('id');
        }
        
        // Final cache on completion
        if (currentAction === 'summary' && window.brseLastSummaryText) {
          const cacheKey = 'brse_summary_' + currentSummaryLang + '_' + getNormalizedUrl(window.location.href);
          chrome.storage.local.set({ [cacheKey]: window.brseLastSummaryText });
        }
      }
    }
    if (msg.type === MESSAGE_TYPES.BRSE_OPEN_PALETTE) {
      showCommandPalette(handlePaletteAction);
    }
    if (msg.type === MESSAGE_TYPES.BRSE_START_OCR_CAPTURE) {
      startOcrCapture();
      if (typeof sendResponse === "function") sendResponse({ success: true });
    }
    if (msg.type === MESSAGE_TYPES.BRSE_COLLECT_TAB_CONTEXT) {
      reportTabContext();
      if (typeof sendResponse === "function") sendResponse({ ok: true });
    }
    return false;
  });

  // Initialize Keigo Checker and Glossary Highlighter
  initKeigoChecker();
  initGlossaryHighlighter();

  // Initialize Shadow Reply and Meeting Recorder
  initShadowReply();
  initMeetingRecorder();

  // Furigana hover (hold Alt + hover Japanese text → kana/romaji/meaning/TTS)
  initFuriganaHover();
}

function reportTabContext() {
  setTimeout(() => {
    try {
      const cleanText = (document.body?.innerText || "")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);
        
      safeSendMessage({
        type: MESSAGE_TYPES.BRSE_REPORT_TAB_CONTEXT,
        title: document.title,
        url: window.location.href,
        content: cleanText
      });
    } catch (e) {
      console.warn("[BrSE] Tab context report failed:", e);
    }
  }, 1500);
}

function handleMouseUp(e) {
  const target = e.target;
  let text = "";
  let rect = null;

  const isInputOrTextarea = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
  
  if (isInputOrTextarea) {
    try {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      if (typeof start === 'number' && typeof end === 'number' && start !== end) {
        text = target.value.substring(start, end).trim();
        rect = {
          left: e.clientX,
          bottom: e.clientY + 8
        };
      }
    } catch (err) {
      console.warn("[BrSE OS] Selection input parsing error:", err);
    }
  } else {
    const s = window.getSelection();
    if (s && s.rangeCount > 0) {
      text = s.toString().trim();
      const r = s.getRangeAt(0).getBoundingClientRect();
      if (r && (r.width > 0 || r.height > 0)) {
        rect = {
          left: r.left,
          bottom: r.bottom + 8
        };
      }
    }
  }

  selectedText = text;
  if (containsQuickBox(e.target) || containsToolbar(e.target)) return;

  const x = e.clientX;
  const y = e.clientY + SELECTION_TOOLBAR_Y_OFFSET_PX;

  getStorageItem(STORAGE_KEYS.TOOLBAR_MODE, "auto").then((mode) => {
    if (!shouldShowSelectionToolbar(e, selectedText, selectionMouseState, mode)) return;
    showSupremeToolbar(x, y, handleAction);
  });
}

function handleMouseDown(e) {
  recordSelectionMouseDown(selectionMouseState, e);
  if (isToolbarActive() && !containsToolbar(e.target)) removeToolbar();
  if (containsQuickNote(e.target)) return;
  if (!containsQuickBox(e.target)) {
    // If chat tab is active, do NOT close on click outside!
    if (currentQuickBoxShadow) {
      const chatTab = currentQuickBoxShadow.getElementById('qb-tab-chat');
      if (chatTab && chatTab.classList.contains('active')) {
        return; // Skip closing to preserve work context
      }
    }
    hideQuickBox();
  }
}

function handleAction(id) {
  if (id === 'copy') {
    navigator.clipboard.writeText(selectedText).then(() => showToast(t("toastCopied")));
  } else if (id === 'google') {
    const s = window.getSelection();
    if (s.rangeCount > 0) {
      currentQuickBoxShadow = showRichQuickBox(s.getRangeAt(0).getBoundingClientRect());
      safeSendMessage({ type: MESSAGE_TYPES.BRSE_GOOGLE_TRANSLATE, text: selectedText });
    }
  } else if (id === 'bilingual') {
    const s = window.getSelection();
    if (s.rangeCount > 0) {
      lastBilingualTarget = s.anchorNode.parentElement;
      safeSendMessage({ type: MESSAGE_TYPES.BRSE_GOOGLE_TRANSLATE, text: selectedText });
    }
  } else if (id === 'speak') {
    if (selectedText) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(selectedText);
      const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(selectedText);
      if (hasJapanese) {
        utterance.lang = 'ja-JP';
      } else {
        utterance.lang = 'en-US';
      }
      window.speechSynthesis.speak(utterance);
    }
  } else if (['grammar', 'polish', 'explain'].includes(id)) {
    const s = window.getSelection();
    if (s.rangeCount > 0) {
      currentQuickBoxShadow = showRichQuickBox(s.getRangeAt(0).getBoundingClientRect());
      safeSendMessage({ type: MESSAGE_TYPES.BRSE_AI_REQUEST, action: id, text: selectedText, quick: true });
    }
  } else if (id === 'sync') {
    safeSendMessage({ 
      type: MESSAGE_TYPES.BRSE_SYNC_KNOWLEDGE, 
      originalText: selectedText, 
      translation: "Manual Capture", 
      url: window.location.href 
    }).then((res) => {
      if (res && res.ok) {
        showToast(t("toastSyncedHub"));
      } else if (res && res.error === "offline_saved") {
        showToast(t("toastOfflineOutbox"));
      } else {
        showToast(t("toastSyncError", [res?.error || "Unknown error"]));
      }
    });
  }
  removeToolbar();
}

function handlePaletteAction(id, text, matchedItem) {
  if (id === 'memo') {
    const dummyRect = { bottom: window.innerHeight / 2, left: window.innerWidth / 2 - 180 };
    currentQuickBoxShadow = showRichQuickBox(dummyRect, { tab: 'dict', memo: matchedItem });
    return;
  }

  const input = text || selectedText;
  if (!input) return showToast(t("toastSelectTextOrCmd"));
  
  const dummyRect = { bottom: window.innerHeight / 2, left: window.innerWidth / 2 - 240 };
  
  if (id === 'google') {
    currentQuickBoxShadow = showRichQuickBox(dummyRect);
    safeSendMessage({ type: MESSAGE_TYPES.BRSE_GOOGLE_TRANSLATE, text: input });
  } else {
    currentQuickBoxShadow = showRichQuickBox(dummyRect);
    safeSendMessage({ type: MESSAGE_TYPES.BRSE_AI_REQUEST, action: id, text: input, quick: true });
  }
}

function handleKeyDown(e) {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    const selection = window.getSelection()?.toString()?.trim() || selectedText || "";
    showQuickNotePanel(selection);
    return;
  }

  if (e.ctrlKey && e.key.toLowerCase() === 'i') {
    const activeEl = document.activeElement;
    if (activeEl && (
      activeEl.tagName === 'TEXTAREA' || 
      activeEl.tagName === 'INPUT' || 
      activeEl.isContentEditable || 
      activeEl.getAttribute('contenteditable') === 'true'
    )) {
      e.preventDefault();
      const s = window.getSelection();
      const selText = s ? s.toString().trim() : "";
      showInlineWriter(activeEl, selText);
    }
  }
}

function handleFocusIn(e) {
  const target = e.target;
  if (!target) return;
  if (target.id && target.id.startsWith('brse-')) return;
  
  const isInputOrTextarea = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  const isContentEditable = target.isContentEditable || target.getAttribute('contenteditable') === 'true';
  
  if (isInputOrTextarea || isContentEditable) {
    lastActiveInput = target;
  }
}

function handleMousedownForInput(e) {
  const target = e.target;
  if (!target) return;
  if (target.id && target.id.startsWith('brse-')) return;
  
  const isInputOrTextarea = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  const isContentEditable = target.isContentEditable || target.getAttribute('contenteditable') === 'true';
  
  if (isInputOrTextarea || isContentEditable) {
    lastActiveInput = target;
  }
}

function handleInsertTextEvent(e) {
  const text = e.detail?.text;
  if (!text) return;
  
  if (lastActiveInput) {
    const success = insertTextIntoElement(lastActiveInput, text);
    if (success) {
      showToast(t("toastInsertedText"));
    } else {
      showToast(t("toastInsertTextFailed"));
    }
  } else {
    showToast(t("toastSelectFieldFirst"));
  }
}

function insertTextIntoElement(el, text) {
  if (!el) return false;
  
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const val = el.value || "";
    el.value = val.substring(0, start) + text + val.substring(end);
    const newCursorPos = start + text.length;
    el.setSelectionRange(newCursorPos, newCursorPos);
    el.focus();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } else if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
    el.focus();
    try {
      const inserted = document.execCommand('insertText', false, text);
      if (inserted) return true;
    } catch (e) {
      console.warn("[BrSE] execCommand insertText failed, falling back to Range API:", e);
    }
    
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);
      
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  return false;
}

init();
