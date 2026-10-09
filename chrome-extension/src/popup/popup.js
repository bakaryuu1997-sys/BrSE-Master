"use strict";

import { getStorageItems, setStorageItems, STORAGE_KEYS } from '../shared/storage.js';
import { MESSAGE_TYPES } from '../shared/messageTypes.js';
import {
  DEFAULT_EXTENSION_MODEL,
  normalizeAiModel,
  persistActiveAiModel,
  readActiveAiModel,
  renderAiModelOptions,
} from '../shared/modelConfig.js';
import { buildLearnedTermsHtml } from '../shared/learnedTermsRenderer.js';
import { escapeHtml } from '../shared/sanitizer.js';
import { checkRuntimeStatus, normalizeApiBaseUrl } from '../shared/settingsStatus.js';
import { DEFAULT_API_BASE } from '../shared/api.js';
import { t, localizeHtml } from '../shared/i18n.js';

// Initialize HTML localization
localizeHtml();

const apiBaseInput = document.querySelector("#apiBaseUrl");
const secretTokenInput = document.querySelector("#secretToken");
const aiModelSelect = document.querySelector("#aiModel");
const configStatus = document.querySelector("#config-status");
const todoList = document.querySelector("#todo-list");
const todoCount = document.querySelector("#todo-count");
const connectionDot = document.querySelector("#connection-dot");
const saveConfigButton = document.querySelector("#btn-save-config");

const furiganaAlwaysOnInput = document.querySelector("#furiganaAlwaysOn");

getStorageItems([
  STORAGE_KEYS.API_BASE_URL,
  STORAGE_KEYS.SECRET_TOKEN,
  STORAGE_KEYS.AI_MODEL,
  STORAGE_KEYS.FURIGANA_ALWAYS_ON
]).then((stored) => {
  apiBaseInput.value = stored[STORAGE_KEYS.API_BASE_URL] || DEFAULT_API_BASE;
  secretTokenInput.value = stored[STORAGE_KEYS.SECRET_TOKEN] || "";
  if (furiganaAlwaysOnInput) {
    furiganaAlwaysOnInput.checked = Boolean(stored[STORAGE_KEYS.FURIGANA_ALWAYS_ON]);
  }

  // Load active models dynamically
  loadDynamicAiModels();

  loadTodos();
});

// Persist the furigana "always on" preference immediately on toggle.
furiganaAlwaysOnInput?.addEventListener("change", () => {
  setStorageItems({ [STORAGE_KEYS.FURIGANA_ALWAYS_ON]: furiganaAlwaysOnInput.checked });
});

document.querySelectorAll(".tab-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    const targetTab = button.dataset.tab;
    document.querySelectorAll("section").forEach((section) => {
      section.style.display = "none";
    });
    document.querySelector(`#tab-${targetTab}`).style.display = "block";

    if (targetTab === "todos") loadTodos();
  });
});

// --- Quick-actions hub (Dashboard) ---
document.querySelector("#hub-palette")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_OPEN_PALETTE });
  window.close();
});

document.querySelector("#hub-ocr")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_START_OCR_ON_ACTIVE_TAB });
  window.close();
});

document.querySelector("#hub-sidepanel")?.addEventListener("click", () => {
  // The popup is not a tab, so open the side panel against the active tab.
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs?.[0]?.id;
    if (tabId == null) return;
    chrome.sidePanel
      .open({ tabId })
      .then(() => window.close())
      .catch((err) => console.warn("[Popup] Open sidepanel failed:", err?.message));
  });
});

document.querySelector("#hub-webapp")?.addEventListener("click", async () => {
  const stored = await getStorageItems([STORAGE_KEYS.API_BASE_URL]);
  const base = (stored[STORAGE_KEYS.API_BASE_URL] || DEFAULT_API_BASE).replace(/\/$/, "");
  // API base is ".../api"; the browser app lives at ".../app".
  const appUrl = base.replace(/\/api$/, "/app");
  chrome.tabs.create({ url: appUrl });
  window.close();
});

// --- Hub toggles: glossary highlight + Keigo checker ---
// Both are chrome.storage.local flags that the content scripts already watch
// live (GlossaryHighlighter + KeigoChecker). Default (undefined) = enabled.
function paintHubToggle(btn, enabled) {
  if (!btn) return;
  btn.classList.toggle("is-on", enabled);
  btn.setAttribute("aria-pressed", String(enabled));
}

function initHubToggle(selector, flagKey) {
  const btn = document.querySelector(selector);
  if (!btn) return;
  chrome.storage.local.get([flagKey], (res) => paintHubToggle(btn, res[flagKey] !== false));
  btn.addEventListener("click", () => {
    chrome.storage.local.get([flagKey], (res) => {
      const next = res[flagKey] === false; // currently disabled -> enable, else disable
      chrome.storage.local.set({ [flagKey]: next }, () => paintHubToggle(btn, next));
    });
  });
}

initHubToggle("#hub-glossary", "brseGlossaryHighlightEnabled");
initHubToggle("#hub-keigo", "brseKeigoEnabled");

// FuriganaHover uses chrome.storage.sync (not local).
(function() {
  const btn = document.querySelector("#hub-furigana");
  if (!btn) return;
  const key = "brseFuriganaEnabled";
  chrome.storage.sync.get([key], (res) => paintHubToggle(btn, res[key] !== false));
  btn.addEventListener("click", () => {
    chrome.storage.sync.get([key], (res) => {
      const next = res[key] === false; // flip
      chrome.storage.sync.set({ [key]: next }, () => paintHubToggle(btn, next));
    });
  });
})();

function setConfigStatus(message, state = "") {
  if (!configStatus) return;
  configStatus.classList.remove("is-saving", "is-success", "is-error");
  if (state) configStatus.classList.add(`is-${state}`);
  configStatus.textContent = message;
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

saveConfigButton.addEventListener("click", async () => {
  let apiBaseUrl = apiBaseInput.value.trim() || DEFAULT_API_BASE;
  const secretToken = secretTokenInput.value.trim();
  const aiModel = normalizeAiModel(aiModelSelect.value);

  apiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

  apiBaseInput.value = apiBaseUrl; // Reflect correct URL back to input field

  saveConfigButton.disabled = true;
  setConfigStatus(t("savingSettingsStatus"), "saving");

  try {
    await setStorageItems({
      [STORAGE_KEYS.API_BASE_URL]: apiBaseUrl,
      [STORAGE_KEYS.SECRET_TOKEN]: secretToken,
      [STORAGE_KEYS.AI_MODEL]: aiModel
    });
    let persistedModel = await persistActiveAiModel(aiModel);
    await sendRuntimeMessage({ type: MESSAGE_TYPES.BRSE_SET_MODEL, model: persistedModel });
    let runtime = await checkRuntimeStatus(apiBaseUrl, secretToken);

    if (!runtime.ok && /\b(401|403)\b/.test(runtime.message) && persistedModel !== DEFAULT_EXTENSION_MODEL) {
      setConfigStatus(t("modelRejectedStatus", [persistedModel, DEFAULT_EXTENSION_MODEL]), "saving");
      await sendRuntimeMessage({ type: MESSAGE_TYPES.BRSE_SET_MODEL, model: DEFAULT_EXTENSION_MODEL });
      persistedModel = await persistActiveAiModel(DEFAULT_EXTENSION_MODEL);
      renderAiModelOptions(aiModelSelect, persistedModel);
      runtime = await checkRuntimeStatus(apiBaseUrl, secretToken);
    }

    const message = runtime.ok
      ? t("settingsSavedSuccess", [persistedModel, runtime.message])
      : t("settingsSavedLocalOnly", [runtime.message]);
    setConfigStatus(message, runtime.ok ? "success" : "error");
    loadTodos();
  } catch (error) {
    setConfigStatus(t("settingsSavedError", [error.message]), "error");
  } finally {
    saveConfigButton.disabled = false;
  }
});

const btnShowLearned = document.querySelector("#btn-show-learned");
const btnResetLearned = document.querySelector("#btn-reset-learned");
const learnedListContainer = document.querySelector("#learned-list-container");

function renderLearnedList() {
  chrome.storage.local.get(["brseLearnedTerms", "brseGlossaryCache"], (res) => {
    const learnedIds = Array.isArray(res.brseLearnedTerms) ? res.brseLearnedTerms : [];
    const cachedTerms = Array.isArray(res.brseGlossaryCache) ? res.brseGlossaryCache : [];
    
    const countEl = document.querySelector("#learned-count");
    if (countEl) countEl.textContent = learnedIds.length;
    
    const listEl = document.querySelector("#learned-list");
    
    if (!listEl) return;
    
    if (learnedIds.length === 0) {
      listEl.innerHTML = buildLearnedTermsHtml(learnedIds, cachedTerms);
      if (btnResetLearned) btnResetLearned.style.display = "none";
      return;
    }
    
    if (btnResetLearned) btnResetLearned.style.display = "block";
    listEl.innerHTML = buildLearnedTermsHtml(learnedIds, cachedTerms, { maxWidth: "150px" });
    
    // Bind click events to Unhide buttons
    listEl.querySelectorAll(".unhide-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        chrome.storage.local.get(["brseLearnedTerms"], (r) => {
          const current = Array.isArray(r.brseLearnedTerms) ? r.brseLearnedTerms : [];
          const updated = current.filter(termId => termId !== id);
          chrome.storage.local.set({ brseLearnedTerms: updated }, () => {
            chrome.runtime.sendMessage({ type: "BRSE_GLOSSARY_UPDATED" });
            renderLearnedList();
          });
        });
      });
    });
  });
}

if (btnShowLearned) {
  btnShowLearned.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = learnedListContainer.style.display === "none" || !learnedListContainer.style.display;
    learnedListContainer.style.display = isHidden ? "block" : "none";
    if (isHidden) renderLearnedList();
  });
}

if (btnResetLearned) {
  btnResetLearned.addEventListener("click", (e) => {
    e.stopPropagation();
    chrome.storage.local.set({ brseLearnedTerms: [] }, () => {
      chrome.runtime.sendMessage({ type: "BRSE_GLOSSARY_UPDATED" });
      renderLearnedList();
    });
  });
}

// Initial load
renderLearnedList();

async function loadTodos() {
  const stored = await getStorageItems([STORAGE_KEYS.API_BASE_URL, STORAGE_KEYS.SECRET_TOKEN]);
  const apiBaseUrl = stored[STORAGE_KEYS.API_BASE_URL];
  const secretToken = stored[STORAGE_KEYS.SECRET_TOKEN];
  const baseUrl = (apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, "");

  try {
    const headers = { "Content-Type": "application/json" };
    if (secretToken) headers["X-BrSE-Token"] = secretToken;

    const response = await fetch(`${baseUrl}/command-center`, {
      headers,
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Invalid token");
      if (response.status === 404) throw new Error("Wrong API URL");
      throw new Error(`Server error ${response.status}`);
    }

    const data = await response.json();
    const todos = (data.next_focus || data.open_todos || []).slice(0, 5);

    todoCount.textContent = String(todos.length);
    connectionDot.style.background = "var(--success)";
    connectionDot.title = t("backendStatusOnline");

    if (!todos.length) {
      todoList.innerHTML = `<p class="status-msg text-muted">${t("noUrgentFocus")}</p>`;
      return;
    }

    todoList.innerHTML = todos
      .map(
        (todo) => `
          <div class="todo-item">
            <div class="todo-check" style="border-color: var(--accent-primary);"></div>
            <div class="todo-text">
              <div style="font-weight: bold; color: var(--text-primary);">${escapeHtml(todo.title || "Untitled")}</div>
              <div class="todo-meta">${escapeHtml(todo.project_name || "Project")} - ${escapeHtml(todo.priority || "P2")}</div>
            </div>
          </div>
        `,
      )
      .join("");
  } catch (error) {
    connectionDot.style.background = "var(--error)";
    connectionDot.title = t("backendStatusOffline", [error.message]);
    todoCount.textContent = "0";
    todoList.innerHTML = `<p class="status-msg text-error">${escapeHtml(error.message)}</p>`;
  }
}

// Listen for model storage changes from other components (F5-free 3-way sync)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.brseActiveChatModel) {
    const newModel = normalizeAiModel(changes.brseActiveChatModel.newValue);
    if (newModel && aiModelSelect && aiModelSelect.value !== newModel) {
      renderAiModelOptions(aiModelSelect, newModel);
    }
  } else if (areaName === 'sync' && changes.aiModel) {
    const newModel = normalizeAiModel(changes.aiModel.newValue);
    if (newModel && aiModelSelect && aiModelSelect.value !== newModel) {
      renderAiModelOptions(aiModelSelect, newModel);
    }
  }
});

function loadDynamicAiModels() {
  const modelSelectEl = document.querySelector("#aiModel");
  if (!modelSelectEl) return;

  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_GET_AI_MODELS }, async (response) => {
    const activeModel = response?.data?.model || await readActiveAiModel();
    renderAiModelOptions(modelSelectEl, activeModel, response?.data?.presets);
  });
}
