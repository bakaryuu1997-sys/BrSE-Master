"use strict";

import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storage.js';
import { queueOfflineSync } from './outbox.js';

export const DEFAULT_API_BASE = "http://127.0.0.1:3010/api";

export function normalizeApiBaseUrl(value) {
  let apiBaseUrl = String(value || "").trim() || DEFAULT_API_BASE;
  try {
    const parsed = new URL(apiBaseUrl);
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    const isLocalHost = host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "backend";
    if (isLocalHost && parsed.port === "8000") {
      return DEFAULT_API_BASE;
    }
    if (parsed.pathname === "/app" || parsed.pathname === "/app/") {
      parsed.pathname = "/api";
      return parsed.toString().replace(/\/$/, "");
    }
    if (parsed.pathname === "" || parsed.pathname === "/") {
      parsed.pathname = "/api";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // Fall through to string normalization for plain or partially typed values.
  }

  if (apiBaseUrl.endsWith("/app")) {
    apiBaseUrl = apiBaseUrl.replace(/\/app$/, "/api");
  } else if (apiBaseUrl.endsWith("/app/")) {
    apiBaseUrl = apiBaseUrl.replace(/\/app\/$/, "/api");
  } else if (!apiBaseUrl.endsWith("/api") && !apiBaseUrl.endsWith("/api/")) {
    apiBaseUrl = apiBaseUrl.replace(/\/$/, "") + "/api";
  }
  return apiBaseUrl.replace(/\/$/, "");
}

export async function getApiBase() {
  const storedUrl = await getStorageItem(STORAGE_KEYS.API_BASE_URL, DEFAULT_API_BASE);
  const normalizedUrl = normalizeApiBaseUrl(storedUrl);
  if (normalizedUrl !== String(storedUrl || "").replace(/\/$/, "")) {
    await setStorageItem(STORAGE_KEYS.API_BASE_URL, normalizedUrl);
  }
  return normalizedUrl;
}

export async function getAuthHeaders() {
  const token = await getStorageItem(STORAGE_KEYS.SECRET_TOKEN, "");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-BrSE-Token"] = token;
  return headers;
}

export async function syncToProjectHub(originalText, translation, url, projectId = null) {
  const base = await getApiBase();
  const headers = await getAuthHeaders();
  const payload = {
    type: "qna", 
    title: `Term: ${originalText.slice(0, 30)}`,
    status: "Open", 
    project_id: projectId,
    project_name: "Knowledge Base",
    field_a: `[Text] ${originalText}\n[Mean] ${translation}`,
    field_b: url
  };

  try {
    const response = await fetch(`${base}/operations`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Sync failed (${response.status})`);
    }
    const data = await response.json();
    if (!data || !data.id) {
      throw new Error("Server returned success but record ID is missing");
    }
    return data;
  } catch (err) {
    console.warn("[API] Connection failed. Queuing offline sync:", err.message);
    await queueOfflineSync({ originalText, translation, url, projectId });
    throw new Error("offline_saved");
  }
}

export async function fetchAiReply(input, action, projectId = null) {
  const base = await getApiBase();
  const headers = await getAuthHeaders();
  const response = await fetch(`${base}/ai/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: input, action, project_id: projectId })
  });
  if (!response.ok) throw new Error(`AI Request failed (${response.status})`);
  return await response.json();
}
