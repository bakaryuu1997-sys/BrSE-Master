"use strict";

import { escapeHtml } from "../shared/sanitizer.js";

export function initChatController({
  chatMessages,
  chatInput,
  btnSend,
  btnStop,
  MESSAGE_TYPES,
  getModelLabel,
  readActiveAiModel,
  formatChatMessage,
  playAudio
}) {
  
  function addMessage(text, role = "ai") {
    const message = document.createElement("div");
    message.className = `message ${role}`;
    message.style.opacity = "0";
    message.style.transform = "translateY(10px)";
    
    const content = document.createElement("div");
    content.className = "msg-content";
    content.innerText = text;
    message.appendChild(content);

    if (role === "ai") {
      const actions = document.createElement("div");
      actions.className = "msg-actions";
      
      const btnSpeak = document.createElement("button");
      btnSpeak.innerHTML = "🔊";
      btnSpeak.title = "Đọc tin nhắn";
      btnSpeak.onclick = () => playAudio(content.innerText, 'ja');
      
      const btnInject = document.createElement("button");
      btnInject.innerHTML = "➕";
      btnInject.title = "Chèn vào trình soạn thảo";
      btnInject.onclick = () => {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_INJECT_TEXT_ON_ACTIVE_TAB, text: content.innerText });
      };
      
      actions.appendChild(btnSpeak);
      actions.appendChild(btnInject);
      message.appendChild(actions);
    }

    chatMessages.appendChild(message);
    setTimeout(() => {
      message.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      message.style.opacity = "1";
      message.style.transform = "translateY(0)";
    }, 10);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return content; 
  }

  async function handleSendMessage(crossTabContext) {
    const text = chatInput.value.trim();
    if (!text) return;

    const finalPrompt = crossTabContext.buildPromptContext() + text;

    addMessage(text, "user");
    chatInput.value = "";
    chatInput.style.height = "auto";
    const activeModel = await readActiveAiModel();
    const pendingAi = addMessage(`Đang trả lời bằng ${getModelLabel(activeModel)}...`, "ai");
    pendingAi.dataset.pending = "true";
    
    if (btnSend && btnStop) {
      btnSend.style.display = "none";
      btnStop.style.display = "flex";
    }
    
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_AI_REQUEST, action: "chat", text: finalPrompt });
  }

  if (btnStop) {
    btnStop.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "BRSE_ABORT_AI_REQUEST" });
      
      if (btnSend) btnSend.style.display = "flex";
      btnStop.style.display = "none";
      
      const messages = chatMessages.querySelectorAll(".message.ai");
      if (messages && messages.length > 0) {
        const lastAiMessage = messages[messages.length - 1];
        const contentDiv = lastAiMessage.querySelector(".msg-content");
        if (contentDiv) {
          if (contentDiv.innerText === "Đang trả lời...") {
            contentDiv.innerHTML = "<i>🛑 Đã dừng sinh chữ.</i>";
          } else {
            contentDiv.innerHTML += "<br><i>🛑 Đã dừng sinh chữ.</i>";
          }
        }
      }
    });
  }

  function handleStreamChunk(
    message,
    getPendingTodoSyncProjectId,
    handleJiraTodoImportDone,
    getPendingQnaRecordId,
    handleQnaImportDone,
  ) {
    const messages = chatMessages.querySelectorAll(".message.ai");
    if (!messages || messages.length === 0) return;
    
    let lastAiMessage = messages[messages.length - 1];
    if (lastAiMessage) {
      const contentDiv = lastAiMessage.querySelector(".msg-content");
      if (contentDiv) {
        if (message.error) {
          contentDiv.innerHTML = `<span style="color:#ff5d6c;">❌ Lỗi: ${escapeHtml(message.error)}</span>`;
          if (btnSend && btnStop) {
            btnSend.style.display = "flex";
            btnStop.style.display = "none";
          }
          chatMessages.scrollTop = chatMessages.scrollHeight;
          return;
        }
        if (message.text) {
          if (contentDiv.dataset.pending === "true") {
            contentDiv.innerText = "";
            delete contentDiv.dataset.pending;
          }
          contentDiv.innerText += message.text;
        }
        if (message.done) {
          formatChatMessage(contentDiv);
          if (btnSend && btnStop) {
            btnSend.style.display = "flex";
            btnStop.style.display = "none";
          }
          const pendingProjectId = getPendingTodoSyncProjectId();
          if (pendingProjectId) {
            handleJiraTodoImportDone(contentDiv.innerText, pendingProjectId);
          }
          const pendingQnaRecordId = getPendingQnaRecordId?.();
          if (pendingQnaRecordId) {
            handleQnaImportDone?.(contentDiv.innerText, pendingQnaRecordId);
          }
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  }

  function handleIncomingQuickChat(text) {
    if (!text) return;
    chatInput.value = `Hãy giải thích chi tiết ý nghĩa và cách dùng trong công việc BrSE cho phần văn bản sau:\n\n"${text}"`;
    chatInput.focus();
    chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(120, chatInput.scrollHeight)}px`;
    if (chrome.storage?.local) {
      chrome.storage.local.remove(['quickChatTermCache']); // clear cache
    }
  }

  return {
    addMessage,
    handleSendMessage,
    handleStreamChunk,
    handleIncomingQuickChat
  };
}
