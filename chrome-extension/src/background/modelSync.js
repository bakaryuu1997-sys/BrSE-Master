"use strict";

import { getApiBase, getAuthHeaders } from "../shared/api.js";
import {
  DEFAULT_EXTENSION_MODEL,
  normalizeAiModel,
  persistActiveAiModel,
  readActiveAiModel,
} from "../shared/modelConfig.js";

export function createModelSync({
  fetchImpl = fetch,
  getApiBaseImpl = getApiBase,
  getAuthHeadersImpl = getAuthHeaders,
  normalizeModelImpl = normalizeAiModel,
  persistModelImpl = persistActiveAiModel,
  readModelImpl = readActiveAiModel,
  defaultModel = DEFAULT_EXTENSION_MODEL,
} = {}) {
  async function setBackendModel(model) {
    const normalizedModel = normalizeModelImpl(model);
    const apiBase = await getApiBaseImpl();
    const headers = await getAuthHeadersImpl();
    const response = await fetchImpl(`${apiBase}/ai/model`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ model: normalizedModel }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Backend set model error status ${response.status}`);
    }
    await persistModelImpl(normalizedModel);
    return response.json();
  }

  async function getBackendModelStatus({ checkRuntime = false } = {}) {
    const apiBase = await getApiBaseImpl();
    const headers = await getAuthHeadersImpl();
    const statusUrl = `${apiBase}/ai/status${checkRuntime ? "?check_runtime=true" : ""}`;
    const response = await fetchImpl(statusUrl, {
      method: "GET",
      headers,
    });
    if (!response.ok) throw new Error(`HTTP error status ${response.status}`);
    return response.json();
  }

  async function syncActiveModelFromBackend({ checkRuntime = false } = {}) {
    const status = await getBackendModelStatus({ checkRuntime });
    const backendModel = normalizeModelImpl(status.model || status.selected_model);
    const selectedModel = status.model && status.model === backendModel
      ? backendModel
      : defaultModel;

    if (status.model !== selectedModel) {
      await setBackendModel(selectedModel);
    } else {
      await persistModelImpl(selectedModel);
    }

    return { ...status, model: selectedModel, selected_model: selectedModel };
  }

  async function resolveActiveModelForRequest() {
    const activeModel = await readModelImpl();
    await setBackendModel(activeModel);
    return activeModel;
  }

  return {
    getBackendModelStatus,
    resolveActiveModelForRequest,
    setBackendModel,
    syncActiveModelFromBackend,
  };
}

const modelSync = createModelSync();

export const getBackendModelStatus = modelSync.getBackendModelStatus;
export const resolveActiveModelForRequest = modelSync.resolveActiveModelForRequest;
export const setBackendModel = modelSync.setBackendModel;
export const syncActiveModelFromBackend = modelSync.syncActiveModelFromBackend;
