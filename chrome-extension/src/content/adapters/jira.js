/**
 * Jira Adapter for BrSE OS
 * Extracts ticket context and implements the Jira-to-Operations Bridge.
 */

import { safeSendMessage } from '../utils/dom.js';
import { showToast } from '../ui/Toast.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { STORAGE_KEYS } from '../../shared/storage.js';
import { debounce } from '../utils/debounce.js';
import { SELECTORS } from '../../shared/selectors.js';
import { showImportModal, removeImportModal } from '../ui/ImportModal.tsx';
import { THEME } from '../../shared/theme.js';

let jiraObserver = null;
let currentTicketKey = null;

export function cleanupJiraAdapter() {
  if (jiraObserver) {
    jiraObserver.disconnect();
    jiraObserver = null;
  }
  currentTicketKey = null;
  removeImportModal();
}

export function initJiraAdapter() {
  if (!window.location.hostname.includes('atlassian.net')) return;
  
  cleanupJiraAdapter();
  
  const debouncedCallback = debounce(() => {
    // Determine active ticket key
    let ticketKey = document.querySelector(SELECTORS.jira.ticketKeyBreadcrumb)?.innerText;
    if (!ticketKey) {
      const urlMatch = window.location.pathname.match(/\/browse\/([A-Z0-9]+-\d+)/);
      if (urlMatch) ticketKey = urlMatch[1];
    }
    
    if (ticketKey && ticketKey !== currentTicketKey) {
      currentTicketKey = ticketKey;
      const oldBtn = document.getElementById('brse-jira-import-btn');
      if (oldBtn) oldBtn.remove();
    }

    // 1. Inject import button next to ticket title
    const titleHeading = document.querySelector(SELECTORS.jira.titleHeading);
    if (titleHeading && ticketKey) {
      const container = titleHeading.parentElement;
      if (container && !container.querySelector('#brse-jira-import-btn')) {
        injectJiraImportButton(titleHeading, ticketKey);
      }
    }

    // 2. Original comment toolbar button injection (kept for convenience)
    const toolbars = document.querySelectorAll(SELECTORS.jira.commentToolbars);
    toolbars.forEach(toolbar => {
      if (toolbar.querySelector('#brse-jira-btn')) return;
      injectJiraCommentButton(toolbar);
    });
  }, 150);

  jiraObserver = new MutationObserver(debouncedCallback);
  jiraObserver.observe(document.body, { childList: true, subtree: true });
}

function injectJiraImportButton(titleHeading, ticketKey) {
  const btn = document.createElement('button');
  btn.id = 'brse-jira-import-btn';
  btn.innerText = '⏳ Checking...';
  
  // Tokyo Night aesthetics
  Object.assign(btn.style, {
    height: '28px',
    padding: '0 12px',
    fontSize: '11.5px',
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

  safeSendMessage({ type: MESSAGE_TYPES.BRSE_CHECK_JIRA_EXIST, key: ticketKey })
    .then(res => {
      if (res && res.ok && res.exists) {
        // Ticket already synced!
        btn.innerText = '✅ Synced to Operations';
        btn.style.borderColor = THEME.success;
        btn.style.color = THEME.success;
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4), 0 0 5px rgba(78, 201, 165, 0.3)';
        
        btn.onmouseenter = () => {
          btn.style.background = 'rgba(78, 201, 165, 0.15)';
          btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5), 0 0 8px rgba(78, 201, 165, 0.5)';
        };
        btn.onmouseleave = () => {
          btn.style.background = THEME.surface;
          btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4), 0 0 5px rgba(78, 201, 165, 0.3)';
        };

        btn.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          
          // Reconstruct the synced context to show in Sidepanel
          const contextPayload = {
            type: "jira_import",
            key: ticketKey,
            title: res.record.title || ticketKey,
            desc: res.record.field_a || "",
            comments: JSON.parse(res.record.field_b || "[]"),
            url: res.record.field_c || window.location.href,
            recordId: res.record.id
          };

          chrome.storage.local.set({ [STORAGE_KEYS.CONTEXT]: contextPayload }, () => {
            chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_OPEN_SIDEPANEL }, () => {
              chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.BRSE_CONTEXT_UPDATED,
                context: contextPayload
              });
              showToast("✨ Đã mở thông tin phân tích cũ trong Sidepanel!");
            });
          });
        };
      } else {
        // Standard Import Button
        btn.innerText = '🛠️ Import to BrSE OS';
        
        btn.onmouseenter = () => {
          btn.style.background = 'rgba(255, 107, 94, 0.15)';
          btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5), 0 0 8px rgba(255, 107, 94, 0.5)';
        };
        btn.onmouseleave = () => {
          btn.style.background = THEME.surface;
          btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4), 0 0 5px rgba(255, 107, 94, 0.3)';
        };

        btn.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          
          let ticketTitle = document.querySelector(SELECTORS.jira.titleHeading)?.innerText || 
                            document.title.replace(/ - Jira$/, '').trim();

          const descContainer = document.querySelector(SELECTORS.jira.descContainer);
          const ticketDesc = descContainer ? descContainer.innerText.trim() : "Không có mô tả chi tiết.";

          const comments = [];
          const commentElements = document.querySelectorAll(SELECTORS.jira.commentBox);
          commentElements.forEach(el => {
            const authorEl = el.querySelector(SELECTORS.jira.commentAuthor);
            const textEl = el.querySelector(SELECTORS.jira.commentText);
            if (textEl) {
              const author = authorEl ? authorEl.innerText.trim() : "User";
              const text = textEl.innerText.trim();
              if (text && !comments.some(c => c.text === text)) {
                comments.push({ author, text });
              }
            }
          });

          const ticketData = {
            source: 'jira',
            key: ticketKey,
            title: ticketTitle,
            desc: ticketDesc,
            comments: comments,
            url: window.location.href
          };

          showImportModal(ticketData);
        };
      }
    })
    .catch(err => {
      console.warn("[Jira Adapter] Check exist failed, fallback:", err);
      btn.innerText = '🛠️ Import to BrSE OS';
      
      btn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        // Fallback action
        let ticketTitle = document.querySelector(SELECTORS.jira.titleHeading)?.innerText || document.title;
        showImportModal({ source: 'jira', key: ticketKey, title: ticketTitle, desc: "", comments: [], url: window.location.href });
      };
    });

  // Insert button adjacent to title
  if (titleHeading.nextSibling) {
    titleHeading.parentNode.insertBefore(btn, titleHeading.nextSibling);
  } else {
    titleHeading.parentNode.appendChild(btn);
  }
}

function injectJiraCommentButton(parent) {
  const btn = document.createElement('div');
  btn.id = 'brse-jira-btn';
  const avatarUrl = chrome.runtime.getURL('icons/avatar.png');
  btn.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" alt="AI" />`;
  btn.title = 'BrSE OS: Hỗ trợ Ticket Jira';
  Object.assign(btn.style, {
    width: '24px', height: '24px', background: 'transparent',
    borderRadius: '4px', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', marginLeft: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 5px rgba(255, 107, 94, 0.4)',
    border: `1.2px solid ${THEME.primary}`, userSelect: 'none', overflow: 'hidden', boxSizing: 'border-box'
  });
  
  btn.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    
    const ticketTitle = document.querySelector(SELECTORS.jira.titleHeading)?.innerText || document.title;
    const ticketKey = document.querySelector(SELECTORS.jira.ticketKeyBreadcrumb)?.innerText || "Jira-Issue";
    
    const context = {
      type: "jira",
      title: ticketTitle,
      key: ticketKey,
      url: window.location.href
    };
    
    if (chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEYS.CONTEXT]: context }, () => {
        safeSendMessage({ type: MESSAGE_TYPES.BRSE_OPEN_SIDEPANEL });
        safeSendMessage({ type: MESSAGE_TYPES.BRSE_CONTEXT_UPDATED, context });
        showToast(`Đã nạp context Jira: ${context.key}`);
      });
    } else {
      safeSendMessage({ type: MESSAGE_TYPES.BRSE_OPEN_SIDEPANEL });
    }
  };
  
  parent.appendChild(btn);
}
