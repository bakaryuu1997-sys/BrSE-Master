"use strict";

import { injectThemeTokens } from '../../shared/theme.js';
import { GLOSSARY_HIGHLIGHTER_STYLE } from "./GlossaryHighlighterStyles.js";
import { safeSendMessage } from '../utils/dom.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { escapeHtml } from '../../shared/sanitizer.js';
import {
  buildGlossaryPattern,
  hasAsciiBoundary,
  isUsefulEnglishVariant,
  normalizeGlossaryKey,
  splitGlossaryVariants,
} from "./glossaryMatching.js";
import { shouldObserveElement } from "./glossaryDom.js";

let glossaryTerms = [];
let learnedTerms = [];
let glossaryMap = new Map();
let globalTooltip = null;
let hideTimeout = null;
let mutationObserver = null;
let pendingNodes = [];
let scanTimeout = null;
let intersectionObserver = null;

export function unwrapAllHighlights() {
  if (mutationObserver) mutationObserver.disconnect();
  try {
    const highlights = document.querySelectorAll('.brse-glossary-highlight');
    highlights.forEach(span => {
      const textNode = document.createTextNode(span.textContent);
      span.replaceWith(textNode);
    });
  } catch (err) {
    console.warn("[Glossary] unwrapAllHighlights failed:", err);
  } finally {
    if (mutationObserver && glossaryTerms.length > 0 && typeof chrome !== "undefined") {
      chrome.storage.local.get(["brseGlossaryHighlightEnabled"], (res) => {
        const enabled = res["brseGlossaryHighlightEnabled"] !== false;
        if (enabled) {
          mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }
      });
    }
  }
}

export function disableGlossaryHighlighter() {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }
  unwrapAllHighlights();
}

export function enableGlossaryHighlighter() {
  buildGlossaryIndex();
  forceGlossaryScan();
}

export function initGlossaryHighlighter() {
  // 1. Listen to storage changes for brseGlossaryHighlightEnabled
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.brseGlossaryHighlightEnabled) {
        const enabled = changes.brseGlossaryHighlightEnabled.newValue !== false;
        if (enabled) {
          enableGlossaryHighlighter();
        } else {
          disableGlossaryHighlighter();
        }
      }
    });
  }

  // 2. Try to load instantly from chrome.storage.local cache to highlight without delay if enabled
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["brseGlossaryHighlightEnabled", "brseGlossaryCache", "brseLearnedTerms"], (res) => {
      const enabled = res["brseGlossaryHighlightEnabled"] !== false;
      learnedTerms = Array.isArray(res["brseLearnedTerms"]) ? res["brseLearnedTerms"] : [];
      if (!enabled) {
        const cached = res["brseGlossaryCache"];
        if (Array.isArray(cached) && cached.length > 0) {
          glossaryTerms = cached;
          buildGlossaryIndex();
        }
        return;
      }

      const cached = res["brseGlossaryCache"];
      if (Array.isArray(cached) && cached.length > 0 && glossaryTerms.length === 0) {
        glossaryTerms = cached;
        buildGlossaryIndex();
        startGlossaryScanning();
      }
    });
  }

  // 3. Fetch fresh terms from background script (API + Custom DB) and hot-reload if changed
  safeSendMessage({ type: MESSAGE_TYPES.BRSE_GET_GLOSSARY })
    .then(response => {
      if (response && response.ok && Array.isArray(response.terms)) {
        const changed = JSON.stringify(glossaryTerms) !== JSON.stringify(response.terms);
        if (changed || glossaryTerms.length === 0) {
          glossaryTerms = response.terms;
          buildGlossaryIndex();
        }
        
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(["brseGlossaryHighlightEnabled"], (res) => {
            const enabled = res["brseGlossaryHighlightEnabled"] !== false;
            if (enabled) {
              forceGlossaryScan();
            }
          });
        } else {
          forceGlossaryScan();
        }
      }
    })
    .catch(err => console.warn("[Glossary] Init failed:", err));

  // 4. Fallback: Run a clean scan once the window has fully loaded if enabled
  const runFallbackScan = () => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["brseGlossaryHighlightEnabled"], (res) => {
        const enabled = res["brseGlossaryHighlightEnabled"] !== false;
        if (enabled) {
          forceGlossaryScan();
        }
      });
    } else {
      forceGlossaryScan();
    }
  };

  if (document.readyState === "complete") {
    setTimeout(runFallbackScan, 800);
  } else {
    window.addEventListener("load", () => {
      setTimeout(runFallbackScan, 800);
    });
  }
}

export function forceGlossaryScan() {
  if (glossaryRegexes.length === 0) return;

  // Clear data-brse-scanned from all elements so we can scan cleanly
  const scanned = document.querySelectorAll('[data-brse-scanned]');
  scanned.forEach(el => el.removeAttribute('data-brse-scanned'));

  startGlossaryScanning();
}

function reObserveElement(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
  if (!shouldObserveElement(el)) return;
  
  // Remove scanned flag from the element itself and all its ancestors
  let curr = el;
  while (curr && curr !== document.body) {
    if (curr.hasAttribute('data-brse-scanned')) {
      curr.removeAttribute('data-brse-scanned');
    }
    curr = curr.parentNode;
  }
  
  intersectionObserver.observe(el);
}

let glossaryRegexes = []; // Changed from single glossaryRegex to an array

function upsertGlossaryTermLocal(term) {
  if (!term || !term.id) return;
  const index = glossaryTerms.findIndex((item) => item.id === term.id);
  if (index >= 0) {
    glossaryTerms[index] = term;
  } else {
    glossaryTerms.push(term);
  }
}

function buildGlossaryIndex() {
  glossaryMap.clear();
  const allParts = [];

  // Filter out learned terms
  const activeTerms = glossaryTerms.filter(term => !learnedTerms.includes(term.id));

  // Sort terms by length descending
  const sorted = [...activeTerms].sort((a, b) => {
    const lenA = Math.max(a.english?.length || 0, a.japanese?.length || 0);
    const lenB = Math.max(b.english?.length || 0, b.japanese?.length || 0);
    return lenB - lenA;
  });

  for (const term of sorted) {
    if (term.english) {
      const enVariations = splitGlossaryVariants(term.english);
      for (const enVar of enVariations) {
        const en = enVar.trim();
        if (isUsefulEnglishVariant(en)) {
          glossaryMap.set(normalizeGlossaryKey(en), term);
          allParts.push(buildGlossaryPattern(en));
        }
      }
    }
    if (term.japanese) {
      const jpSynonyms = splitGlossaryVariants(term.japanese);
      for (const jp of jpSynonyms) {
        const cleanJp = jp.trim();
        if (cleanJp.length > 1) {
          glossaryMap.set(normalizeGlossaryKey(cleanJp), term);
          allParts.push(buildGlossaryPattern(cleanJp));
        }
      }
    }
  }

  glossaryRegexes = [];
  if (allParts.length > 0) {
    // Split parts into chunks to avoid regex length limits (approx 2000 chars per regex)
    const CHUNK_SIZE = 100; 
    for (let i = 0; i < allParts.length; i += CHUNK_SIZE) {
      const chunk = allParts.slice(i, i + CHUNK_SIZE);
      try {
        glossaryRegexes.push(new RegExp(`(${chunk.join('|')})`, 'gi'));
      } catch (e) {
        console.error("[Glossary] Failed to create regex chunk:", e);
      }
    }
    console.log(`[Glossary] Created ${glossaryRegexes.length} regex chunks for ${allParts.length} terms.`);
  }
}

function setupIntersectionObserver() {
  if (intersectionObserver) intersectionObserver.disconnect();
  
  intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        // Mark as observed and scan
        if (!el.hasAttribute('data-brse-scanned')) {
          el.setAttribute('data-brse-scanned', 'true');
          scanElement(el);
        }
        // We can stop observing after scanning to save resources
        intersectionObserver.unobserve(el);
      }
    });
  }, {
    rootMargin: '300px' // Scan 300px before entering viewport for instantaneous hover rendering
  });
}
function startGlossaryScanning() {
  if (glossaryRegexes.length === 0) return;

  setupIntersectionObserver();

  // 1. Initial observation of potential text blocks
  observeBlocks(document.body);

  // 2. Setup MutationObserver for dynamic page loads (SPA support)
  setupMutationObserver();

  // 3. Setup global hover tooltip events
  setupHovercardEvents();
}

function observeBlocks(root) {
  if (!root || glossaryRegexes.length === 0) return;

  // Find all block-level elements or elements that likely contain meaningful text
  const blocks = root.querySelectorAll('p, li, td, h1, h2, h3, h4, h5, h6, article, section, div:not(:empty)');
  blocks.forEach(block => {
    if (shouldObserveElement(block)) {
      intersectionObserver.observe(block);
    }
  });
}

function setupMutationObserver() {
  if (mutationObserver) mutationObserver.disconnect();

  mutationObserver = new MutationObserver((mutations) => {
    let needsProcess = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingNodes.push(node);
            needsProcess = true;
          } else if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentNode;
            if (parent) {
              pendingNodes.push(parent);
              needsProcess = true;
            }
          }
        }
      } else if (mutation.type === 'characterData') {
        const parent = mutation.target.parentNode;
        if (parent) {
          pendingNodes.push(parent);
          needsProcess = true;
        }
      }
    }

    if (needsProcess) {
      if (scanTimeout) clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => {
        const nodesToProcess = [...pendingNodes];
        pendingNodes = [];
        
        nodesToProcess.forEach(node => {
          reObserveElement(node);
          if (node.nodeType === Node.ELEMENT_NODE) {
            const subBlocks = node.querySelectorAll?.('p, li, td, h1, h2, h3, div');
            subBlocks?.forEach(sb => {
              reObserveElement(sb);
            });
          }
        });
      }, 250); // 250ms debounced interval to prevent aggressive CPU lockups
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

function scanElement(root) {
  if (!root || glossaryRegexes.length === 0) return;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentNode;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tagName = parent.tagName;

        // Skip sensitive elements to avoid breakages
        const skipTags = [
          'SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'CODE', 'PRE', 
          'NOSCRIPT', 'IFRAME', 'HEAD', 'BUTTON', 'A', 'svg', 'path'
        ];
        if (skipTags.includes(tagName) || parent.closest('code, pre, kbd, samp')) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if contenteditable or role textbox
        if (parent.isContentEditable || parent.getAttribute('contenteditable') === 'true' || parent.getAttribute('role') === 'textbox') {
          return NodeFilter.FILTER_REJECT;
        }

        // Avoid self-highlighting and extension overlays
        if (parent.closest('.brse-glossary-highlight') || parent.closest('[id^="brse-"]')) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let currentNode;
  while (currentNode = walker.nextNode()) {
    textNodes.push(currentNode);
  }

  // Highlight matches in found text nodes
  textNodes.forEach(node => {
    const text = node.nodeValue;
    if (!text) return;

    // Collect all matches from all regex chunks
    const allMatches = [];
    for (const regex of glossaryRegexes) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (!hasAsciiBoundary(text, match.index, match[0].length)) {
          continue;
        }
        allMatches.push({
          text: match[0],
          index: match.index,
          length: match[0].length
        });
      }
    }

    if (allMatches.length === 0) return;

    // Sort by index (ascending) and length (descending)
    allMatches.sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return b.length - a.length;
    });

    // Deduplicate/remove overlaps (greedy)
    const filteredMatches = [];
    let lastEnd = 0;
    for (const m of allMatches) {
      if (m.index >= lastEnd) {
        filteredMatches.push(m);
        lastEnd = m.index + m.length;
      }
    }

    if (filteredMatches.length === 0) return;

    const fragment = document.createDocumentFragment();
    let lastIdx = 0;

    for (const match of filteredMatches) {
      const matchText = match.text;
      const matchIdx = match.index;

      // Add preceding plain text
      if (matchIdx > lastIdx) {
        fragment.appendChild(document.createTextNode(text.substring(lastIdx, matchIdx)));
      }

      // Find the matched term object in our index
      const matchedTerm = glossaryMap.get(normalizeGlossaryKey(matchText));

      if (matchedTerm) {
        // ANTI-NOISE RULE: Case-Sensitive for short terms (<= 3 chars)
        const enParts = splitGlossaryVariants(matchedTerm.english);
        const isShortUpper = enParts.some(p => p.trim().length <= 3 && p.trim() === p.trim().toUpperCase());
        
        if (isShortUpper && matchText.length <= 3 && matchText !== matchText.toUpperCase()) {
           fragment.appendChild(document.createTextNode(matchText));
           lastIdx = matchIdx + matchText.length;
           continue;
        }

        // Create styled highlight span
        const span = document.createElement('span');
        span.className = 'brse-glossary-highlight';
        span.setAttribute('data-term-id', matchedTerm.id);
        span.textContent = matchText;
        
        // Inline highlight styles
        Object.assign(span.style, {
          display: 'inline',
          whiteSpace: 'normal',
          borderBottom: '1px dashed var(--brse-secondary)',
          color: 'var(--brse-text)',
          textShadow: '0 0 4px rgba(255, 138, 125, 0.4)',
          cursor: 'help',
          transition: 'all 0.2s ease',
          fontWeight: '500'
        });

        // Add visual flare on hover & trigger tooltip show/hide directly
        span.onmouseenter = () => {
          span.style.color = 'var(--brse-secondary)';
          span.style.borderBottomColor = 'var(--brse-primary)';
          span.style.textShadow = '0 0 8px rgba(255, 138, 125, 0.7)';
          
          if (hideTimeout) clearTimeout(hideTimeout);
          const termId = span.getAttribute('data-term-id');
          const term = glossaryTerms.find(t => t.id === termId);
          if (term) {
            showTooltip(span, term);
          }
        };
        span.onmouseleave = () => {
          span.style.color = 'var(--brse-text)';
          span.style.borderBottomColor = 'var(--brse-secondary)';
          span.style.textShadow = '0 0 4px rgba(255, 138, 125, 0.4)';
          
          hideTimeout = setTimeout(() => {
            hideTooltip();
          }, 400); 
        };

        fragment.appendChild(span);
      } else {
        // Fallback to normal text if not mapped
        fragment.appendChild(document.createTextNode(matchText));
      }

      lastIdx = matchIdx + matchText.length;
    }

    // Add trailing text
    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
    }

    // Replace original node safely
    if (node.parentNode) {
      // Disconnect mutation observer during domestic modification to avoid infinite recursion
      if (mutationObserver) mutationObserver.disconnect();
      try {
        node.parentNode.replaceChild(fragment, node);
      } catch (err) {
        console.warn("[Glossary] replaceChild failed:", err);
      } finally {
        // Reconnect mutation observer
        if (mutationObserver) {
          mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }
      }
    }
  });
}

function setupHovercardEvents() {
  createTooltipContainer();
}

function createTooltipContainer() {
  if (globalTooltip) return;

  globalTooltip = document.createElement('div');
  globalTooltip.id = 'brse-glossary-tooltip';
  
  Object.assign(globalTooltip.style, {
    position: 'absolute',
    zIndex: '1000000',
    pointerEvents: 'none',
    opacity: '0',
    transform: 'translateY(8px)',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    width: '320px'
  });

  const shadow = globalTooltip.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = GLOSSARY_HIGHLIGHTER_STYLE;

  const container = document.createElement('div');
  container.id = 'tooltip-body';

  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(globalTooltip);

  // Keep open when mouse enters tooltip itself
  globalTooltip.addEventListener('mouseenter', () => {
    if (hideTimeout) clearTimeout(hideTimeout);
  });
  globalTooltip.addEventListener('mouseleave', () => {
    hideTimeout = setTimeout(() => {
      hideTooltip();
    }, 200);
  });
}

function bindTooltipEvents(cardEl, term) {
  const btnSpeakEn = cardEl.querySelector('#brse-speak-en');
  const btnSpeakJp = cardEl.querySelector('#brse-speak-jp');
  const btnSpeakVi = cardEl.querySelector('#brse-speak-vi');
  const btnLearnTerm = cardEl.querySelector('#brse-learn-term');
  const btnEditTermNow = cardEl.querySelector('#brse-edit-term-now');

  const playSpeech = (text, lang) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  if (btnSpeakEn) {
    btnSpeakEn.onclick = (e) => {
      e.stopPropagation();
      const firstEn = (term.english || '').split('/')[0].trim();
      playSpeech(firstEn, 'en-US');
    };
  }

  if (btnSpeakJp) {
    btnSpeakJp.onclick = (e) => {
      e.stopPropagation();
      const firstJp = (term.japanese || '').split('/')[0].trim();
      playSpeech(firstJp, 'ja-JP');
    };
  }

  if (btnSpeakVi) {
    btnSpeakVi.onclick = (e) => {
      e.stopPropagation();
      const firstVi = (term.vietnamese || '').split('/')[0].trim();
      playSpeech(firstVi, 'vi-VN');
    };
  }

  if (btnEditTermNow) {
    btnEditTermNow.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      renderEditForm(cardEl.firstElementChild, term);
    };
  }

  if (btnLearnTerm) {
    btnLearnTerm.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      chrome.storage.local.get(["brseLearnedTerms"], (res) => {
        const currentLearned = Array.isArray(res["brseLearnedTerms"]) ? res["brseLearnedTerms"] : [];
        if (!currentLearned.includes(term.id)) {
          currentLearned.push(term.id);
        }
        learnedTerms = currentLearned;
        
        chrome.storage.local.set({ brseLearnedTerms: currentLearned }, () => {
          hideTooltip();
          
          if (mutationObserver) mutationObserver.disconnect();
          try {
            const elements = document.querySelectorAll(`.brse-glossary-highlight[data-term-id="${term.id}"]`);
            elements.forEach(el => {
              const textNode = document.createTextNode(el.textContent);
              el.replaceWith(textNode);
            });
          } catch (err) {
            console.warn("[Glossary] Unwrap failed:", err);
          } finally {
            if (mutationObserver) {
              mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
              });
            }
          }
          
          buildGlossaryIndex();
          const enSynonyms = splitGlossaryVariants(term.english);
          showToast(`Đã tắt highlight từ "${enSynonyms[0] || ''}"`);
        });
      });
    };
  }
}

function renderEditForm(cardWrapper, term) {
  const originalHtml = cardWrapper.innerHTML;

  cardWrapper.textContent = ''; // clear first
  
  const container = document.createElement('div');
  container.style.cssText = "font-family: inherit; font-size: 12.5px; color: var(--brse-text);";
  
  const h4 = document.createElement('h4');
  h4.style.cssText = "margin: 0 0 10px 0; color: var(--brse-primary); font-size: 13px; font-weight: bold; border-bottom: 1px solid rgba(255, 107, 94, 0.2); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;";
  
  const titleSpan = document.createElement('span');
  titleSpan.textContent = "✏️ Chỉnh sửa thuật ngữ";
  h4.appendChild(titleSpan);
  container.appendChild(h4);

  const scrollDiv = document.createElement('div');
  scrollDiv.style.cssText = "display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; padding-right: 4px; margin-bottom: 10px;";

  const createField = (labelName, id, type, value, isSelect = false, options = []) => {
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.style.cssText = "display: block; font-size: 10px; color: var(--brse-text-dim); font-weight: bold; margin-bottom: 2px;";
    label.textContent = labelName;
    div.appendChild(label);

    if (isSelect) {
      const select = document.createElement('select');
      select.id = id;
      select.style.cssText = "width: 98%; background: var(--brse-surface); border: 1px solid rgba(255, 107, 94, 0.4); border-radius: 4px; padding: 4px 6px; color: #fff; font-size: 12px; font-family: inherit; outline: none;";
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (value === opt) option.selected = true;
        select.appendChild(option);
      });
      div.appendChild(select);
    } else if (type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.id = id;
      textarea.value = value || '';
      textarea.style.cssText = "width: 93%; height: 40px; background: var(--brse-surface); border: 1px solid rgba(255, 107, 94, 0.4); border-radius: 4px; padding: 4px 6px; color: #fff; font-size: 12px; font-family: inherit; outline: none; resize: vertical;";
      div.appendChild(textarea);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = id;
      input.value = value || '';
      input.style.cssText = "width: 93%; background: var(--brse-surface); border: 1px solid rgba(255, 107, 94, 0.4); border-radius: 4px; padding: 4px 6px; color: #fff; font-size: 12px; font-family: inherit; outline: none;";
      div.appendChild(input);
    }
    return div;
  };

  scrollDiv.appendChild(createField('English (Gốc)*', 'edit-english', 'text', term.english));
  scrollDiv.appendChild(createField('Japanese (Nhật)*', 'edit-japanese', 'text', term.japanese));
  scrollDiv.appendChild(createField('Kana (Cách đọc)', 'edit-kana', 'text', term.kana));
  scrollDiv.appendChild(createField('Nghĩa Tiếng Việt*', 'edit-vietnamese', 'text', term.vietnamese));
  scrollDiv.appendChild(createField('Phân loại (Category)*', 'edit-category', 'text', term.category, true, ['Quality', 'Release', 'Infrastructure', 'Business', 'Process', 'Technical']));
  scrollDiv.appendChild(createField('Ghi chú (Note)', 'edit-note', 'textarea', term.note));
  scrollDiv.appendChild(createField('Ví dụ minh họa (Example)', 'edit-example', 'textarea', term.example));

  container.appendChild(scrollDiv);

  const buttonDiv = document.createElement('div');
  buttonDiv.style.cssText = "display: flex; justify-content: flex-end; gap: 6px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;";

  const btnCancel = document.createElement('button');
  btnCancel.id = "edit-cancel-btn";
  btnCancel.style.cssText = "background: rgba(255, 93, 108, 0.15); border: 1px solid rgba(255, 93, 108, 0.3); color: var(--brse-error); padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: bold; cursor: pointer; border-style: solid;";
  btnCancel.textContent = "Hủy";
  btnCancel.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    cardWrapper.innerHTML = originalHtml;
    // Re-bind standard events of standard tooltip layout
    bindTooltipEvents(cardWrapper.parentNode, term);
  };
  buttonDiv.appendChild(btnCancel);

  const btnSave = document.createElement('button');
  btnSave.id = "edit-save-btn";
  btnSave.style.cssText = "background: rgba(78, 201, 165, 0.2); border: 1px solid rgba(78, 201, 165, 0.4); color: var(--brse-success); padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: bold; cursor: pointer; border-style: solid;";
  btnSave.textContent = "Lưu";
  btnSave.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const englishVal = container.querySelector('#edit-english').value.trim();
    const japaneseVal = container.querySelector('#edit-japanese').value.trim();
    const kanaVal = container.querySelector('#edit-kana').value.trim();
    const categoryVal = container.querySelector('#edit-category').value;
    const vietnameseVal = container.querySelector('#edit-vietnamese').value.trim();
    const noteVal = container.querySelector('#edit-note').value.trim();
    const exampleVal = container.querySelector('#edit-example').value.trim();

    if (!englishVal || !japaneseVal || !vietnameseVal) {
      showToast("⚠️ Vui lòng nhập đầy đủ các trường bắt buộc (*)");
      return;
    }

    const updatedTerm = {
      ...term,
      english: englishVal,
      japanese: japaneseVal,
      kana: kanaVal || null,
      vietnamese: vietnameseVal,
      category: categoryVal,
      note: noteVal || null,
      example: exampleVal || null,
      roles: term.roles && Array.isArray(term.roles) && term.roles.length > 0 ? term.roles : ["BrSE"]
    };

    btnSave.textContent = "⏳ Lưu...";
    btnSave.disabled = true;

    safeSendMessage({
      type: MESSAGE_TYPES.BRSE_UPDATE_GLOSSARY_TERM,
      termId: term.id,
      term: updatedTerm
    }).then((response) => {
      if (response && response.ok) {
        showToast("✨ Đã cập nhật thuật ngữ thành công!");
        
        // Update the term object in our memory list
        const idx = glossaryTerms.findIndex(t => t.id === term.id);
        if (idx !== -1) {
          glossaryTerms[idx] = response.term;
        }
        buildGlossaryIndex();
        
        // Hide tooltip
        hideTooltip();

        // Trigger scan to update highlight texts if they changed
        setTimeout(() => {
          forceGlossaryScan();
        }, 100);
      } else {
        const errorMsg = (response && response.error) ? response.error : "Lỗi kết nối";
        showToast(`❌ Cập nhật thất bại: ${errorMsg}`);
        btnSave.textContent = "Lưu";
        btnSave.disabled = false;
      }
    });
  };
  buttonDiv.appendChild(btnSave);

  container.appendChild(buttonDiv);
  cardWrapper.appendChild(container);
}

function showTooltip(anchorEl, term) {
  const body = globalTooltip.shadowRoot.getElementById('tooltip-body');
  body.textContent = ''; // clear first
  
  const card = document.createElement('div');
  card.className = "tooltip-card";

  const titleDiv = document.createElement('div');
  titleDiv.className = "term-title";

  const titleLeft = document.createElement('span');
  titleLeft.style.cssText = "display:flex; align-items:center; gap: 4px; flex-wrap: wrap;";

  const enSynonyms = splitGlossaryVariants(term.english);
  const jpSynonyms = splitGlossaryVariants(term.japanese);
  const viSynonyms = splitGlossaryVariants(term.vietnamese);

  const mainTermSpan = document.createElement('span');
  mainTermSpan.style.color = "var(--brse-secondary)";
  mainTermSpan.textContent = enSynonyms[0] || jpSynonyms[0] || '';
  titleLeft.appendChild(mainTermSpan);

  if (enSynonyms.length > 1) {
    const extraSpan = document.createElement('span');
    extraSpan.style.cssText = "font-size:10px; color:var(--brse-text-dim); background:rgba(110, 112, 121,0.1); padding:1px 4px; border-radius:3px;";
    extraSpan.textContent = `+${enSynonyms.length - 1} biến thể`;
    titleLeft.appendChild(extraSpan);
  }
  titleDiv.appendChild(titleLeft);

  const titleRight = document.createElement('div');
  titleRight.style.cssText = "display: flex; gap: 6px;";

  const btnEdit = document.createElement('button');
  btnEdit.id = "brse-edit-term-now";
  btnEdit.className = "learn-btn edit-now-btn";
  btnEdit.title = "Chỉnh sửa trực tiếp từ vựng này";
  btnEdit.textContent = "✏️ Sửa ngay";
  titleRight.appendChild(btnEdit);

  const btnLearn = document.createElement('button');
  btnLearn.id = "brse-learn-term";
  btnLearn.className = "learn-btn";
  btnLearn.title = "Đánh dấu đã thuộc & tắt highlight";
  btnLearn.textContent = "🔕 Tắt highlight";
  titleRight.appendChild(btnLearn);

  titleDiv.appendChild(titleRight);
  card.appendChild(titleDiv);

  const gridDiv = document.createElement('div');
  gridDiv.style.cssText = "margin-top: 8px; display: grid; grid-template-columns: auto 1fr; gap: 8px; font-size: 12px; line-height: 1.4;";

  const createSpeakerSvg = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "12");
    
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", "11 5 6 9 2 9 2 15 6 15 11 19 11 5");
    svg.appendChild(polygon);
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07");
    svg.appendChild(path);
    
    return svg;
  };

  const enLabel = document.createElement('div');
  enLabel.style.cssText = "color: var(--brse-primary); font-weight: bold; display: flex; align-items: center; gap: 4px;";
  enLabel.textContent = "🇬🇧 EN:";
  if (enSynonyms.length > 0) {
    const speakEnBtn = document.createElement('button');
    speakEnBtn.className = "speaker-btn";
    speakEnBtn.id = "brse-speak-en";
    speakEnBtn.title = "Phát âm tiếng Anh";
    speakEnBtn.style.color = "var(--brse-primary)";
    speakEnBtn.appendChild(createSpeakerSvg());
    enLabel.appendChild(speakEnBtn);
  }
  gridDiv.appendChild(enLabel);

  const enVal = document.createElement('div');
  enVal.style.color = "var(--brse-text-muted)";
  enSynonyms.forEach((s, idx) => {
    const code = document.createElement('code');
    code.textContent = s;
    enVal.appendChild(code);
    if (idx < enSynonyms.length - 1) {
      enVal.appendChild(document.createTextNode(', '));
    }
  });
  gridDiv.appendChild(enVal);

  const jpLabel = document.createElement('div');
  jpLabel.style.cssText = "color: var(--brse-accent); font-weight: bold; display: flex; align-items: center; gap: 4px;";
  jpLabel.textContent = "🇯🇵 JP:";
  if (jpSynonyms.length > 0) {
    const speakJpBtn = document.createElement('button');
    speakJpBtn.className = "speaker-btn";
    speakJpBtn.id = "brse-speak-jp";
    speakJpBtn.title = "Phát âm tiếng Nhật";
    speakJpBtn.style.color = "var(--brse-accent)";
    speakJpBtn.appendChild(createSpeakerSvg());
    jpLabel.appendChild(speakJpBtn);
  }
  gridDiv.appendChild(jpLabel);

  const jpVal = document.createElement('div');
  jpVal.style.color = "var(--brse-text-muted)";
  jpSynonyms.forEach((s, idx) => {
    const span = document.createElement('span');
    span.textContent = s;
    jpVal.appendChild(span);
    if (idx < jpSynonyms.length - 1) {
      jpVal.appendChild(document.createTextNode(', '));
    }
  });
  if (term.kana) {
    const kanaSpan = document.createElement('span');
    kanaSpan.style.cssText = "color:var(--brse-text-dim); font-size:11px;";
    kanaSpan.textContent = ` (${term.kana})`;
    jpVal.appendChild(kanaSpan);
  }
  gridDiv.appendChild(jpVal);

  const vnLabel = document.createElement('div');
  vnLabel.style.cssText = "color: var(--brse-success); font-weight: bold; display: flex; align-items: center; gap: 4px;";
  vnLabel.textContent = "🇻🇳 VN:";
  const speakViBtn = document.createElement('button');
  speakViBtn.className = "speaker-btn";
  speakViBtn.id = "brse-speak-vi";
  speakViBtn.title = "Phát âm tiếng Việt";
  speakViBtn.style.color = "var(--brse-success)";
  speakViBtn.appendChild(createSpeakerSvg());
  vnLabel.appendChild(speakViBtn);
  gridDiv.appendChild(vnLabel);

  const vnVal = document.createElement('div');
  vnVal.style.cssText = "color: var(--brse-success); font-weight: bold;";
  vnVal.textContent = viSynonyms.join(' / ');
  gridDiv.appendChild(vnVal);

  card.appendChild(gridDiv);

  const noteDiv = document.createElement('div');
  noteDiv.className = "term-note";
  noteDiv.style.cssText = "border-top: 1px solid rgba(110, 112, 121,0.2); margin-top: 10px; padding-top: 8px;";
  noteDiv.textContent = term.note || '';
  card.appendChild(noteDiv);

  if (term.example) {
    const exDiv = document.createElement('div');
    exDiv.className = "term-example";
    exDiv.textContent = `例: ${term.example}`;
    card.appendChild(exDiv);
  }

  const tagsDiv = document.createElement('div');
  tagsDiv.className = "tags-container";

  const catTag = document.createElement('span');
  catTag.className = "tag";
  catTag.style.cssText = "background: rgba(255, 180, 84,0.15); color:var(--brse-accent); border-color: rgba(255, 180, 84,0.3);";
  catTag.textContent = term.category || 'Business';
  tagsDiv.appendChild(catTag);

  (term.roles || []).forEach(role => {
    const tag = document.createElement('span');
    tag.className = `tag tag-${role.toLowerCase()}`;
    tag.textContent = role;
    tagsDiv.appendChild(tag);
  });

  card.appendChild(tagsDiv);
  body.appendChild(card);

  bindTooltipEvents(body, term);

  const anchorRect = anchorEl.getBoundingClientRect();
  const tooltipHeight = 220;
  const tooltipWidth = 320;

  let top = anchorRect.top + window.scrollY - tooltipHeight - 8;
  let left = anchorRect.left + window.scrollX + (anchorRect.width / 2) - (tooltipWidth / 2);

  if (top < window.scrollY + 10) {
    top = anchorRect.bottom + window.scrollY + 8;
  }
  if (left < window.scrollX + 10) {
    left = window.scrollX + 10;
  } else if (left + tooltipWidth > window.scrollX + window.innerWidth - 10) {
    left = window.scrollX + window.innerWidth - tooltipWidth - 10;
  }

  globalTooltip.style.top = `${top}px`;
  globalTooltip.style.left = `${left}px`;
  globalTooltip.style.pointerEvents = 'auto';
  globalTooltip.style.opacity = '1';
  globalTooltip.style.transform = 'translateY(0)';
}

function hideTooltip() {
  if (globalTooltip) {
    globalTooltip.style.pointerEvents = 'none';
    globalTooltip.style.opacity = '0';
    globalTooltip.style.transform = 'translateY(8px)';
  }
}

function showToast(message) {
  let toast = document.getElementById('brse-toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'brse-toast-notification';
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      background: 'rgba(29, 30, 34, 0.95)',
      border: '1px solid var(--brse-accent)',
      borderRadius: '8px',
      color: 'var(--brse-accent)',
      padding: '12px 20px',
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontWeight: 'bold',
      zIndex: '2000000',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
      opacity: '0',
      transform: 'translateY(10px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease'
    });
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 3000);
}

export function refreshGlossaryHighlighter(eventOrTerm = null) {
  const optimisticTerm = eventOrTerm?.detail?.term || eventOrTerm?.term || eventOrTerm;
  chrome.storage.local.get(["brseGlossaryHighlightEnabled", "brseLearnedTerms"], (res) => {
    const enabled = res["brseGlossaryHighlightEnabled"] !== false;
    learnedTerms = Array.isArray(res["brseLearnedTerms"]) ? res["brseLearnedTerms"] : [];
    
    if (!enabled) {
      disableGlossaryHighlighter();
      return;
    }

    if (optimisticTerm && optimisticTerm.id) {
      unwrapAllHighlights();
      upsertGlossaryTermLocal(optimisticTerm);
      buildGlossaryIndex();
      if (glossaryRegexes.length > 0) {
        scanElement(document.body);
        startGlossaryScanning();
      }
    }
    
    safeSendMessage({ type: MESSAGE_TYPES.BRSE_GET_GLOSSARY })
      .then(response => {
        if (response && response.ok && Array.isArray(response.terms)) {
          unwrapAllHighlights();
          glossaryTerms = response.terms;
          
          // Remove existing attribute data-brse-scanned so we can scan again
          const scanned = document.querySelectorAll('[data-brse-scanned]');
          scanned.forEach(el => {
            el.removeAttribute('data-brse-scanned');
          });
          
          buildGlossaryIndex();
          
          if (glossaryRegexes.length > 0) {
            scanElement(document.body);
            setupIntersectionObserver();
            observeBlocks(document.body);
            setupMutationObserver();
            setupHovercardEvents();
          }
        }
      })
      .catch(err => console.warn("[Glossary] Refresh failed:", err));
  });
}
