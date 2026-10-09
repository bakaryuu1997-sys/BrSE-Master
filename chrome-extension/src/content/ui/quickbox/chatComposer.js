"use strict";

import { safeSendMessage } from "../../utils/dom.js";
import { MESSAGE_TYPES } from "../../../shared/messageTypes.js";
import { getApiBase, getAuthHeaders } from "../../../shared/api.js";
import { showToast } from "../Toast.js";
import { appendBubbleTimestamp } from "./chatTime.js";
import {
  collectGenericPageSummarySource,
  collectYouTubeSummarySource,
} from "../../summarySource.js";

export function bindInlineChatComposer({ shadow, getLastSelectionText, switchTabInShadow }) {
  const inputEl = shadow.getElementById("brse-qb-chat-input");
  const sendBtn = shadow.getElementById("brse-qb-chat-send");
  const chatHistoryEl = shadow.getElementById("brse-qb-chat-history");
  const imagePreviewEl = shadow.getElementById("brse-qb-image-preview");

  let attachedImageBase64 = null;

  // Clean and hide image preview container
  const clearAttachedImage = () => {
    attachedImageBase64 = null;
    if (imagePreviewEl) {
      imagePreviewEl.style.display = "none";
      imagePreviewEl.innerHTML = "";
    }
  };

  // Render pasted image preview
  const showAttachedImagePreview = (base64) => {
    if (!imagePreviewEl) return;
    attachedImageBase64 = base64;
    imagePreviewEl.style.display = "flex";
    imagePreviewEl.innerHTML = `
      <div style="position: relative; display: inline-flex; align-items: center; border: 1px solid rgba(255, 107, 94, 0.3); border-radius: 8px; padding: 4px; background: rgba(0,0,0,0.3);">
        <img src="${base64}" style="max-height: 40px; max-width: 60px; border-radius: 4px; object-fit: cover;" />
        <button id="brse-qb-image-clear" style="
          position: absolute; top: -6px; right: -6px;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--brse-error); border: none; color: #fff;
          font-size: 9px; font-weight: bold; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        " title="Gỡ ảnh">✕</button>
      </div>
      <span style="font-size: 11px; color: var(--brse-text-muted); font-style: italic;">Đã đính kèm ảnh (Nhấn gửi để phân tích)</span>
    `;

    const clearBtn = imagePreviewEl.querySelector("#brse-qb-image-clear");
    if (clearBtn) {
      clearBtn.onclick = (e) => {
        e.stopPropagation();
        clearAttachedImage();
      };
    }
  };

  // Intercept Ctrl+V image paste
  if (inputEl) {
    inputEl.onpaste = (e) => {
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf("image") === 0) {
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            showAttachedImagePreview(event.target.result);
            showToast("📸 Đã đính kèm hình ảnh từ clipboard!");
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    };
  }

  const triggerInlineChat = async () => {
    if (!inputEl || !chatHistoryEl) return;
    const query = inputEl.value.trim();
    if (!query && !attachedImageBase64) return;

    inputEl.value = "";
    switchTabInShadow(shadow, "chat");

    const oldActive = shadow.getElementById("brse-qb-active-ai-bubble");
    if (oldActive) oldActive.removeAttribute("id");

    // 1. User Bubble (show pasted image thumbnail if attached)
    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble user";
    if (attachedImageBase64) {
      userBubble.innerHTML = `
        <div style="margin-bottom: 6px; display: block;">
          <img src="${attachedImageBase64}" style="max-height: 80px; max-width: 140px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2);" />
        </div>
        <div>${escapeHtmlText(query || "Phân tích hình ảnh này")}</div>
      `;
    } else {
      userBubble.textContent = query;
    }

    const delBtn = document.createElement("span");
    delBtn.className = "bubble-delete-btn";
    delBtn.title = "Xóa tin nhắn này";
    delBtn.textContent = "✕";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      userBubble.remove();
    };
    userBubble.appendChild(delBtn);
    appendBubbleTimestamp(userBubble);
    chatHistoryEl.appendChild(userBubble);

    // 2. AI Loading Bubble
    const aiBubble = document.createElement("div");
    aiBubble.className = "chat-bubble ai";
    aiBubble.id = "brse-qb-active-ai-bubble";
    aiBubble.innerHTML = `
      <div class="typing-indicator" style="display: flex; flex-direction: column; gap: 8px; height: auto;">
        <span style="font-size: 11px; color: var(--brse-text-muted);" id="brse-qb-ai-status-text">
          ${attachedImageBase64 ? "Đang trích xuất chữ trong ảnh (OCR)..." : "Đang kết nối AI..."}
        </span>
        <div style="display: flex; gap: 4px;">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    chatHistoryEl.appendChild(aiBubble);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    // Preserve local copy of attached image and clear state
    const currentImage = attachedImageBase64;
    clearAttachedImage();

    try {
      let finalPrompt = query;

      // 3. Pre-process Image via OCR if attached
      if (currentImage) {
        const base = await getApiBase();
        const headers = await getAuthHeaders();
        const ocrResponse = await fetch(`${base}/ai/ocr`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64_image: currentImage })
        });

        if (!ocrResponse.ok) {
          throw new Error(`OCR trích xuất ảnh thất bại (${ocrResponse.status})`);
        }

        const ocrData = await ocrResponse.json();
        const statusText = aiBubble.querySelector("#brse-qb-ai-status-text");
        if (statusText) statusText.innerText = "Đang gửi ngữ cảnh ảnh cho AI...";

        let ocrFormattedText = "";
        if (ocrData.success && Array.isArray(ocrData.translations) && ocrData.translations.length > 0) {
          ocrFormattedText = ocrData.translations
            .map((item, idx) => `[Dòng ${idx + 1}] Gốc: "${item.text}" -> Dịch: "${item.translation}"`)
            .join("\n");
        } else {
          ocrFormattedText = "Không phát hiện thấy ký tự hoặc chữ trong vùng ảnh chụp.";
        }

        finalPrompt = `Dưới đây là kết quả trích xuất văn bản tiếng Nhật/tiếng Anh từ hình ảnh người dùng đính kèm:\n\n${ocrFormattedText}\n\nCâu hỏi/Yêu cầu của người dùng: ${query || "Hãy dịch và giải thích nội dung hình ảnh trên."}`;
      }

      // 4. Send query to AI
      const pageContext = await buildCurrentPageContext(query);
      safeSendMessage({
        type: MESSAGE_TYPES.BRSE_AI_REQUEST,
        action: "inline",
        prompt: buildPersonaPrompt(shadow, finalPrompt),
        text: [getLastSelectionText(), pageContext].filter(Boolean).join("\n\n"),
        quick: true,
      });

    } catch (err) {
      const activeBubble = shadow.getElementById("brse-qb-active-ai-bubble");
      if (activeBubble) {
        const errorText = document.createElement("span");
        errorText.style.color = "var(--brse-error)";
        errorText.textContent = `❌ Lỗi: ${err.message || "Không thể kết nối dịch vụ."}`;
        activeBubble.replaceChildren(errorText);
        appendBubbleTimestamp(activeBubble);
      }
    }
  };

  if (sendBtn) {
    sendBtn.onclick = triggerInlineChat;
  }
  if (inputEl) {
    inputEl.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        triggerInlineChat();
      }
    };
  }

  return triggerInlineChat;
}

export async function buildCurrentPageContext(query) {
  const wantsPageContext = shouldAttachPageContext(query);
  if (!wantsPageContext) return "";
  try {
    const isYouTube = window.location.host.includes("youtube.com") && window.location.search.includes("v=");
    const source = isYouTube
      ? await collectYouTubeSummarySource(window.location, document)
      : collectGenericPageSummarySource(document);
    const text = String(source.promptText || "").trim();
    if (!text) return "";
    return [
      "Current web page context:",
      `Title: ${document.title || "(untitled)"}`,
      `URL: ${window.location.href}`,
      source.noTranscript ? "Note: YouTube captions were unavailable; context may be only title/description." : "",
      text.slice(0, 4200),
    ].filter(Boolean).join("\n");
  } catch (error) {
    console.warn("[BrSE QuickBox] Page context collection failed:", error.message);
    return "";
  }
}

export function shouldAttachPageContext(query) {
  const value = String(query || "").toLowerCase();
  if (!value.trim()) return true;
  return /(trang|web|website|page|current|hiện tại|nội dung|đang mở|đang xem|this|github|repo|repository|この記事|このページ|ページ|内容)/i.test(value);
}

function escapeHtmlText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPersonaPrompt(shadow, query) {
  const personaSelect = shadow.getElementById("brse-persona-select");
  const persona = personaSelect ? personaSelect.value : "brse";

  if (persona === "keigo") {
    return `[Vai trò: Bậc thầy Kính ngữ Keigo Nhật Bản] Hãy giải thích, dịch hoặc cải tiến theo đúng ngữ pháp kính ngữ:\n${query}`;
  }
  if (persona === "writer") {
    return `[Vai trò: Kỹ sư Cầu nối BrSE chuyên nghiệp] Hãy soạn thảo hoặc chỉnh sửa tài liệu chuẩn xác:\n${query}`;
  }
  if (persona === "coder") {
    return `[Vai trò: Chuyên gia Giải thích Code & Kiến trúc phần mềm] Hãy giải thích chi tiết đoạn code hoặc thuật ngữ kỹ thuật này:\n${query}`;
  }
  return `[Vai trò: Trợ lý Cầu nối BrSE] ${query}`;
}
