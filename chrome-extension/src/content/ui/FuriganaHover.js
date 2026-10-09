"use strict";

import { safeSendMessage } from '../utils/dom.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { escapeHtml } from '../../shared/sanitizer.js';
import { injectThemeTokens } from '../../shared/theme.js';
import { romajiToKana } from '../utils/kana.js';
import { extractJapaneseSegment, hasJapanese } from '../utils/japanese.js';

const HOVER_DEBOUNCE_MS = 220;
const FURIGANA_ALWAYS_ON_KEY = "brseFuriganaAlwaysOn";
const FURIGANA_ENABLED_KEY   = "brseFuriganaEnabled"; // master on/off

let furiganaEnabled = true;

let altDown = false;
let alwaysOn = false;
let host = null;
let shadow = null;
let debounceTimer = null;
let currentWord = "";
const cache = new Map();

const FURIGANA_STYLE = `
  :host { all: initial; }
  .fg-card {
    position: fixed;
    z-index: 2147483646;
    max-width: 320px;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--brse-surface, #1d1e22);
    border: 1px solid var(--brse-border-strong, rgba(255, 107, 94,0.35));
    box-shadow: var(--brse-shadow-lg, 0 16px 40px rgba(0,0,0,0.5));
    color: var(--brse-text, #ededf0);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    pointer-events: auto;
    animation: fgIn 0.14s ease both;
  }
  @keyframes fgIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .fg-row { display: flex; align-items: center; gap: 8px; }
  .fg-kana { font-size: 16px; font-weight: 800; color: var(--brse-primary, #ff6b5e); }
  .fg-word { font-size: 13px; color: var(--brse-text-muted, #a2a3aa); }
  .fg-romaji { margin-top: 3px; font-size: 11.5px; color: var(--brse-text-dim, #6e7079); font-style: italic; }
  .fg-meaning { margin-top: 5px; font-size: 12.5px; color: var(--brse-text, #ededf0); line-height: 1.4; }
  .fg-speak {
    margin-left: auto;
    border: 1px solid var(--brse-border, rgba(110, 112, 121,0.3));
    background: transparent;
    color: var(--brse-primary, #ff6b5e);
    border-radius: 8px;
    padding: 2px 8px;
    font-size: 13px;
    cursor: pointer;
  }
  .fg-speak:hover { background: rgba(255, 107, 94,0.15); }
  .fg-loading { font-size: 12px; color: var(--brse-text-dim, #6e7079); }
`;

function ensureTooltip() {
  if (host) return;
  host = document.createElement('div');
  host.id = 'brse-furigana-root';
  shadow = host.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = FURIGANA_STYLE;
  shadow.appendChild(style);
  document.body.appendChild(host);
}

function hideTooltip() {
  currentWord = "";
  if (shadow) shadow.querySelector('.fg-card')?.remove();
}

function positionCard(card, x, y) {
  const pad = 14;
  card.style.left = `${Math.min(x + 12, window.innerWidth - 340)}px`;
  card.style.top = `${Math.min(y + 18, window.innerHeight - 120)}px`;
  card.style.left = `${Math.max(pad, parseFloat(card.style.left))}px`;
}

function renderCard(word, { kana, romaji, meaning, loading }, x, y) {
  ensureTooltip();
  shadow.querySelector('.fg-card')?.remove();
  const card = document.createElement('div');
  card.className = 'fg-card';
  if (loading) {
    card.innerHTML = `<div class="fg-loading">⏳ ${escapeHtml(word)} …</div>`;
  } else {
    card.innerHTML = `
      <div class="fg-row">
        <span class="fg-kana">${escapeHtml(kana || word)}</span>
        <span class="fg-word">${escapeHtml(word)}</span>
        <button class="fg-speak" title="Đọc to (ja)">🔊</button>
      </div>
      ${romaji ? `<div class="fg-romaji">${escapeHtml(romaji)}</div>` : ''}
      ${meaning ? `<div class="fg-meaning">${escapeHtml(meaning)}</div>` : ''}
    `;
    card.querySelector('.fg-speak').onclick = (e) => {
      e.stopPropagation();
      safeSendMessage({ type: MESSAGE_TYPES.BRSE_SPEAK, text: word, lang: 'ja-JP' });
    };
  }
  shadow.appendChild(card);
  positionCard(card, x, y);
}

async function resolveWord(word, x, y) {
  if (cache.has(word)) {
    renderCard(word, cache.get(word), x, y);
    return;
  }
  renderCard(word, { loading: true }, x, y);
  try {
    const res = await safeSendMessage({ type: MESSAGE_TYPES.BRSE_GOOGLE_TRANSLATE, text: word });
    if (currentWord !== word) return; // user moved on
    const data = res?.data || {};
    const romaji = data.transliteration || "";
    const info = {
      kana: romajiToKana(romaji, word) || word,
      romaji,
      meaning: data.translation || "",
    };
    cache.set(word, info);
    renderCard(word, info, x, y);
  } catch {
    if (currentWord === word) renderCard(word, { kana: word, romaji: "", meaning: "" }, x, y);
  }
}

function wordUnderPoint(x, y) {
  const range = document.caretRangeFromPoint?.(x, y);
  const node = range?.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE) return "";
  return extractJapaneseSegment(node.textContent || "", range.startOffset);
}

function handleMouseMove(e) {
  if (!furiganaEnabled) return;
  if (!altDown && !alwaysOn) return;
  const target = e.target;
  if (target?.id?.startsWith?.('brse-')) return;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

  clearTimeout(debounceTimer);
  const { clientX, clientY } = e;
  debounceTimer = setTimeout(() => {
    if (!altDown && !alwaysOn) return;
    const word = wordUnderPoint(clientX, clientY);
    if (!word || !hasJapanese(word)) {
      hideTooltip();
      return;
    }
    if (word === currentWord) return;
    currentWord = word;
    resolveWord(word, clientX, clientY);
  }, HOVER_DEBOUNCE_MS);
}

export function initFuriganaHover() {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
  document.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('scroll', hideTooltip, true);

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('scroll', hideTooltip, true);

  // Load the "always on" preference + master enable, then keep them in sync.
  try {
    chrome.storage?.sync?.get?.([FURIGANA_ALWAYS_ON_KEY, FURIGANA_ENABLED_KEY], (res) => {
      alwaysOn       = Boolean(res?.[FURIGANA_ALWAYS_ON_KEY]);
      furiganaEnabled = res?.[FURIGANA_ENABLED_KEY] !== false; // default on
    });
    chrome.storage?.onChanged?.addListener?.((changes, area) => {
      if (area !== 'sync') return;
      if (changes[FURIGANA_ALWAYS_ON_KEY]) {
        alwaysOn = Boolean(changes[FURIGANA_ALWAYS_ON_KEY].newValue);
        if (!alwaysOn && !altDown) hideTooltip();
      }
      if (changes[FURIGANA_ENABLED_KEY]) {
        furiganaEnabled = changes[FURIGANA_ENABLED_KEY].newValue !== false;
        if (!furiganaEnabled) hideTooltip();
      }
    });
  } catch {
    // chrome.storage unavailable (e.g. in tests) — stay Alt-gated.
  }
}

function handleKeyDown(e) {
  if (e.key === 'Alt') altDown = true;
}
function handleKeyUp(e) {
  if (e.key === 'Alt') {
    altDown = false;
    hideTooltip();
  }
}
