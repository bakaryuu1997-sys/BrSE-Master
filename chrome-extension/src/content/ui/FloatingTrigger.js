"use strict";

import { FLOATING_TRIGGER_STYLE } from "./FloatingTriggerStyles.js";
import { injectThemeTokens } from "../../shared/theme.js";
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../../shared/storage.js';
import { getNormalizedUrl } from '../utils/url.js';
import { startOcrCapture } from './OCR.js';
import { startColorPicker } from './ColorPicker.js';
import { startFullPageCapture } from './FullPageCapture.js';
import { BRSE_LAYER } from './layers.js';

let floatingButtonRoot = null;
const GLOSSARY_HIGHLIGHT_ENABLED_KEY = "brseGlossaryHighlightEnabled";
const KEIGO_ENABLED_KEY = "brseKeigoEnabled";
const FURIGANA_ENABLED_KEY = "brseFuriganaEnabled";

/**
 * Creates and initializes the draggable premium B (Subaru AI) floating trigger button.
 * @param {Function} onClickCallback - Action when the button is clicked.
 */
export function createFloatingBButton(callbacks) {
  const existing = document.getElementById('brse-trigger-root');
  if (existing) {
    existing.remove();
  }

  const onOpenChat = typeof callbacks === 'function' ? callbacks : callbacks?.onOpenChat;
  const onSummarize = callbacks?.onSummarize;
  const onQuickNote = callbacks?.onQuickNote;

  floatingButtonRoot = document.createElement('div');
  floatingButtonRoot.id = 'brse-trigger-root';
  Object.assign(floatingButtonRoot.style, {
    position: 'fixed',
    zIndex: String(BRSE_LAYER.base + 5),
    width: '46px',
    height: '46px',
    userSelect: 'none',
    pointerEvents: 'none',
    display: 'block'
  });

  const shadow = floatingButtonRoot.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);

  const style = document.createElement('style');
  style.textContent = FLOATING_TRIGGER_STYLE;

  const container = document.createElement('div');
  container.className = 'btn-container';
  container.title = 'Trợ lý BrSE OS (Click để mở menu, Kéo thả để di chuyển)';
  
  const avatarUrl = chrome.runtime.getURL('icons/avatar.png');
  container.innerHTML = `<img src="${avatarUrl}" alt="Subaru AI" />`;
  
  const menu = document.createElement('div');
  menu.className = 'popover-menu';
  menu.innerHTML = `
    <div class="menu-item" id="btn-open-chat">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      Mở khung chat
    </div>
    <div class="menu-item" id="btn-summarize-vi">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
      Tóm tắt trang (Tiếng Việt)
    </div>
    <div class="menu-item" id="btn-summarize-ja">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
      Tóm tắt trang (Tiếng Nhật)
    </div>
    <div class="menu-item" id="btn-ocr-capture">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
      Lấy chữ & dịch ảnh (OCR)
    </div>
    <div class="menu-item" id="btn-fullpage-capture">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 8V5a2 2 0 0 1 2-2h3"></path>
        <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
        <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
        <path d="M21 16v3a2 2 0 0 1-2 2h-3"></path>
        <rect x="7" y="7" width="10" height="10" rx="1"></rect>
      </svg>
      Chụp ảnh toàn bộ trang
    </div>
    <div class="menu-item" id="btn-color-picker">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        <path d="M2 12h20"></path>
      </svg>
      Lấy mã màu (Pick)
    </div>
    <div class="menu-item" id="btn-toggle-highlight" style="border-top: 1px solid rgba(255, 107, 94, 0.2); padding-top: 8px; margin-top: 4px;">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="icon-toggle-highlight" style="width: 14px; height: 14px; stroke: none; fill: currentColor;">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
      <span id="text-toggle-highlight">Gạch chân từ vựng</span>
    </div>
    <div class="menu-item" id="btn-toggle-keigo">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="icon-toggle-keigo" style="width: 14px; height: 14px; stroke: none; fill: currentColor;">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
      <span id="text-toggle-keigo">Keigo checker</span>
    </div>
    <div class="menu-item" id="btn-toggle-hover">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="icon-toggle-hover" style="width: 14px; height: 14px; stroke: none; fill: currentColor;">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
      <span id="text-toggle-hover">Hover dịch thuật</span>
    </div>
    <div class="menu-item" id="btn-quick-note">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16v16H4z"></path>
        <path d="M8 8h8"></path>
        <path d="M8 12h8"></path>
        <path d="M8 16h5"></path>
      </svg>
      Quick Note
    </div>
    <div class="menu-item" id="btn-open-recordings" style="border-top: 1px solid rgba(255, 107, 94, 0.2); padding-top: 8px; margin-top: 4px;">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      Mở thư mục ghi âm
    </div>
    <div class="menu-item" id="btn-open-docx-pdf">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      Chuyển DOCX sang PDF
    </div>
    <div class="menu-item" id="btn-open-dashboard">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      Mở Dashboard Web App
    </div>
    <div class="menu-item" id="btn-restore-summary" style="display: none; border-top: 1px solid rgba(255, 107, 94, 0.3); padding-top: 8px; margin-top: 6px; color: #ffb454; font-weight: 700; text-shadow: 0 0 8px rgba(255, 180, 84, 0.4);">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke: #ffb454; filter: drop-shadow(0 0 3px rgba(255, 180, 84, 0.6));">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      Xem lại bản tóm tắt
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(container);
  shadow.appendChild(menu);
  document.body.appendChild(floatingButtonRoot);

  let dockSide = 'right';
  let idleTimer = null;
  let isHovered = false;

  const checkDockSide = (left) => {
    dockSide = left < window.innerWidth / 2 ? 'left' : 'right';
  };

  const startIdleTimer = () => {
    clearIdleTimer();
    if (isHovered || menu.classList.contains('show')) return;
    idleTimer = setTimeout(() => {
      container.classList.add('idle');
      if (dockSide === 'left') {
        container.style.transform = 'translateX(-22px)';
      } else {
        container.style.transform = 'translateX(22px)';
      }
      container.style.opacity = '0.45';
    }, 3000);
  };

  const clearIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const wakeUpButton = () => {
    container.classList.remove('idle');
    container.style.transform = 'scale(1.1)';
    container.style.opacity = '1';
    clearIdleTimer();
  };

  const setToggleDisplay = (textEl, iconEl, enabled, enabledText, disabledText) => {
    if (!textEl || !iconEl) return;
    textEl.textContent = enabled ? enabledText : disabledText;
    textEl.style.color = enabled ? "#4ec9a5" : "#ff5d6c";
    iconEl.setAttribute('fill', enabled ? '#4ec9a5' : '#ff5d6c');
  };

  const updateHighlightToggleStatus = () => {
    chrome.storage.local.get([GLOSSARY_HIGHLIGHT_ENABLED_KEY], (res) => {
      const enabled = res[GLOSSARY_HIGHLIGHT_ENABLED_KEY] !== false;
      setToggleDisplay(
        shadow.getElementById('text-toggle-highlight'),
        shadow.getElementById('icon-toggle-highlight'),
        enabled,
        "Bật gạch chân (Click: Tắt)",
        "Tắt gạch chân (Click: Bật)"
      );
    });
  };

  const updateKeigoToggleStatus = () => {
    chrome.storage.local.get([KEIGO_ENABLED_KEY], (res) => {
      const enabled = res[KEIGO_ENABLED_KEY] !== false;
      setToggleDisplay(
        shadow.getElementById('text-toggle-keigo'),
        shadow.getElementById('icon-toggle-keigo'),
        enabled,
        "Bật Keigo (Click: Tắt)",
        "Tắt Keigo (Click: Bật)"
      );
    });
  };

  const updateHoverToggleStatus = () => {
    chrome.storage.sync.get([FURIGANA_ENABLED_KEY], (res) => {
      const enabled = res[FURIGANA_ENABLED_KEY] !== false;
      setToggleDisplay(
        shadow.getElementById('text-toggle-hover'),
        shadow.getElementById('icon-toggle-hover'),
        enabled,
        "Bật Hover dịch (Click: Tắt)",
        "Tắt Hover dịch (Click: Bật)"
      );
    });
  };

  const leaveButton = () => {
    container.style.transform = '';
    startIdleTimer();
  };

  const updateMenuPosition = () => {
    const left = parseInt(floatingButtonRoot.style.left, 10) || 0;
    if (left < 200) {
      menu.style.left = '0';
      menu.style.right = 'auto';
    } else {
      menu.style.right = '0';
      menu.style.left = 'auto';
    }
  };

  // Position setup (from storage or defaults)
  getStorageItem(STORAGE_KEYS.TRIGGER_POS).then((pos) => {
    let top = window.innerHeight - 100;
    let left = window.innerWidth - 80;

    if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
      left = Math.max(10, Math.min(pos.left, window.innerWidth - 60));
      top = Math.max(10, Math.min(pos.top, window.innerHeight - 60));
    }

    floatingButtonRoot.style.left = `${left}px`;
    floatingButtonRoot.style.top = `${top}px`;
    checkDockSide(left);
    updateMenuPosition();
    startIdleTimer();
  });

  // Drag and drop logic
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let buttonLeft = 0;
  let buttonTop = 0;
  let hasMoved = false;

  const onMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
    e.preventDefault();
    isDragging = true;
    hasMoved = false;
    clearIdleTimer();
    
    startX = e.clientX;
    startY = e.clientY;
    
    buttonLeft = parseInt(floatingButtonRoot.style.left, 10) || 0;
    buttonTop = parseInt(floatingButtonRoot.style.top, 10) || 0;
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMoved = true;
    }
    
    let newLeft = buttonLeft + dx;
    let newTop = buttonTop + dy;
    
    newLeft = Math.max(10, Math.min(newLeft, window.innerWidth - 60));
    newTop = Math.max(10, Math.min(newTop, window.innerHeight - 60));
    
    floatingButtonRoot.style.left = `${newLeft}px`;
    floatingButtonRoot.style.top = `${newTop}px`;
  };

  let activeCloseMenu = null;

  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    if (hasMoved) {
      const finalTop = parseInt(floatingButtonRoot.style.top, 10);
      const currentLeft = parseInt(floatingButtonRoot.style.left, 10);
      const halfWidth = window.innerWidth / 2;
      const targetLeft = currentLeft < halfWidth ? 10 : window.innerWidth - 56;

      // Magnetic snap transition
      floatingButtonRoot.style.transition = 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      floatingButtonRoot.style.left = `${targetLeft}px`;
      
      setTimeout(() => {
        floatingButtonRoot.style.transition = '';
        setStorageItem(STORAGE_KEYS.TRIGGER_POS, { left: targetLeft, top: finalTop });
        checkDockSide(targetLeft);
        updateMenuPosition();
        startIdleTimer();
      }, 300);
    } else {
      // Just a click: toggle menu
      const isShown = menu.classList.toggle('show');
      if (isShown) {
        clearIdleTimer();
        updateMenuPosition();
        
        updateHighlightToggleStatus();
        updateKeigoToggleStatus();
        updateHoverToggleStatus();

        const btnRestore = shadow.getElementById('btn-restore-summary');
        if (btnRestore) {
          const normalized = getNormalizedUrl(window.location.href);
          const cacheKeyVi = 'brse_summary_vi_' + normalized;
          const cacheKeyJa = 'brse_summary_ja_' + normalized;
          chrome.storage.local.get([cacheKeyVi, cacheKeyJa], (res) => {
            if (res[cacheKeyVi] || res[cacheKeyJa] || window.brseLastSummaryText) {
              btnRestore.style.display = 'flex';
            } else {
              btnRestore.style.display = 'none';
            }
          });
        }

        if (activeCloseMenu) {
          document.removeEventListener('click', activeCloseMenu);
        }
        activeCloseMenu = (event) => {
          if (!floatingButtonRoot.contains(event.target)) {
            menu.classList.remove('show');
            startIdleTimer();
            document.removeEventListener('click', activeCloseMenu);
            activeCloseMenu = null;
          }
        };
        setTimeout(() => {
          if (activeCloseMenu) {
            document.addEventListener('click', activeCloseMenu);
          }
        }, 50);
      } else {
        startIdleTimer();
        if (activeCloseMenu) {
          document.removeEventListener('click', activeCloseMenu);
          activeCloseMenu = null;
        }
      }
    }
  };

  shadow.getElementById('btn-open-chat').onclick = (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    if (typeof onOpenChat === 'function') {
      onOpenChat();
    }
  };

  shadow.getElementById('btn-summarize-vi').onclick = (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    if (typeof onSummarize === 'function') {
      onSummarize('vi');
    }
  };

  shadow.getElementById('btn-summarize-ja').onclick = (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    if (typeof onSummarize === 'function') {
      onSummarize('ja');
    }
  };

  shadow.getElementById('btn-restore-summary').onclick = (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    if (typeof callbacks?.onRestoreSummary === 'function') {
      callbacks.onRestoreSummary();
    }
  };

  shadow.getElementById('btn-quick-note').onclick = (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    if (typeof onQuickNote === 'function') {
      onQuickNote();
    }
  };

  shadow.getElementById('btn-open-recordings')?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    chrome.runtime.sendMessage({ type: "BRSE_SHOW_RECORDING_FOLDER" });
  });

  shadow.getElementById('btn-open-docx-pdf')?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    window.open("http://127.0.0.1:3010/app/power-tools", "_blank");
  });

  shadow.getElementById('btn-open-dashboard')?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    window.open("http://127.0.0.1:3010", "_blank");
  });

  shadow.getElementById('btn-ocr-capture').onclick = (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    startOcrCapture();
  };

  shadow.getElementById('btn-fullpage-capture').onclick = (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    startFullPageCapture();
  };

  shadow.getElementById('btn-color-picker').onclick = (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    startIdleTimer();
    if (activeCloseMenu) {
      document.removeEventListener('click', activeCloseMenu);
      activeCloseMenu = null;
    }
    startColorPicker();
  };

  shadow.getElementById('btn-toggle-highlight').onclick = (e) => {
    e.stopPropagation();
    chrome.storage.local.get([GLOSSARY_HIGHLIGHT_ENABLED_KEY], (res) => {
      const current = res[GLOSSARY_HIGHLIGHT_ENABLED_KEY] !== false;
      const next = !current;
      chrome.storage.local.set({ [GLOSSARY_HIGHLIGHT_ENABLED_KEY]: next }, () => {
        updateHighlightToggleStatus();
      });
    });
  };

  shadow.getElementById('btn-toggle-keigo').onclick = (e) => {
    e.stopPropagation();
    chrome.storage.local.get([KEIGO_ENABLED_KEY], (res) => {
      const current = res[KEIGO_ENABLED_KEY] !== false;
      const next = !current;
      chrome.storage.local.set({ [KEIGO_ENABLED_KEY]: next }, () => {
        updateKeigoToggleStatus();
      });
    });
  };

  shadow.getElementById('btn-toggle-hover').onclick = (e) => {
    e.stopPropagation();
    chrome.storage.sync.get([FURIGANA_ENABLED_KEY], (res) => {
      const current = res[FURIGANA_ENABLED_KEY] !== false;
      const next = !current;
      chrome.storage.sync.set({ [FURIGANA_ENABLED_KEY]: next }, () => {
        updateHoverToggleStatus();
      });
    });
  };

  container.addEventListener('mousedown', onMouseDown);
  container.addEventListener('mouseenter', () => {
    isHovered = true;
    wakeUpButton();
  });
  container.addEventListener('mouseleave', () => {
    isHovered = false;
    leaveButton();
  });
}
