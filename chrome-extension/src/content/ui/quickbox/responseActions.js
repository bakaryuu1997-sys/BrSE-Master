"use strict";

import { sanitizeAiHtml } from '../../../shared/sanitizer.js';
import { escapeHtml } from './markdown.js';

export function addActionsToBubble(shadow, bubble, text, showToast) {
  if (!bubble) return;
  
  if (!bubble.querySelector('.bubble-delete-btn')) {
    const delBtn = document.createElement('span');
    delBtn.className = 'bubble-delete-btn';
    delBtn.title = 'Xóa tin nhắn này';
    delBtn.textContent = '✕';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      bubble.remove();
    };
    bubble.appendChild(delBtn);
  }
  
  if (bubble.querySelector('.bubble-actions-bar')) return;
  
  const bar = document.createElement('div');
  bar.className = 'bubble-actions-bar';
  
  const copyBtn = document.createElement('span');
  copyBtn.className = 'action-btn-link';
  copyBtn.innerHTML = '📋 Sao chép';
  copyBtn.onclick = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      showToast("📋 Đã copy nội dung phản hồi!");
    });
  };
  
  const insertBtn = document.createElement('span');
  insertBtn.className = 'action-btn-link';
  insertBtn.innerHTML = '✍️ Chèn vào ô nhập';
  insertBtn.onclick = (e) => {
    e.stopPropagation();
    const event = new CustomEvent('brse-insert-text', { detail: { text } });
    document.dispatchEvent(event);
  };
  
  bar.appendChild(copyBtn);
  bar.appendChild(insertBtn);
  bubble.appendChild(bar);
}

export function renderErrorCardWithRetry(targetEl, text, safeSendMessage, showToast) {
  if (!targetEl) return;
  const isOllamaError = text.toLowerCase().includes("ollama") || 
                        text.toLowerCase().includes("local backend") || 
                        text.includes("11435") || 
                        text.includes("11434");
                        
  const switchBtnHtml = isOllamaError ? `
    <button class="brse-qb-switch-9router-btn" style="
      background: rgba(255, 138, 125, 0.15);
      border: 1px solid rgba(255, 138, 125, 0.3);
      color: var(--brse-secondary);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      font-family: inherit;
      margin-right: 8px;
      transition: all 0.2s;
    " title="Chuyển sang 9router đám mây trực tiếp">
      ⚡ Chuyển 9router
    </button>
  ` : "";

  targetEl.innerHTML = sanitizeAiHtml(`
    <div class="brse-error-card" style="
      background: rgba(255, 93, 108, 0.08);
      border: 1px solid rgba(255, 93, 108, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
      font-family: inherit;
      font-size: 13px;
      color: var(--brse-error);
      line-height: 1.5;
      position: relative;
    ">
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 14px;">⚠️</span>
        <div>${escapeHtml(text.replace("❌ ", ""))}</div>
      </div>
      
      <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
        ${switchBtnHtml}
        <button class="brse-qb-retry-btn" style="
          background: rgba(255, 107, 94, 0.15);
          border: 1px solid rgba(255, 107, 94, 0.3);
          color: var(--brse-primary);
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: inherit;
          transition: all 0.2s;
        " title="Thử kết nối lại ngay">
          <span class="retry-icon" style="display: inline-block; transition: transform 0.2s;">🔄</span> Thử lại
        </button>
      </div>
    </div>
  `);

  const retryBtn = targetEl.querySelector('.brse-qb-retry-btn');
  if (retryBtn) {
    retryBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.brseLastAiRequest) {
        const icon = retryBtn.querySelector('.retry-icon');
        if (icon) icon.classList.add('spin');
        retryBtn.style.pointerEvents = 'none';
        
        setTimeout(() => {
          targetEl.innerHTML = `
            <div class="typing-indicator" style="display: flex; gap: 4px; padding: 10px 0;">
              <div class="typing-dot" style="width: 6px; height: 6px; background: var(--brse-text-muted); border-radius: 50%; animation: typing 1.4s infinite both;"></div>
              <div class="typing-dot" style="width: 6px; height: 6px; background: var(--brse-text-muted); border-radius: 50%; animation: typing 1.4s infinite both; animation-delay: 0.2s;"></div>
              <div class="typing-dot" style="width: 6px; height: 6px; background: var(--brse-text-muted); border-radius: 50%; animation: typing 1.4s infinite both; animation-delay: 0.4s;"></div>
            </div>
          `;
          safeSendMessage(window.brseLastAiRequest);
        }, 600);
      } else {
        showToast("⚠️ Không tìm thấy tác vụ AI cũ để thử lại!");
      }
    };
  }

  const switchBtn = targetEl.querySelector('.brse-qb-switch-9router-btn');
  if (switchBtn) {
    switchBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const stableModel = "openrouter/nvidia/nemotron-3-super-120b-a12b:free";
      showToast("⚡ Đang chuyển sang 9router (Nemotron 3 Super Free)...");
      
      safeSendMessage({
        type: "BRSE_SET_MODEL",
        model: stableModel
      }).then((response) => {
        if (response?.ok) {
          showToast(`Đã kích hoạt model 9router: ${stableModel}`);
        }
        
        // Auto retry
        if (window.brseLastAiRequest) {
          targetEl.innerHTML = `
            <div class="typing-indicator" style="display: flex; gap: 4px; padding: 10px 0;">
              <div class="typing-dot" style="width: 6px; height: 6px; background: var(--brse-text-muted); border-radius: 50%; animation: typing 1.4s infinite both;"></div>
              <div class="typing-dot" style="width: 6px; height: 6px; background: var(--brse-text-muted); border-radius: 50%; animation: typing 1.4s infinite both; animation-delay: 0.2s;"></div>
              <div class="typing-dot" style="width: 6px; height: 6px; background: var(--brse-text-muted); border-radius: 50%; animation: typing 1.4s infinite both; animation-delay: 0.4s;"></div>
            </div>
          `;
          if (window.brseLastAiRequest.payload) {
            window.brseLastAiRequest.payload.model = stableModel;
          }
          safeSendMessage(window.brseLastAiRequest);
        } else {
          showToast("⚠️ Không tìm thấy tác vụ AI cũ để thử lại!");
        }
      }).catch((err) => {
        showToast(`❌ Lỗi chuyển model: ${err.message}`);
      });
    };
  }
}
