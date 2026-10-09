"use strict";

import { injectThemeTokens } from '../../shared/theme.js';
import { makeDraggable, safeSendMessage, replaceTextFrameworkSafe } from '../utils/dom.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { showToast } from './Toast.js';
import { BRSE_LAYER } from './layers.js';
import { t } from '../../shared/i18n.js';

let activeBadge = null;
let activePopover = null;
let currentTarget = null;
let lastAnalyzedText = "";
let improvedText = "";
let resizeObserver = null;
let activeScrollListener = null;
let keigoEnabled = true;
let listenersInstalled = false;
let storageListenerInstalled = false;

const KEIGO_ENABLED_KEY = "brseKeigoEnabled";

function syncKeigoEnabled() {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  chrome.storage.local.get([KEIGO_ENABLED_KEY], (res) => {
    keigoEnabled = res[KEIGO_ENABLED_KEY] !== false;
    if (!keigoEnabled) {
      removeKeigoBadge();
      removeKeigoPopover();
    }
  });
}

export function initKeigoChecker() {
  syncKeigoEnabled();

  if (!storageListenerInstalled && typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[KEIGO_ENABLED_KEY]) return;
      keigoEnabled = changes[KEIGO_ENABLED_KEY].newValue !== false;
      if (!keigoEnabled) {
        removeKeigoBadge();
        removeKeigoPopover();
      }
    });
    storageListenerInstalled = true;
  }

  if (listenersInstalled) return;
  listenersInstalled = true;

  // Capture focus events globally on input/textarea and editable elements
  document.addEventListener('focus', (e) => {
    if (!keigoEnabled) return;
    const target = e.target;
    if (isEditable(target)) {
      showKeigoBadge(target);
    }
  }, true);

  // Capture blur events globally
  document.addEventListener('blur', (e) => {
    if (!keigoEnabled) return;
    const target = e.target;
    // Delay slightly to check if focus shifted to our badge/popover
    setTimeout(() => {
      if (activeBadge && currentTarget === target) {
        const activeEl = document.activeElement;
        // Don't remove if focus moved inside badge or popover
        if (activeEl && (activeEl.closest('#brse-keigo-badge') || activeEl.closest('#brse-keigo-popover-root'))) {
          return;
        }
        removeKeigoBadge();
      }
    }, 200);
  }, true);

  // Global keydown for Ctrl + Alt + K
  document.addEventListener('keydown', (e) => {
    if (!keigoEnabled) return;
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'k') {
      const activeEl = document.activeElement;
      if (isEditable(activeEl)) {
        e.preventDefault();
        triggerKeigoCheck(activeEl);
      }
    }
  });
}

function isEditable(el) {
  if (!el) return false;
  const tagName = el.tagName;
  const isInput = tagName === 'TEXTAREA' || (tagName === 'INPUT' && (el.type === 'text' || !el.type));
  const isContentEditable = el.isContentEditable || el.getAttribute('contenteditable') === 'true';
  const role = el.getAttribute('role');
  const isTextBox = role === 'textbox' || role === 'combobox';

  // Guard against extension roots
  if (el.closest('#brse-iw-root') || el.closest('#brse-keigo-badge') || el.closest('#brse-keigo-popover-root') || el.closest('#brse-command-palette')) {
    return false;
  }
  return isInput || isContentEditable || isTextBox;
}

function showKeigoBadge(target) {
  if (!keigoEnabled) return;
  removeKeigoBadge();
  currentTarget = target;

  activeBadge = document.createElement('div');
  activeBadge.id = 'brse-keigo-badge';
  
  Object.assign(activeBadge.style, {
    position: 'absolute',
    zIndex: String(BRSE_LAYER.base + 8),
    pointerEvents: 'auto'
  });

  const shadow = activeBadge.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = `
    .badge-btn {
      background: rgba(29, 30, 34, 0.95);
      border: 1px solid rgba(255, 107, 94, 0.7);
      border-radius: 999px;
      color: var(--brse-primary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: bold;
      width: 28px;
      height: 28px;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 107, 94, 0.2);
      backdrop-filter: blur(8px);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    .badge-btn:hover {
      background: rgba(35, 37, 41, 0.98);
      border-color: var(--brse-secondary);
      color: var(--brse-secondary);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 138, 125, 0.4);
      transform: translateY(-1px);
    }
    .badge-btn:active {
      transform: translateY(1px);
    }
    .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: linear-gradient(135deg, var(--brse-primary), var(--brse-secondary));
      color: var(--brse-surface);
      font-size: 10px;
      font-weight: 900;
      border-radius: 50%;
    }
  `;

  const btn = document.createElement('button');
  btn.className = 'badge-btn';
  btn.title = 'AI Keigo Real-time Checker (Ctrl + Alt + K)';
  btn.setAttribute('aria-label', 'AI Keigo Real-time Checker');
  const logo = document.createElement('span');
  logo.className = 'logo';
  logo.textContent = '敬';
  btn.appendChild(logo);
  
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    triggerKeigoCheck(target);
  };

  shadow.appendChild(style);
  shadow.appendChild(btn);
  document.body.appendChild(activeBadge);

  // Dynamic alignment
  alignBadge(target, activeBadge);

  // ResizeObserver to track editor changes
  resizeObserver = new ResizeObserver(() => {
    alignBadge(target, activeBadge);
  });
  resizeObserver.observe(target);

  // Scroll listener
  activeScrollListener = () => {
    alignBadge(target, activeBadge);
  };
  window.addEventListener('scroll', activeScrollListener, { passive: true });
}

function alignBadge(target, badge) {
  if (!target || !badge) return;
  const rect = target.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    badge.style.display = 'none';
    return;
  }
  badge.style.display = 'block';
  // Keep the badge small and near the top-right of the editor so it does not cover typed text.
  const top = Math.max(8, rect.top + window.scrollY + 6);
  const left = Math.min(
    window.scrollX + window.innerWidth - 36,
    Math.max(window.scrollX + 8, rect.right + window.scrollX - 34)
  );
  badge.style.top = `${top}px`;
  badge.style.left = `${left}px`;
}

function removeKeigoBadge() {
  if (activeBadge) {
    activeBadge.remove();
    activeBadge = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (activeScrollListener) {
    window.removeEventListener('scroll', activeScrollListener);
    activeScrollListener = null;
  }
}

function triggerKeigoCheck(target) {
  if (!keigoEnabled) return;
  currentTarget = target;
  const text = target.value || target.innerText || "";
  const cleaned = text.trim();

  // Show popover UI
  showKeigoPopover(target);

  if (!cleaned) {
    // If no text selected/entered yet, show quick Vietnamese-to-Keigo input form
    renderKeigoInputMode(target);
    return;
  }

  executeKeigoAnalysis(cleaned);
}

function renderKeigoInputMode(target) {
  if (!activePopover) return;
  const shadow = activePopover.shadowRoot;
  const contentEl = shadow.getElementById('brse-keigo-content');

  let selectedContext = "Gửi Khách hàng (Trang trọng)";

  contentEl.innerHTML = `
    <div class="quick-input-container">
      <div style="font-size: 13px; font-weight: 700; color: var(--brse-text);">
        🇻🇳 Nhập ý tiếng Việt ➔ 🇯🇵 Kính ngữ Nhật (Keigo)
      </div>
      <div style="font-size: 11.5px; color: var(--brse-text-muted);">
        Chuyển ý tứ giao tiếp thành câu kính ngữ công sở chuẩn Nhật để gửi khách hoặc nội bộ:
      </div>
      <textarea id="keigo-custom-input" class="quick-input-area" placeholder="Ví dụ: mai mình bận họp với khách cả sáng nên đầu giờ chiều sẽ gửi tài liệu thiết kế ạ..."></textarea>
      
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 11px; font-weight: 600; color: var(--brse-text-dim);">Ngữ cảnh giao tiếp:</span>
        <div class="context-chips">
          <button type="button" class="context-chip active" data-context="Gửi Khách hàng (Trang trọng)">🏢 Gửi Khách hàng</button>
          <button type="button" class="context-chip" data-context="Nội bộ / Chatwork">💬 Nội bộ / Chatwork</button>
          <button type="button" class="context-chip" data-context="Nhờ vả / Xin lỗi">🙏 Nhờ vả / Xin lỗi</button>
        </div>
      </div>
    </div>

    <div class="footer">
      <button id="brse-keigo-btn-cancel" class="btn-secondary">Đóng</button>
      <button id="brse-keigo-btn-generate" class="btn-primary">✦ Tạo Kính ngữ</button>
    </div>
  `;

  // Context chips click
  const chips = contentEl.querySelectorAll('.context-chip');
  chips.forEach(chip => {
    chip.onclick = () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedContext = chip.getAttribute('data-context');
    };
  });

  const textarea = contentEl.querySelector('#keigo-custom-input');
  if (textarea) setTimeout(() => textarea.focus(), 150);

  shadow.getElementById('brse-keigo-btn-cancel').onclick = removeKeigoPopover;
  
  shadow.getElementById('brse-keigo-btn-generate').onclick = () => {
    const val = textarea.value.trim();
    if (!val) {
      showToast("⚠️ Vui lòng nhập ý tiếng Việt hoặc nháp cần tạo kính ngữ!");
      textarea.focus();
      return;
    }
    executeKeigoAnalysis(val, selectedContext);
  };
}

function executeKeigoAnalysis(inputText, customerStyle = "") {
  if (!activePopover) return;
  const shadow = activePopover.shadowRoot;
  const contentEl = shadow.getElementById('brse-keigo-content');

  contentEl.innerHTML = `
    <div class="loader-container">
      <div class="loader"></div>
      <div class="loader-text">Đang phân tích & chuyển đổi Kính ngữ...</div>
    </div>
  `;

  safeSendMessage({
    type: MESSAGE_TYPES.BRSE_CHECK_KEIGO,
    text: inputText,
    customer_style: customerStyle
  }).then(response => {
    if (response && response.ok && response.data) {
      renderKeigoResults(response.data);
    } else {
      contentEl.innerHTML = `
        <div class="error-container">
          <span style="color: var(--brse-error); font-size: 20px;">✕</span>
          <p>${t("kcLocalBackendErr", [response?.error || 'Unknown Error'])}</p>
          <p style="font-size: 11px; color: var(--brse-text-dim); margin-top: 5px;">${t("kcStartBackendPrompt")}</p>
        </div>
      `;
    }
  }).catch(err => {
    contentEl.innerHTML = `
      <div class="error-container">
        <span style="color: var(--brse-error); font-size: 20px;">✕</span>
        <p>${t("kcErrorGeneral", [err.message])}</p>
      </div>
    `;
  });
}

function showKeigoPopover(target) {
  removeKeigoPopover();

  activePopover = document.createElement('div');
  activePopover.id = 'brse-keigo-popover-root';
  
  const rect = target.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 10;
  const left = Math.max(10, Math.min(window.innerWidth - 490, rect.left + window.scrollX));

  Object.assign(activePopover.style, {
    position: 'absolute',
    top: `${top}px`,
    left: `${left}px`,
    width: '470px',
    zIndex: '999999',
    pointerEvents: 'none'
  });

  const shadow = activePopover.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = `
    .card {
      background: rgba(29, 30, 34, 0.98);
      border: 1px solid rgba(255, 138, 125, 0.6);
      border-radius: 16px;
      color: var(--brse-text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 138, 125, 0.15);
      overflow: hidden;
      pointer-events: auto;
      backdrop-filter: blur(16px);
      transition: all 0.3s;
    }
    .header {
      background: rgba(35, 37, 41, 0.85);
      padding: 12px 16px;
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
    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--brse-secondary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .header .close {
      cursor: pointer;
      color: var(--brse-text-dim);
      font-size: 16px;
      transition: color 0.2s;
    }
    .header .close:hover {
      color: var(--brse-error);
    }
    .body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 480px;
      overflow-y: auto;
    }
    .score-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(18, 19, 22, 0.5);
      border-radius: 10px;
      padding: 12px;
      border: 1px solid rgba(110, 112, 121, 0.4);
    }
    .score-desc {
      flex: 1;
    }
    .score-level {
      font-size: 14px;
      font-weight: bold;
      color: var(--brse-primary);
    }
    .score-summary {
      font-size: 12px;
      color: var(--brse-text-muted);
      margin-top: 4px;
      line-height: 1.4;
    }
    .section-title {
      font-size: 11px;
      font-weight: bold;
      color: var(--brse-text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .diff-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .diff-box {
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .diff-original {
      background: rgba(255, 93, 108, 0.08);
      border: 1px solid rgba(255, 93, 108, 0.3);
      color: var(--brse-error);
    }
    .diff-improved {
      background: rgba(78, 201, 165, 0.08);
      border: 1px solid rgba(78, 201, 165, 0.4);
      color: var(--brse-success);
    }
    .changes-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .change-item {
      background: rgba(18, 19, 22, 0.4);
      border: 1px solid rgba(110, 112, 121, 0.3);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      line-height: 1.5;
    }
    .change-diff {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .change-original {
      color: var(--brse-error);
      text-decoration: line-through;
    }
    .change-arrow {
      color: var(--brse-text-dim);
    }
    .change-corrected {
      color: var(--brse-success);
    }
    .change-reason {
      color: var(--brse-text-muted);
      font-style: italic;
      padding-left: 6px;
      border-left: 2px solid var(--brse-primary);
    }
    .quick-input-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .quick-input-area {
      width: 100%;
      height: 95px;
      background: rgba(18, 19, 22, 0.6);
      border: 1px solid rgba(110, 112, 121, 0.5);
      border-radius: 8px;
      color: var(--brse-text);
      font-size: 13px;
      line-height: 1.5;
      padding: 10px 12px;
      box-sizing: border-box;
      resize: vertical;
      font-family: inherit;
    }
    .quick-input-area:focus {
      outline: none;
      border-color: var(--brse-secondary);
      box-shadow: 0 0 0 1px var(--brse-secondary);
    }
    .context-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .context-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: var(--brse-text-muted);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .context-chip.active {
      background: rgba(255, 107, 94, 0.18);
      border-color: var(--brse-secondary);
      color: var(--brse-secondary);
      font-weight: 700;
    }
    .footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      border-top: 1px solid rgba(110, 112, 121, 0.4);
      padding-top: 12px;
      margin-top: 6px;
    }
    button {
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
      outline: none;
    }
    .btn-copy {
      background: rgba(255, 255, 255, 0.08);
      color: var(--brse-text);
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    .btn-copy:hover {
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.3);
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
    .btn-primary:active {
      transform: translateY(1px);
    }
    
    /* Loader styles */
    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 16px;
    }
    .loader {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 138, 125, 0.2);
      border-radius: 50%;
      border-top-color: var(--brse-secondary);
      animation: spin 1s ease-in-out infinite;
    }
    .loader-text {
      color: var(--brse-text-muted);
      font-size: 13px;
      text-align: center;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .error-container {
      text-align: center;
      padding: 30px 10px;
      color: var(--brse-text);
    }
    .error-container p {
      margin-top: 8px;
      font-size: 13px;
    }
    
    /* SVG Chart */
    .circular-chart {
      display: block;
      max-width: 54px;
      max-height: 54px;
    }
    .circle-bg {
      fill: none;
      stroke: rgba(110, 112, 121, 0.4);
      stroke-width: 2.8;
    }
    .circle {
      fill: none;
      stroke-width: 2.8;
      stroke-linecap: round;
      animation: progress 1.2s ease-out forwards;
    }
    @keyframes progress {
      0% {
        stroke-dasharray: 0 100;
      }
    }
  `;

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="header" id="brse-keigo-drag">
      <div class="header-title">
        <span style="color: var(--brse-primary);">✦</span> ${t("kcHeaderTitle")}
      </div>
      <span class="close" id="brse-keigo-close">✕</span>
    </div>
    <div class="body" id="brse-keigo-content">
      <!-- Loaded dynamically -->
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(card);
  document.body.appendChild(activePopover);

  makeDraggable(activePopover, shadow.getElementById('brse-keigo-drag'));

  shadow.getElementById('brse-keigo-close').onclick = removeKeigoPopover;

  // Click outside listener
  const clickOutside = (e) => {
    if (activePopover && !activePopover.contains(e.target) && e.target !== target && !e.target.closest('#brse-keigo-badge')) {
      removeKeigoPopover();
      document.removeEventListener('mousedown', clickOutside);
    }
  };
  setTimeout(() => {
    document.addEventListener('mousedown', clickOutside);
  }, 100);
}

function renderKeigoResults(data) {
  if (!activePopover) return;
  const shadow = activePopover.shadowRoot;
  const contentEl = shadow.getElementById('brse-keigo-content');

  const score = data.score || 0;
  improvedText = data.improved || "";
  
  // Decide stroke color based on score
  let scoreColor = "var(--brse-error)"; // red
  if (score >= 80) {
    scoreColor = "var(--brse-success)"; // matcha green
  } else if (score >= 60) {
    scoreColor = "var(--brse-accent)"; // gold/orange
  }

  let changesHtml = "";
  if (Array.isArray(data.changes) && data.changes.length > 0) {
    changesHtml = `
      <div>
        <div class="section-title">${t("kcChangesDetail")}</div>
        <div class="changes-list">
          ${data.changes.map(ch => `
            <div class="change-item">
              <div class="change-diff">
                <span class="change-original">${escapeHtml(ch.original)}</span>
                <span class="change-arrow">→</span>
                <span class="change-corrected">${escapeHtml(ch.corrected)}</span>
              </div>
              ${ch.reason_vi ? `<div class="change-reason">${escapeHtml(ch.reason_vi)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    changesHtml = `
      <div style="font-size: 12px; color: var(--brse-text-dim); text-align: center; font-style: italic; padding: 10px;">
        ${t("kcAlreadyPolite")}
      </div>
    `;
  }

  contentEl.innerHTML = `
    <div class="score-banner">
      <svg viewBox="0 0 36 36" class="circular-chart">
        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path class="circle" stroke-dasharray="${score}, 100" stroke="${scoreColor}" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <text x="18" y="20.3" fill="var(--brse-text)" font-size="8" font-weight="bold" text-anchor="middle">${score}%</text>
      </svg>
      <div class="score-desc">
        <div class="score-level">${t("kcClassification")}<span style="color: ${scoreColor}">${escapeHtml(data.level || 'Lịch sự')}</span></div>
        <div class="score-summary">${escapeHtml(data.summary_vi || 'AI đã rà soát và tinh chỉnh văn phong Nhật công sở chuẩn mực.')}</div>
      </div>
    </div>

    <div class="diff-container">
      <div>
        <div class="section-title">${t("kcOriginalText")}</div>
        <div class="diff-box diff-original">${escapeHtml(currentTarget.value || currentTarget.innerText || "")}</div>
      </div>
      <div>
        <div class="section-title">${t("kcProposedEdits")}</div>
        <div class="diff-box diff-improved">${escapeHtml(improvedText)}</div>
      </div>
    </div>

    ${changesHtml}

    <div class="footer">
      <button id="brse-keigo-btn-cancel" class="btn-secondary">${t("kcCloseBtn")}</button>
      <button id="brse-keigo-btn-reinput" class="btn-secondary" title="Soạn lại ý khác">✏️ Soạn lại</button>
      <button id="brse-keigo-btn-copy" class="btn-copy" title="Sao chép câu Kính ngữ vào bộ nhớ tạm">📋 Sao chép</button>
      <button id="brse-keigo-btn-apply" class="btn-primary" title="Chèn trực tiếp vào khung chat/soạn thảo">${t("kcApplyBtn")}</button>
    </div>
  `;

  shadow.getElementById('brse-keigo-btn-cancel').onclick = removeKeigoPopover;

  const reinputBtn = shadow.getElementById('brse-keigo-btn-reinput');
  if (reinputBtn) {
    reinputBtn.onclick = () => {
      renderKeigoInputMode(currentTarget);
    };
  }

  const copyBtn = shadow.getElementById('brse-keigo-btn-copy');
  if (copyBtn) {
    copyBtn.onclick = () => {
      if (improvedText) {
        navigator.clipboard.writeText(improvedText).then(() => {
          showToast("📋 Đã sao chép Kính ngữ vào clipboard!");
        }).catch(() => {
          showToast("✕ Không thể sao chép");
        });
      }
    };
  }
  
  shadow.getElementById('brse-keigo-btn-apply').onclick = () => {
    if (improvedText && currentTarget) {
      applyCorrection(currentTarget, improvedText);
      showToast(t("kcApplySuccess"));
      removeKeigoPopover();
    }
  };
}

function applyCorrection(el, text) {
  replaceTextFrameworkSafe(el, text);
}

function removeKeigoPopover() {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
