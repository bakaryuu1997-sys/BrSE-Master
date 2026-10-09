/**
 * BrSE OS Premium Quick Injector Component
 * Built with modular Vanilla JS and Shadow DOM in Tokyo Night theme.
 */

import { injectThemeTokens } from '../../shared/theme.js';
import { safeSendMessage } from '../utils/dom.js';
import { showToast } from './Toast.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { BRSE_LAYER } from './layers.js';
import { escapeHtml } from '../../shared/sanitizer.js';

let injectorContainer = null;
let currentTargetInput = null;
let dataCache = { qnas: [], minutes: [], memos: [] };
let activeTab = 'qna'; // 'qna' | 'minutes' | 'memo'
let searchQuery = '';

export function removeQuickInjector() {
  if (injectorContainer) {
    injectorContainer.remove();
    injectorContainer = null;
  }
  currentTargetInput = null;
  document.removeEventListener('mousedown', handleOutsideClick);
}

function handleOutsideClick(e) {
  if (!injectorContainer) return;
  
  // Get path or composedPath to check if click is inside shadow DOM
  const path = e.composedPath ? e.composedPath() : [];
  const clickedInside = path.some(el => el === injectorContainer || (el.id && el.id.startsWith('brse-qi')));
  
  if (!clickedInside) {
    removeQuickInjector();
  }
}

export function showQuickInjector(anchorEl, targetInputEl) {
  removeQuickInjector();
  
  currentTargetInput = targetInputEl;
  
  // Create container
  injectorContainer = document.createElement('div');
  injectorContainer.id = 'brse-qi-root';
  
  const rect = anchorEl.getBoundingClientRect();
  const popupWidth = 380;
  const popupHeight = 440;
  
  // Position intelligent sizing
  let top = rect.bottom + window.scrollY + 6;
  let left = rect.left + window.scrollX;
  
  // Check if screen edges are clashing
  if (left + popupWidth > window.innerWidth + window.scrollX) {
    left = Math.max(10, window.innerWidth + window.scrollX - popupWidth - 20);
  }
  if (rect.bottom + popupHeight > window.innerHeight) {
    // If no space below, show above the button
    top = Math.max(10, rect.top + window.scrollY - popupHeight - 6);
  }
  
  Object.assign(injectorContainer.style, {
    position: 'absolute',
    top: `${top}px`,
    left: `${left}px`,
    width: `${popupWidth}px`,
    height: `${popupHeight}px`,
    zIndex: BRSE_LAYER.injector,
    pointerEvents: 'none'
  });
  
  const shadow = injectorContainer.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  
  // Styles in Tokyo Night design system
  const style = document.createElement('style');
  style.textContent = `
    .injector-card {
      background: rgba(29, 30, 34, 0.96);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 107, 94, 0.45);
      border-radius: 12px;
      color: var(--brse-text);
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65), 0 0 20px rgba(255, 107, 94, 0.2);
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
      animation: brse-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes brse-fade-in {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    /* Header styling */
    .header {
      background: #232529;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      height: 40px;
      box-sizing: border-box;
      flex-shrink: 0;
    }
    .header-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--brse-primary);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-logo {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }
    .close-btn {
      color: var(--brse-text-dim);
      cursor: pointer;
      font-size: 14px;
      background: transparent;
      border: none;
      transition: color 0.15s, transform 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }
    .close-btn:hover {
      color: #ff5d6c;
      transform: scale(1.1);
    }
    
    /* Search box styling */
    .search-container {
      padding: 10px 12px 6px 12px;
      flex-shrink: 0;
    }
    .search-input {
      width: 100%;
      background: #232529;
      border: 1.2px solid rgba(255, 107, 94, 0.25);
      border-radius: 8px;
      color: var(--brse-text);
      padding: 7px 10px;
      font-size: 13px;
      box-sizing: border-box;
      outline: none;
      transition: all 0.2s ease;
    }
    .search-input:focus {
      border-color: var(--brse-primary);
      background: #161719;
      box-shadow: 0 0 8px rgba(255, 107, 94, 0.35);
    }
    
    /* Navigation tabs */
    .tabs {
      display: flex;
      background: #232529;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 0 8px;
      height: 34px;
      flex-shrink: 0;
    }
    .tab-btn {
      flex: 1;
      color: #6e7079;
      background: transparent;
      border: none;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.2s ease;
      position: relative;
      outline: none;
    }
    .tab-btn:hover {
      color: var(--brse-text);
    }
    .tab-btn.active {
      color: var(--brse-primary);
    }
    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 15%;
      width: 70%;
      height: 2.2px;
      background: var(--brse-primary);
      border-radius: 2px 2px 0 0;
    }
    
    /* Content display list */
    .list-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      box-sizing: border-box;
      min-height: 0;
    }
    
    /* Scrollbar */
    .list-container::-webkit-scrollbar {
      width: 5px;
    }
    .list-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .list-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    .list-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 107, 94, 0.3);
    }
    
    /* List items */
    .list-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      padding: 9px 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .list-item:hover {
      background: rgba(255, 107, 94, 0.06);
      border-color: rgba(255, 107, 94, 0.35);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .item-title {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      word-break: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .list-item:hover .item-title {
      color: var(--brse-primary);
    }
    .item-preview {
      font-size: 11.5px;
      color: var(--brse-success);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      line-height: 1.4;
    }
    .item-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 2px;
      font-size: 10px;
      color: var(--brse-text-dim);
    }
    .item-category {
      background: rgba(255, 138, 125, 0.12);
      color: var(--brse-secondary);
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: bold;
    }
    
    /* Loading and Empty State */
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--brse-text-dim);
      font-size: 13px;
      gap: 12px;
      padding: 20px;
      text-align: center;
      box-sizing: border-box;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(255, 107, 94, 0.2);
      border-top-color: var(--brse-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  
  // Card elements
  const card = document.createElement('div');
  card.className = 'injector-card';
  
  const avatarUrl = chrome.runtime.getURL('icons/avatar.png');
  card.innerHTML = `
    <div class="header">
      <div class="header-title">
        <img src="${avatarUrl}" class="header-logo" />
        <span>BrSE OS Quick Injector</span>
      </div>
      <button class="close-btn" id="qi-close">✕</button>
    </div>
    <div class="search-container">
      <input type="text" class="search-input" id="qi-search" placeholder="🔍 Tìm kiếm nhanh..." />
    </div>
    <div class="tabs">
      <button class="tab-btn active" id="qi-tab-qna">💬 Q&A</button>
      <button class="tab-btn" id="qi-tab-minutes">📄 Biên bản</button>
      <button class="tab-btn" id="qi-tab-memo">📝 Ghi chú</button>
    </div>
    <div class="list-container" id="qi-list">
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Đang nạp dữ liệu từ Project Hub...</span>
      </div>
    </div>
  `;
  
  shadow.appendChild(style);
  shadow.appendChild(card);
  
  document.body.appendChild(injectorContainer);
  
  // Attach event listeners
  shadow.getElementById('qi-close').onclick = removeQuickInjector;
  
  const searchInput = shadow.getElementById('qi-search');
  searchInput.oninput = (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderList(shadow);
  };
  
  // Set up tabs
  const tabQna = shadow.getElementById('qi-tab-qna');
  const tabMinutes = shadow.getElementById('qi-tab-minutes');
  const tabMemo = shadow.getElementById('qi-tab-memo');
  
  tabQna.onclick = () => switchTab('qna', shadow);
  tabMinutes.onclick = () => switchTab('minutes', shadow);
  tabMemo.onclick = () => switchTab('memo', shadow);
  
  // Load initial data
  loadData(shadow);
  
  // Listen for outside clicks
  setTimeout(() => {
    document.addEventListener('mousedown', handleOutsideClick);
  }, 10);
}
 
function switchTab(tab, shadow) {
  activeTab = tab;
  
  const shadowRoot = shadow;
  const tabs = shadowRoot.querySelectorAll('.tab-btn');
  tabs.forEach(t => t.classList.remove('active'));
  
  shadowRoot.getElementById(`qi-tab-${tab}`).classList.add('active');
  renderList(shadow);
}
 
function loadData(shadow) {
  safeSendMessage({ type: MESSAGE_TYPES.BRSE_GET_QUICK_INJECT_ITEMS }).then(res => {
    if (res && res.ok) {
      dataCache = {
        qnas: Array.isArray(res.qnas) ? res.qnas : [],
        minutes: Array.isArray(res.minutes) ? res.minutes : [],
        memos: Array.isArray(res.memos) ? res.memos : []
      };
      renderList(shadow);
    } else {
      const listEl = shadow.getElementById('qi-list');
      listEl.innerHTML = `
        <div class="empty-state">
          <span style="font-size: 24px;">🌐</span>
          <span>Không thể kết nối đến Local Backend.<br/>Vui lòng đảm bảo backend đang chạy tại cổng 3010!</span>
        </div>
      `;
    }
  }).catch(err => {
    const listEl = shadow.getElementById('qi-list');
    listEl.innerHTML = `
      <div class="empty-state">
        <span style="font-size: 24px;">❌</span>
        <span>Lỗi tải dữ liệu: ${escapeHtml(err.message)}</span>
      </div>
    `;
  });
}
 
function renderList(shadow) {
  const listEl = shadow.getElementById('qi-list');
  if (!listEl) return;
  
  let items = [];
  if (activeTab === 'qna') items = dataCache.qnas;
  else if (activeTab === 'minutes') items = dataCache.minutes;
  else if (activeTab === 'memo') items = dataCache.memos;
  
  // Filter items by search query
  if (searchQuery) {
    items = items.filter(item => {
      const title = (item.title || "").toLowerCase();
      const content = (item.content || item.body_markdown || item.body || "").toLowerCase();
      return title.includes(searchQuery) || content.includes(searchQuery);
    });
  }
  
  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <span style="font-size: 20px;">📭</span>
        <span>Không tìm thấy kết quả nào trùng khớp!</span>
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = '';
  
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = buildQuickInjectorItemHtml(item, activeTab);
    
    div.onclick = () => {
      insertFormattedText(item);
    };
    
    listEl.appendChild(div);
  });
}

export function buildQuickInjectorItemHtml(item, tab = 'qna') {
  const titleText = item.title || "Untitled";
  const previewText = item.content || item.body_markdown || item.body || "";
  let metaHtml = '';

  if (tab === 'qna') {
    metaHtml = `
      <div class="item-meta">
        <span class="item-category">${escapeHtml(item.category || "Q&A")}</span>
        <span>PID: ${escapeHtml(item.project_id || "default")}</span>
      </div>
    `;
  } else if (tab === 'minutes') {
    const formattedDate = item.meeting_date ? item.meeting_date.split('T')[0] : 'N/A';
    metaHtml = `
      <div class="item-meta">
        <span>📅 ${escapeHtml(formattedDate)}</span>
        <span>Vị trí: ${escapeHtml(item.location || "N/A")}</span>
      </div>
    `;
  } else if (tab === 'memo') {
    metaHtml = `
      <div class="item-meta">
        <span>🏷️ ${escapeHtml(item.tags || "no-tags")}</span>
        <span>Pinned: ${item.pinned ? "📌" : "❌"}</span>
      </div>
    `;
  }

  return `
    <span class="item-title">${escapeHtml(titleText)}</span>
    <span class="item-preview">${escapeHtml(previewText.replace(/[\#\*\_`]/g, ''))}</span>
    ${metaHtml}
  `;
}

function insertFormattedText(item) {
  if (!currentTargetInput) {
    showToast("⚠️ Vui lòng click chọn ô soạn thảo trước!");
    removeQuickInjector();
    return;
  }
  
  let formattedText = "";
  if (activeTab === 'qna') {
    formattedText = `[Hỏi] ${item.title}\n[Đáp] ${item.content}`;
  } else if (activeTab === 'minutes') {
    const dateStr = item.meeting_date ? item.meeting_date.split('T')[0] : 'N/A';
    formattedText = `[Biên bản họp] ${item.title}\n- Ngày họp: ${dateStr}\n- Nội dung chính:\n${item.body_markdown || ""}`;
  } else if (activeTab === 'memo') {
    formattedText = `[Ghi chú] ${item.title}\n${item.body || ""}`;
  }
  
  // Dispatch custom event to trigger injection through content.js insertTextIntoElement
  const event = new CustomEvent('brse-insert-text', {
    detail: { text: formattedText }
  });
  
  // Set last active input in content.js directly by updating target
  window.brseLastActiveInput = currentTargetInput;
  document.dispatchEvent(event);
  
  removeQuickInjector();
}
