"use strict";

import { googleTranslatePro, translateText } from '../shared/google-translate.js';
import { DEFAULT_API_BASE, getApiBase, getAuthHeaders, syncToProjectHub } from '../shared/api.js';
import { MESSAGE_TYPES } from '../shared/messageTypes.js';
import { retryOfflineSync } from '../shared/outbox.js';
import { getStorageItems, STORAGE_KEYS } from '../shared/storage.js';
import { getLanguage } from '../shared/i18n.js';
import {
  DEFAULT_EXTENSION_MODEL,
  EXTENSION_AI_MODELS,
  getSupportedAiModels,
  normalizeAiModel,
  readActiveAiModel,
} from '../shared/modelConfig.js';
import {
  resolveActiveModelForRequest,
  setBackendModel,
  syncActiveModelFromBackend,
} from './modelSync.js';
import {
  ensureRuntimeReadyModel,
  fetchAiStream,
  isUnauthorizedAiError,
  parseAndStreamResponse,
  stopActiveAiStream,
} from './aiStream.js';
import {
  handleAddGlossaryTerm,
  handleGetGlossary,
  handleUpdateGlossaryTerm,
} from './glossarySync.js';
import {
  handleCheckJiraExists,
  handleCheckKeigo,
  handleCreateOperation,
  handleUpdateOperation,
  handleCreateTodoItems,
  handleCreateTodoProject,
  handleQuickInjectItems,
  handleSearchMemos,
  handleShadowReply,
} from './backendBridge.js';
import {
  collectVisibleTabContexts,
  getActiveCurrentTab,
  getOtherTabContexts,
  recordTabContext,
  registerTabContextCleanup,
  safeSendTabMessage,
  sendOrInjectTabMessage,
} from './tabMessaging.js';

registerTabContextCleanup();

// Self-healing migration for API Base URL from old port 8000 or legacy WSL IP to port 3010 proxy
try {
  chrome.storage.sync.get([STORAGE_KEYS.API_BASE_URL], (res) => {
    const url = res[STORAGE_KEYS.API_BASE_URL];
    if (url && (url.includes("127.0.0.1:8000") || url.includes("localhost:8000") || url.includes("172.21.191.148"))) {
      chrome.storage.sync.set({ [STORAGE_KEYS.API_BASE_URL]: DEFAULT_API_BASE }, () => {
        console.log("[Background] Automatically migrated API base URL to port 3010 proxy.");
      });
    }
  });
} catch (e) {
  console.warn("[Background] API Base URL migration skipped/failed:", e.message);
}

// Auto-retry offline outbox sync every 30 seconds
setInterval(async () => {
  try {
    const res = await retryOfflineSync(syncToProjectHub);
    if (res.successCount > 0) {
      console.log(`[Background Sync] Auto-synced ${res.successCount} items from offline outbox queue!`);
    }
  } catch (err) {
    console.warn("[Background Sync] Auto-retry error:", err.message);
  }
}, 30000);

syncActiveModelFromBackend().catch((err) => {
  console.warn("[Background] Initial model sync skipped:", err.message);
});

setInterval(() => {
  syncActiveModelFromBackend().catch((err) => {
    console.warn("[Background] Periodic model sync skipped:", err.message);
  });
}, 15000);

async function handleAiStreamRequest(message, sender, sendResponse) {
  const apiBase = await getApiBase();
  const headers = await getAuthHeaders();
  if (sendResponse) sendResponse({ ok: true });

  let activeModel = DEFAULT_EXTENSION_MODEL;
  try {
    activeModel = await resolveActiveModelForRequest();
    activeModel = await ensureRuntimeReadyModel(apiBase, headers, activeModel);
  } catch (err) {
    console.warn("[Background] Active model sync failed, using extension default:", err.message);
    await setBackendModel(DEFAULT_EXTENSION_MODEL).catch((fallbackErr) => {
      console.warn("[Background] Default model sync also failed:", fallbackErr.message);
    });
  }

  const getPrompt = (action, lang) => {
    const activeLang = lang || getLanguage();
    const defaultLang = activeLang === "ja" ? "ja" : (activeLang === "en" ? "en" : "vi");
    
    if (action === "explain") {
      if (defaultLang === "ja") return "次の選択範囲を説明してください。【コード/ログ/エラーの場合】何をするか、エラー原因(あれば)、修正方法、学ぶべきIT概念を1〜2点、簡潔に。【通常の文章の場合】意味・文法・BrSE業務での使い方。日本語・簡潔なMarkdownで：";
      if (defaultLang === "en") return "Explain the selection below. If it is CODE / a LOG / an ERROR: concisely say what it does, the root cause (if any), how to fix it, and 1-2 IT concepts worth learning. If it is normal text: explain meaning, grammar, and BrSE usage. Reply in concise Markdown: ";
      return "Hãy giải thích đoạn dưới đây. NẾU là CODE / LOG / LỖI: nói ngắn gọn nó làm gì, nguyên nhân lỗi (nếu có), cách sửa, và 1-2 khái niệm IT nên học. NẾU là văn bản thường: giải thích ý nghĩa, ngữ pháp và cách dùng trong công việc BrSE. Trả lời bằng Markdown gọn: ";
    }
    if (action === "grammar") {
      if (defaultLang === "ja") return "次の文章の文法エラーをチェックし、より正確な表現を提案してください（ビジネススタイルを優先してください）：";
      if (defaultLang === "en") return "Please check for grammatical errors and suggest a more accurate way to write this paragraph (prioritize business style): ";
      return "Hãy kiểm tra lỗi ngữ pháp và đề xuất cách viết chuẩn xác hơn cho đoạn văn này (ưu tiên văn phong Business): ";
    }
    if (action === "polish") {
      if (defaultLang === "ja") return "次の文章を最もプロフェッショナルで丁寧な日本語の敬語（ビジネス敬語）表現に推敲してください：";
      if (defaultLang === "en") return "Please polish the following text into professional and polite Japanese business style (Keigo): ";
      return "Hãy chuyển đoạn văn sau thành văn phong Keigo (Kính ngữ Nhật Bản) chuyên nghiệp và lịch sự nhất: ";
    }
    if (action === "summary") {
      if (defaultLang === "ja") {
        return `次の文書の内容を日本語で簡潔に要約してください。Markdownのみで出力し、JSONやコードフェンスは出力しないでください。構成は「概要」「重要ポイント」「アクションアイテム」「注意点/不明点」です。

対象文書：`;
      }
      if (defaultLang === "en") {
        return `Please summarize the following web page/document in English. Return Markdown only. Do not output JSON or fenced code blocks. Use these sections: Overview, Key points, Action items, Risks/unknowns.

Document to summarize: `;
      }
      return `Hãy tóm tắt nội dung trang web/tài liệu sau bằng Tiếng Việt. Chỉ trả về Markdown, không trả JSON hoặc code fence. Dùng các phần: Tóm tắt, Điểm chính, Action items, Rủi ro/điểm chưa rõ.

Tài liệu cần tóm tắt: `;
    }
    return "";
  };

  let input = "";
  if (message.promptOverride) {
    input = String(message.promptOverride).slice(0, 9000);
  } else if (message.action === "inline") {
    input = `Yêu cầu: ${message.prompt}\n\nVăn bản hiện tại hoặc ngữ cảnh:\n${message.text || ""}`;
  } else {
    input = `${getPrompt(message.action, message.lang)}\n\n${message.text}`;
  }

  try {
    let response;
    try {
      response = await fetchAiStream(apiBase, headers, input, message);
    } catch (err) {
      if (activeModel !== DEFAULT_EXTENSION_MODEL && isUnauthorizedAiError(err)) {
        console.warn(`[Background] Model ${activeModel} was rejected by runtime. Retrying with ${DEFAULT_EXTENSION_MODEL}.`);
        await setBackendModel(DEFAULT_EXTENSION_MODEL);
        activeModel = DEFAULT_EXTENSION_MODEL;
        response = await fetchAiStream(apiBase, headers, input, message);
      } else {
        throw err;
      }
    }
    
    await parseAndStreamResponse(response, sender, message, { model: activeModel, provider: "local" });
  } catch (err) {
    console.warn("Local Backend failed or bypassed, trying Cloud fallback:", err.message);
    const stored = await getStorageItems([STORAGE_KEYS.GEMINI_API_KEY, STORAGE_KEYS.GEMINI_MODEL]);
    if (stored[STORAGE_KEYS.GEMINI_API_KEY]) {
      try {
        const model = stored[STORAGE_KEYS.GEMINI_MODEL] || "gemini-2.5-flash";
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${stored[STORAGE_KEYS.GEMINI_API_KEY]}`;
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input }] }]
          })
        });
        if (!response.ok) throw new Error(`Gemini Cloud API (${response.status})`);
        
        await parseAndStreamResponse(response, sender, message, { model, provider: "gemini" });
      } catch (cloudErr) {
        const errorMsg = `❌ Lỗi Cloud Fallback: ${cloudErr.message}`;
        if (sender.tab?.id) {
          safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_QUICK_AI_RESULT, text: errorMsg });
          safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, done: true, error: cloudErr.message });
        }
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, done: true, error: cloudErr.message });
      }
    } else {
      const errorMsg = `❌ Lỗi kết nối Local Backend (${activeModel}): ${err.message}. Vui lòng khởi động backend hoặc cấu hình Gemini API Key trong phần Cài đặt để kích hoạt Cloud Fallback.`;
      if (sender.tab?.id) {
        safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_QUICK_AI_RESULT, text: errorMsg });
        safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, done: true, error: err.message });
      }
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, done: true, error: err.message });
    }
  }
}

async function handlePerformOcr(params) {
  const apiBase = await getApiBase();
  const headers = await getAuthHeaders();
  const mode = params.mode || "hybrid";
  const imagePayload = params.image
    ? (params.image.includes(",") ? params.image.split(",")[1] : params.image)
    : "";

  async function requestBackendOcr(payload) {
    const response = await fetch(`${apiBase}/ai/ocr`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.detail || errorData.error || response.statusText || "Unknown OCR backend error";
      throw new Error(`Backend OCR API returned status ${response.status}: ${detail}`);
    }

    const data = await response.json();
    if (data && data.success) {
      return { success: true, translations: data.translations, mode: payload.mode };
    }
    throw new Error(data?.error || "Backend OCR processing failed");
  }

  if (mode === "offline") {
    const extractedText = String(params.text || "").trim();
    if (!extractedText) {
      throw new Error("Offline OCR requires extracted text from the page content script.");
    }
    return requestBackendOcr({
      base64_image: null,
      text: extractedText,
      mode: "offline"
    });
  }

  if (!imagePayload && params.imageUrl) {
    return requestBackendOcr({
      base64_image: null,
      image_url: params.imageUrl,
      text: null,
      mode
    });
  }

  if (!imagePayload) {
    throw new Error("Image data is empty.");
  }

  return requestBackendOcr({
    base64_image: imagePayload,
    text: null,
    mode
  });
}

// Pre-warm a local (Ollama) model so the user's first AI action is not met with
// a 30s+ cold-start (which previously looked like "AI not working"). Fire-and-
// forget; only for the local provider, only on browser start / extension update.
async function warmUpLocalModel() {
  try {
    const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
    const statusRes = await fetch(`${apiBase}/ai/status?check_runtime=true`, {
      headers,
      signal: AbortSignal.timeout(6000),
    });
    if (!statusRes.ok) return;
    const status = await statusRes.json().catch(() => ({}));
    if (status.provider !== "ollama") return; // cloud/9router lanes do not cold-start
    fetch(`${apiBase}/ai/chat`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping" }),
      signal: AbortSignal.timeout(60000),
    }).catch(() => {});
  } catch {
    // Backend offline — nothing to warm.
  }
}

chrome.runtime.onStartup?.addListener(() => { warmUpLocalModel(); });
chrome.runtime.onInstalled?.addListener(() => { warmUpLocalModel(); });

// --- Listeners ---
chrome.commands.onCommand.addListener((command) => {
  if (command === "open_command_palette") {
    getActiveCurrentTab()
      .then((tab) => sendOrInjectTabMessage(tab, { type: MESSAGE_TYPES.BRSE_OPEN_PALETTE }))
      .catch((err) => console.warn("[BrSE Background] Command palette injection failed:", err.message));
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "brse-parent", title: "BrSE OS Assistant", contexts: ["selection", "page"] });
  chrome.contextMenus.create({ id: "brse-google", parentId: "brse-parent", title: "G Dịch Pro (Google)", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "brse-google") {
    googleTranslatePro(info.selectionText).then(data => {
      return sendOrInjectTabMessage(tab, { type: MESSAGE_TYPES.BRSE_GOOGLE_RESULT, data });
    }).catch(err => {
      sendOrInjectTabMessage(tab, {
        type: MESSAGE_TYPES.BRSE_GOOGLE_RESULT,
        data: { error: err.message, originalText: info.selectionText }
      });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "BRSE_DOWNLOAD_FILE") {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      saveAs: false
    }, (downloadId) => {
      sendResponse({ ok: true, downloadId });
    });
    return true;
  }

  if (message.type === "BRSE_ABORT_AI_REQUEST") {
    stopActiveAiStream();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_GOOGLE_TRANSLATE) {
    googleTranslatePro(message.text).then(data => {
      if (sender.tab?.id) safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_GOOGLE_RESULT, data });
      sendResponse({ ok: true, data });
    }).catch(err => {
      const errData = { error: err.message, originalText: message.text };
      if (sender.tab?.id) {
        safeSendTabMessage(sender.tab.id, {
          type: MESSAGE_TYPES.BRSE_GOOGLE_RESULT,
          data: errData
        });
      }
      sendResponse({ ok: false, error: err.message, data: errData });
    });
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_TRANSLATE_TEXT) {
    // Content scripts cannot fetch translate.googleapis.com directly (page CORS
    // blocks the cross-origin response). The service worker has host permission,
    // so run the translation here and hand back just the string.
    // Cap the payload: the free Google endpoint rejects very long q= anyway, and
    // this stops a page from spamming huge translation requests through us.
    const text = String(message.text || "").slice(0, 5000);
    translateText(text, message.targetLang)
      .then((translation) => sendResponse({ ok: true, translation: translation || "" }))
      .catch((err) => sendResponse({ ok: false, error: err?.message || "translate failed", translation: "" }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_PERFORM_OCR) {
    handlePerformOcr(message)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_START_OCR_ON_ACTIVE_TAB) {
    getActiveCurrentTab()
      .then((tab) => sendOrInjectTabMessage(tab, { type: MESSAGE_TYPES.BRSE_START_OCR_CAPTURE }))
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_INJECT_TEXT_ON_ACTIVE_TAB) {
    getActiveCurrentTab()
      .then((tab) => sendOrInjectTabMessage(tab, { type: MESSAGE_TYPES.BRSE_INJECT_TEXT, text: message.text }))
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // Open the in-page command palette on the active tab. The keyboard command
  // path does the same; this runtime entry lets the popup Quick-actions hub
  // trigger it (the popup is not a tab, so it cannot message a tab directly).
  if (message.type === MESSAGE_TYPES.BRSE_OPEN_PALETTE) {
    getActiveCurrentTab()
      .then((tab) => sendOrInjectTabMessage(tab, { type: MESSAGE_TYPES.BRSE_OPEN_PALETTE }))
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_AI_REQUEST) {
    handleAiStreamRequest(message, sender, sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_CAPTURE_TAB) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      let targetTab = tabs[0];
      if (!targetTab) {
        chrome.tabs.query({ active: true, currentWindow: true }, (fallbackTabs) => {
          targetTab = fallbackTabs[0];
          if (!targetTab || !targetTab.windowId) {
            sendResponse({ success: false, error: "Không tìm thấy tab hoạt động để chụp ảnh." });
            return;
          }
          captureTab(targetTab.windowId);
        });
      } else {
        captureTab(targetTab.windowId);
      }
    });

    function captureTab(windowId) {
      try {
        chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error("[Background Capture] captureVisibleTab failed:", chrome.runtime.lastError.message);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else if (!dataUrl) {
            sendResponse({ success: false, error: "Không lấy được ảnh chụp màn hình." });
          } else {
            sendResponse({ success: true, dataUrl });
          }
        });
      } catch (err) {
        console.error("[Background Capture] Exception:", err.message);
        sendResponse({ success: false, error: err.message });
      }
    }
    return true; // Keep message channel open for async response
  }

  if (message.type === MESSAGE_TYPES.BRSE_SAVE_AND_SHOW_RECORDING) {
    const filename = message.filename || `meeting_live_${Date.now()}.webm`;
    const audioUrl = message.audioDataUrl;
    if (!audioUrl) {
      sendResponse({ ok: false, error: "Missing audioDataUrl" });
      return true;
    }

    try {
      chrome.downloads.download({
        url: audioUrl,
        filename: `BrSE_Meetings/${filename}`,
        saveAs: false,
        conflictAction: "uniquify"
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("[Downloads] Recording download failed:", chrome.runtime.lastError.message);
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true, downloadId });
        }
      });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_SHOW_RECORDING_FOLDER) {
    try {
      if (message.downloadId) {
        chrome.downloads.show(message.downloadId);
        sendResponse({ ok: true });
      } else {
        chrome.downloads.showDefaultFolder();
        sendResponse({ ok: true });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_OPEN_QUICKNOTE_WINDOW) {
    // Detached, standalone Quick Memo window: survives closing the page and can
    // be moved anywhere on screen (outside the browser). Shares the same notes
    // via chrome.storage.local.
    chrome.windows.create({
      url: chrome.runtime.getURL("src/quicknote/index.html"),
      type: "popup",
      width: 480,
      height: 640,
    })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_OPEN_SIDEPANEL) {
    chrome.sidePanel.open({ tabId: sender.tab.id })
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_GET_IPA) {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(message.text)}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        let ukIpa = "";
        let usIpa = "";
        let ukAudio = "";
        let usAudio = "";

        if (Array.isArray(data) && data[0]) {
          const entry = data[0];
          if (Array.isArray(entry.phonetics)) {
            entry.phonetics.forEach(ph => {
              if (ph.audio) {
                const aud = ph.audio.startsWith('//') ? 'https:' + ph.audio : ph.audio;
                if (aud.includes('-uk') || aud.includes('/uk/')) {
                  ukAudio = aud;
                } else if (aud.includes('-us') || aud.includes('/us/')) {
                  usAudio = aud;
                } else {
                  if (!ukAudio) ukAudio = aud;
                  if (!usAudio) usAudio = aud;
                }
              }
              if (ph.text) {
                if (ph.text.includes('UK') || ph.audio?.includes('-uk')) {
                  ukIpa = ph.text;
                } else if (ph.text.includes('US') || ph.audio?.includes('-us')) {
                  usIpa = ph.text;
                } else {
                  if (!ukIpa) ukIpa = ph.text;
                  if (!usIpa) usIpa = ph.text;
                }
              }
            });
          }
          if (!ukIpa && entry.phonetic) ukIpa = entry.phonetic;
          if (!usIpa && entry.phonetic) usIpa = entry.phonetic;
        }
        sendResponse({ ok: true, ukIpa, usIpa, ukAudio, usAudio });
      })
      .catch(err => {
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_SPEAK) {
    chrome.tts.speak(message.text, { lang: message.lang || 'ja', rate: 1.0 });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === MESSAGE_TYPES.BRSE_SYNC_KNOWLEDGE) {
    syncToProjectHub(message.originalText, message.translation, message.url, message.projectId)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_SEARCH_MEMOS) {
    handleSearchMemos(sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_GET_QUICK_INJECT_ITEMS) {
    handleQuickInjectItems(sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_CREATE_OPERATION) {
    handleCreateOperation(message, sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_UPDATE_OPERATION) {
    handleUpdateOperation(message, sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_CREATE_TODO_PROJECT) {
    handleCreateTodoProject(message, sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_CREATE_TODO_ITEMS) {
    handleCreateTodoItems(message, sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_CHECK_KEIGO) {
    handleCheckKeigo(message, sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_GET_GLOSSARY) {
    handleGetGlossary(sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_SET_MODEL) {
    setBackendModel(message.model)
      .then(data => sendResponse({ ok: true, data, model: normalizeAiModel(message.model) }))
      .catch(err => {
        console.error("[Background] Set active model failed:", err.message);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_ADD_GLOSSARY_TERM) {
    handleAddGlossaryTerm(message, sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_UPDATE_GLOSSARY_TERM) {
    handleUpdateGlossaryTerm(message, sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_GET_AI_MODELS) {
    syncActiveModelFromBackend({ checkRuntime: true })
      .then((status) => {
        sendResponse({
          ok: true,
          data: {
            ...status,
            presets: getSupportedAiModels(status.available_models || EXTENSION_AI_MODELS),
            runtime_models: [],
          },
        });
      })
      .catch(async (err) => {
        const selectedModel = await readActiveAiModel();
        sendResponse({
          ok: false,
          error: err.message,
          data: {
            selected_model: selectedModel,
            model: selectedModel,
            presets: getSupportedAiModels(),
            runtime_models: [],
          },
        });
      }).catch(err => {
        console.error("[Background] Get AI models failed:", err.message);
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_RETRY_SYNC) {
    retryOfflineSync(syncToProjectHub)
    .then(res => {
      sendResponse({ ok: true, successCount: res.successCount, remaining: res.remaining });
      // Notify outbox storage change
      chrome.storage.local.get(["brse_outbox_queue"], (stored) => {
        const queue = stored.brse_outbox_queue || [];
        chrome.storage.local.set({ brse_outbox_queue: queue });
      });
    })
    .catch(err => {
      console.error("[Background] Retry sync failed:", err.message);
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_CHECK_JIRA_EXIST) {
    handleCheckJiraExists(message, sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_REPORT_TAB_CONTEXT) {
    sendResponse(recordTabContext(sender, message));
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_COLLECT_VISIBLE_TAB_CONTEXTS) {
    collectVisibleTabContexts(sender)
      .then((tabs) => sendResponse({ ok: true, tabs }))
      .catch((err) => sendResponse({ ok: false, error: err.message, tabs: getOtherTabContexts(sender) }));
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_GET_ACTIVE_TABS) {
    sendResponse({ ok: true, tabs: getOtherTabContexts(sender) });
    return true;
  }

  if (message.type === MESSAGE_TYPES.BRSE_GET_SHADOW_REPLY) {
    handleShadowReply(message, sendResponse);
    return true;
  }

  return false;
});



