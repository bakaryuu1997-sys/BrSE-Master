"use strict";

import { getApiBase, getAuthHeaders } from "../shared/api.js";
import { getStorageItems, STORAGE_KEYS } from "../shared/storage.js";

async function readJsonOrThrow(response, label) {
  if (!response.ok) {
    throw new Error(`${label} error status ${response.status}`);
  }
  return response.json();
}

export async function searchMemos() {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  const response = await fetch(`${apiBase}/memos`, { method: "GET", headers });
  return readJsonOrThrow(response, "Backend Memos");
}

export async function getQuickInjectItems() {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  const memosPromise = fetch(`${apiBase}/memos`, { method: "GET", headers })
    .then((res) => (res.ok ? res.json() : []))
    .catch(() => []);

  const qnasPromise = fetch(`${apiBase}/knowledge/`, { method: "GET", headers })
    .then((res) => (res.ok ? res.json() : []))
    .catch(() => []);

  const minutesPromise = fetch(`${apiBase}/projects`, { method: "GET", headers })
    .then((res) => (res.ok ? res.json() : []))
    .catch(() => [])
    .then(async (projects) => {
      const projectIds = ["default"];
      if (Array.isArray(projects)) {
        projects.forEach((project) => {
          if (project.id && !projectIds.includes(project.id)) {
            projectIds.push(project.id);
          }
        });
      }
      const promises = projectIds.map((projectId) =>
        fetch(`${apiBase}/meeting-minutes?project_id=${encodeURIComponent(projectId)}`, { method: "GET", headers })
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []),
      );
      const results = await Promise.all(promises);
      return results.flat();
    });

  const [qnas, minutes, memos] = await Promise.all([qnasPromise, minutesPromise, memosPromise]);
  return { qnas, minutes, memos };
}

export async function createOperation(payload) {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  const response = await fetch(`${apiBase}/operations`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJsonOrThrow(response, "Backend Operations");
}

export async function updateOperation(opId, payload) {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  const response = await fetch(`${apiBase}/operations/${encodeURIComponent(opId)}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJsonOrThrow(response, "Backend Update Operation");
}

export async function createTodoProject(payload) {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  const response = await fetch(`${apiBase}/todos/projects`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJsonOrThrow(response, "Backend Create Todo Project");
}

export async function createTodoItems(payload = {}) {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  const { projectId, items } = payload;
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return Promise.all(
    items.map((item) =>
      fetch(`${apiBase}/todos/projects/${encodeURIComponent(projectId)}/items`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }).then((res) => (res.ok ? res.json() : null)),
    ),
  );
}

export async function checkKeigo(text) {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  const response = await fetch(`${apiBase}/ai/keigo`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return readJsonOrThrow(response, "Backend Keigo");
}

export async function checkJiraExists(key) {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  const response = await fetch(`${apiBase}/operations`, { method: "GET", headers });
  const records = response.ok ? await response.json() : [];
  const found = Array.isArray(records) ? records.find((record) => record.field_d === key) : null;
  return { exists: !!found, record: found };
}

function buildShadowReplyPrompt(inputContext) {
  return [
    "Bạn là một trợ lý BrSE (Kỹ sư cầu nối) Nhật - Việt xuất sắc.",
    "Hãy phân tích ngữ cảnh giao tiếp (email hoặc chat của đối tác/khách hàng) sau đây và viết một câu trả lời gợi ý bằng tiếng Nhật Keigo (Kính ngữ Nhật Bản) cực kỳ lịch sự, tự nhiên, chuyên nghiệp và đúng chuẩn Business Nhật Bản.",
    "Chỉ trả về ĐÚNG văn bản Nhật Keigo gợi ý trả lời đó mà không thêm bất kỳ giải thích, chú thích hay văn bản tiếng Việt nào.",
    "",
    "Ngữ cảnh tin nhắn khách hàng:",
    `"${inputContext}"`
  ].join("\n");
}

async function fetchGeminiShadowReply(systemPrompt) {
  const stored = await getStorageItems([STORAGE_KEYS.GEMINI_API_KEY, STORAGE_KEYS.GEMINI_MODEL]);
  const apiKey = stored[STORAGE_KEYS.GEMINI_API_KEY];
  if (!apiKey) {
    throw new Error("No fallback AI provider configured");
  }

  const model = stored[STORAGE_KEYS.GEMINI_MODEL] || "gemini-2.5-flash";
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }],
    }),
  });
  if (!response.ok) throw new Error(`Gemini Cloud API (${response.status})`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function getShadowReply(context) {
  const systemPrompt = buildShadowReplyPrompt(context);
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  try {
    const response = await fetch(`${apiBase}/ai/chat`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ message: systemPrompt }),
    });
    const data = await readJsonOrThrow(response, "Backend AI");
    return (data.text || data.response || "").trim();
  } catch (err) {
    console.warn("Local Backend failed for Shadow Reply, trying Cloud fallback:", err.message);
    return (await fetchGeminiShadowReply(systemPrompt)).trim();
  }
}

function replyWith(sendResponse, promise, mapper = (data) => ({ ok: true, data }), timeoutMs = 15000) {
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    sendResponse({ ok: false, error: "Request timed out. Kiểm tra backend 127.0.0.1:3010 rồi thử lại." });
  }, timeoutMs);

  promise
    .then((data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sendResponse(mapper(data));
    })
    .catch((err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sendResponse({ ok: false, error: err.message });
    });
}

export function handleSearchMemos(sendResponse) {
  replyWith(sendResponse, searchMemos());
}

export function handleQuickInjectItems(sendResponse) {
  replyWith(sendResponse, getQuickInjectItems(), (data) => ({ ok: true, ...data }));
}

export function handleCreateOperation(message, sendResponse) {
  replyWith(sendResponse, createOperation(message.payload));
}

export function handleUpdateOperation(message, sendResponse) {
  replyWith(sendResponse, updateOperation(message.opId, message.payload));
}

export function handleCreateTodoProject(message, sendResponse) {
  replyWith(sendResponse, createTodoProject(message.payload));
}

export function handleCreateTodoItems(message, sendResponse) {
  replyWith(sendResponse, createTodoItems(message.payload), (data) => (
    data === null ? { ok: true } : { ok: true, data }
  ));
}

export function handleCheckKeigo(message, sendResponse) {
  replyWith(sendResponse, checkKeigo(message.text));
}

export function handleCheckJiraExists(message, sendResponse) {
  replyWith(sendResponse, checkJiraExists(message.key), (data) => ({ ok: true, ...data }));
}

export function handleShadowReply(message, sendResponse) {
  replyWith(sendResponse, getShadowReply(message.context), (reply) => ({ ok: true, reply }));
}
