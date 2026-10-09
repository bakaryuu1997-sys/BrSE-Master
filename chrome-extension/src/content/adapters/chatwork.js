/**
 * Chatwork Adapter for BrSE OS
 * Injects a trigger button into Chatwork toolbars and launches Quick Injector.
 */

import { safeSendMessage } from '../utils/dom.js';
import { showToast } from '../ui/Toast.js';
import { showQuickInjector } from '../ui/QuickInjector.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { STORAGE_KEYS } from '../../shared/storage.js';
import { debounce } from '../utils/debounce.js';
import { SELECTORS } from '../../shared/selectors.js';
import { THEME } from '../../shared/theme.js';

let chatworkObserver = null;

export function cleanupChatworkAdapter() {
  if (chatworkObserver) {
    chatworkObserver.disconnect();
    chatworkObserver = null;
  }
}

export function initChatworkAdapter() {
  if (!window.location.hostname.includes('chatwork.com')) return;
  
  cleanupChatworkAdapter();
  
  const debouncedCallback = debounce(() => {
    // Selectors for Chatwork message utility toolbar
    const toolbars = document.querySelectorAll(SELECTORS.chatwork.toolbars);
    toolbars.forEach(toolbar => {
      if (toolbar.querySelector('#brse-chatwork-btn')) return;
      injectChatworkButton(toolbar);
    });
  }, 150);
  
  chatworkObserver = new MutationObserver(debouncedCallback);
  chatworkObserver.observe(document.body, { childList: true, subtree: true });
}

function injectChatworkButton(parent) {
  const btn = document.createElement('li');
  btn.id = 'brse-chatwork-btn';
  btn.title = 'BrSE OS: Soạn thảo bằng AI & Chèn thông tin dự án';
  
  const avatarUrl = chrome.runtime.getURL('icons/avatar.png');
  
  // Style similarly to Chatwork standard toolbar icons
  Object.assign(btn.style, {
    width: '22px', 
    height: '22px', 
    background: 'transparent',
    borderRadius: '4px', 
    display: 'inline-flex', 
    alignItems: 'center',
    justifyContent: 'center', 
    cursor: 'pointer', 
    marginLeft: '6px',
    marginRight: '6px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2), 0 0 3px rgba(255, 107, 94, 0.3)',
    border: `1px solid ${THEME.primary}`,
    userSelect: 'none', 
    overflow: 'hidden', 
    boxSizing: 'border-box',
    listStyleType: 'none',
    verticalAlign: 'middle'
  });
  
  btn.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 3px;" alt="AI" />`;
  
  btn.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    
    // In Chatwork, the message box has the ID "_chatText"
    const textbox = document.querySelector(SELECTORS.chatwork.textbox);
    
    if (textbox) {
      showQuickInjector(btn, textbox);
      
      // Extract basic context information from Chatwork
      const roomTitle = document.querySelector(SELECTORS.chatwork.roomTitle)?.textContent?.trim() || "Chatwork Room";
      const context = {
        type: "chatwork",
        title: roomTitle,
        url: window.location.href
      };
      
      if (chrome.storage?.local) {
        chrome.storage.local.set({ [STORAGE_KEYS.CONTEXT]: context });
      }
    } else {
      showToast("⚠️ Không tìm thấy ô soạn thảo Chatwork (#_chatText)!");
    }
  };
  
  // Append as first or last child depending on parent node structure
  if (parent.tagName === 'UL') {
    parent.appendChild(btn);
  } else {
    // If it's a div, let's wrap it in an list item structure if there's a UL inside
    const ul = parent.querySelector('ul');
    if (ul) {
      ul.appendChild(btn);
    } else {
      parent.appendChild(btn);
    }
  }
}
