"use strict";

import { clampQuickBoxFrame } from "../ui/quickbox/position.js";

export function makeDraggable(el, handle) {
  let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
  handle.onmousedown = (e) => {
    e.preventDefault();
    p3 = e.clientX;
    p4 = e.clientY;
    document.onmouseup = () => {
      document.onmouseup = null;
      document.onmousemove = null;
    };
    document.onmousemove = (ev) => {
      p1 = p3 - ev.clientX;
      p2 = p4 - ev.clientY;
      p3 = ev.clientX;
      p4 = ev.clientY;
      const rect = el.getBoundingClientRect();
      const safeFrame = clampQuickBoxFrame({
        top: rect.top - p2,
        left: rect.left - p1,
        width: rect.width,
        height: rect.height,
      });
      el.style.top = `${safeFrame.top}px`;
      el.style.left = `${safeFrame.left}px`;
    };
  };
}

export function safeSendMessage(msg) {
  if (msg && msg.type === "BRSE_AI_REQUEST") {
    window.brseLastAiRequest = msg;
  }
  if (typeof chrome !== "undefined" && chrome.runtime?.id) {
    return chrome.runtime.sendMessage(msg).catch(e => {
      const message = e?.message || "Extension message failed";
      console.warn("Send failed:", e);
      return {
        ok: false,
        success: false,
        error: message.includes("Extension context invalidated")
          ? "Extension vừa được reload. Hãy refresh tab web hiện tại rồi thử lại."
          : message,
      };
    });
  }
  return Promise.resolve({
    ok: false,
    success: false,
    error: "Extension runtime disconnected. Hãy refresh tab web hiện tại rồi thử lại.",
  });
}

export function wrapWords(text) {
  if (!text) return '';
  return text.split(/(\s+)/).map(part => {
    if (/\s+/.test(part)) return part;
    return `<span class="brse-word">${part}</span>`;
  }).join('');
}

export function replaceTextFrameworkSafe(el, text) {
  if (!el) return;
  el.focus();
  
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    const originalValue = el.value;
    try {
      el.select();
      const success = document.execCommand('insertText', false, text);
      if (!success || el.value === originalValue) {
        el.value = text;
      }
    } catch (err) {
      el.value = text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
    const originalText = el.innerText;
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
      
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });
      el.dispatchEvent(pasteEvent);
      
      const success = document.execCommand('insertText', false, text);
      if (!success || el.innerText === originalText) {
        el.innerText = text;
      }
    } catch (err) {
      console.warn("[BrSE] execCommand failed, fallback to innerText:", err);
      el.innerText = text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
