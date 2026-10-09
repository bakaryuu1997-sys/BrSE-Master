"use strict";

import { escapeHtml } from "../shared/sanitizer.js";
import { t } from "../shared/i18n.js";

export function initJiraContextSync({
  contextBanner,
  contextIcon,
  contextTitle,
  contextDesc,
  btnUseContext,
  btnClearContext,
  chatMessages,
  switchTab,
  chatController,
  MESSAGE_TYPES,
  STORAGE_KEYS
}) {
  let activeContext = null;
  let pendingTodoSyncProjectId = null;
  let pendingQnaRecordId = null;
  let pendingQnaTitle = "";
  let pendingQnaOriginal = "";

  const IMPORT_CONTEXT_TYPES = [
    "jira_import",
    "jira_todo_import",
    "jira_qna_import",
    "gmail_qna_import",
    "gmail_todo_import",
  ];

  function handleIncomingContext(context) {
    if (!context || !contextBanner) return;
    activeContext = context;
    contextBanner.classList.remove("hidden");

    if (context.type === "gmail") {
      contextIcon.innerText = "📬";
      contextTitle.innerText = "Gmail Context Detected";
      contextDesc.innerText = `Subject: ${context.subject || "Draft"}`;
    } else if (context.type === "jira") {
      contextIcon.innerText = "🛠️";
      contextTitle.innerText = "Jira Ticket Detected";
      contextDesc.innerText = `Ticket: [${context.key || "Issue"}] ${context.title || ""}`;
    } else if (IMPORT_CONTEXT_TYPES.includes(context.type)) {
      const source = resolveSource(context);
      const meta = sourceMeta(source);
      const isTodo = context.type.endsWith("_todo_import");
      const isQna = context.type.endsWith("_qna_import");
      contextIcon.innerText = meta.icon;
      contextTitle.innerText = isTodo
        ? `${meta.label} Todo Project Created`
        : isQna
          ? `${meta.label} Q&A Created`
          : `${meta.label} Operations Imported`;
      contextDesc.innerText = source === "gmail"
        ? (context.subject || context.title || "Email")
        : `[${context.key || "Issue"}] ${context.title || ""}`;
      triggerImportAiAnalysis(context);
    }
  }

  function resolveSource(context) {
    if (context.source) return context.source;
    return context.type && context.type.startsWith("gmail") ? "gmail" : "jira";
  }

  function sourceMeta(source) {
    return source === "gmail"
      ? { icon: "📬", label: "Gmail" }
      : { icon: "🛠️", label: "Jira" };
  }

  async function triggerImportAiAnalysis(context) {
    switchTab("chat");

    if (!chatMessages) return;

    const source = resolveSource(context);
    const meta = sourceMeta(source);
    const isTodo = context.type.endsWith("_todo_import");
    const isQna = context.type.endsWith("_qna_import");
    const destName = isTodo ? t("jiraDestTodo") : isQna ? t("destQna") : t("jiraDestOps");

    const headline = source === "gmail"
      ? escapeHtml(context.subject || context.title || "Email")
      : `[${escapeHtml(context.key || "Issue")}] ${escapeHtml(context.title || "")}`;

    const systemCard = document.createElement("div");
    systemCard.className = "message system";
    systemCard.style.margin = "12px 0";
    systemCard.innerHTML = `
      <div style="background: rgba(255, 107, 94, 0.08); border: 1.2px solid rgba(255, 107, 94, 0.25); border-radius: 8px; padding: 12px; font-size: 13px;">
        <div style="font-weight: 800; color: var(--brse-primary); display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <span>${meta.icon} ${meta.label} → BrSE OS Bridge</span>
        </div>
        <div style="color: var(--brse-text); font-weight: 700; font-size: 13.5px; margin-bottom: 4px;">${headline}</div>
        <div style="color: var(--brse-text-dim); font-size: 11px; margin-bottom: 8px;">${t("jiraSyncSuccess")} <span style="color: var(--brse-accent); font-weight: bold;">${destName}</span></div>
        <div style="color: var(--brse-success); font-size: 11.5px; display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-block; width: 6px; height: 6px; background: var(--brse-success); border-radius: 50%; box-shadow: 0 0 6px var(--brse-success);"></span>
          ${t("jiraAiAnalyzing")}
        </div>
      </div>
    `;
    chatMessages.appendChild(systemCard);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    clearContext();

    pendingTodoSyncProjectId = isTodo ? context.projectId : null;
    pendingQnaRecordId = isQna ? (context.recordId || null) : null;
    pendingQnaTitle = source === "gmail"
      ? (context.subject || context.title || "Email")
      : `[${context.key || "Issue"}] ${context.title || ""}`;
    pendingQnaOriginal = source === "gmail"
      ? (context.subject || "")
      : (context.desc || "");

    const promptText = isTodo ? t("jiraTodoPrompt") : isQna ? t("qnaAnalysisPrompt") : t("jiraOpsPrompt");

    const contextBody = source === "gmail"
      ? `Tiêu đề: ${context.subject || context.title || ""}\nNgười gửi: ${context.sender || ""}\nNội dung email:\n${context.body || "Không có nội dung."}\nURL: ${context.url || ""}`
      : `Jira Key: ${context.key}\nTiêu đề: ${context.title}\nMô tả:\n${context.desc || "Không có mô tả."}\n\nBình luận:\n${JSON.stringify(context.comments || [])}\nURL: ${context.url || ""}`;

    chatController.addMessage(t("jiraAnalysisPreparing"), "ai");
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.BRSE_AI_REQUEST,
      action: "inline",
      prompt: promptText,
      text: contextBody
    });
  }

  function handleJiraTodoImportDone(text, projectId) {
    let parsedItems = [];
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    
    if (match) {
      try {
        parsedItems = JSON.parse(match[1].trim());
      } catch (e) {
        console.warn("[Sidepanel] JSON block parsing failed, trying broad sweep:", e);
      }
    }
    
    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        try {
          parsedItems = JSON.parse(text.substring(firstBracket, lastBracket + 1).trim());
        } catch (e) {
          console.warn("[Sidepanel] Broad sweep parsing failed too:", e);
        }
      }
    }

    const notifyCard = document.createElement("div");
    notifyCard.className = "message system";
    notifyCard.style.margin = "12px 0";

    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
      const formattedItems = parsedItems.map(item => ({
        phase: item.phase || "3. Implementation & Coding",
        title: item.title || "Tác vụ con",
        detail: item.detail || "Được tạo tự động bởi BrSE OS AI",
        priority: (item.priority || "MEDIUM").toUpperCase(),
        done: false,
        source: "workflow"
      }));

      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.BRSE_CREATE_TODO_ITEMS,
        payload: {
          projectId: projectId,
          items: formattedItems
        }
      }, (res) => {
        if (res && res.ok) {
          notifyCard.innerHTML = `
            <div style="background: rgba(78, 201, 165, 0.08); border: 1.2px solid rgba(78, 201, 165, 0.25); border-radius: 8px; padding: 12px; font-size: 13px;">
              <div style="font-weight: 800; color: var(--brse-success); display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span>${t("jiraSyncTaskSuccess")}</span>
              </div>
              <div style="color: var(--brse-text);">${t("jiraAutoImportedCount", [formattedItems.length])}</div>
            </div>
          `;
        } else {
          const safeError = escapeHtml(res?.error || "Unknown error.");
          notifyCard.innerHTML = `
            <div style="background: rgba(255, 93, 108, 0.08); border: 1.2px solid rgba(255, 93, 108, 0.25); border-radius: 8px; padding: 12px; font-size: 13px;">
              <div style="font-weight: 800; color: var(--brse-error); display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span>${t("jiraSyncTaskError")}</span>
              </div>
              <div style="color: var(--brse-text);">${t("jiraSyncTaskErrorDetail", [safeError])}</div>
            </div>
          `;
        }
        chatMessages.appendChild(notifyCard);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      });
    } else {
      notifyCard.innerHTML = `
        <div style="background: rgba(255, 180, 84, 0.08); border: 1.2px solid rgba(255, 180, 84, 0.25); border-radius: 8px; padding: 12px; font-size: 13px;">
          <div style="font-weight: 800; color: var(--brse-warning); display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span>${t("jiraSyncTaskWarning")}</span>
          </div>
          <div style="color: var(--brse-text);">${t("jiraSyncTaskWarningDetail")}</div>
        </div>
      `;
      chatMessages.appendChild(notifyCard);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function handleQnaImportDone(text, recordId) {
    pendingQnaRecordId = null;
    const aiText = (text || "").trim();
    if (!recordId || !aiText) return;

    const fieldA = pendingQnaOriginal
      ? `${pendingQnaOriginal}\n\n━━ AI gợi ý 確認事項 ━━\n${aiText}`
      : aiText;

    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.BRSE_UPDATE_OPERATION,
      opId: recordId,
      payload: {
        type: "qna",
        title: pendingQnaTitle || "Q&A",
        status: "OPEN",
        priority: "MEDIUM",
        field_a: fieldA,
      },
    }, (res) => {
      const card = document.createElement("div");
      card.className = "message system";
      card.style.margin = "12px 0";
      if (res && res.ok) {
        card.innerHTML = `
          <div style="background: rgba(78, 201, 165, 0.08); border: 1.2px solid rgba(78, 201, 165, 0.25); border-radius: 8px; padding: 12px; font-size: 13px;">
            <div style="font-weight: 800; color: var(--brse-success); margin-bottom: 4px;">✓ Đã lưu Q&A vào Operations</div>
            <div style="color: var(--brse-text); font-size: 11.5px;">Câu hỏi 確認事項 do AI soạn đã được lưu vào bản ghi (field Câu hỏi).</div>
          </div>`;
      } else {
        const safeError = escapeHtml(res?.error || "Unknown error.");
        card.innerHTML = `
          <div style="background: rgba(255, 180, 84, 0.08); border: 1.2px solid rgba(255, 180, 84, 0.25); border-radius: 8px; padding: 12px; font-size: 13px;">
            <div style="font-weight: 800; color: var(--brse-warning); margin-bottom: 4px;">⚠️ Chưa lưu được Q&A vào Operations</div>
            <div style="color: var(--brse-text); font-size: 11.5px;">${safeError} (bạn vẫn có thể copy thủ công).</div>
          </div>`;
      }
      if (chatMessages) {
        chatMessages.appendChild(card);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    });
  }

  function clearContext() {
    activeContext = null;
    if (contextBanner) contextBanner.classList.add("hidden");
    if (chrome.storage?.local) {
      chrome.storage.local.remove([STORAGE_KEYS.CONTEXT]);
    }
  }

  if (btnUseContext) {
    btnUseContext.onclick = () => {
      if (!activeContext) return;
      
      switchTab("write");
      
      const writeInput = document.querySelector("#write-input");
      if (!writeInput) return;
      
      if (activeContext.type === "gmail") {
        writeInput.value = `Write a polite business Japanese email to: ${activeContext.to || "recipient"}\nRegarding subject: ${activeContext.subject || "discussion"}\n\nMain content to draft: `;
      } else if (activeContext.type === "jira") {
        writeInput.value = `Create a professional report or update regarding Jira ticket [${activeContext.key}] "${activeContext.title}".\n\nProgress/Action items: `;
      }
      
      writeInput.focus();
      writeInput.selectionStart = writeInput.selectionEnd = writeInput.value.length;
      
      clearContext();
    };
  }

  if (btnClearContext) {
    btnClearContext.onclick = clearContext;
  }

  return {
    handleIncomingContext,
    handleJiraTodoImportDone,
    handleQnaImportDone,
    clearContext,
    getPendingTodoSyncProjectId: () => pendingTodoSyncProjectId,
    setPendingTodoSyncProjectId: (val) => { pendingTodoSyncProjectId = val; },
    getPendingQnaRecordId: () => pendingQnaRecordId
  };
}
