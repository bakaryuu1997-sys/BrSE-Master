"use strict";

import { getYouTubeTranscriptFromPage } from "./youtubeTranscript.js";

const MAX_SUMMARY_CHARS = 6500;
const BODY_SAMPLE_CHARS = 24000;
const CONTENT_SELECTORS = [
  "article",
  "main",
  "[role='main']",
  ".markdown-body",
  "#readme",
  ".repository-content",
  ".container-lg",
  "#content",
  ".content",
];
const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "template",
  "link",
  "meta",
  "svg",
  "canvas",
  "nav",
  "footer",
  "header",
  "aside",
  "form",
  "button",
  "input",
  "textarea",
  "select",
  "[aria-hidden='true']",
  "[hidden]",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
];

export function collectGenericPageSummarySource(documentRef = document) {
  const text = collectReadableText(documentRef);
  return {
    kind: "page",
    sourceLabel: "Page body text",
    status: text ? "Live page text" : "No readable page text",
    charCount: text.length,
    isFallback: !text,
    title: normalizeText(documentRef.title || documentRef.querySelector("h1")?.textContent || ""),
    promptText: text.slice(0, MAX_SUMMARY_CHARS),
  };
}

export async function collectYouTubeSummarySource(locationRef = window.location, documentRef = document) {
  const transcript = normalizeText(await getYouTubeTranscriptFromPage(locationRef, documentRef));
  if (transcript) {
    return {
      kind: "youtube",
      sourceLabel: "YouTube captions",
      status: "Captions found",
      charCount: transcript.length,
      isFallback: false,
      promptText: `YouTube captions:\n\n${transcript.slice(0, MAX_SUMMARY_CHARS)}`,
    };
  }

  const panelTranscript = normalizeText(readVisibleYouTubeTranscriptPanel(documentRef));
  if (panelTranscript) {
    return {
      kind: "youtube",
      sourceLabel: "Visible YouTube transcript panel",
      status: "Using open transcript panel",
      charCount: panelTranscript.length,
      isFallback: false,
      promptText: `YouTube transcript panel text:\n\n${panelTranscript.slice(0, MAX_SUMMARY_CHARS)}`,
    };
  }

  const fallback = collectYouTubeTitleDescription(documentRef);
  return {
    kind: "youtube",
    sourceLabel: "YouTube title/description",
    status: "No captions found; using title/description fallback",
    charCount: fallback.length,
    isFallback: true,
    noTranscript: true,
    promptText: fallback.slice(0, 4000),
  };
}

export function formatSummarySourceNotice(source, options = {}) {
  const cacheStatus = options.cached ? "Cache hit" : source.status;
  const fallbackNote = source.noTranscript
    ? "\n- Transcript: no subtitles/captions found on this page"
    : "";
  return [
    "### Summary source",
    `- Source: ${source.sourceLabel}`,
    `- Input length: ${source.charCount} chars`,
    `- Status: ${cacheStatus}${source.isFallback ? " (fallback)" : ""}${fallbackNote}`,
  ].join("\n");
}

export function readVisibleYouTubeTranscriptPanel(documentRef = document) {
  const selectors = [
    "ytd-transcript-segment-renderer",
    "ytd-transcript-segment-list-renderer yt-formatted-string",
    "#segments-container yt-formatted-string",
    "[class*='transcript-segment']",
    "[data-testid*='transcript']",
  ];
  const lines = [];
  selectors.forEach((selector) => {
    documentRef.querySelectorAll(selector).forEach((node) => {
      const text = normalizeText(node.textContent || "");
      if (text && !lines.includes(text)) lines.push(text);
    });
  });
  const transcript = lines.join("\n");
  return transcript.length >= 80 ? transcript : "";
}

function collectYouTubeTitleDescription(documentRef) {
  const title = normalizeText(
    documentRef.querySelector("h1.ytd-watch-metadata")?.textContent
      || documentRef.querySelector("h1")?.textContent
      || documentRef.title
      || "Untitled YouTube video"
  );
  const description = normalizeText(
    documentRef.querySelector("#description-inline-expander")?.textContent
      || documentRef.querySelector("#description")?.textContent
      || ""
  );
  return `YouTube video title: ${title}\n\nDescription: ${description}`;
}

export function collectReadableText(documentRef = document) {
  const candidateTexts = CONTENT_SELECTORS
    .flatMap((selector) => Array.from(documentRef.querySelectorAll(selector)))
    .map((node) => extractReadableNodeText(node))
    .filter((text) => text.length >= 160)
    .filter((text) => !looksLikeSerializedMarkup(text))
    .sort((a, b) => b.length - a.length);

  if (candidateTexts.length > 0) {
    return candidateTexts[0].slice(0, BODY_SAMPLE_CHARS);
  }

  const body = documentRef.body;
  if (!body) return "";
  const clone = body.cloneNode(true);
  clone.querySelectorAll(NOISE_SELECTORS.join(",")).forEach((node) => node.remove());
  const text = normalizeText(clone.textContent || "");
  return looksLikeSerializedMarkup(text) ? "" : text.slice(0, BODY_SAMPLE_CHARS);
}

export function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractReadableNodeText(node) {
  if (!node) return "";
  const clone = node.cloneNode(true);
  clone.querySelectorAll?.(NOISE_SELECTORS.join(","))?.forEach((child) => child.remove());
  return normalizeText(clone.textContent || "");
}

function looksLikeSerializedMarkup(text) {
  const value = String(text || "");
  if (!value) return false;
  const markers = [
    /\\u003c\/?[a-z]/i,
    /&lt;\/?[a-z]/i,
    /<\s*\/?[a-z][^>]*>/i,
    /\bclass=\\?["']/i,
    /\bitemprop=\\?["']/i,
    /self\.__next_f\.push/i,
    /__NEXT_DATA__/i,
  ];
  const markerHits = markers.reduce((count, regex) => count + (regex.test(value) ? 1 : 0), 0);
  const repeatedMarkupHits = (value.match(/\\u003c|&lt;|<\s*\/?[a-z]|\bclass=|\bdir=|\bitemprop=/gi) || []).length;
  return markerHits >= 2 || repeatedMarkupHits >= 8;
}
