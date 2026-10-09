/**
 * Gmail Adapter for BrSE OS
 * - Compose toolbar: AI drafting via Quick Injector.
 * - Open email view: one-click capture into Q&A / Todo via the shared Import modal.
 */

import { safeSendMessage } from '../utils/dom.js';
import { showToast } from '../ui/Toast.js';
import { showQuickInjector } from '../ui/QuickInjector.js';
import { showImportModal, removeImportModal } from '../ui/ImportModal.tsx';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { STORAGE_KEYS } from '../../shared/storage.js';
import { debounce } from '../utils/debounce.js';
import { SELECTORS } from '../../shared/selectors.js';
import { THEME } from '../../shared/theme.js';

let gmailObserver = null;

function readText(el) {
  if (!el) return '';
  return String(el.innerText || el.textContent || '').trim();
}

/**
 * Extract subject / sender / body from an open Gmail conversation.
 * Pure (takes a root) so it can be unit-tested without a live Gmail page.
 */
export function extractGmailEmail(root = document) {
  const subject = readText(root.querySelector(SELECTORS.gmail.openSubject));

  const senderEl = root.querySelector(SELECTORS.gmail.openSender);
  const senderName = senderEl
    ? (senderEl.getAttribute('name') || senderEl.getAttribute('email') || readText(senderEl))
    : '';
  const senderEmail = senderEl ? (senderEl.getAttribute('email') || '') : '';
  const sender = senderEmail && senderName && senderName !== senderEmail
    ? `${senderName} <${senderEmail}>`
    : (senderName || senderEmail);

  const bodyEls = root.querySelectorAll(SELECTORS.gmail.openBody);
  const bodyEl = bodyEls.length ? bodyEls[bodyEls.length - 1] : null;
  const body = readText(bodyEl).slice(0, 5000);

  return { subject, sender, body };
}

/** Best-effort stable id for the open Gmail conversation (from the URL hash). */
export function getGmailMessageId() {
  const hash = window.location.hash || "";
  const tail = hash.split("/").filter(Boolean).pop() || "";
  // Only treat long opaque ids as a conversation id (skip folder names like "inbox").
  return /^[A-Za-z0-9_-]{12,}$/.test(tail) ? tail : "";
}

export function cleanupGmailAdapter() {
  if (gmailObserver) {
    gmailObserver.disconnect();
    gmailObserver = null;
  }
  removeImportModal();
}

export function initGmailAdapter() {
  if (!window.location.hostname.includes('mail.google.com')) return;

  cleanupGmailAdapter();

  const debouncedCallback = debounce(() => {
    // 1. Compose toolbar AI drafting (existing behavior).
    const toolbars = document.querySelectorAll(SELECTORS.gmail.composeToolbar);
    toolbars.forEach(toolbar => {
      if (toolbar.querySelector('#brse-gmail-btn')) return;
      injectGmailButton(toolbar);
    });

    // 2. Open email view: capture into Q&A / Todo.
    const subjectEl = document.querySelector(SELECTORS.gmail.openSubject);
    if (subjectEl && subjectEl.parentElement && !subjectEl.parentElement.querySelector('#brse-gmail-capture-btn')) {
      injectGmailCaptureButton(subjectEl);
    }
  }, 150);

  gmailObserver = new MutationObserver(debouncedCallback);
  gmailObserver.observe(document.body, { childList: true, subtree: true });
}

function injectGmailCaptureButton(subjectEl) {
  const btn = document.createElement('button');
  btn.id = 'brse-gmail-capture-btn';
  btn.innerText = '🛠️ → BrSE OS';
  btn.title = 'BrSE OS: Tạo Q&A / Todo từ email này';

  Object.assign(btn.style, {
    height: '26px',
    padding: '0 10px',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '6px',
    border: `1.2px solid ${THEME.primary}`,
    background: THEME.surface,
    color: THEME.primary,
    cursor: 'pointer',
    marginLeft: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 5px rgba(255, 107, 94, 0.3)',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    outline: 'none',
    boxSizing: 'border-box',
    verticalAlign: 'middle'
  });

  btn.onmouseenter = () => {
    btn.style.background = 'rgba(255, 107, 94, 0.15)';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5), 0 0 8px rgba(255, 107, 94, 0.5)';
  };
  btn.onmouseleave = () => {
    btn.style.background = THEME.surface;
    btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4), 0 0 5px rgba(255, 107, 94, 0.3)';
  };

  // Detect an already-imported email (dedup) and reflect it on the button.
  const messageId = getGmailMessageId();
  if (messageId) {
    safeSendMessage({ type: MESSAGE_TYPES.BRSE_CHECK_JIRA_EXIST, key: `gmail:${messageId}` })
      .then((res) => {
        if (res && res.ok && res.exists) {
          btn.innerText = '✅ Đã lưu vào BrSE OS';
          btn.style.borderColor = THEME.success;
          btn.style.color = THEME.success;
          btn.title = 'Email này đã được lưu sang BrSE OS (bấm để mở lại)';
        }
      })
      .catch(() => { /* check is best-effort */ });
  }

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { subject, sender, body } = extractGmailEmail(document);
    if (!subject && !body) {
      showToast('⚠️ Không trích xuất được nội dung email!');
      return;
    }

    showImportModal({
      source: 'gmail',
      title: subject || 'Email',
      subject,
      sender,
      body,
      messageId,
      url: window.location.href
    });
  };

  subjectEl.parentElement.appendChild(btn);
}

function injectGmailButton(parent) {
  const btn = document.createElement('div');
  btn.id = 'brse-gmail-btn';
  const avatarUrl = chrome.runtime.getURL('icons/avatar.png');
  btn.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" alt="AI" />`;
  btn.title = 'BrSE OS: Soạn thảo bằng AI & Chèn thông tin dự án';
  Object.assign(btn.style, {
    width: '24px', height: '24px', background: 'transparent',
    borderRadius: '4px', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', marginLeft: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 5px rgba(255, 107, 94, 0.4)',
    border: `1.2px solid ${THEME.primary}`, userSelect: 'none', overflow: 'hidden', boxSizing: 'border-box'
  });

  btn.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();

    // Find Gmail Compose dialog context container
    const composeContainer = parent.closest(SELECTORS.gmail.composeContainer);

    // Target editable textbox element
    const textbox = composeContainer ? composeContainer.querySelector(SELECTORS.gmail.textbox) : null;

    if (textbox) {
      showQuickInjector(btn, textbox);

      // Update context in local storage silently for other sidebar tools
      const subjectField = composeContainer.querySelector(SELECTORS.gmail.subjectField);
      const toField = composeContainer.querySelector(SELECTORS.gmail.toField);
      const context = {
        type: "gmail",
        subject: subjectField ? subjectField.value : "Draft Subject",
        to: toField ? toField.value : "Recipient",
        url: window.location.href
      };

      if (chrome.storage?.local) {
        chrome.storage.local.set({ [STORAGE_KEYS.CONTEXT]: context });
      }
    } else {
      showToast("⚠️ Không tìm thấy ô soạn thảo Gmail!");
    }
  };

  parent.appendChild(btn);
}
