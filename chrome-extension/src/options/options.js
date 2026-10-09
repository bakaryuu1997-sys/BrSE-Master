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
import { checkRuntimeStatus, normalizeApiBaseUrl } from '../shared/settingsStatus.js';
import { DEFAULT_API_BASE } from '../shared/api.js';
import { t, localizeHtml } from '../shared/i18n.js';

// Initialize HTML localization
localizeHtml();
 
const apiBaseInput = document.querySelector("#apiBaseUrl");
const appBaseInput = document.querySelector("#appBaseUrl");
const projectInput = document.querySelector("#defaultProjectName");
const secretInput = document.querySelector("#secretToken");
const modelSelect = document.querySelector("#aiModel");
const toolbarModeSelect = document.querySelector("#toolbarMode");
const status = document.querySelector("#status");
const saveButton = document.querySelector("#save");
 
getStorageItems([
  STORAGE_KEYS.API_BASE_URL,
  STORAGE_KEYS.APP_BASE_URL,
  STORAGE_KEYS.DEFAULT_PROJECT_NAME,
  STORAGE_KEYS.SECRET_TOKEN,
  STORAGE_KEYS.AI_MODEL,
  STORAGE_KEYS.TOOLBAR_MODE
]).then((stored) => {
  appBaseInput.value = stored[STORAGE_KEYS.APP_BASE_URL] || "http://127.0.0.1:3010";
  apiBaseInput.value = stored[STORAGE_KEYS.API_BASE_URL] || DEFAULT_API_BASE;
  projectInput.value = stored[STORAGE_KEYS.DEFAULT_PROJECT_NAME] || "Personal project";
  secretInput.value = stored[STORAGE_KEYS.SECRET_TOKEN] || "";
  toolbarModeSelect.value = stored[STORAGE_KEYS.TOOLBAR_MODE] || "auto";
 
  // Load active models dynamically
  loadDynamicAiModels();
});
 
function setStatus(message, state = "") {
  if (!status) return;
  status.classList.remove("is-saving", "is-success", "is-error");
  if (state) status.classList.add(`is-${state}`);
  status.textContent = message;
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
 
saveButton.addEventListener("click", async () => {
  const appBaseUrl = appBaseInput.value.trim() || "http://127.0.0.1:3010";
  let apiBaseUrl = apiBaseInput.value.trim() || DEFAULT_API_BASE;
  const defaultProjectName = projectInput.value.trim() || "Personal project";
  const secretToken = secretInput.value.trim();
  const aiModel = normalizeAiModel(modelSelect.value);
  const toolbarMode = toolbarModeSelect.value;
 
  apiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
 
  apiBaseInput.value = apiBaseUrl; // Reflect correct URL back to input field
 
  saveButton.disabled = true;
  setStatus(t("savingSettingsStatus"), "saving");
 
  try {
    await setStorageItems({
      [STORAGE_KEYS.APP_BASE_URL]: appBaseUrl,
      [STORAGE_KEYS.API_BASE_URL]: apiBaseUrl,
      [STORAGE_KEYS.DEFAULT_PROJECT_NAME]: defaultProjectName,
      [STORAGE_KEYS.SECRET_TOKEN]: secretToken,
      [STORAGE_KEYS.AI_MODEL]: aiModel,
      [STORAGE_KEYS.TOOLBAR_MODE]: toolbarMode
    });
    let persistedModel = await persistActiveAiModel(aiModel);
    await sendRuntimeMessage({ type: MESSAGE_TYPES.BRSE_SET_MODEL, model: persistedModel });
    let runtime = await checkRuntimeStatus(apiBaseUrl, secretToken);
 
    if (!runtime.ok && /\b(401|403)\b/.test(runtime.message) && persistedModel !== DEFAULT_EXTENSION_MODEL) {
      setStatus(t("modelRejectedStatus", [persistedModel, DEFAULT_EXTENSION_MODEL]), "saving");
      await sendRuntimeMessage({ type: MESSAGE_TYPES.BRSE_SET_MODEL, model: DEFAULT_EXTENSION_MODEL });
      persistedModel = await persistActiveAiModel(DEFAULT_EXTENSION_MODEL);
      renderAiModelOptions(modelSelect, persistedModel);
      runtime = await checkRuntimeStatus(apiBaseUrl, secretToken);
    }
 
    const message = runtime.ok
      ? t("settingsSavedSuccess", [persistedModel, runtime.message])
      : t("settingsSavedLocalOnly", [runtime.message]);
    setStatus(message, runtime.ok ? "success" : "error");
  } catch (error) {
    setStatus(t("settingsSavedError", [error.message]), "error");
  } finally {
    saveButton.disabled = false;
  }
});
 
 
// Listen for model storage changes from other components (F5-free 3-way sync)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.brseActiveChatModel) {
    const newModel = normalizeAiModel(changes.brseActiveChatModel.newValue);
    if (newModel && modelSelect && modelSelect.value !== newModel) {
      renderAiModelOptions(modelSelect, newModel);
    }
  } else if (areaName === 'sync' && changes.aiModel) {
    const newModel = normalizeAiModel(changes.aiModel.newValue);
    if (newModel && modelSelect && modelSelect.value !== newModel) {
      renderAiModelOptions(modelSelect, newModel);
    }
  }
});
 
// --- AI Provider & API Key Settings ---
const AI_KEYS = {
  geminiKey:   "brseAiGeminiKey",
  geminiModel: "brseAiGeminiModel",
  nineRouterUrl: "brseAi9RouterUrl",
  nineRouterKey: "brseAi9RouterKey",
  openaiUrl:   "brseAiOpenaiUrl",
  openaiKey:   "brseAiOpenaiKey",
  ollamaUrl:   "brseAiOllamaUrl",
  ollamaModel: "brseAiOllamaModel",
};

const aiInputs = {
  geminiKey:    document.querySelector("#ai-gemini-key"),
  geminiModel:  document.querySelector("#ai-gemini-model"),
  nineRouterUrl:document.querySelector("#ai-9router-url"),
  nineRouterKey:document.querySelector("#ai-9router-key"),
  openaiUrl:    document.querySelector("#ai-openai-url"),
  openaiKey:    document.querySelector("#ai-openai-key"),
  ollamaUrl:    document.querySelector("#ai-ollama-url"),
  ollamaModel:  document.querySelector("#ai-ollama-model"),
};

const btnSaveAi = document.querySelector("#btn-save-ai");
const aiSaveStatus = document.querySelector("#ai-save-status");

function setAiStatus(msg, cls = "") {
  if (!aiSaveStatus) return;
  aiSaveStatus.className = `status-msg status-inline${cls ? " is-"+cls : ""}`;
  aiSaveStatus.textContent = msg;
}

// Map extension fields → backend /ai/config fields (ollamaModel stays local;
// the active Ollama model is chosen via the AI Model selector / /ai/model).
const BACKEND_FIELD_MAP = {
  geminiKey: "gemini_api_key",
  geminiModel: "ocr_vision_model",
  nineRouterUrl: "nine_router_base_url",
  nineRouterKey: "nine_router_api_key",
  openaiUrl: "openai_base_url",
  openaiKey: "openai_api_key",
  ollamaUrl: "ollama_base_url",
};

async function getApiTarget() {
  const stored = await new Promise((resolve) =>
    chrome.storage.sync.get([STORAGE_KEYS.API_BASE_URL, STORAGE_KEYS.SECRET_TOKEN], resolve)
  );
  const base = (stored[STORAGE_KEYS.API_BASE_URL] || DEFAULT_API_BASE).replace(/\/$/, "");
  const headers = { "Content-Type": "application/json" };
  if (stored[STORAGE_KEYS.SECRET_TOKEN]) headers["X-BrSE-Token"] = stored[STORAGE_KEYS.SECRET_TOKEN];
  return { base, headers };
}

// Load saved AI config (local values first, then reflect backend state).
chrome.storage.local.get(Object.values(AI_KEYS), async (res) => {
  Object.entries(AI_KEYS).forEach(([field, key]) => {
    const el = aiInputs[field];
    if (el && res[key]) el.value = res[key];
  });
  try {
    const { base, headers } = await getApiTarget();
    const r = await fetch(`${base}/ai/config`, { headers, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return;
    const cfg = await r.json();
    const fill = (el, val) => { if (el && !el.value && val) el.value = val; };
    fill(aiInputs.geminiModel, cfg.ocr_vision_model);
    fill(aiInputs.nineRouterUrl, cfg.nine_router_base_url);
    fill(aiInputs.openaiUrl, cfg.openai_base_url);
    fill(aiInputs.ollamaUrl, cfg.ollama_base_url);
    const markSet = (el, on) => { if (el && on && !el.value) el.placeholder = "•••• (đã lưu trên backend)"; };
    markSet(aiInputs.geminiKey, cfg.configured && cfg.configured.gemini_api_key);
    markSet(aiInputs.nineRouterKey, cfg.configured && cfg.configured.nine_router_api_key);
    markSet(aiInputs.openaiKey, cfg.configured && cfg.configured.openai_api_key);
  } catch {
    // Backend offline — local values only.
  }
});

btnSaveAi?.addEventListener("click", async () => {
  btnSaveAi.disabled = true;
  setAiStatus("Đang lưu...", "saving");
  const items = {};
  const backendBody = {};
  Object.entries(AI_KEYS).forEach(([field, key]) => {
    const val = aiInputs[field]?.value?.trim() || "";
    if (val) {
      items[key] = val;
      const backendField = BACKEND_FIELD_MAP[field];
      if (backendField) backendBody[backendField] = val;
    }
  });
  try {
    await new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
    // Push provider config to backend (applied at runtime + persisted server-side).
    let backendOk = false;
    if (Object.keys(backendBody).length) {
      try {
        const { base, headers } = await getApiTarget();
        const res = await fetch(`${base}/ai/config`, {
          method: "PUT",
          headers,
          body: JSON.stringify(backendBody),
          signal: AbortSignal.timeout(6000),
        });
        backendOk = res.ok;
      } catch {
        backendOk = false;
      }
    } else {
      backendOk = true;
    }
    setAiStatus(
      backendOk ? "✅ Đã lưu (extension + backend)!" : "✅ Đã lưu vào extension (backend offline)",
      backendOk ? "success" : "saving",
    );
    setTimeout(() => setAiStatus(""), 4000);
  } catch (err) {
    setAiStatus("❌ Lỗi: " + err.message, "error");
  } finally {
    btnSaveAi.disabled = false;
  }
});

// --- Glossary Hidden Terms Manager ---
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
    listEl.innerHTML = buildLearnedTermsHtml(learnedIds, cachedTerms, { maxWidth: "180px" });
    
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
 
 
function loadDynamicAiModels() {
  const modelSelectEl = document.querySelector("#aiModel");
  if (!modelSelectEl) return;
 
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_GET_AI_MODELS }, async (response) => {
    const activeModel = response?.data?.model || await readActiveAiModel();
    renderAiModelOptions(modelSelectEl, activeModel, response?.data?.presets);
  });
}
