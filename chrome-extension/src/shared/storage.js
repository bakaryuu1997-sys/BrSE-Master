"use strict";

export const STORAGE_KEYS = {
  API_BASE_URL: "apiBaseUrl",
  APP_BASE_URL: "appBaseUrl",
  DEFAULT_PROJECT_NAME: "defaultProjectName",
  SECRET_TOKEN: "secretToken",
  AI_MODEL: "aiModel",
  TOOLBAR_MODE: "toolbarMode",
  TRIGGER_POS: "brseTriggerPos",
  GEMINI_API_KEY: "geminiApiKey",
  GEMINI_MODEL: "geminiModel",
  CONTEXT: "brseContext",
  QUICK_CHAT: "brseQuickChat",
  GLOSSARY_CACHE: "brseGlossaryCache",
  FURIGANA_ALWAYS_ON: "brseFuriganaAlwaysOn"
};

/**
 * Reads a value from chrome.storage.sync
 * @param {string} key
 * @param {any} defaultValue
 * @returns {Promise<any>}
 */
export function getStorageItem(key, defaultValue = null) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.warn("[Storage] Error getting key", key, chrome.runtime.lastError);
          resolve(defaultValue);
        } else {
          resolve(result[key] !== undefined ? result[key] : defaultValue);
        }
      });
    } else {
      resolve(defaultValue);
    }
  });
}

/**
 * Writes a value to chrome.storage.sync
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export function setStorageItem(key, value) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.warn("[Storage] Error setting key", key, chrome.runtime.lastError);
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Reads multiple keys from chrome.storage.sync
 * @param {string[]} keys
 * @returns {Promise<object>}
 */
export function getStorageItems(keys) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          console.warn("[Storage] Error getting keys", keys, chrome.runtime.lastError);
          resolve({});
        } else {
          resolve(result || {});
        }
      });
    } else {
      resolve({});
    }
  });
}

/**
 * Writes multiple values to chrome.storage.sync
 * @param {object} items
 * @returns {Promise<void>}
 */
export function setStorageItems(items) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(items, () => {
        if (chrome.runtime.lastError) {
          console.warn("[Storage] Error setting items", items, chrome.runtime.lastError);
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

