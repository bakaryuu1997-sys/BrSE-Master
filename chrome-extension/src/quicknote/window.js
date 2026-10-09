"use strict";

// Standalone, detached Quick Memo window. Reuses the same panel + notes store
// (chrome.storage.local global key) as the in-page overlay, but lives in its own
// browser window so it survives closing the page and can be moved off-screen.

import { showQuickNotePanel } from "../content/ui/QuickNote.js";
import { installBrseLayerVars } from "../content/ui/layers.js";

installBrseLayerVars();
showQuickNotePanel();

// The panel normally floats over a page; here it should fill the window. The
// stylesheet forces this with !important, but also normalize any inline styles
// the panel set so dragging cannot move it out of view.
const root = document.getElementById("brse-quick-note-root");
if (root) {
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    maxWidth: "none",
    maxHeight: "none",
    borderRadius: "0",
  });
}

// Best-effort recovery: when the extension is reloaded/updated (or its service
// worker is recycled), this standalone page's context is invalidated and some
// Chromium forks (e.g. Cốc Cốc) replace it with the browser home page. Detect
// the invalidation early and reload from the (reinstalled) extension so the
// window comes back instead of silently turning into the home page.
setInterval(() => {
  let alive = false;
  try {
    alive = Boolean(chrome.runtime && chrome.runtime.id);
  } catch {
    alive = false;
  }
  if (!alive) {
    try {
      location.reload();
    } catch {
      /* page is already gone */
    }
  }
}, 4000);
