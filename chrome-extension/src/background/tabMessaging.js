"use strict";

import { MESSAGE_TYPES } from "../shared/messageTypes.js";

const BRSE_CONTENT_SCRIPT_FILES = ["src/content/content.js"];
const BRSE_CONTENT_CSS_FILES = ["shared/tokens.css"];

const tabContexts = {};

export function registerTabContextCleanup(chromeApi = chrome) {
  chromeApi.tabs.onRemoved.addListener((tabId) => {
    delete tabContexts[tabId];
  });

  chromeApi.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      delete tabContexts[tabId];
    }
  });
}

export function safeSendTabMessage(tabId, message, chromeApi = chrome) {
  if (!tabId) return;
  chromeApi.tabs.sendMessage(tabId, message).catch((err) => {
    console.warn(`[BrSE Background] Failed to send message to tab ${tabId}:`, err.message);
  });
}

export function isInjectableWebUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

export async function ensureBrseContentScript(tab, chromeApi = chrome) {
  if (!tab?.id || !isInjectableWebUrl(tab.url)) {
    return { ok: false, error: "Trang này không hỗ trợ content script." };
  }

  try {
    await chromeApi.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.BRSE_PING });
    return { ok: true, alreadyInjected: true };
  } catch {
    // Not injected yet. Dynamic injection below runs only after user action.
  }

  try {
    await chromeApi.scripting.insertCSS({
      target: { tabId: tab.id, allFrames: false },
      files: BRSE_CONTENT_CSS_FILES,
    });
    await chromeApi.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: BRSE_CONTENT_SCRIPT_FILES,
    });
    return { ok: true, injected: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function sendOrInjectTabMessage(tab, message, chromeApi = chrome) {
  const ensured = await ensureBrseContentScript(tab, chromeApi);
  if (!ensured.ok) return ensured;
  await chromeApi.tabs.sendMessage(tab.id, message);
  return { ok: true };
}

export async function getActiveCurrentTab(chromeApi = chrome) {
  const tabs = await chromeApi.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

export function recordTabContext(sender, message) {
  if (!sender?.tab?.id) {
    return { ok: false, error: "No sender tab" };
  }

  tabContexts[sender.tab.id] = {
    id: sender.tab.id,
    title: message.title || sender.tab.title || "Untitled Tab",
    url: message.url || sender.tab.url || "",
    content: message.content || "",
  };
  return { ok: true };
}

export function getOtherTabContexts(sender) {
  return Object.values(tabContexts).filter((tab) => !sender?.tab || tab.id !== sender.tab.id);
}

export async function collectVisibleTabContexts(sender, chromeApi = chrome) {
  const tabs = await chromeApi.tabs.query({ currentWindow: true });
  const webTabs = (tabs || []).filter((tab) => tab?.id && isInjectableWebUrl(tab.url));
  for (const tab of webTabs) {
    try {
      await sendOrInjectTabMessage(tab, { type: MESSAGE_TYPES.BRSE_COLLECT_TAB_CONTEXT }, chromeApi);
    } catch (err) {
      console.warn(`[BrSE Background] Context collect skipped for tab ${tab.id}:`, err.message);
    }
  }
  return getOtherTabContexts(sender);
}
