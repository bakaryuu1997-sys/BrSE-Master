"use strict";

// Pure DOM predicate extracted from GlossaryHighlighter.js so it can be unit
// tested (jsdom) and reused. Decides whether an element's text should be scanned
// for glossary terms. Holds no module state — depends only on the passed element
// and the DOM API, so it is safe to test in isolation.

export const GLOSSARY_SKIP_TAGS = [
  "SCRIPT", "STYLE", "INPUT", "TEXTAREA", "CODE", "PRE",
  "NOSCRIPT", "IFRAME", "HEAD", "BUTTON", "A", "SVG", "PATH",
];

export function shouldObserveElement(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

  if (GLOSSARY_SKIP_TAGS.includes(el.tagName)) return false;

  if (
    el.isContentEditable ||
    el.getAttribute("contenteditable") === "true" ||
    el.getAttribute("role") === "textbox"
  ) {
    return false;
  }

  // Skip code-like containers, already-highlighted spans, and the extension's
  // own injected UI (ids prefixed with "brse-").
  if (
    el.closest("code, pre, kbd, samp") ||
    el.closest(".brse-glossary-highlight") ||
    el.closest('[id^="brse-"]')
  ) {
    return false;
  }

  return true;
}
