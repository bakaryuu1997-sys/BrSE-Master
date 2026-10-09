"use strict";

const ASCII_BOUNDARY = /[A-Za-z0-9_]/;
const GLOSSARY_VARIANT_SEPARATOR = /[\/,;，、・]+/;

export function normalizeGlossaryKey(value = "") {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

export function splitGlossaryVariants(value = "") {
  return String(value)
    .split(GLOSSARY_VARIANT_SEPARATOR)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function isUsefulEnglishVariant(value = "") {
  const text = String(value).trim();
  if (text.length < 2) return false;
  if (/^[A-Z0-9_+-]{2,6}$/.test(text)) return true;
  return text.length >= 4;
}

export function buildGlossaryPattern(value = "") {
  const escapedParts = String(value)
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
  return escapedParts.join("\\s+");
}

export function hasAsciiBoundary(text, index, length) {
  const before = index > 0 ? text[index - 1] : "";
  const after = index + length < text.length ? text[index + length] : "";
  return !ASCII_BOUNDARY.test(before) && !ASCII_BOUNDARY.test(after);
}
