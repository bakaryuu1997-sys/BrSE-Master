"use strict";

import { safeSendMessage, replaceTextFrameworkSafe } from '../utils/dom.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { showToast } from './Toast.js';
import { THEME } from '../../shared/theme.js';

let debounceTimeout = null;
let currentTargetEl = null;
let shadowReplyWidget = null;
let suggestedReplyText = "";

export function initShadowReply() {
  // Listen for keyup and focus events on textareas, inputs, and contenteditable elements
  document.addEventListener('keyup', handleUserTyping);
  document.addEventListener('focusin', handleInputFocus);
  document.addEventListener('focusout', handleInputBlur);
  document.addEventListener('keydown', handleKeyDownGlobal, true);
}

function handleUserTyping(e) {
  const target = e.target;
  if (!isEditableElement(target)) return;

  currentTargetEl = target;
  
  // Clear existing suggestion if they are typing
  hideShadowReplyWidget();

  if (debounceTimeout) clearTimeout(debounceTimeout);
  
  const text = getElementText(target);
  // Only trigger suggestion if the user has typed very little or is starting to reply
  if (text.length > 15) return;

  debounceTimeout = setTimeout(() => {
    triggerShadowReplyGeneration(target);
  }, 1500); // 1.5s pause trigger
}

function handleInputFocus(e) {
  const target = e.target;
  if (!isEditableElement(target)) return;
  currentTargetEl = target;
}

function handleInputBlur(e) {
  // Small timeout to allow Tab clicks to process before hiding
  setTimeout(() => {
    if (currentTargetEl === e.target) {
      hideShadowReplyWidget();
    }
  }, 200);
}

function handleKeyDownGlobal(e) {
  if (e.key === 'Tab' && shadowReplyWidget && suggestedReplyText) {
    // If suggestion is visible, intercept Tab key and insert suggested reply
    e.preventDefault();
    e.stopPropagation();
    
    if (currentTargetEl) {
      replaceTextFrameworkSafe(currentTargetEl, suggestedReplyText);
      showToast("✨ Đã áp dụng câu trả lời Keigo tự động!");
    }
    
    hideShadowReplyWidget();
  }
}

function isEditableElement(el) {
  if (!el) return false;
  const tagName = el.tagName;
  const isContentEditable = el.isContentEditable || el.getAttribute('contenteditable') === 'true';
  return tagName === 'TEXTAREA' || tagName === 'INPUT' || isContentEditable;
}

function getElementText(el) {
  if (!el) return "";
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    return el.value || "";
  }
  return el.innerText || "";
}

function getPageChatContext() {
  // 1. Jira Context
  if (window.location.hostname.includes('atlassian.net')) {
    const comments = [];
    const commentElements = document.querySelectorAll('[data-testid^="issue.activity.comment"], div[id^="comment-"], .comment-thread, .comment-box');
    commentElements.forEach(el => {
      const authorEl = el.querySelector('[data-testid^="comment-author"], .comment-author, strong');
      const textEl = el.querySelector('[data-testid^="comment-text"], .comment-text, .ak-renderer-document');
      if (textEl) {
        const author = authorEl ? authorEl.innerText.trim() : "User";
        const text = textEl.innerText.trim();
        if (text && !comments.some(c => c.includes(text))) {
          comments.push(`${author}: ${text}`);
        }
      }
    });
    if (comments.length > 0) {
      // Get up to the last 5 comments
      return comments.slice(-5).join('\n---\n');
    }
  }

  // 2. Gmail Context
  if (window.location.hostname.includes('mail.google.com')) {
    const emails = document.querySelectorAll('.ii.gt, .a3k');
    if (emails.length > 0) {
      // Get up to the last 3 emails in active thread
      const lastEmails = Array.from(emails).slice(-3).map(el => el.innerText.trim()).filter(Boolean);
      if (lastEmails.length > 0) {
        return lastEmails.join('\n---\n');
      }
    }
  }
  
  // 3. Chatwork Context
  if (window.location.hostname.includes('chatwork.com')) {
    const chatMsgs = document.querySelectorAll('.chatTimeLineMessage, ._message');
    if (chatMsgs.length > 0) {
      // Get up to the last 5 messages in active chat
      const lastMsgs = Array.from(chatMsgs).slice(-5).map(el => el.innerText.trim()).filter(Boolean);
      if (lastMsgs.length > 0) {
        return lastMsgs.join('\n---\n');
      }
    }
  }
  
  // 4. Fallback: scan for any message-like containers or return general page text
  const generalText = document.body.innerText || "";
  return generalText.slice(0, 1000);
}

function triggerShadowReplyGeneration(target) {
  const context = getPageChatContext();
  if (!context || context.trim().length < 5) return;

  // Send request to background
  safeSendMessage({
    type: MESSAGE_TYPES.BRSE_GET_SHADOW_REPLY,
    context: context.trim()
  }).then(res => {
    if (res && res.ok && res.reply && res.reply.trim().length > 0) {
      suggestedReplyText = res.reply.trim();
      // Ensure target is still focused
      if (document.activeElement === target) {
        showShadowReplyWidget(target, suggestedReplyText);
      }
    }
  }).catch(err => {
    console.warn("[ShadowReply] Request failed:", err);
  });
}

function showShadowReplyWidget(target, replyText) {
  hideShadowReplyWidget();

  shadowReplyWidget = document.createElement('div');
  shadowReplyWidget.id = 'brse-shadow-reply-widget';
  
  // Tokyo Night glassmorphic style
  Object.assign(shadowReplyWidget.style, {
    position: 'absolute',
    zIndex: '10000000',
    background: 'rgba(29, 30, 34, 0.95)',
    border: `1.2px dashed ${THEME.success}`,
    borderRadius: '10px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 12px rgba(78, 201, 165, 0.25)',
    backdropFilter: 'blur(10px)',
    padding: '12px 14px',
    width: '380px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: THEME.textMuted,
    pointerEvents: 'auto',
    opacity: '0',
    transform: 'translateY(8px)',
    transition: 'opacity 0.25s ease, transform 0.25s ease'
  });

  const titleRow = document.createElement('div');
  Object.assign(titleRow.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    borderBottom: '1px solid rgba(110, 112, 121, 0.4)',
    paddingBottom: '6px'
  });

  titleRow.innerHTML = `
    <span style="font-weight: 800; font-size: 11.5px; color: ${THEME.success}; display: flex; align-items: center; gap: 4px;">
      <span style="display:inline-block; width:6px; height:6px; background:${THEME.success}; border-radius:50%; box-shadow:0 0 6px ${THEME.success};"></span>
      SHADOW REPLY (GỢI Ý KEIGO)
    </span>
    <span style="font-size: 9.5px; background: rgba(255, 107, 94, 0.2); color: ${THEME.primary}; font-weight: 800; padding: 1.5px 5px; border-radius: 4px; border: 0.8px solid rgba(255, 107, 94, 0.4);">
      ẤN TAB ĐỂ CHÈN
    </span>
  `;

  const contentBox = document.createElement('div');
  Object.assign(contentBox.style, {
    fontSize: '12.5px',
    lineHeight: '1.6',
    color: THEME.text,
    maxHeight: '120px',
    overflowY: 'auto',
    fontStyle: 'italic',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    padding: '4px 0'
  });
  contentBox.textContent = replyText;

  shadowReplyWidget.appendChild(titleRow);
  shadowReplyWidget.appendChild(contentBox);
  document.body.appendChild(shadowReplyWidget);

  // Position the widget beautifully right below the active input
  const rect = target.getBoundingClientRect();
  let top = rect.bottom + window.scrollY + 6;
  let left = rect.left + window.scrollX;

  // Screen overflow correction
  const widgetWidth = 380;
  if (left + widgetWidth > window.innerWidth + window.scrollX - 20) {
    left = window.innerWidth + window.scrollX - widgetWidth - 20;
  }
  if (left < window.scrollX + 10) {
    left = window.scrollX + 10;
  }

  // If running out of bottom space, show above the target
  const widgetHeight = 160;
  if (rect.bottom + widgetHeight > window.innerHeight && rect.top > widgetHeight) {
    top = rect.top + window.scrollY - widgetHeight - 6;
    shadowReplyWidget.style.borderStyle = 'dashed';
  }

  shadowReplyWidget.style.top = `${top}px`;
  shadowReplyWidget.style.left = `${left}px`;
  
  // Trigger fade in animation
  setTimeout(() => {
    if (shadowReplyWidget) {
      shadowReplyWidget.style.opacity = '1';
      shadowReplyWidget.style.transform = 'translateY(0)';
    }
  }, 20);
}

function hideShadowReplyWidget() {
  if (shadowReplyWidget) {
    shadowReplyWidget.remove();
    shadowReplyWidget = null;
    suggestedReplyText = "";
  }
}
