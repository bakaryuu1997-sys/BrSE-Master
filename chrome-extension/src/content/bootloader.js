/**
 * BrSE OS Content Script Bootloader
 * Chrome Extension Manifest V3 content scripts execute as classic scripts.
 * Dynamic import() allows loading the modular ES module content script cleanly.
 */
(async () => {
  try {
    const scriptUrl = chrome.runtime.getURL('src/content/content.js');
    await import(scriptUrl);
  } catch (err) {
    console.error('[BrSE OS] Failed to initialize content script module:', err);
  }
})();
