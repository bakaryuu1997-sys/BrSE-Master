import DOMPurify from './vendor/dompurify.es.js';

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

export function sanitizeAiText(value) {
  return escapeHtml(value);
}

const ALLOWED_AI_TAGS = [
  "b",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "i",
  "img",
  "li",
  "p",
  "pre",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "tr",
  "ul",
];

const ALLOWED_AI_ATTRS = [
  "alt",
  "class",
  "data-index",
  "id",
  "style",
  "title",
  "type",
];

export function sanitizeAiHtml(html) {
  const safeHtml = String(html ?? "");
  if (typeof window === "undefined" || typeof document === "undefined") {
    return safeHtml;
  }

  return DOMPurify.sanitize(safeHtml, {
    ALLOWED_TAGS: ALLOWED_AI_TAGS,
    ALLOWED_ATTR: ALLOWED_AI_ATTRS,
  });
}
