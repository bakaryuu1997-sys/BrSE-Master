"use strict";

import { MESSAGE_TYPES } from "../../shared/messageTypes.js";
import { getModelLabel, readActiveAiModel } from "../../shared/modelConfig.js";
import { escapeAttribute, escapeHtml } from "../../shared/sanitizer.js";
import { safeSendMessage } from "../utils/dom.js";
import { showToast } from "./Toast.js";
import { QUICK_NOTE_STYLE } from "./QuickNoteStyles.js";
import { injectThemeTokens } from "../../shared/theme.js";
import { openScreenshotAnnotator } from "./ScreenshotAnnotator.js";
import {
  appendTextToNote,
  createEmptyNote,
  loadQuickNoteState,
  normalizeState,
  saveQuickNoteState,
} from "./QuickNoteStore.js";

let quickNoteRoot = null;
let currentState = null;
let noteSearchQuery = "";         // filter for the note list
let lastSavedSnapshot = "";       // serialized state of our own last write (to skip self-echo)
let pendingExternalState = null;  // external update deferred while the user is typing here
let saveTimer = null;
let activeAiBubble = null;
let isMaximized = false;
let previousRect = null;
let currentTheme = "light";

const RESIZE_HANDLES = [
  ["resize-left", ["left"]],
  ["resize-right", ["right"]],
  ["resize-top", ["top"]],
  ["resize-bottom", ["bottom"]],
  ["resize-top-left", ["top", "left"]],
  ["resize-top-right", ["top", "right"]],
  ["resize-bottom-left", ["bottom", "left"]],
  ["resize-bottom-right", ["bottom", "right"]],
];

export function showQuickNotePanel(initialText = "") {
  if (quickNoteRoot) {
    quickNoteRoot.style.display = "block";
    if (initialText) appendSelectionToActiveNote(initialText);
    focusActiveEditor();
    return;
  }

  quickNoteRoot = document.createElement("div");
  quickNoteRoot.id = "brse-quick-note-root";
  Object.assign(quickNoteRoot.style, {
    position: "fixed",
    top: "76px",
    right: "24px",
    width: "760px",
    maxWidth: "calc(100vw - 48px)",
    height: "600px",
    maxHeight: "calc(100vh - 104px)",
    zIndex: "var(--brse-z-index)",
    pointerEvents: "none",
  });

  const shadow = quickNoteRoot.attachShadow({ mode: "open" });
  injectThemeTokens(shadow);
  const style = document.createElement("style");
  style.textContent = QUICK_NOTE_STYLE;
  shadow.appendChild(style);
  shadow.appendChild(createPanelMarkup());

  RESIZE_HANDLES.forEach(([className]) => {
    const handle = document.createElement("div");
    handle.className = `resize-handle ${className}`;
    shadow.appendChild(handle);
  });

  document.body.appendChild(quickNoteRoot);

  loadQuickNoteState().then((state) => {
    currentState = state;
    if (initialText) appendSelectionToActiveNote(initialText, { silent: true });
    renderNotes(shadow);
    bindEvents(shadow);
    chrome.storage.local.get("brse.quickMemo.theme", (res) => {
      currentTheme = res["brse.quickMemo.theme"] || "light";
      applyTheme(shadow);
    });
    focusActiveEditor();
  });
}

export function updateQuickNoteAiStream(message) {
  if (!quickNoteRoot || !activeAiBubble) return;
  if (message.status === "started" && message.model) {
    activeAiBubble.textContent = `Đang trả lời bằng ${getModelLabel(message.model)}...`;
    return;
  }
  if (message.text) {
    if (activeAiBubble.dataset.pending === "true") {
      activeAiBubble.textContent = "";
      delete activeAiBubble.dataset.pending;
    }
    activeAiBubble.textContent += message.text;
  }
  if (message.done && message.elapsedMs) {
    activeAiBubble.dataset.done = "true";
    const meta = document.createElement("div");
    meta.style.cssText = "margin-top:6px;color:#94a3b8;font-size:11px;font-weight:700;";
    meta.textContent = `Done · ${(message.elapsedMs / 1000).toFixed(1)}s`;
    activeAiBubble.appendChild(meta);
    activeAiBubble = null;
  }
}

export function containsQuickNote(target) {
  return quickNoteRoot && quickNoteRoot.contains(target);
}

function createPanelMarkup() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.innerHTML = `
    <section class="assistant">
      <button class="rail-expand" id="brse-qn-expand-assistant" type="button" title="Mở trợ lý AI">🤖<span>Assistant</span></button>
      <header class="header" id="brse-qn-drag-assistant">
        <button class="qn-collapse" id="brse-qn-collapse-assistant" type="button" title="Thu gọn trợ lý AI" aria-label="Thu gọn trợ lý AI">◀</button>
        <span>BrSE OS Assistant</span>
        <button id="brse-qn-ask-note" type="button">Ask note</button>
      </header>
      <div class="chat-log" id="brse-qn-chat-log">
        <div class="bubble">Mình có thể giúp tóm tắt, chuyển note thành task, hoặc viết email Nhật dựa trên memo bên phải.</div>
      </div>
      <form class="chat-form" id="brse-qn-chat-form">
        <input id="brse-qn-chat-input" placeholder="Hỏi AI về note này..." />
        <button type="submit">Send</button>
      </form>
    </section>
    <section class="mid-list">
      <button class="rail-expand" id="brse-qn-expand-mid" type="button" title="Mở danh sách note">🗂️<span>Notes</span></button>
      <header class="mid-header" id="brse-qn-drag-mid">
        <button class="qn-collapse" id="brse-qn-collapse-mid" type="button" title="Thu gọn danh sách note" aria-label="Thu gọn danh sách note">◀</button>
        <span>Danh sách note</span>
        <button id="brse-qn-mid-add" type="button" style="padding: 2px 6px; font-size: 11px; background: rgba(255, 107, 94, 0.2); border-color: rgba(255, 107, 94, 0.4); color: #ff6b5e;">+ Thêm</button>
      </header>
      <input id="brse-qn-search" type="search" placeholder="🔍 Tìm note..." style="margin:6px 8px;padding:6px 8px;border-radius:8px;border:1px solid var(--brse-border);background:var(--brse-surface);color:var(--brse-text);font-size:12px;outline:none;" />
      <div class="mid-container" id="brse-qn-mid-container"></div>
    </section>
    <section class="notes">
      <header class="header note-header" id="brse-qn-drag-notes">
        <span>Quick Memo</span>
        <div class="actions">
          <button id="brse-qn-toggle-assistant" class="qn-toggle" type="button" title="Ẩn/hiện trợ lý AI">🤖</button>
          <button id="brse-qn-toggle-mid" class="qn-toggle" type="button" title="Ẩn/hiện danh sách note">🗂️</button>
          <button id="brse-qn-detach" type="button" title="Tách ra cửa sổ riêng (nổi ngoài trang)">⧉</button>
          <button id="brse-qn-attach-img" type="button" title="Đính ảnh từ file">📎</button>
          <button id="brse-qn-theme" type="button" title="Toggle Dark/Light Mode">🌙</button>
          <button id="brse-qn-maximize" type="button" title="Maximize">⛶</button>
          <button id="brse-qn-delete" type="button">Delete</button>
          <button id="brse-qn-close" type="button">Close</button>
        </div>
      </header>
      <div class="meta" title="${escapeAttribute(document.title)}">${escapeHtml(document.title || window.location.hostname)}</div>
      <input class="note-title" id="brse-qn-title" maxlength="80" placeholder="Note title" />
      <textarea id="brse-qn-text" maxlength="5000" placeholder="Take Note (max: 5000 per note). Ctrl+V / kéo-thả ảnh hoặc bấm 📎"></textarea>
      <input type="file" id="brse-qn-file" accept="image/*" multiple style="display:none" />
      <div class="image-container" id="brse-qn-images"></div>
      <footer class="footer">
        <span id="brse-qn-count">0/5000</span>
        <span class="saved" id="brse-qn-state">Saved locally</span>
      </footer>
    </section>
  `;
  return panel;
}

const COLLAPSE_KEYS = { assistant: "brseQnCollapseAssistant", mid: "brseQnCollapseMid" };
const COLLAPSE_CLASS = { assistant: "assistant-collapsed", mid: "mid-collapsed" };
// Toggle button in the Quick Memo header (right side).
const COLLAPSE_BTN = { assistant: "brse-qn-toggle-assistant", mid: "brse-qn-toggle-mid" };
// Collapse (◀) button inside each left panel header.
const COLLAPSE_HEADER_BTN = { assistant: "brse-qn-collapse-assistant", mid: "brse-qn-collapse-mid" };
// Expand button on the slim rail shown when a panel is collapsed.
const EXPAND_RAIL_BTN = { assistant: "brse-qn-expand-assistant", mid: "brse-qn-expand-mid" };

function setupPanelCollapse(shadow) {
  const panel = shadow.querySelector(".panel");
  if (!panel) return;

  const applyState = (section, collapsed) => {
    panel.classList.toggle(COLLAPSE_CLASS[section], collapsed);
    const btn = shadow.getElementById(COLLAPSE_BTN[section]);
    if (btn) {
      btn.classList.toggle("qn-toggle-off", collapsed);
      btn.setAttribute("aria-pressed", String(!collapsed));
    }
  };

  const setCollapsed = (section, collapsed) => {
    applyState(section, collapsed);
    try {
      chrome.storage?.local?.set({ [COLLAPSE_KEYS[section]]: collapsed });
    } catch {
      // storage is best-effort; collapse still works for this session
    }
  };

  const toggle = (section) => setCollapsed(section, !panel.classList.contains(COLLAPSE_CLASS[section]));

  for (const section of ["assistant", "mid"]) {
    const toggleBtn = shadow.getElementById(COLLAPSE_BTN[section]);
    if (toggleBtn) toggleBtn.onclick = () => toggle(section);

    const collapseBtn = shadow.getElementById(COLLAPSE_HEADER_BTN[section]);
    if (collapseBtn) collapseBtn.onclick = (e) => { e.stopPropagation(); setCollapsed(section, true); };

    const expandBtn = shadow.getElementById(EXPAND_RAIL_BTN[section]);
    if (expandBtn) expandBtn.onclick = (e) => { e.stopPropagation(); setCollapsed(section, false); };
  }

  try {
    chrome.storage?.local?.get([COLLAPSE_KEYS.assistant, COLLAPSE_KEYS.mid], (res) => {
      applyState("assistant", Boolean(res?.[COLLAPSE_KEYS.assistant]));
      applyState("mid", Boolean(res?.[COLLAPSE_KEYS.mid]));
    });
  } catch {
    // no persisted state available; default to expanded
  }
}

function bindEvents(shadow) {
  shadow.getElementById("brse-qn-close").onclick = () => {
    clearTimeout(saveTimer);
    persistState(shadow, "Saved locally").then(() => {
      quickNoteRoot.style.display = "none";
    });
  };
  shadow.getElementById("brse-qn-theme").onclick = () => {
    currentTheme = currentTheme === "light" ? "dark" : "light";
    chrome.storage.local.set({ "brse.quickMemo.theme": currentTheme });
    applyTheme(shadow);
  };
  shadow.getElementById("brse-qn-maximize").onclick = (e) => {
    const btn = e.currentTarget || e.target;
    if (!isMaximized) {
      previousRect = {
        top: quickNoteRoot.style.top,
        left: quickNoteRoot.style.left,
        width: quickNoteRoot.style.width,
        height: quickNoteRoot.style.height,
        right: quickNoteRoot.style.right,
      };
      Object.assign(quickNoteRoot.style, {
        top: "0px",
        left: "0px",
        width: "100vw",
        height: "100vh",
        maxWidth: "100vw",
        maxHeight: "100vh",
        right: "auto"
      });
      btn.textContent = "🗗";
      btn.title = "Restore";
      isMaximized = true;
    } else {
      Object.assign(quickNoteRoot.style, {
        top: previousRect.top || "76px",
        left: previousRect.left || "auto",
        width: previousRect.width || "760px",
        height: previousRect.height || "600px",
        maxWidth: "calc(100vw - 48px)",
        maxHeight: "calc(100vh - 104px)",
        right: previousRect.right || "24px"
      });
      btn.textContent = "⛶";
      btn.title = "Maximize";
      isMaximized = false;
    }
  };
  shadow.getElementById("brse-qn-mid-add").onclick = () => {
    const note = createEmptyNote(`Note ${currentState.notes.length + 1}`);
    currentState = { activeId: note.id, notes: [...currentState.notes, note] };
    renderNotes(shadow);
    persistState(shadow, "Saved locally");
    focusActiveEditor();
  };
  shadow.getElementById("brse-qn-search")?.addEventListener("input", (e) => {
    noteSearchQuery = e.target.value || "";
    renderNotes(shadow);
  });
  shadow.getElementById("brse-qn-delete").onclick = () => {
    if (currentState.notes.length <= 1) {
      updateActiveNote({ body: "", title: "Note 1" });
    } else {
      const notes = currentState.notes.filter((note) => note.id !== currentState.activeId);
      currentState = { activeId: notes[0].id, notes };
    }
    renderNotes(shadow);
    persistState(shadow, "Deleted");
  };
  shadow.getElementById("brse-qn-title").addEventListener("input", (event) => {
    updateActiveNote({ title: event.target.value });
    const activeItem = shadow.querySelector(`.mid-item[data-id="${currentState.activeId}"]`);
    if (activeItem) {
      activeItem.textContent = event.target.value || "Untitled";
    }
    scheduleSave(shadow);
  });
  const textarea = shadow.getElementById("brse-qn-text");
  textarea.addEventListener("input", (event) => {
    updateActiveNote({ body: event.target.value });
    updateCount(shadow);
    scheduleSave(shadow);
  });

  // Stop propagation of keydown events to prevent host page shortcuts (like Youtube Space) from hijacking keys
  shadow.addEventListener("keydown", (e) => {
    e.stopPropagation();
  });
  shadow.addEventListener("keyup", (e) => {
    e.stopPropagation();
  });
  shadow.addEventListener("keypress", (e) => {
    e.stopPropagation();
  });

  // Shared image-attach path used by paste (Ctrl+V), the 📎 file picker, and drag-drop.
  async function attachImageFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f && f.type && f.type.indexOf("image") === 0);
    if (files.length === 0) return;
    shadow.getElementById("brse-qn-state").textContent = "Đang xử lý ảnh...";
    try {
      const resizedImages = await Promise.all(files.map(resizeClipboardImage));
      const activeNote = getActiveNote();
      activeNote.images = [...(activeNote.images || []), ...resizedImages];
      activeNote.updatedAt = Date.now();
      renderNotes(shadow);
      scheduleSave(shadow);
      showToast("📸 Đã đính ảnh vào memo!");
    } catch (err) {
      console.error("Attach image failed:", err);
      showToast("❌ Không thể đính ảnh.");
      shadow.getElementById("brse-qn-state").textContent = "Saved locally";
    }
  }

  // Ctrl+V paste image
  textarea.addEventListener("paste", (e) => {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.type.indexOf("image") === 0) files.push(item.getAsFile());
    }
    if (files.length === 0) return;
    e.preventDefault();
    attachImageFiles(files);
  });

  // ⧉ Detach into a standalone floating window (survives closing the page).
  shadow.getElementById("brse-qn-detach")?.addEventListener("click", () => {
    safeSendMessage({ type: MESSAGE_TYPES.BRSE_OPEN_QUICKNOTE_WINDOW });
  });

  // 📎 File picker
  const fileInput = shadow.getElementById("brse-qn-file");
  shadow.getElementById("brse-qn-attach-img")?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => {
    attachImageFiles(fileInput.files);
    fileInput.value = "";
  });

  // Drag & drop image onto the note editor
  ["dragenter", "dragover"].forEach((evt) =>
    textarea.addEventListener(evt, (e) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    })
  );
  textarea.addEventListener("drop", (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    attachImageFiles(e.dataTransfer.files);
  });

  // Apply any external update that arrived while typing, once focus leaves the
  // editor (live cross-window sync without clobbering in-progress text).
  shadow.addEventListener("focusout", () => {
    setTimeout(() => {
      if (pendingExternalState && !isEditingNote(shadow)) {
        const next = pendingExternalState;
        pendingExternalState = null;
        applyExternalQuickNoteState(shadow, next);
      }
    }, 0);
  });

  setupPanelCollapse(shadow);

  shadow.getElementById("brse-qn-ask-note").onclick = () => askAssistant(shadow, "Hãy tóm tắt memo này và đề xuất bước tiếp theo.");
  shadow.getElementById("brse-qn-chat-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = shadow.getElementById("brse-qn-chat-input");
    const query = input.value.trim();
    if (!query) return;
    input.value = "";
    askAssistant(shadow, query);
  });

  // Draggable Setup
  const dragHandles = [
    shadow.getElementById("brse-qn-drag-assistant"),
    shadow.getElementById("brse-qn-drag-mid"),
    shadow.getElementById("brse-qn-drag-notes")
  ];
  makeQuickNoteDraggable(quickNoteRoot, dragHandles);

  // Resizable Setup
  RESIZE_HANDLES.forEach(([className, directions]) => {
    const handle = shadow.querySelector(`.${className}`);
    if (handle) {
      handle.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = quickNoteRoot.getBoundingClientRect();
        quickNoteRoot.style.top = `${rect.top}px`;
        quickNoteRoot.style.left = `${rect.left}px`;
        quickNoteRoot.style.right = "auto";
        quickNoteRoot.style.bottom = "auto";

        const startWidth = rect.width;
        const startHeight = rect.height;
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = rect.left;
        const startTop = rect.top;

        const doResize = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          let newWidth = startWidth;
          let newHeight = startHeight;
          let newLeft = startLeft;
          let newTop = startTop;

          if (directions.includes("left")) {
            newWidth = Math.max(480, startWidth - deltaX);
            newLeft = startLeft + (startWidth - newWidth);
          } else if (directions.includes("right")) {
            newWidth = Math.max(480, startWidth + deltaX);
          }

          if (directions.includes("top")) {
            newHeight = Math.max(350, startHeight - deltaY);
            newTop = startTop + (startHeight - newHeight);
          } else if (directions.includes("bottom")) {
            newHeight = Math.max(350, startHeight + deltaY);
          }

          quickNoteRoot.style.width = `${newWidth}px`;
          quickNoteRoot.style.height = `${newHeight}px`;

          if (directions.includes("left")) quickNoteRoot.style.left = `${newLeft}px`;
          if (directions.includes("top")) quickNoteRoot.style.top = `${newTop}px`;

          if (isMaximized) {
            isMaximized = false;
            const maxBtn = shadow.getElementById("brse-qn-maximize");
            if (maxBtn) {
              maxBtn.textContent = "⛶";
              maxBtn.title = "Maximize";
            }
          }
        };

        const stopResize = () => {
          document.removeEventListener("mousemove", doResize);
          document.removeEventListener("mouseup", stopResize);
        };

        document.addEventListener("mousemove", doResize);
        document.addEventListener("mouseup", stopResize);
      };
    }
  });
}

function renderNotes(shadow) {
  const activeNote = getActiveNote();
  const midContainer = shadow.getElementById("brse-qn-mid-container");
  midContainer.innerHTML = "";
  const query = noteSearchQuery.trim().toLowerCase();
  const visibleNotes = query
    ? currentState.notes.filter((note) =>
        (note.title || "").toLowerCase().includes(query) ||
        (note.body || "").toLowerCase().includes(query))
    : currentState.notes;
  if (visibleNotes.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "padding:12px 10px;font-size:11px;color:var(--brse-text-dim);text-align:center;";
    empty.textContent = "Không tìm thấy note nào.";
    midContainer.appendChild(empty);
  }
  visibleNotes.forEach((note) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `mid-item${note.id === currentState.activeId ? " active" : ""}`;
    item.dataset.id = note.id;
    item.textContent = note.title || "Untitled";
    item.onclick = () => {
      currentState.activeId = note.id;
      renderNotes(shadow);
      persistState(shadow, "Saved locally");
    };
    midContainer.appendChild(item);
  });
  shadow.getElementById("brse-qn-title").value = activeNote.title;
  shadow.getElementById("brse-qn-text").value = activeNote.body;

  // Render images
  const imagesContainer = shadow.getElementById("brse-qn-images");
  if (imagesContainer) {
    const images = Array.isArray(activeNote.images) ? activeNote.images : [];
    if (images.length > 0) {
      imagesContainer.style.display = "flex";
      imagesContainer.innerHTML = images.map((img) => `
        <div class="image-preview" data-id="${img.id}">
          <img src="${img.dataUrl}" alt="${escapeHtml(img.name)}" />
          <button class="delete-img" type="button" title="Gỡ ảnh">✕</button>
        </div>
      `).join("");
      
      imagesContainer.querySelectorAll(".delete-img").forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const imgId = btn.closest(".image-preview").dataset.id;
          removeNoteImage(shadow, imgId);
        };
      });

      // Click a thumbnail to open the full editor: view large + annotate
      // (draw, circle/box, arrow, highlight, text) and save back to the note.
      imagesContainer.querySelectorAll(".image-preview img").forEach((imgEl) => {
        imgEl.style.cursor = "zoom-in";
        imgEl.title = "Mở để xem & chú thích (vẽ, khoanh, mũi tên, thêm chữ)";
        imgEl.addEventListener("click", () => openScreenshotAnnotator(imgEl.src));
      });
    } else {
      imagesContainer.style.display = "none";
      imagesContainer.innerHTML = "";
    }
  }

  updateCount(shadow);
}

function askAssistant(shadow, query) {
  const note = getActiveNote();
  const log = shadow.getElementById("brse-qn-chat-log");
  appendBubble(log, query, "user");
  activeAiBubble = appendBubble(log, "Đang kết nối model...", "ai");
  activeAiBubble.dataset.pending = "true";

  readActiveAiModel().then((model) => {
    activeAiBubble.textContent = `Đang trả lời bằng ${getModelLabel(model)}...`;
  });

  safeSendMessage({
    type: MESSAGE_TYPES.BRSE_AI_REQUEST,
    action: "inline",
    prompt: `${query}\n\nMemo title: ${note.title}\nMemo body:\n${note.body}`,
    text: document.body?.innerText?.slice(0, 1200) || "",
    quick: true,
  });
}

function appendBubble(log, text, role) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
  return bubble;
}

function appendSelectionToActiveNote(text, options = {}) {
  const note = appendTextToNote(getActiveNote(), text);
  currentState.notes = currentState.notes.map((item) => item.id === note.id ? note : item);
  const shadow = quickNoteRoot?.shadowRoot;
  if (shadow) {
    renderNotes(shadow);
    persistState(shadow, options.silent ? "Saved locally" : "Appended selection");
  }
}

function updateActiveNote(patch) {
  currentState.notes = currentState.notes.map((note) => (
    note.id === currentState.activeId ? { ...note, ...patch, updatedAt: Date.now() } : note
  ));
}

function scheduleSave(shadow) {
  shadow.getElementById("brse-qn-state").textContent = "Saving...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persistState(shadow, "Saved locally"), 250);
}

function persistState(shadow, label) {
  return saveQuickNoteState(currentState).then((saved) => {
    currentState = saved;
    lastSavedSnapshot = JSON.stringify(saved);
    shadow.getElementById("brse-qn-state").textContent = label;
  }).catch((err) => {
    console.error("[BrSE QuickNote] Save failed:", err);
    const stateEl = shadow.getElementById("brse-qn-state");
    if (stateEl) stateEl.textContent = "⚠️ Lưu thất bại";
    showToast("❌ Không lưu được memo/ảnh (có thể quá dung lượng lưu trữ). Hãy gỡ bớt ảnh lớn rồi thử lại.");
  });
}

function getActiveNote() {
  return currentState.notes.find((note) => note.id === currentState.activeId) || currentState.notes[0];
}

function focusActiveEditor() {
  quickNoteRoot?.shadowRoot?.getElementById("brse-qn-text")?.focus();
}

function updateCount(shadow) {
  const text = shadow.getElementById("brse-qn-text").value;
  shadow.getElementById("brse-qn-count").textContent = `${text.length}/5000`;
}

function makeQuickNoteDraggable(el, handles) {
  let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
  handles.forEach(handle => {
    if (!handle) return;
    handle.onmousedown = (e) => {
      if (e.target.tagName === "BUTTON" || e.target.closest("button") || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.id === "brse-qn-tabs" || e.target.closest("#brse-qn-tabs")) {
        return;
      }
      e.preventDefault();
      p3 = e.clientX;
      p4 = e.clientY;
      document.onmouseup = () => {
        document.onmouseup = null;
        document.onmousemove = null;
      };
      document.onmousemove = (ev) => {
        p1 = p3 - ev.clientX;
        p2 = p4 - ev.clientY;
        p3 = ev.clientX;
        p4 = ev.clientY;
        const rect = el.getBoundingClientRect();
        
        el.style.top = (rect.top - p2) + "px";
        el.style.left = (rect.left - p1) + "px";
        el.style.right = "auto";
        
        if (isMaximized) {
          isMaximized = false;
          const maxBtn = el.shadowRoot?.getElementById("brse-qn-maximize");
          if (maxBtn) {
            maxBtn.textContent = "⛶";
            maxBtn.title = "Maximize";
          }
        }
      };
    };
  });
}

function applyTheme(shadow) {
  const notesSec = shadow.querySelector(".notes");
  const themeBtn = shadow.getElementById("brse-qn-theme");
  if (!notesSec || !themeBtn) return;
  
  if (currentTheme === "dark") {
    notesSec.classList.add("dark-theme");
    themeBtn.textContent = "☀️";
    themeBtn.title = "Switch to Light Mode";
  } else {
    notesSec.classList.remove("dark-theme");
    themeBtn.textContent = "🌙";
    themeBtn.title = "Switch to Dark Mode";
  }
}

// Automatically refresh Quick Note panel if global note state is updated elsewhere
window.addEventListener('brse-quicknotes-update', () => {
  if (quickNoteRoot && quickNoteRoot.shadowRoot) {
    loadQuickNoteState().then((state) => {
      currentState = state;
      lastSavedSnapshot = JSON.stringify(state);
      renderNotes(quickNoteRoot.shadowRoot);
    });
  }
});

// --- Live cross-window sync (detached window <-> in-page panel) ---
function isEditingNote(shadow) {
  const el = shadow.activeElement;
  return !!el && (el.id === "brse-qn-text" || el.id === "brse-qn-title");
}

function applyExternalQuickNoteState(shadow, rawState) {
  const normalized = normalizeState(rawState);
  // Preserve this window's active selection if that note still exists.
  const keepActive = currentState && normalized.notes.some((n) => n.id === currentState.activeId)
    ? currentState.activeId
    : normalized.activeId;
  currentState = { activeId: keepActive, notes: normalized.notes };
  lastSavedSnapshot = JSON.stringify(normalized);
  renderNotes(shadow);
}

// When the shared notes change in another window/tab, refresh here. Skips our
// own writes (snapshot match) and defers while the user is typing so an external
// update never clobbers in-progress text (flushed on focusout).
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes["brse.quickNotes.global"]) return;
    const shadow = quickNoteRoot?.shadowRoot;
    if (!shadow) return;
    const newVal = changes["brse.quickNotes.global"].newValue;
    if (!newVal) return;
    if (JSON.stringify(normalizeState(newVal)) === lastSavedSnapshot) return; // our own write
    if (isEditingNote(shadow)) { pendingExternalState = newVal; return; }
    applyExternalQuickNoteState(shadow, newVal);
  });
}

function removeNoteImage(shadow, imageId) {
  const activeNote = getActiveNote();
  activeNote.images = (activeNote.images || []).filter((img) => img.id !== imageId);
  activeNote.updatedAt = Date.now();
  renderNotes(shadow);
  scheduleSave(shadow);
}

async function resizeClipboardImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Cannot load pasted image"));
    img.src = dataUrl;
  });

  const maxWidth = 1000;
  const scale = Math.min(1, maxWidth / Math.max(image.width, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot create image preview");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const name = file.name || `screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;

  return {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    createdAt: new Date().toISOString()
  };
}
