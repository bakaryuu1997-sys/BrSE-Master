"use strict";

import { injectThemeTokens } from '../../shared/theme.js';
import { safeSendMessage } from '../utils/dom.js';
import { t } from '../../shared/i18n.js';

let floatingToolbar = null;

export function showSupremeToolbar(x, y, onAction) {
  removeToolbar();
  floatingToolbar = document.createElement('div');
  floatingToolbar.id = 'brse-toolbar-root';
  
  // Position slightly above the selection or client cursor position for premium spacing
  const offsetTop = y - 10;
  
  Object.assign(floatingToolbar.style, { 
    position: 'fixed', 
    top: `${offsetTop}px`, 
    left: `${x}px`, 
    zIndex: '999999', 
    pointerEvents: 'none' 
  });
  
  const shadow = floatingToolbar.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = `
    .wrapper { 
      pointer-events: auto; 
    }
    
    .trigger-btn { 
      width: 32px; 
      height: 32px; 
      background: rgba(29, 30, 34, 0.95); 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 50%; 
      cursor: pointer; 
      box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(255, 107, 94, 0.4); 
      border: 1.8px solid var(--brse-primary);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
      user-select: none;
      box-sizing: border-box;
      overflow: hidden;
      padding: 3px;
    }
    
    .trigger-btn:hover { 
      transform: scale(1.15); 
      box-shadow: 0 6px 20px rgba(0,0,0,0.6), 0 0 15px rgba(255, 138, 125, 0.6); 
      border-color: var(--brse-secondary); 
    }
    
    .toolbar { 
      background: rgba(29, 30, 34, 0.96); 
      border: 1.5px solid rgba(110, 112, 121, 0.8); 
      border-radius: 10px; 
      padding: 4px 6px; 
      display: none; 
      gap: 4px; 
      align-items: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(255, 107, 94, 0.25); 
      backdrop-filter: blur(12px);
      animation: fadeIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.85) translateY(5px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    button { 
      background: transparent; 
      border: none; 
      color: var(--brse-text); 
      width: 32px; 
      height: 32px; 
      cursor: pointer; 
      border-radius: 6px; 
      font-size: 15px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
      box-sizing: border-box;
    }
    
    button:hover { 
      background: rgba(255, 107, 94, 0.16); 
      color: var(--brse-primary); 
      transform: translateY(-2px) scale(1.05); 
      box-shadow: 0 4px 10px rgba(255, 107, 94, 0.2);
    }
    
    button:active {
      transform: translateY(0) scale(0.95);
    }
    
    .sep { 
      width: 1px; 
      background: rgba(110, 112, 121, 0.6); 
      margin: 4px 2px; 
      height: 22px; 
    }
    
    .primary { 
      color: var(--brse-primary); 
      font-weight: 800; 
      text-shadow: 0 0 4px rgba(255, 107, 94, 0.3);
    }
  `;
  
  const wrapper = document.createElement('div');
  wrapper.className = 'wrapper';
  
  const trigger = document.createElement('div');
  trigger.className = 'trigger-btn';
  const avatarUrl = chrome.runtime.getURL('icons/avatar.png');
  trigger.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="AI" />`;
  
  const container = document.createElement('div');
  container.className = 'toolbar';
  
  const actions = [
    { id: 'google', icon: 'G', title: t('tbTranslatePro'), cls: 'primary' },
    { id: 'bilingual', icon: '🌐', title: t('tbTranslateBilingual'), cls: 'primary' },
    { id: 'speak', icon: '🔊', title: t('tbSpeakText'), cls: 'primary' },
    { id: 'sep' },
    { id: 'grammar', icon: '✍️', title: t('tbGrammarCheck') },
    { id: 'polish', icon: '✨', title: t('tbPolishKeigo') },
    { id: 'explain', icon: '💡', title: t('tbExplainAi') },
    { id: 'sep' },
    { id: 'copy', icon: '📋', title: t('tbQuickCopy') },
    { id: 'sync', icon: '📥', title: t('tbSaveProject') }
  ];

  actions.forEach(a => {
    if (a.id === 'sep') {
      const sep = document.createElement('div');
      sep.className = 'sep';
      container.appendChild(sep);
      return;
    }
    const btn = document.createElement('button');
    btn.innerHTML = a.icon;
    btn.title = a.title;
    if (a.cls) btn.className = a.cls;
    btn.onclick = (ev) => {
      ev.stopPropagation();
      onAction(a.id);
    };
    container.appendChild(btn);
  });
  
  const expand = () => {
    trigger.style.display = 'none';
    container.style.display = 'flex';
  };
  
  trigger.addEventListener('click', (ev) => {
    ev.stopPropagation();
    expand();
  });

  trigger.addEventListener('mouseenter', (ev) => {
    expand();
  });
  
  wrapper.appendChild(trigger);
  wrapper.appendChild(container);
  
  shadow.appendChild(style);
  shadow.appendChild(wrapper);
  document.body.appendChild(floatingToolbar);
}

export function removeToolbar() {
  if (floatingToolbar) {
    floatingToolbar.remove();
    floatingToolbar = null;
  }
}

export function isToolbarActive() {
  return !!floatingToolbar;
}

export function containsToolbar(target) {
  return floatingToolbar && floatingToolbar.contains(target);
}


