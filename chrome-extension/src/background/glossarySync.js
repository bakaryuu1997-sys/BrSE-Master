"use strict";

import { getApiBase, getAuthHeaders } from "../shared/api.js";
import { MESSAGE_TYPES } from "../shared/messageTypes.js";
import { STORAGE_KEYS } from "../shared/storage.js";
import { safeSendTabMessage } from "./tabMessaging.js";

let cachedGlossary = [];
const builtInGlossaryTerms = [];

function uniqueGlossaryTerms(terms) {
  const seen = new Set();
  const unique = [];
  for (const term of terms) {
    if (!term || (!term.english && !term.japanese)) continue;
    const key = `${term.english?.toLowerCase() || ""}|${term.japanese?.toLowerCase() || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(term);
    }
  }
  return unique;
}

function parseCustomTerms(customData) {
  if (!customData?.value) return [];
  try {
    return JSON.parse(customData.value);
  } catch (err) {
    console.warn("[Background] Failed to parse custom glossary terms:", err);
    return [];
  }
}

function parseKnowledgeTerms(knowledgeItems) {
  if (!Array.isArray(knowledgeItems)) return [];

  return knowledgeItems
    .filter((item) => item && item.category === "glossary")
    .map((item) => {
      const title = item.title || "";
      const titleParts = title.split(/[\/\-:\(|（]/);
      let english = title.trim();
      let japanese = title.trim();
      if (titleParts.length > 1) {
        japanese = titleParts[0].trim();
        english = titleParts[1].replace(/[\)|）]/g, "").trim();
      }
      return {
        id: `knowledge-${item.id}`,
        english,
        japanese,
        vietnamese: item.content || "",
        roles: ["BrSE"],
        category: "Business",
        note: item.content || "Thuật ngữ tự động trích xuất từ meeting.",
      };
    });
}

async function readCachedGlossary(chromeApi = chrome) {
  if (cachedGlossary.length > 0) return cachedGlossary;
  const stored = await chromeApi.storage.local.get([STORAGE_KEYS.GLOSSARY_CACHE]);
  cachedGlossary = stored[STORAGE_KEYS.GLOSSARY_CACHE] || [];
  return cachedGlossary;
}

async function writeCachedGlossary(terms, chromeApi = chrome) {
  cachedGlossary = terms;
  await chromeApi.storage.local.set({ [STORAGE_KEYS.GLOSSARY_CACHE]: terms });
}

function normalizeTermValue(value) {
  return String(value || "").trim().toLowerCase();
}

function isDuplicateTermError(status, detail) {
  if (status !== 400) return false;
  return (
    detail.includes("ID already exists") ||
    detail.includes("Term already exists") ||
    detail.includes("da ton tai") ||
    detail.includes("đã tồn tại")
  );
}

function buildGlossaryUpdatePayload(term, existing = {}) {
  return {
    english: term.english ?? existing.english ?? "",
    japanese: term.japanese ?? existing.japanese ?? "",
    kana: term.kana ?? existing.kana ?? null,
    vietnamese: term.vietnamese ?? existing.vietnamese ?? "",
    roles: term.roles ?? existing.roles ?? ["BrSE"],
    category: term.category ?? existing.category ?? "Technical",
    note: term.note ?? existing.note ?? null,
    example: term.example ?? existing.example ?? null,
  };
}

async function findExistingGlossaryTerm(term, apiBase, headers) {
  const searchText = (term.english || term.japanese || "").trim();
  if (!searchText) return null;

  const response = await fetch(`${apiBase}/glossary/?search=${encodeURIComponent(searchText)}&size=20`, {
    method: "GET",
    headers,
  });
  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  const items = Array.isArray(data?.items) ? data.items : [];
  const english = normalizeTermValue(term.english);
  const japanese = normalizeTermValue(term.japanese);

  return (
    items.find((item) => (
      normalizeTermValue(item.english) === english &&
      normalizeTermValue(item.japanese) === japanese
    )) ||
    items.find((item) => (
      english && normalizeTermValue(item.english) === english
    )) ||
    items.find((item) => (
      japanese && normalizeTermValue(item.japanese) === japanese
    )) ||
    null
  );
}

async function updateExistingGlossaryTerm(apiBase, headers, termId, term, existing = {}) {
  const updateRes = await fetch(`${apiBase}/glossary/${encodeURIComponent(termId)}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(buildGlossaryUpdatePayload(term, existing)),
  });
  if (!updateRes.ok) {
    const upErr = await updateRes.json().catch(() => ({}));
    throw new Error(upErr.detail || `Update fallback failed (${updateRes.status})`);
  }
  return updateRes.json();
}

function notifyGlossaryUpdated(chromeApi = chrome, term = null) {
  chromeApi.tabs.query({}, (tabs) => {
    if (!Array.isArray(tabs)) return;
    for (const tab of tabs) {
      if (tab?.id) {
        safeSendTabMessage(tab.id, { type: MESSAGE_TYPES.BRSE_GLOSSARY_UPDATED, term }, chromeApi);
      }
    }
  });
}

export async function getGlossaryTerms(chromeApi = chrome) {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  try {
    const customPromise = fetch(`${apiBase}/client-state/entry/brse.glossary.customTerms.v1`, { method: "GET", headers })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);

    const knowledgePromise = fetch(`${apiBase}/knowledge/`, { method: "GET", headers })
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => []);

    const dbGlossaryPromise = fetch(`${apiBase}/glossary/?size=10000`, { method: "GET", headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data && Array.isArray(data.items) ? data.items : []))
      .catch((err) => {
        console.warn("[Background] Failed to fetch database glossary:", err.message);
        return [];
      });

    const [customData, knowledgeItems, dbTerms] = await Promise.all([
      customPromise,
      knowledgePromise,
      dbGlossaryPromise,
    ]);

    if (dbTerms.length > 0) {
      await writeCachedGlossary(dbTerms, chromeApi);
    } else {
      await readCachedGlossary(chromeApi);
    }

    return uniqueGlossaryTerms([
      ...builtInGlossaryTerms,
      ...cachedGlossary,
      ...parseCustomTerms(customData),
      ...parseKnowledgeTerms(knowledgeItems),
    ]);
  } catch (err) {
    console.warn("[Background] Fetch glossary error, fallback to cache:", err.message);
    const fallback = await readCachedGlossary(chromeApi);
    return uniqueGlossaryTerms([...builtInGlossaryTerms, ...fallback]);
  }
}

export function handleGetGlossary(sendResponse, chromeApi = chrome) {
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    sendResponse({ ok: false, error: "Glossary request timed out. Hãy kiểm tra backend 127.0.0.1:3010.", terms: [] });
  }, 15000);

  getGlossaryTerms(chromeApi)
    .then((terms) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sendResponse({ ok: true, terms });
    })
    .catch((err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sendResponse({ ok: false, error: err.message, terms: [] });
    });
}

export async function addGlossaryTerm(term, chromeApi = chrome) {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);

  const response = await fetch(`${apiBase}/glossary/`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(term),
  });

  if (response.ok) return response.json();

  const errData = await response.json().catch(() => ({}));
  const detail = errData.detail || "";

  if (isDuplicateTermError(response.status, detail)) {
    if (!detail.includes("ID already exists")) {
      const existing = await findExistingGlossaryTerm(term, apiBase, headers);
      if (existing?.id) {
        console.log(`[Background] Glossary term already exists as "${existing.id}". Attempting fallback PUT...`);
        return updateExistingGlossaryTerm(apiBase, headers, existing.id, term, existing);
      }
    }

    console.log(`[Background] Term ID "${term.id}" collision. Attempting fallback PUT...`);
    return updateExistingGlossaryTerm(apiBase, headers, term.id, term);
  }

  throw new Error(detail || `HTTP error ${response.status}`);
}

export async function updateGlossaryTerm(termId, term) {
  const [apiBase, headers] = await Promise.all([getApiBase(), getAuthHeaders()]);
  const response = await fetch(`${apiBase}/glossary/${encodeURIComponent(termId)}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(term),
  });

  if (response.ok) return response.json();

  const errData = await response.json().catch(() => ({}));
  throw new Error(errData.detail || `HTTP error ${response.status}`);
}

async function upsertCachedTerm(savedTerm, chromeApi = chrome) {
  const stored = await chromeApi.storage.local.get([STORAGE_KEYS.GLOSSARY_CACHE]);
  const currentCache = stored[STORAGE_KEYS.GLOSSARY_CACHE] || [];
  const existingIdx = currentCache.findIndex((item) => item.id === savedTerm.id);
  if (existingIdx !== -1) {
    currentCache[existingIdx] = savedTerm;
  } else {
    currentCache.push(savedTerm);
  }
  await writeCachedGlossary(currentCache, chromeApi);
}

export function handleAddGlossaryTerm(message, sendResponse, chromeApi = chrome) {
  addGlossaryTerm(message.term, chromeApi)
    .then(async (savedTerm) => {
      await upsertCachedTerm(savedTerm, chromeApi);
      notifyGlossaryUpdated(chromeApi, savedTerm);
      sendResponse({ ok: true, term: savedTerm });
    })
    .catch((err) => {
      console.error("[Background] Add glossary failed:", err.message);
      sendResponse({ ok: false, error: err.message });
    });
}

export function handleUpdateGlossaryTerm(message, sendResponse, chromeApi = chrome) {
  updateGlossaryTerm(message.termId, message.term)
    .then(async (updatedTerm) => {
      await upsertCachedTerm(updatedTerm, chromeApi);
      notifyGlossaryUpdated(chromeApi, updatedTerm);
      sendResponse({ ok: true, term: updatedTerm });
    })
    .catch((err) => {
      console.error("[Background] Update glossary failed:", err.message);
      sendResponse({ ok: false, error: err.message });
    });
}
