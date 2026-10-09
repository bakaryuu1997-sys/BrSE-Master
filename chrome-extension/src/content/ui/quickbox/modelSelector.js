"use strict";

import { MESSAGE_TYPES } from "../../../shared/messageTypes.js";
import {
  normalizeAiModel,
  persistActiveAiModel,
  readActiveAiModel,
  renderAiModelOptions,
} from "../../../shared/modelConfig.js";

export function refreshQuickBoxModelOptions(shadow, { safeSendMessage }) {
  const modelSelectEl = shadow.getElementById("brse-model-select");
  if (!modelSelectEl) return;

  safeSendMessage({ type: MESSAGE_TYPES.BRSE_GET_AI_MODELS }).then((response) => {
    readActiveAiModel().then((storedModel) => {
      const activeModel = response?.data?.model || storedModel;
      renderAiModelOptions(modelSelectEl, activeModel, response?.data?.presets);
    });
  }).catch((err) => {
    console.warn("[QuickBox] Failed to load dynamic AI models:", err);
    readActiveAiModel().then((activeModel) => renderAiModelOptions(modelSelectEl, activeModel));
  });
}

export function bindQuickBoxModelSelector(shadow, { safeSendMessage, showToast }) {
  const modelSelect = shadow.getElementById("brse-model-select");
  refreshQuickBoxModelOptions(shadow, { safeSendMessage });

  if (modelSelect) {
    modelSelect.onchange = async () => {
      const selectedModel = await persistActiveAiModel(modelSelect.value);
      showToast(`Đang chuyển sang model: ${selectedModel}...`);
      safeSendMessage({
        type: MESSAGE_TYPES.BRSE_SET_MODEL,
        model: selectedModel,
      }).then((response) => {
        if (response?.ok) {
          showToast(`Đã kích hoạt model backend: ${selectedModel}`);
        } else {
          showToast("Lỗi chuyển model backend. Extension vẫn giữ model đã chọn.");
        }
      });
    };
  }

  const onStorageChanged = (changes, areaName) => {
    const nextModel = getChangedModel(changes, areaName);
    if (nextModel && modelSelect && modelSelect.value !== nextModel) {
      renderAiModelOptions(modelSelect, nextModel);
    }
  };

  chrome.storage?.onChanged?.addListener?.(onStorageChanged);

  return () => {
    chrome.storage?.onChanged?.removeListener?.(onStorageChanged);
  };
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
