"use strict";

export function t(key, substitutions) {
  if (typeof chrome !== "undefined" && chrome && chrome.i18n && chrome.i18n.getMessage) {
    const msg = chrome.i18n.getMessage(key, substitutions);
    if (msg) return msg;
  }
  return key;
}

export function getLanguage() {
  if (typeof chrome !== "undefined" && chrome && chrome.i18n && chrome.i18n.getUILanguage) {
    const uiLang = chrome.i18n.getUILanguage();
    if (uiLang) {
      const lang = uiLang.split('-')[0].toLowerCase();
      if (['en', 'ja', 'vi'].includes(lang)) return lang;
    }
  }
  return 'vi';
}

export function localizeHtml() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const msg = t(key);
    if (msg && msg !== key) {
      // Find the first text node child to replace, preserving child elements (like spans)
      const textNode = Array.from(el.childNodes).find(n => n.nodeType === 3); // Node.TEXT_NODE is 3
      if (textNode) {
        textNode.textContent = msg;
      } else if (el.children.length === 0) {
        el.textContent = msg;
      }
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const msg = t(key);
    if (msg && msg !== key) el.placeholder = msg;
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    const msg = t(key);
    if (msg && msg !== key) el.title = msg;
  });
}
