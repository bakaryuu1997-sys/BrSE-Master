"use strict";

import { injectThemeTokens } from '../../shared/theme.js';
import { safeSendMessage } from '../utils/dom.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { escapeHtml } from '../../shared/sanitizer.js';

let palette = null;

const COMMANDS = [
  { 
    id: 'google', 
    icon: '🌐', 
    name: 'Dịch Pro (Google / Hiragana)', 
    subtitle: 'Dịch Nhật-Anh-Việt, tra cứu cách đọc Hiragana và phiên âm IPA', 
    keywords: ['dich', 'translate', 'hieu', 'read', 'doc', 'dictionary', 'tu dien', 'ja', 'vi', 'en', 'romaji', 'hiragana', 'kanji'] 
  },
  { 
    id: 'grammar', 
    icon: '✍️', 
    name: 'Kiểm tra Ngữ pháp (Grammar Check)', 
    subtitle: 'Phát hiện lỗi sai ngữ pháp, chính tả và đề xuất sửa đổi Business', 
    keywords: ['ngu phap', 'grammar', 'sua loi', 'chinh ta', 'correct', 'check', 'viet'] 
  },
  { 
    id: 'polish', 
    icon: '✨', 
    name: 'Làm mượt Keigo (Keigo Polisher)', 
    subtitle: 'Nâng cấp email, câu chào sang kính ngữ Keigo (Sonkeigo/Kenjougo)', 
    keywords: ['keigo', 'kinh ngu', 'email', 'chao', 'ton kinh', 'khiem nhuong', 'business', 'viet thu', 'mail'] 
  },
  { 
    id: 'explain', 
    icon: '💡', 
    name: 'Giải thích AI (AI Explainer)', 
    subtitle: 'Giải thích chi tiết thuật ngữ, logic nghiệp vụ BrSE hoặc đoạn code', 
    keywords: ['giai thich', 'explain', 'code', 'logic', 'technical', 'nghiep vu', 'brse', 'thuat ngu'] 
  },
  { 
    id: 'summary', 
    icon: '📄', 
    name: 'Tóm tắt nội dung (Summarize)', 
    subtitle: 'Trích xuất ý chính, checklist công việc và contradictions', 
    keywords: ['tom tat', 'summarize', 'y chinh', 'spec', 'checklist', 'brief'] 
  }
];

export function showCommandPalette(onAction) {
  removePalette();
  palette = document.createElement('div');
  palette.id = 'brse-palette-root';
  Object.assign(palette.style, {
    position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
    width: '600px', zIndex: 'var(--brse-z-index)', pointerEvents: 'none'
  });

  const shadow = palette.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = `
    .container {
      background: rgba(29, 30, 34, 0.95); backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 107, 94, 0.6); border-radius: 16px; padding: 12px;
      box-shadow: 0 30px 100px rgba(0,0,0,0.8), 0 0 20px rgba(255, 107, 94, 0.15); 
      pointer-events: auto;
      font-family: system-ui, -apple-system, sans-serif;
    }
    input {
      width: 100%; background: transparent; border: none; color: #fff;
      font-size: 18px; outline: none; padding: 8px; box-sizing: border-box;
      border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 10px;
    }
    input::placeholder {
      color: var(--brse-text-dim);
    }
    .item {
      padding: 10px 14px; border-radius: 8px; color: var(--brse-text);
      cursor: pointer; display: flex; align-items: center; gap: 12px;
      transition: all 0.2s;
    }
    .item:hover, .item.active { background: rgba(255, 107, 94, 0.2); color: #fff; }
    .kbd { background: #232529; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: auto; color: var(--brse-primary); border: 1px solid rgba(255, 107, 94, 0.3); }
  `;

  const container = document.createElement('div');
  container.className = 'container';
  container.innerHTML = `
    <input type="text" placeholder="Gõ lệnh hoặc từ khóa (ví dụ: 'keigo', 'dịch', 'check')..." id="p-input" autofocus>
    <div id="p-list"></div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(palette);

  const input = shadow.getElementById('p-input');
  input.focus();

  let memoItems = [];
  safeSendMessage({ type: MESSAGE_TYPES.BRSE_SEARCH_MEMOS }).then(res => {
    if (res && res.ok && Array.isArray(res.data)) {
      memoItems = res.data.map(m => ({
        id: `memo:${m.id}`,
        icon: '📝',
        name: m.title || 'Untitled Memo',
        subtitle: m.body ? (m.body.trim().slice(0, 80) + (m.body.length > 80 ? '...' : '')) : 'No content',
        body: m.body || '',
        isMemo: true,
        keywords: [
          (m.title || '').toLowerCase(),
          (m.body || '').toLowerCase(),
          'note', 'memo', 'ghi chu', 'luu tru'
        ]
      }));
      renderList(input.value);
    }
  });

  const renderList = (filterText = "") => {
    const listDiv = shadow.getElementById('p-list');
    listDiv.innerHTML = '';
    
    const query = filterText.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // normalize Vietnamese accents
      
    const allItems = [...COMMANDS, ...memoItems];
    const filtered = allItems.filter(cmd => {
      if (!query) return true;
      const matchName = cmd.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query);
      const matchSubtitle = cmd.subtitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query);
      const matchKeywords = cmd.keywords.some(kw => {
        const cleanKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return cleanKw.includes(query);
      });
      return matchName || matchSubtitle || matchKeywords;
    });
    
    if (filtered.length === 0) {
      listDiv.innerHTML = `<div style="padding:16px; color:var(--brse-text-dim); text-align:center; font-size:13px;">Không tìm thấy lệnh hoặc ghi chú nào phù hợp với "${escapeHtml(filterText)}"</div>`;
      return;
    }
    
    filtered.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `item ${idx === 0 ? 'active' : ''}`;
      item.dataset.id = cmd.id;
      item.innerHTML = `
        <span style="font-size: 18px;">${cmd.icon}</span>
        <div style="display:flex; flex-direction:column; gap:2px; pointer-events:none;">
          <span style="font-size:13px; font-weight:600; color:#fff;">${escapeHtml(cmd.name)}</span>
          <span style="font-size:10px; color:var(--brse-text-dim);">${escapeHtml(cmd.subtitle)}</span>
        </div>
        ${idx === 0 ? '<span class="kbd">ENTER</span>' : ''}
      `;
      item.onclick = (e) => {
        e.stopPropagation();
        if (cmd.isMemo) {
          onAction('memo', input.value, cmd);
        } else {
          onAction(cmd.id, input.value);
        }
        removePalette();
      };
      listDiv.appendChild(item);
    });
  };

  // Initial render
  renderList();

  input.oninput = () => {
    renderList(input.value);
  };

  input.onkeydown = (e) => {
    if (e.key === 'Escape') removePalette();
    if (e.key === 'Enter') {
      const active = shadow.querySelector('.item.active');
      if (active) {
        const itemId = active.dataset.id;
        const matchedItem = [...COMMANDS, ...memoItems].find(x => x.id === itemId);
        if (matchedItem) {
          if (matchedItem.isMemo) {
            onAction('memo', input.value, matchedItem);
          } else {
            onAction(matchedItem.id, input.value);
          }
        }
      }
      removePalette();
    }
    // Handle arrow keys for selection
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = Array.from(shadow.querySelectorAll('.item'));
      if (items.length === 0) return;
      let index = items.findIndex(i => i.classList.contains('active'));
      if (index !== -1) items[index].classList.remove('active');
      
      if (e.key === 'ArrowDown') {
        index = (index + 1) % items.length;
      } else {
        index = (index - 1 + items.length) % items.length;
      }
      
      items[index].classList.add('active');
      e.preventDefault();
    }
  };
}

export function removePalette() {
  if (palette) {
    palette.remove();
    palette = null;
  }
}
