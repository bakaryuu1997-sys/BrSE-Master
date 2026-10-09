"use strict";

import { clampQuickBoxElement } from "./position.js";

export function handleQuickBoxReuse({
  quickBox,
  shadow,
  selectedText,
  options,
  selectionRect,
  switchTabInShadow,
  repositionQuickBoxNearSelection,
  safeSendMessage,
  MESSAGE_TYPES,
  refreshQuickBoxModelOptions,
  renderIpaElements,
  setIpaData
}) {
  quickBox.style.display = 'block';
  clampQuickBoxElement(quickBox);
  const activeTab = options.tab || (options.action ? 'chat' : 'dict');
  
  if (activeTab === 'dict' && !options.memo) {
    const brseContent = shadow.getElementById('brse-content');
    if (brseContent) {
      brseContent.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--brse-text-muted); font-size: 14px; font-family: inherit;">⏳ Đang lấy dữ liệu từ điển chuyên sâu...</div>';
      brseContent.style.opacity = '1';
    }
  }
  
  if (options.action) {
    const chatHistoryEl = shadow.getElementById('brse-qb-chat-history');
    if (chatHistoryEl) {
      const oldActive = shadow.getElementById('brse-qb-active-ai-bubble');
      if (oldActive) oldActive.removeAttribute('id');
      
      const actionTitles = {
        explain: "💡 Giải thích AI",
        grammar: "✍️ Check Ngữ pháp",
        polish: "✨ Làm mượt Keigo",
        summary: options.lang === 'ja' ? "📄 Tóm tắt trang (Tiếng Nhật)" : "📄 Tóm tắt trang (Tiếng Việt)"
      };
      const title = actionTitles[options.action] || "Yêu cầu AI";
      
      const userBubble = document.createElement('div');
      userBubble.className = 'chat-bubble user';
      userBubble.innerHTML = `
        ${title}
        <span class="bubble-delete-btn" title="Xóa tin nhắn này">✕</span>
      `;
      userBubble.querySelector('.bubble-delete-btn').onclick = (e) => {
        e.stopPropagation();
        userBubble.remove();
      };
      chatHistoryEl.appendChild(userBubble);
      
      const aiBubble = document.createElement('div');
      aiBubble.className = 'chat-bubble ai';
      aiBubble.id = 'brse-qb-active-ai-bubble';
      aiBubble.innerHTML = `
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `;
      chatHistoryEl.appendChild(aiBubble);
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }
  }
  
  switchTabInShadow(shadow, activeTab);
  
  repositionQuickBoxNearSelection(quickBox, selectionRect, options);
  
  if (activeTab === 'dict') {
    const cleanWord = selectedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
    const isEnglishWord = /^[a-zA-Z\s\-]+$/.test(cleanWord) && cleanWord.split(' ').length <= 2;
    if (isEnglishWord) {
      safeSendMessage({ type: MESSAGE_TYPES.BRSE_GET_IPA, text: cleanWord }).then(response => {
        if (response && response.ok) {
          setIpaData(response);
          renderIpaElements(shadow, cleanWord, response);
        }
      });
    }
  }
  
  refreshQuickBoxModelOptions(shadow, { safeSendMessage });
  
  return shadow;
}
