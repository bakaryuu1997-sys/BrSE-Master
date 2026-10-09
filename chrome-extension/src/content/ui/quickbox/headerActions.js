"use strict";

import { MESSAGE_TYPES } from "../../../shared/messageTypes.js";

export function bindQuickBoxHeaderActions(shadow, {
  quickBox,
  hideQuickBox,
  safeSendMessage,
  showToast,
}) {
  bindClose(shadow, hideQuickBox);
  bindClearChat(shadow, showToast);
  bindSettings(shadow, safeSendMessage, showToast);
  bindFeedback(shadow, showToast);
  bindMinimize(shadow, quickBox, showToast);
  bindBubbleDeleteButtons(shadow);
}

export function bindBubbleDeleteButtons(root) {
  root.querySelectorAll(".bubble-delete-btn").forEach((btn) => {
    btn.onclick = (event) => {
      event.stopPropagation();
      btn.parentElement?.remove();
    };
  });
}

function bindClose(shadow, hideQuickBox) {
  const closeBtn = shadow.getElementById("brse-close");
  if (closeBtn) closeBtn.onclick = hideQuickBox;
}

function bindClearChat(shadow, showToast) {
  const clearBtn = shadow.getElementById("qb-clear-chat");
  if (!clearBtn) return;

  clearBtn.onclick = () => {
    const chatHistoryEl = shadow.getElementById("brse-qb-chat-history");
    if (!chatHistoryEl) return;

    chatHistoryEl.innerHTML = `
      <div class="chat-bubble ai">
        Tôi là trợ lý BrSE. Bạn có muốn hỏi thêm gì không?
        <span class="bubble-delete-btn" title="Xóa tin nhắn này">×</span>
      </div>
    `;
    bindBubbleDeleteButtons(chatHistoryEl);
    showToast("Đã xóa toàn bộ hội thoại.");
  };
}

function bindSettings(shadow, safeSendMessage, showToast) {
  const settingsBtn = shadow.getElementById("qb-settings");
  if (!settingsBtn) return;

  settingsBtn.onclick = () => {
    safeSendMessage({ type: MESSAGE_TYPES.BRSE_OPEN_SIDEPANEL });
    showToast("Đã mở cài đặt tại thanh bên.");
  };
}

function bindFeedback(shadow, showToast) {
  const feedbackBtn = shadow.getElementById("qb-feedback");
  if (feedbackBtn) {
    feedbackBtn.onclick = () => showToast("Cảm ơn phản hồi. Góp ý đã được ghi nhận.");
  }
}

function bindMinimize(shadow, quickBox, showToast) {
  const minimizeBtn = shadow.getElementById("brse-minimize");
  if (!minimizeBtn) return;

  minimizeBtn.onclick = () => {
    quickBox.style.display = "none";
    showToast("Đã thu nhỏ. Có thể mở lại từ icon Subaru.");
  };
}
