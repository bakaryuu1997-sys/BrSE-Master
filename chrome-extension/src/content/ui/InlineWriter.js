"use strict";

import { injectThemeTokens } from '../../shared/theme.js';
import { makeDraggable, safeSendMessage, replaceTextFrameworkSafe } from '../utils/dom.js';
import { showToast } from './Toast.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';

let inlineWriter = null;
let currentActiveEl = null;
let currentFullText = "";
let activeOutsideClickListener = null;

export function isInlineWriterActive() {
  return !!inlineWriter;
}

export function showInlineWriter(activeEl, selectedText = "") {
  removeInlineWriter();
  currentActiveEl = activeEl;
  currentFullText = "";

  inlineWriter = document.createElement('div');
  inlineWriter.id = 'brse-iw-root';
  
  const rect = activeEl.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 10;
  const left = Math.max(10, Math.min(window.innerWidth - 460, rect.left + window.scrollX));

  Object.assign(inlineWriter.style, {
    position: 'absolute',
    top: `${top}px`,
    left: `${left}px`,
    width: '440px',
    zIndex: 'var(--brse-z-index)',
    pointerEvents: 'none'
  });

  const shadow = inlineWriter.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = `
    .card {
      background: rgba(29, 30, 34, 0.95);
      border: 1px solid rgba(255, 107, 94, 0.6);
      border-radius: 14px;
      color: var(--brse-text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 107, 94, 0.15);
      overflow: hidden;
      pointer-events: auto;
      backdrop-filter: blur(12px);
      transition: border-color 0.3s;
    }
    .card.streaming {
      border-color: var(--brse-secondary);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 138, 125, 0.25);
    }
    .header {
      background: rgba(35, 37, 41, 0.8);
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(110, 112, 121, 0.5);
      cursor: grab;
      user-select: none;
    }
    .header:active {
      cursor: grabbing;
    }
    .header b {
      color: var(--brse-primary);
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    .header .close {
      cursor: pointer;
      color: var(--brse-text-dim);
      font-size: 14px;
      transition: color 0.2s;
    }
    .header .close:hover {
      color: var(--brse-error);
    }
    .body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .prompt-container {
      position: relative;
    }
    textarea {
      width: 100%;
      min-height: 60px;
      max-height: 150px;
      background: rgba(18, 19, 22, 0.6);
      border: 1px solid rgba(110, 112, 121, 0.8);
      border-radius: 8px;
      color: var(--brse-text);
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.5;
      resize: vertical;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    textarea:focus {
      border-color: var(--brse-secondary);
      box-shadow: 0 0 8px rgba(255, 138, 125, 0.3);
    }
    .suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .tag {
      background: rgba(110, 112, 121, 0.3);
      border: 1px solid rgba(110, 112, 121, 0.6);
      color: var(--brse-text-muted);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      transition: 0.2s;
    }
    .tag:hover {
      background: rgba(255, 107, 94, 0.15);
      border-color: var(--brse-primary);
      color: var(--brse-primary);
    }
    .output-container {
      background: rgba(18, 19, 22, 0.8);
      border: 1px solid rgba(110, 112, 121, 0.5);
      border-radius: 8px;
      padding: 12px;
      max-height: 180px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      color: var(--brse-text);
      display: none;
    }
    .output-container.active {
      display: block;
    }
    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }
    button {
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      font-size: 12px;
      font-weight: 600;
      transition: 0.2s;
      outline: none;
    }
    .btn-secondary {
      background: rgba(110, 112, 121, 0.4);
      color: var(--brse-text-muted);
      border: 1px solid rgba(110, 112, 121, 0.6);
    }
    .btn-secondary:hover {
      background: rgba(110, 112, 121, 0.7);
      color: var(--brse-text);
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--brse-primary), var(--brse-secondary));
      color: #121316;
      box-shadow: 0 4px 12px rgba(255, 107, 94, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(255, 107, 94, 0.4);
    }
    .actions-panel {
      display: none;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      border-top: 1px solid rgba(110, 112, 121, 0.4);
      padding-top: 10px;
      margin-top: 6px;
    }
    .actions-panel.active {
      display: flex;
    }
    .actions-left {
      color: var(--brse-text-dim);
      font-size: 11px;
    }
    .actions-right {
      display: flex;
      gap: 8px;
    }
    .loader {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 138, 125, 0.3);
      border-radius: 50%;
      border-top-color: var(--brse-secondary);
      animation: spin 1s ease-in-out infinite;
      margin-right: 6px;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="header" id="brse-iw-drag">
      <b>INLINE WRITER PROMPT</b>
      <span class="close" id="brse-iw-close">✕</span>
    </div>
    <div class="body">
      <div class="prompt-container">
        <textarea id="brse-iw-input" placeholder="Nhập yêu cầu để AI xử lý văn bản tại chỗ... (Nhấn Enter để gửi)"></textarea>
        <div class="suggestions">
          <span class="tag" data-prompt="Chuyển thành kính ngữ Keigo lịch sự">Kính ngữ Keigo ✍️</span>
          <span class="tag" data-prompt="Tóm tắt spec kỹ thuật này ngắn gọn">Tóm tắt Spec 💡</span>
          <span class="tag" data-prompt="Kiểm tra lỗi ngữ pháp và sửa văn phong Business">Check Ngữ pháp ✨</span>
          <span class="tag" data-prompt="Dịch đoạn này sang tiếng Việt dễ hiểu">Dịch Nhật-Việt 🌐</span>
        </div>
      </div>
      <div id="brse-iw-output" class="output-container"></div>
      <div class="footer" id="brse-iw-footer">
        <button id="brse-iw-btn-close" class="btn-secondary">Hủy</button>
        <button id="brse-iw-btn-submit" class="btn-primary">Gửi AI</button>
      </div>
      <div class="actions-panel" id="brse-iw-actions">
        <span class="actions-left" id="brse-iw-status">AI đang phản hồi...</span>
        <div class="actions-right">
          <button id="brse-iw-btn-insert" class="btn-secondary" style="color: var(--brse-success); border-color: rgba(78, 201, 165, 0.4);">➕ Chèn</button>
          <button id="brse-iw-btn-replace" class="btn-primary">✨ Thay thế</button>
        </div>
      </div>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(card);
  document.body.appendChild(inlineWriter);

  makeDraggable(inlineWriter, shadow.getElementById('brse-iw-drag'));

  const textarea = shadow.getElementById('brse-iw-input');
  textarea.focus();

  // Suggestion tags click handler
  shadow.querySelectorAll('.tag').forEach(tag => {
    tag.onclick = () => {
      textarea.value = tag.getAttribute('data-prompt');
      textarea.focus();
    };
  });

  const submitPrompt = () => {
    const prompt = textarea.value.trim();
    if (!prompt) return;

    // Get current value or selection in active input
    let textContext = selectedText;
    if (!textContext) {
      textContext = activeEl.value || activeEl.innerText || "";
    }

    // Toggle states
    card.classList.add('streaming');
    shadow.getElementById('brse-iw-output').classList.add('active');
    shadow.getElementById('brse-iw-output').innerHTML = '<div style="color: var(--brse-text-dim)"><span class="loader"></span>Đang chuẩn bị dữ liệu...</div>';
    shadow.getElementById('brse-iw-actions').classList.add('active');
    shadow.getElementById('brse-iw-footer').style.display = 'none';

    currentFullText = "";
    
    safeSendMessage({
      type: MESSAGE_TYPES.BRSE_AI_REQUEST,
      action: "inline",
      prompt: prompt,
      text: textContext,
      quick: true
    });
  };

  shadow.getElementById('brse-iw-btn-submit').onclick = submitPrompt;
  shadow.getElementById('brse-iw-btn-close').onclick = removeInlineWriter;
  shadow.getElementById('brse-iw-close').onclick = removeInlineWriter;

  textarea.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitPrompt();
    }
  };

  // Close when clicking outside of InlineWriter
  activeOutsideClickListener = (e) => {
    if (inlineWriter && !inlineWriter.contains(e.target) && e.target !== activeEl) {
      removeInlineWriter();
    }
  };
  
  // Delay listener slightly to prevent immediate trigger on open click/keydown
  setTimeout(() => {
    if (inlineWriter) {
      document.addEventListener('mousedown', activeOutsideClickListener);
      inlineWriter.dataset.outsideClickListenerSet = "true";
    }
  }, 100);

  // Insert Action
  shadow.getElementById('brse-iw-btn-insert').onclick = () => {
    if (!currentFullText) return;
    insertTextIntoActive(activeEl, currentFullText);
    showToast("➕ Đã chèn thành công!");
    removeInlineWriter();
  };

  // Replace Action
  shadow.getElementById('brse-iw-btn-replace').onclick = () => {
    if (!currentFullText) return;
    replaceTextInActive(activeEl, currentFullText);
    showToast("✨ Đã thay thế thành công!");
    removeInlineWriter();
  };
}

export function updateInlineWriterStream(msg) {
  if (!inlineWriter) return;
  const shadow = inlineWriter.shadowRoot;
  const outDiv = shadow.getElementById('brse-iw-output');
  const statusSpan = shadow.getElementById('brse-iw-status');
  const card = shadow.querySelector('.card');

  if (msg.done) {
    statusSpan.innerHTML = '✨ AI đã hoàn thành!';
    card.classList.remove('streaming');
    return;
  }

  if (msg.text) {
    currentFullText = msg.fullText || (currentFullText + msg.text);
    outDiv.innerText = currentFullText;
    outDiv.scrollTop = outDiv.scrollHeight;
    statusSpan.innerHTML = '<span class="loader"></span>AI đang viết...';
  }
}

export function removeInlineWriter() {
  if (inlineWriter) {
    inlineWriter.remove();
    inlineWriter = null;
    currentActiveEl = null;
    currentFullText = "";
  }
  if (activeOutsideClickListener) {
    document.removeEventListener('mousedown', activeOutsideClickListener);
    activeOutsideClickListener = null;
  }
}

function insertTextIntoActive(el, text) {
  if (!el) return;
  el.focus();
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    el.value = val.substring(0, start) + text + val.substring(end);
    el.selectionStart = el.selectionEnd = start + text.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      el.innerText += text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function replaceTextInActive(el, text) {
  replaceTextFrameworkSafe(el, text);
}
