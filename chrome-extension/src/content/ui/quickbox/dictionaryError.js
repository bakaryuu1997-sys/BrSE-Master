"use strict";

import { safeSendMessage } from "../../utils/dom.js";
import { MESSAGE_TYPES } from "../../../shared/messageTypes.js";
import { escapeHtml } from "./markdown.js";

export function renderDictionaryError(shadow, div, data, switchTabInShadow) {
  div.innerHTML = `
    <div class="dict-error-container" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px 15px;
      text-align: center;
      background: rgba(255, 85, 85, 0.05);
      border: 1px dashed rgba(255, 85, 85, 0.3);
      border-radius: 8px;
      margin: 10px;
    ">
      <div style="font-size: 32px; margin-bottom: 10px; filter: drop-shadow(0 0 6px rgba(255, 85, 85, 0.4));">⚠️</div>
      <h3 style="margin: 0 0 6px 0; color: var(--brse-error); font-size: 15px; font-weight: 700; font-family: inherit;">Không thể tải dữ liệu từ điển</h3>
      <p style="margin: 0 0 16px 0; color: var(--brse-text-muted); font-size: 12.5px; max-width: 320px; line-height: 1.5; font-family: inherit;">
        Gặp sự cố khi kết nối tới dịch vụ dịch thuật (${escapeHtml(data.error)}). Bạn có thể thử lại hoặc sử dụng trí tuệ nhân tạo (AI) để phân tích từ này.
      </p>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button id="brse-dict-retry-btn" style="
          background: rgba(255, 107, 94, 0.1);
          border: 1px solid rgba(255, 107, 94, 0.3);
          color: var(--brse-primary);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span class="retry-icon" style="display: inline-block; transition: transform 0.2s;">🔄</span> Thử lại
        </button>
        <button id="brse-dict-ai-fallback-btn" style="
          background: linear-gradient(135deg, var(--brse-primary), var(--brse-secondary));
          border: none;
          color: #121316;
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 3px 10px rgba(255, 107, 94, 0.2);
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          🧠 Dịch bằng AI
        </button>
      </div>
    </div>
  `;

  const retryBtn = shadow.getElementById("brse-dict-retry-btn");
  if (retryBtn) {
    retryBtn.onclick = () => {
      const icon = retryBtn.querySelector(".retry-icon");
      if (icon) icon.classList.add("spin");
      retryBtn.style.pointerEvents = "none";

      setTimeout(() => {
        div.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--brse-text-muted); font-size: 14px; font-family: inherit;">⏳ Đang lấy dữ liệu từ điển chuyên sâu...</div>';
        safeSendMessage({ type: MESSAGE_TYPES.BRSE_GOOGLE_TRANSLATE, text: data.originalText });
      }, 600);
    };
  }

  const aiFallbackBtn = shadow.getElementById("brse-dict-ai-fallback-btn");
  if (aiFallbackBtn) {
    aiFallbackBtn.onclick = () => {
      switchTabInShadow(shadow, "chat");
      const chatInput = shadow.getElementById("brse-qb-chat-input");
      if (chatInput) {
        chatInput.value = `Hãy dịch cụm từ "${data.originalText}" sang tiếng Việt và giải thích chi tiết nghĩa chuyên ngành IT/BrSE của nó.`;
        const sendBtn = shadow.getElementById("brse-qb-chat-send");
        if (sendBtn) sendBtn.click();
      }
    };
  }

  div.style.opacity = "1";
}
