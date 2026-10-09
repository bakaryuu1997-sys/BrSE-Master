"use strict";

import { getStorageItem, setStorageItem, STORAGE_KEYS } from "./storage.js";

export const DEFAULT_EXTENSION_MODEL = "openrouter/nvidia/nemotron-3-super-120b-a12b:free";


export const EXTENSION_AI_MODELS = [
  {
    id: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
    label: "Nemotron 3 Super Free",
    provider: "openrouter",
    badge: "9router",
  },
  {
    id: "cx/gpt-5.5",
    label: "ChatGPT 5.5 Codex",
    provider: "cx",
    badge: "9router",
  },
  {
    id: "qwen2.5-coder:7b-instruct",
    label: "Qwen 2.5 Coder (Ollama)",
    provider: "ollama",
    badge: "Local",
  },
  {
    id: "gemini/gemma-4-31b-it",
    label: "Gemma 4 31B",
    provider: "gemini",
    badge: "9router",
  },
  {
    id: "nvidia/google/gemma-4-31b-it",
    label: "NVIDIA Gemma 4 31B",
    provider: "nvidia",
    badge: "9router",
  },
  {
    id: "free-logic",
    label: "9router Free Logic",
    provider: "9router",
    badge: "9router",
  },
];

const SUPPORTED_MODEL_IDS = new Set(EXTENSION_AI_MODELS.map((model) => model.id));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function chromeLocalGet(keys) {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve({});
      return;
    }
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime?.lastError) {
        console.warn("[ModelConfig] Failed to read local storage:", chrome.runtime.lastError.message);
        resolve({});
        return;
      }
      resolve(result || {});
    });
  });
}

function chromeLocalSet(items) {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.set(items, () => {
      if (chrome.runtime?.lastError) {
        console.warn("[ModelConfig] Failed to write local storage:", chrome.runtime.lastError.message);
      }
      resolve();
    });
  });
}

export function normalizeAiModel(value) {
  const normalized = String(value || "").trim();
  return SUPPORTED_MODEL_IDS.has(normalized) ? normalized : DEFAULT_EXTENSION_MODEL;
}

export function getSupportedAiModels(models = EXTENSION_AI_MODELS) {
  const byId = new Map();
  for (const model of models) {
    const id = normalizeAiModel(model.id);
    if (!byId.has(id)) {
      const preset = EXTENSION_AI_MODELS.find((item) => item.id === id);
      if (preset) byId.set(id, preset);
    }
  }
  return Array.from(byId.values());
}

export function getModelLabel(value) {
  const model = EXTENSION_AI_MODELS.find((item) => item.id === normalizeAiModel(value));
  return model ? model.label : EXTENSION_AI_MODELS[0].label;
}

export async function readActiveAiModel() {
  const local = await chromeLocalGet(["brseActiveChatModel"]);
  const syncModel = await getStorageItem(STORAGE_KEYS.AI_MODEL, DEFAULT_EXTENSION_MODEL);
  return normalizeAiModel(local.brseActiveChatModel || syncModel);
}

export async function persistActiveAiModel(value) {
  const model = normalizeAiModel(value);
  await Promise.all([
    chromeLocalSet({ brseActiveChatModel: model }),
    setStorageItem(STORAGE_KEYS.AI_MODEL, model),
  ]);
  return model;
}

export function renderAiModelOptions(selectEl, activeModel, models = EXTENSION_AI_MODELS) {
  if (!selectEl) return DEFAULT_EXTENSION_MODEL;
  const supportedModels = getSupportedAiModels(models);
  const selectedModel = normalizeAiModel(activeModel);
  selectEl.innerHTML = supportedModels
    .map((model) => {
      const icon = model.provider === "ollama" ? "💻" : "🤖";
      return `<option value="${escapeHtml(model.id)}">${icon} ${escapeHtml(model.label)}</option>`;
    })
    .join("");
  selectEl.value = selectedModel;
  return selectedModel;
}
