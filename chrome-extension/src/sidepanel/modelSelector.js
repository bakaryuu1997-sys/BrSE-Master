"use strict";

import { MESSAGE_TYPES } from "../shared/messageTypes.js";
import {
  normalizeAiModel,
  persistActiveAiModel,
  readActiveAiModel,
  renderAiModelOptions,
} from "../shared/modelConfig.js";

export function initSidepanelModelSelector(selectEl) {
  if (!selectEl) return () => {};

  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_GET_AI_MODELS }, async (response) => {
    const activeModel = response?.data?.model || await readActiveAiModel();
    renderAiModelOptions(selectEl, activeModel, response?.data?.presets);
  });

  selectEl.addEventListener("change", async () => {
    const selectedModel = await persistActiveAiModel(selectEl.value);
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_SET_MODEL, model: selectedModel });
  });

  const onStorageChanged = (changes, areaName) => {
    const newModel = getChangedModel(changes, areaName);
    if (newModel && selectEl.value !== newModel) {
      renderAiModelOptions(selectEl, newModel);
    }
  };

  chrome.storage?.onChanged?.addListener?.(onStorageChanged);
  return () => chrome.storage?.onChanged?.removeListener?.(onStorageChanged);
}

function getChangedModel(changes, areaName) {
  if (areaName === "local" && changes.brseActiveChatModel) {
    return normalizeAiModel(changes.brseActiveChatModel.newValue);
  }
  if (areaName === "sync" && changes.aiModel) {
    return normalizeAiModel(changes.aiModel.newValue);
  }
  return null;
}
