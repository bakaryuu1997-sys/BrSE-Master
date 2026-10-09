"use strict";

import { STORAGE_KEYS } from '../shared/storage.js';
import { MESSAGE_TYPES } from '../shared/messageTypes.js';
import { getModelLabel, readActiveAiModel } from '../shared/modelConfig.js';
import { formatChatMessage } from './chatFormatting.js';
import { initCrossTabContext } from './crossTabContext.js';
import { initSidepanelModelSelector } from './modelSelector.js';
import { initOcrTool } from './ocrTool.js';
import { initFlashcardTool } from './flashcardTool.js';
import { loadProjectStatus } from './projectStatus.js';
import { initSpecPreview } from './specPreview.js';
import { initSidepanelStatusPolling } from './status.js';
import { initWriteComposer } from './writeComposer.js';

// Newly extracted modules
import { initChatController } from './chatController.js';
import { initJiraContextSync } from './jiraContext.js';
import { localizeHtml } from '../shared/i18n.js';

// Initialize HTML localization
localizeHtml();

let currentTab = "chat";

function playAudio(text, lang = 'ja') {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_SPEAK, text, lang });
}

initSidepanelStatusPolling();

const version = chrome.runtime.getManifest().version;
const logoH1 = document.querySelector('.logo h1');
if (logoH1) {
  logoH1.innerHTML += ` <span style="font-size:9px; background:var(--primary); color:#121316; padding:1px 5px; border-radius:6px; margin-left:4px; vertical-align:middle; font-weight:900;">v${version} LOCAL</span>`;
}

const chatMessages = document.querySelector("#chat-messages");
const chatInput = document.querySelector("#chat-input");
const btnSend = document.querySelector("#btn-send");
const btnStop = document.querySelector("#btn-stop");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const sidepanelModelSelect = document.querySelector("#sidepanel-model-select");
const crossTabContext = initCrossTabContext();

// Banner Elements
const contextBanner = document.querySelector("#context-banner");
const contextIcon = document.querySelector("#context-icon");
const contextTitle = document.querySelector("#context-title");
const contextDesc = document.querySelector("#context-desc");
const btnUseContext = document.querySelector("#btn-use-context");
const btnClearContext = document.querySelector("#btn-clear-context");

initSidepanelModelSelector(sidepanelModelSelect);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

function switchTab(tabId) {
  tabButtons.forEach((button) => button.classList.remove("active"));
  tabContents.forEach((content) => content.classList.remove("active"));
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add("active");
  document.querySelector(`#tab-${tabId}`)?.classList.add("active");
  currentTab = tabId;
  if (tabId === "project") loadProjectStatus();
}

const chatController = initChatController({
  chatMessages,
  chatInput,
  btnSend,
  btnStop,
  MESSAGE_TYPES,
  getModelLabel,
  readActiveAiModel,
  formatChatMessage,
  playAudio
});

const jiraSync = initJiraContextSync({
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
});

btnSend.addEventListener("click", () => chatController.handleSendMessage(crossTabContext));
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatController.handleSendMessage(crossTabContext);
  }
});
chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(120, chatInput.scrollHeight)}px`;
});

const writeComposer = initWriteComposer({ formatChatMessage });

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK) {
    // Write-tab generations stream into their own result box; everything else
    // (chat, Jira/Gmail inline analysis) renders in the chat thread.
    if (writeComposer.isGenerating()) {
      writeComposer.handleStreamChunk(message);
    } else {
      chatController.handleStreamChunk(
        message,
        jiraSync.getPendingTodoSyncProjectId,
        jiraSync.handleJiraTodoImportDone,
        jiraSync.getPendingQnaRecordId,
        jiraSync.handleQnaImportDone
      );
    }
  } else if (message.type === MESSAGE_TYPES.BRSE_CONTEXT_UPDATED) {
    jiraSync.handleIncomingContext(message.context);
  } else if (message.type === MESSAGE_TYPES.BRSE_QUICK_CHAT_TRIGGERED) {
    chatController.handleIncomingQuickChat(message.text);
  }
});

document.querySelector("#btn-config").addEventListener("click", () => {
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  else window.open(chrome.runtime.getURL("options.html"));
});

if (chrome.storage?.local) {
  chrome.storage.local.get([STORAGE_KEYS.CONTEXT, STORAGE_KEYS.QUICK_CHAT], (res) => {
    if (res[STORAGE_KEYS.CONTEXT]) {
      jiraSync.handleIncomingContext(res[STORAGE_KEYS.CONTEXT]);
    }
    if (res[STORAGE_KEYS.QUICK_CHAT]) {
      chatController.handleIncomingQuickChat(res[STORAGE_KEYS.QUICK_CHAT]);
    }
  });
}

initSpecPreview({ switchTab });
initOcrTool();
initFlashcardTool();

// Connect Tool Cards
document.querySelector("#tool-recorder")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_SHOW_RECORDING_FOLDER });
});

document.querySelector("#tool-docx-pdf")?.addEventListener("click", () => {
  chrome.tabs.create({ url: "http://127.0.0.1:3010/app/power-tools" });
});

document.querySelector("#tool-open-dashboard")?.addEventListener("click", () => {
  chrome.tabs.create({ url: "http://127.0.0.1:3010" });
});

document.querySelector("#tool-keigo")?.addEventListener("click", () => {
  switchTab("write");
  const writeTone = document.querySelector("#write-tone");
  if (writeTone) writeTone.value = "polite";
});

document.querySelector("#tool-horenso")?.addEventListener("click", () => {
  switchTab("write");
  const reportBtn = document.querySelector('.tmpl-btn[data-type="report"]');
  if (reportBtn) reportBtn.click();
});
