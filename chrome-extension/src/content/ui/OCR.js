/**
 * BrSE OS OCR Spec Analyzer UI Component
 * Modular implementation for screen-capture translation overlay.
 */

import { injectThemeTokens } from '../../shared/theme.js';
import { safeSendMessage } from '../utils/dom.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { showToast } from './Toast.js';
import { BRSE_LAYER } from './layers.js';
import { loadQuickNoteState, saveQuickNoteState, appendTextToNote } from './QuickNoteStore.js';
import {
  normalizeOcrText,
  looksLikeCodeCapture,
  groupOcrRows,
  buildLaidOutOcrText,
  buildOriginalOcrText,
} from '../../shared/ocrLayout.js';
import { extractTextWithTesseract } from '../../shared/localOcr.js';
import { fillMissingTranslations, needsTranslationFill } from '../../shared/ocrTranslate.js';

// Content scripts can't fetch translate.googleapis.com directly (the host page's
// CORS blocks the cross-origin response), so offline translation silently
// returned nothing. Route each translation through the background service
// worker, which holds the host permission. Shape matches fillMissingTranslations'
// injectable translator: (text, lang) => Promise<string>.
function translateViaBackground(text, lang) {
  return safeSendMessage({
    type: MESSAGE_TYPES.BRSE_TRANSLATE_TEXT,
    text,
    targetLang: lang,
  })
    .then((res) => (res && res.ok ? res.translation || "" : ""))
    .catch(() => "");
}

export function startOcrCapture() {
  const overlay = document.createElement('div');
  overlay.id = 'brse-ocr-selector-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: BRSE_LAYER.overlay,
    background: 'rgba(18, 19, 22, 0.4)',
    cursor: 'crosshair',
    backdropFilter: 'blur(1px)',
    userSelect: 'none'
  });

  const banner = document.createElement('div');
  Object.assign(banner.style, {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(29, 30, 34, 0.9)',
    border: '1px solid var(--brse-accent)',
    borderRadius: '12px',
    padding: '10px 20px',
    color: 'var(--brse-text)',
    fontFamily: 'sans-serif',
    fontSize: '13px',
    fontWeight: '800',
    zIndex: 'var(--brse-z-index)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
    animation: 'brseSlideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  });
  banner.innerHTML = `<span style="font-size: 16px;">📸</span> Kéo chuột quét qua vùng ảnh thiết kế cần dịch đè`;
  document.body.appendChild(banner);

  const dragBox = document.createElement('div');
  Object.assign(dragBox.style, {
    position: 'fixed',
    border: '2px dashed var(--brse-accent)',
    background: 'rgba(255, 180, 84, 0.08)',
    boxShadow: '0 0 10px rgba(255, 180, 84, 0.2)',
    pointerEvents: 'none',
    display: 'none',
    zIndex: BRSE_LAYER.overlayBox
  });
  overlay.appendChild(dragBox);

  let startX = 0, startY = 0;
  let isSelecting = false;

  overlay.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    
    dragBox.style.left = `${startX}px`;
    dragBox.style.top = `${startY}px`;
    dragBox.style.width = '0px';
    dragBox.style.height = '0px';
    dragBox.style.display = 'block';
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    dragBox.style.left = `${left}px`;
    dragBox.style.top = `${top}px`;
    dragBox.style.width = `${width}px`;
    dragBox.style.height = `${height}px`;
  });

  overlay.addEventListener('mouseup', (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    const endX = e.clientX;
    const endY = e.clientY;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    overlay.remove();
    banner.remove();

    if (w < 10 || h < 10) return;

    setTimeout(() => {
      const promise = safeSendMessage({ type: MESSAGE_TYPES.BRSE_CAPTURE_TAB });
      if (promise && typeof promise.then === 'function') {
        promise.then((res) => {
          if (res && res.dataUrl) {
            processOcrImage(res.dataUrl, x, y, w, h);
          } else {
            const errorMsg = res?.error || "Không thể chụp màn hình. Hãy đảm bảo tab hiện tại hoạt động và cho phép chụp ảnh.";
            console.error("[BrSE OCR] Capture visible tab failed:", errorMsg);
            showToast(`⚠️ Lỗi: ${errorMsg}`);
          }
        }).catch(err => {
          console.error("[BrSE OCR] Capture send message failed:", err);
          showToast(`⚠️ Lỗi kết nối: ${err.message || "mất kết nối extension"}`);
        });
      } else {
        console.error("[BrSE OCR] safeSendMessage did not return a promise.");
        showToast("⚠️ Extension bị mất kết nối hoặc không có quyền. Vui lòng reload trang.");
      }
    }, 100);
  });

  document.body.appendChild(overlay);
}

function processOcrImage(dataUrl, x, y, w, h) {
  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    
    // Limit max device pixel ratio to 1.5 for network performance optimization
    const optimizedDpr = Math.min(1.5, dpr);
    canvas.width = w * optimizedDpr;
    canvas.height = h * optimizedDpr;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img, 
      x * dpr, 
      y * dpr, 
      w * dpr, 
      h * dpr, 
      0, 
      0, 
      w * optimizedDpr, 
      h * optimizedDpr
    );

    // Compress to JPEG with 0.85 quality for 70% smaller payload size
    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);

    const absoluteLeft = x + window.scrollX;
    const absoluteTop = y + window.scrollY;

    const choiceOverlay = document.createElement('div');
    choiceOverlay.id = 'brse-ocr-choice-overlay';
    Object.assign(choiceOverlay.style, {
      position: 'absolute',
      left: `${absoluteLeft}px`,
      top: `${absoluteTop}px`,
      width: `${w}px`,
      height: `${h}px`,
      minWidth: '340px',
      minHeight: '220px',
      zIndex: BRSE_LAYER.overlay,
      background: 'rgba(29, 30, 34, 0.95)',
      border: '2px dashed var(--brse-accent)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--brse-text)',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      gap: '12px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      pointerEvents: 'auto',
      backdropFilter: 'blur(10px)',
      padding: '20px',
      boxSizing: 'border-box'
    });

    choiceOverlay.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; color: var(--brse-accent); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
        🛠️ CHỌN PHƯƠNG THỨC OCR DỊCH THUẬT
      </div>
      
      <div style="display: flex; gap: 12px; width: 100%; height: 100%;">
        <!-- Option Offline -->
        <button id="btn-choice-offline" style="
          flex: 1;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255, 107, 94,0.2);
          border-radius: 10px;
          padding: 12px;
          color: var(--brse-text);
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
          outline: none;
        ">
          <span style="font-size: 20px;">📴</span>
          <strong style="font-size: 11px; color: var(--brse-primary);">DỊCH OFFLINE</strong>
          <span style="font-size: 9px; color: var(--brse-success); background: rgba(78, 201, 165,0.15); padding: 1px 6px; border-radius: 4px; font-weight: bold;">Không cần AI</span>
          <span style="font-size: 9px; color: var(--brse-text-muted); line-height: 1.3;">Tesseract.js đọc chữ tại máy (không AI/model) + dịch bằng Google Translate.</span>
        </button>

        <!-- Option Hybrid -->
        <button id="btn-choice-hybrid" style="
          flex: 1;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255, 180, 84,0.2);
          border-radius: 10px;
          padding: 12px;
          color: var(--brse-text);
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
          outline: none;
        ">
          <span style="font-size: 20px;">☁️</span>
          <strong style="font-size: 11px; color: var(--brse-accent);">DỊCH HYBRID</strong>
          <span style="font-size: 9px; color: var(--brse-primary); background: rgba(255, 107, 94,0.15); padding: 1px 6px; border-radius: 4px; font-weight: bold;">Tối ưu nhất</span>
          <span style="font-size: 9px; color: var(--brse-text-muted); line-height: 1.3;">Dịch và giữ cấu trúc hình ảnh bằng Gemini 3.1 Vision cực chuẩn xác.</span>
        </button>
      </div>

      <button id="btn-choice-close" style="
        background: none;
        border: none;
        color: var(--brse-error);
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
        margin-top: 6px;
        outline: none;
      ">Hủy bỏ</button>
    `;

    document.body.appendChild(choiceOverlay);

    // Bind Option Actions
    const btnClose = choiceOverlay.querySelector('#btn-choice-close');
    btnClose.onclick = () => {
      choiceOverlay.remove();
    };

    const btnOffline = choiceOverlay.querySelector('#btn-choice-offline');
    btnOffline.onmouseenter = () => {
      btnOffline.style.background = 'rgba(255, 107, 94,0.08)';
      btnOffline.style.borderColor = 'var(--brse-primary)';
      btnOffline.style.boxShadow = '0 0 10px rgba(255, 107, 94,0.2)';
    };
    btnOffline.onmouseleave = () => {
      btnOffline.style.background = 'rgba(255,255,255,0.03)';
      btnOffline.style.borderColor = 'rgba(255, 107, 94,0.2)';
      btnOffline.style.boxShadow = 'none';
    };
    btnOffline.onclick = () => {
      choiceOverlay.remove();
      startOfflineOcr(croppedBase64, absoluteLeft, absoluteTop, w, h);
    };

    const btnHybrid = choiceOverlay.querySelector('#btn-choice-hybrid');
    btnHybrid.onmouseenter = () => {
      btnHybrid.style.background = 'rgba(255, 180, 84,0.08)';
      btnHybrid.style.borderColor = 'var(--brse-accent)';
      btnHybrid.style.boxShadow = '0 0 10px rgba(255, 180, 84,0.2)';
    };
    btnHybrid.onmouseleave = () => {
      btnHybrid.style.background = 'rgba(255,255,255,0.03)';
      btnHybrid.style.borderColor = 'rgba(255, 180, 84,0.2)';
      btnHybrid.style.boxShadow = 'none';
    };
    btnHybrid.onclick = () => {
      choiceOverlay.remove();
      startHybridOcr(croppedBase64, absoluteLeft, absoluteTop, w, h, x, y);
    };
  };
}

function startLoadingOverlay(absoluteLeft, absoluteTop, w, h, text) {
  const loading = document.createElement('div');
  loading.className = 'brse-ocr-loading-overlay-running';
  Object.assign(loading.style, {
    position: 'absolute',
    left: `${absoluteLeft}px`,
    top: `${absoluteTop}px`,
    width: `${w}px`,
    height: `${h}px`,
    zIndex: BRSE_LAYER.overlay,
    background: 'rgba(29, 30, 34, 0.85)',
    border: '2px dashed var(--brse-primary)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--brse-text)',
    fontFamily: 'sans-serif',
    gap: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    pointerEvents: 'auto',
    backdropFilter: 'blur(3px)'
  });
  
  loading.innerHTML = `
    <button class="brse-ocr-loading-close" title="Hủy / đóng" style="
      position: absolute; top: 4px; right: 6px;
      background: none; border: none; color: var(--brse-error);
      font-size: 16px; font-weight: bold; line-height: 1; cursor: pointer;
      padding: 2px 4px; outline: none;">✕</button>
    <div class="ocr-spinner" style="
      width: 24px; height: 24px;
      border: 3px solid rgba(255, 107, 94, 0.2);
      border-radius: 50%;
      border-top-color: var(--brse-primary);
      animation: brseOcrSpin 1s linear infinite;
    "></div>
    <div id="brse-ocr-loading-text" style="font-size: 11px; font-weight: bold; color: var(--brse-primary); text-shadow: 0 0 4px rgba(255, 107, 94,0.3); text-transform: uppercase; text-align: center; padding: 0 10px;">${text}</div>
    <style>
      @keyframes brseOcrSpin { to { transform: rotate(360deg); } }
    </style>
  `;
  document.body.appendChild(loading);

  // Cancellable + self-clearing: the overlay must never spin forever. The ✕
  // button cancels immediately; a watchdog auto-clears a stuck run (dead backend
  // / hung network) so it can't get stuck with no way to dismiss.
  const closeBtn = loading.querySelector('.brse-ocr-loading-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      loading._cancelled = true;
      clearTimeout(loading._watchdog);
      loading.remove();
    };
  }
  loading._watchdog = setTimeout(() => {
    if (document.body.contains(loading)) {
      loading._cancelled = true;
      loading.remove();
      showToast("⚠️ OCR quá lâu (timeout). Đã hủy — thử lại hoặc chọn vùng nhỏ hơn.");
    }
  }, 60000);
  return loading;
}

function updateLoadingText(loading, text) {
  const label = loading?.querySelector?.('#brse-ocr-loading-text');
  if (label) label.textContent = text;
}

function fallbackTranslationsFromText(text) {
  return [{
    text,
    source_language: "unknown",
    translation_ja: "",
    translation_vi: "",
    translation: "",
    translation_en: "",
    leftPercent: 0,
    topPercent: 0,
    wPercent: 100,
    hPercent: 100
  }];
}

// OCR layout helpers now live in shared/ocrLayout.js (pure + unit-tested).
// Re-export the two consumed by the content script and existing tests.
export { looksLikeCodeCapture, buildOriginalOcrText };

function startHybridOcr(croppedBase64, absoluteLeft, absoluteTop, w, h, x, y) {
  const loading = startLoadingOverlay(absoluteLeft, absoluteTop, w, h, "OCR ĐANG XỬ LÝ (HYBRID)...");
  const stopped = () => loading._cancelled || !document.body.contains(loading);

  safeSendMessage({
    type: MESSAGE_TYPES.BRSE_PERFORM_OCR,
    image: croppedBase64
  }).then(async res => {
    if (stopped()) return;
    if (res && res.success && Array.isArray(res.translations)) {
      let translations = res.translations;
      // Top up any target language the vision model left empty (Google fallback).
      if (needsTranslationFill(translations)) {
        updateLoadingText(loading, "ĐANG BỔ SUNG BẢN DỊCH (GOOGLE)...");
        translations = await fillMissingTranslations(translations, { translate: translateViaBackground });
      }
      if (stopped()) return;
      clearTimeout(loading._watchdog);
      loading.remove();
      renderOcrTranslationOverlay(x, y, w, h, translations, croppedBase64);
      renderOcrEditorPanel(translations);
    } else {
      clearTimeout(loading._watchdog);
      loading.remove();
      showToast(`⚠️ OCR chưa chạy được: ${res?.error || "lỗi hệ thống."}`);
      startOfflineOcr(croppedBase64, absoluteLeft, absoluteTop, w, h);
    }
  }).catch(err => {
    if (stopped()) return;
    clearTimeout(loading._watchdog);
    loading.remove();
    showToast(`⚠️ OCR chưa chạy được: ${err.message || "lỗi kết nối."}`);
    startOfflineOcr(croppedBase64, absoluteLeft, absoluteTop, w, h);
  });
}

async function startOfflineOcr(croppedBase64, absoluteLeft, absoluteTop, w, h) {
  const loading = startLoadingOverlay(absoluteLeft, absoluteTop, w, h, "ĐANG OCR OFFLINE BẰNG TESSERACT...");
  // True offline mode: NO AI at all. Text is read locally by Tesseract.js and
  // translated only via the free Google Translate endpoint. stopped() lets the
  // ✕ button / watchdog abort cleanly without rendering a stale result.
  const stopped = () => loading._cancelled || !document.body.contains(loading);
  try {
    const extractedText = await extractTextWithTesseract(croppedBase64);
    if (stopped()) return;
    if (!extractedText) {
      throw new Error("Không trích xuất được chữ từ vùng ảnh đã chọn.");
    }

    updateLoadingText(loading, "ĐANG DỊCH BẰNG GOOGLE (KHÔNG AI)...");
    const translations = await fillMissingTranslations(
      fallbackTranslationsFromText(extractedText),
      { translate: translateViaBackground },
    );
    if (stopped()) return;
    clearTimeout(loading._watchdog);
    loading.remove();
    renderOcrEditorPanel(translations);
  } catch (err) {
    if (loading._cancelled) return;
    clearTimeout(loading._watchdog);
    loading.remove();
    showToast(`⚠️ OCR offline lỗi: ${err.message || "không trích/dịch được. Thử lại hoặc dùng Hybrid."}`);
  }
}

function renderOcrTranslationOverlay(x, y, w, h, translations, croppedBase64) {
  const container = document.createElement('div');
  container.className = 'brse-ocr-results-layer';
  
  const absoluteLeft = x + window.scrollX;
  const absoluteTop = y + window.scrollY;

  Object.assign(container.style, {
    position: 'absolute',
    left: `${absoluteLeft}px`,
    top: `${absoluteTop}px`,
    width: `${w}px`,
    height: `${h}px`,
    zIndex: BRSE_LAYER.overlay,
    border: '2px solid rgba(255, 180, 84, 0.5)',
    borderRadius: '8px',
    boxShadow: '0 12px 42px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    pointerEvents: 'none'
  });

  // Create canvas overlay
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  Object.assign(canvas.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none'
  });
  container.appendChild(canvas);

  // Create gorgeous glassmorphic control bar
  const controlBar = document.createElement('div');
  controlBar.className = 'brse-ocr-control-bar';
  Object.assign(controlBar.style, {
    position: 'absolute',
    top: '4px',
    left: '4px',
    display: 'flex',
    gap: '6px',
    background: 'rgba(29, 30, 34, 0.95)',
    border: '1px solid rgba(255, 107, 94, 0.4)',
    borderRadius: '6px',
    padding: '4px 6px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    zIndex: BRSE_LAYER.overlayResult,
    pointerEvents: 'auto',
    alignItems: 'center'
  });

  const jaBtn = document.createElement('button');
  Object.assign(jaBtn.style, {
    background: 'transparent',
    border: 'none',
    color: 'var(--brse-primary)',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  });
  jaBtn.innerHTML = w < 250 ? '📋 JA' : '📋 Chép gốc (JA)';
  jaBtn.onmouseenter = () => {
    jaBtn.style.background = 'rgba(255, 107, 94, 0.15)';
    jaBtn.style.color = '#4ec9a5';
  };
  jaBtn.onmouseleave = () => {
    jaBtn.style.background = 'transparent';
    jaBtn.style.color = 'var(--brse-primary)';
  };
  jaBtn.onclick = (e) => {
    e.stopPropagation();
    const allOriginal = translations.map(t => t.text).join('\n');
    navigator.clipboard.writeText(allOriginal).then(() => {
      showToast("📋 Đã copy toàn bộ chữ gốc (JA)!");
    }).catch(err => {
      console.error(err);
      showToast("⚠️ Không thể copy chữ gốc");
    });
  };

  const viBtn = document.createElement('button');
  Object.assign(viBtn.style, {
    background: 'transparent',
    border: 'none',
    color: 'var(--brse-success)',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  });
  viBtn.innerHTML = w < 250 ? '📋 VI' : '📋 Chép dịch (VI)';
  viBtn.onmouseenter = () => {
    viBtn.style.background = 'rgba(78, 201, 165, 0.15)';
    viBtn.style.color = '#b4f9f8';
  };
  viBtn.onmouseleave = () => {
    viBtn.style.background = 'transparent';
    viBtn.style.color = 'var(--brse-success)';
  };
  viBtn.onclick = (e) => {
    e.stopPropagation();
    const allTranslations = translations.map(t => t.translation).join('\n');
    navigator.clipboard.writeText(allTranslations).then(() => {
      showToast("📋 Đã copy toàn bộ bản dịch (VI)!");
    }).catch(err => {
      console.error(err);
      showToast("⚠️ Không thể copy bản dịch");
    });
  };

  controlBar.appendChild(jaBtn);
  
  const separator = document.createElement('div');
  Object.assign(separator.style, {
    width: '1px',
    height: '14px',
    background: 'rgba(110, 112, 121, 0.5)'
  });
  controlBar.appendChild(separator);
  
  controlBar.appendChild(viBtn);
  container.appendChild(controlBar);
  
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = croppedBase64;
  img.onload = () => {
    // 1. Draw original cropped image
    ctx.drawImage(img, 0, 0, w, h);
    
    // 2. Perform in-place background-erasure and translation overlay
    translations.forEach(t => {
      const tx = (t.leftPercent * w) / 100;
      const ty = (t.topPercent * h) / 100;
      const tw = (t.wPercent * w) / 100;
      const th = (t.hPercent * h) / 100;
      
      // Safety bounds check
      if (tw < 4 || th < 4) return;

      // --- Color Sampling Algorithm ---
      // Sample background color by averaging pixels at the 4 corners of the bounding box
      let bgR = 255, bgG = 255, bgB = 255;
      try {
        const samples = [
          ctx.getImageData(Math.max(0, tx), Math.max(0, ty), 1, 1).data,
          ctx.getImageData(Math.min(w - 1, tx + tw - 1), Math.max(0, ty), 1, 1).data,
          ctx.getImageData(Math.max(0, tx), Math.min(h - 1, ty + th - 1), 1, 1).data,
          ctx.getImageData(Math.min(w - 1, tx + tw - 1), Math.min(h - 1, ty + th - 1), 1, 1).data
        ];
        
        bgR = Math.round((samples[0][0] + samples[1][0] + samples[2][0] + samples[3][0]) / 4);
        bgG = Math.round((samples[0][1] + samples[1][1] + samples[2][1] + samples[3][1]) / 4);
        bgB = Math.round((samples[0][2] + samples[1][2] + samples[2][2] + samples[3][2]) / 4);
      } catch (e) {
        console.warn("Failed to sample background color, using fallback white/black", e);
      }
      
      const bgColorString = `rgb(${bgR}, ${bgG}, ${bgB})`;
      
      // Calculate luminance to decide text color (contrast-aware text color)
      // Standard formula: Y = 0.299R + 0.587G + 0.114B
      const luminance = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / 255;
      const textColorString = luminance > 0.5 ? 'var(--brse-surface)' : 'var(--brse-text)';

      // --- Erase Original Text ---
      ctx.fillStyle = bgColorString;
      ctx.fillRect(tx - 1, ty - 1, tw + 2, th + 2);

      // --- Paint Vietnamese Translation ---
      ctx.font = "bold 11px 'Outfit', 'Inter', system-ui, sans-serif";
      ctx.fillStyle = textColorString;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Advanced Word Wrapping on Canvas
      const text = t.translation;
      const words = text.split(/\s+/);
      const lines = [];
      let currentLine = '';
      
      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > (tw + 12) && currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Center lines vertically
      const fontSize = 11;
      const lineHeight = fontSize + 3;
      const totalHeight = lines.length * lineHeight;
      let startY = ty + (th - totalHeight) / 2 + lineHeight / 2;
      
      lines.forEach((line, index) => {
        ctx.fillText(line, tx + tw / 2, startY + index * lineHeight);
      });

      // --- Create Interactive Hotspot ---
      // Transparent DOM overlay box to listen for hover events
      const hotspot = document.createElement('div');
      Object.assign(hotspot.style, {
        position: 'absolute',
        left: `${tx}px`,
        top: `${ty}px`,
        width: `${tw}px`,
        height: `${th}px`,
        pointerEvents: 'auto',
        cursor: 'copy',
        zIndex: BRSE_LAYER.overlayBox
      });
      
      hotspot.title = `Click để copy chữ gốc: ${t.text}`;
      
      // Add subtle hover borders to show interactive zones
      hotspot.onmouseenter = () => {
        hotspot.style.boxShadow = '0 0 0 1px var(--brse-accent)';
        hotspot.style.borderRadius = '2px';
        hotspot.style.backgroundColor = 'rgba(255, 180, 84, 0.05)';
      };
      hotspot.onmouseleave = () => {
        hotspot.style.boxShadow = '';
        hotspot.style.backgroundColor = '';
      };
      
      hotspot.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(t.text).then(() => {
          showToast(`📋 Đã copy chữ gốc: "${t.text.slice(0, 30)}${t.text.length > 30 ? '...' : ''}"`);
        }).catch(err => {
          console.error("Failed to copy hotspot text:", err);
          showToast("⚠️ Không thể copy chữ gốc");
        });
      };
      
      container.appendChild(hotspot);
    });
  };

  // Close button
  const closeBtn = document.createElement('button');
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'var(--brse-accent)',
    border: 'none',
    color: '#121316',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    zIndex: BRSE_LAYER.overlayResult,
    transition: 'transform 0.2s'
  });
  closeBtn.innerText = '✕';
  closeBtn.onmouseenter = () => { closeBtn.style.transform = 'scale(1.15)'; };
  closeBtn.onmouseleave = () => { closeBtn.style.transform = 'scale(1.0)'; };
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    container.remove();
  };
  container.appendChild(closeBtn);

  document.body.appendChild(container);
  safeSendMessage({ type: MESSAGE_TYPES.BRSE_OCR_COMPLETE });
}

function renderOcrEditorPanel(translations) {
  // If an existing panel is open, close it
  const existing = document.getElementById('brse-ocr-panel-root');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.id = 'brse-ocr-panel-root';
  Object.assign(root.style, {
    position: 'fixed',
    top: '120px',
    right: '24px',
    width: '440px',
    height: '460px',
    zIndex: BRSE_LAYER.overlayResult,
    pointerEvents: 'auto',
    fontFamily: "'Outfit', 'Inter', sans-serif"
  });

  const shadow = root.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  
  // Style block
  const style = document.createElement('style');
  style.textContent = `
    :host {
      --bg-panel: rgba(29, 30, 34, 0.96);
      --border-color: rgba(255, 107, 94, 0.4);
      --text-color: var(--brse-text);
      --text-muted: var(--brse-text-muted);
      --accent-color: var(--brse-primary);
      --success-color: var(--brse-success);
      --accent-orange: var(--brse-accent);
    }
    .panel {
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: var(--bg-panel);
      border: 1.5px solid var(--border-color);
      border-radius: 16px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      overflow: hidden;
      box-sizing: border-box;
      min-width: 360px;
      min-height: 320px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(18, 19, 22, 0.6);
      border-bottom: 1.5px solid rgba(255, 107, 94, 0.2);
      cursor: move;
      user-select: none;
    }
    .header-title {
      font-size: 12px;
      font-weight: 800;
      color: var(--accent-orange);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .header-close {
      background: none;
      border: none;
      color: var(--brse-error);
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s;
      padding: 4px;
      line-height: 1;
    }
    .header-close:hover {
      transform: scale(1.2);
    }
    .tab-bar {
      display: flex;
      background: rgba(18, 19, 22, 0.3);
      padding: 6px;
      gap: 6px;
      border-bottom: 1px solid rgba(255, 107, 94, 0.1);
    }
    .tab-btn {
      flex: 1;
      background: none;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }
    .tab-btn:hover {
      color: var(--text-color);
      background: rgba(255, 107, 94, 0.1);
    }
    .tab-btn.active {
      color: #ffffff;
      background: rgba(255, 107, 94, 0.25);
      border-color: rgba(255, 107, 94, 0.4);
      box-shadow: 0 0 10px rgba(255, 107, 94, 0.2);
    }
    .editor-container {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      height: calc(100% - 100px);
    }
    .textarea-field {
      flex: 1;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1.5px solid rgba(255, 107, 94, 0.15);
      border-radius: 12px;
      padding: 12px;
      color: var(--text-color);
      font-family: inherit;
      font-size: 13px;
      line-height: 1.6;
      resize: none;
      white-space: pre;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
      box-sizing: border-box;
    }
    .textarea-field.code-mode {
      font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
      font-size: 12.5px;
      line-height: 1.55;
      tab-size: 2;
      overflow: auto;
    }
    .textarea-field:focus {
      border-color: var(--accent-color);
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 107, 94, 0.25);
    }
    .footer {
      display: flex;
      justify-content: flex-end;
      padding: 12px 16px;
      gap: 8px;
      background: rgba(18, 19, 22, 0.4);
      border-top: 1px solid rgba(255, 107, 94, 0.1);
    }
    .footer-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-color);
      font-size: 11px;
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }
    .footer-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .footer-btn-primary {
      background: rgba(78, 201, 165, 0.2);
      border-color: rgba(78, 201, 165, 0.4);
      color: var(--success-color);
    }
    .footer-btn-primary:hover {
      background: rgba(78, 201, 165, 0.35);
      border-color: rgba(78, 201, 165, 0.55);
      box-shadow: 0 0 10px rgba(78, 201, 165, 0.2);
    }
    .ocr-resize-handle {
      position: absolute;
      z-index: 10;
      pointer-events: auto;
    }
    .ocr-resize-right {
      top: 14px;
      right: -4px;
      width: 10px;
      height: calc(100% - 28px);
      cursor: e-resize;
    }
    .ocr-resize-bottom {
      left: 14px;
      bottom: -4px;
      width: calc(100% - 28px);
      height: 10px;
      cursor: s-resize;
    }
    .ocr-resize-bottom-right {
      right: -5px;
      bottom: -5px;
      width: 18px;
      height: 18px;
      cursor: se-resize;
    }
    .ocr-resize-bottom-right::after {
      content: "";
      position: absolute;
      right: 5px;
      bottom: 5px;
      width: 9px;
      height: 9px;
      border-right: 2px solid rgba(255, 107, 94, 0.75);
      border-bottom: 2px solid rgba(255, 107, 94, 0.75);
      border-radius: 1px;
    }
  `;
  shadow.appendChild(style);

  // Content texts
  const original = buildOriginalOcrText(translations);
  const originalText = original.text;
  const jpText = buildLaidOutOcrText(translations, 'translation_ja', { preserveColumns: false });
  const enText = buildLaidOutOcrText(translations, 'translation_en', { preserveColumns: false });
  const viText = buildLaidOutOcrText(translations, 'translation_vi', { preserveColumns: false })
    || buildLaidOutOcrText(translations, 'translation', { preserveColumns: false });
  const sourceLanguages = [...new Set(translations.map((item) => item.source_language).filter(Boolean))];
  const sourceLabel = sourceLanguages.length === 1 ? sourceLanguages[0].toUpperCase() : (sourceLanguages.length > 1 ? "MIXED" : "AUTO");

  const texts = {
    original: originalText || 'Không phát hiện thấy chữ gốc trong vùng quét.',
    jp: jpText || originalText || 'Không phát hiện thấy bản tiếng Nhật.',
    en: enText || 'No English translations available.',
    vi: viText || 'Không phát hiện thấy bản dịch tiếng Việt.'
  };

  let activeLang = 'original';

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <header class="header" id="brse-ocr-drag-handle">
      <div class="header-title">🔍 Bảng Soạn Thảo OCR · ${sourceLabel}</div>
      <div class="header-actions">
        <button class="header-close" id="brse-ocr-max-panel" title="Phóng to / thu nhỏ">□</button>
        <button class="header-close" id="brse-ocr-close-panel" title="Đóng panel">✕</button>
      </div>
    </header>
    <div class="tab-bar">
      <button class="tab-btn active" data-lang="original">Ngôn ngữ gốc</button>
      <button class="tab-btn" data-lang="jp">Tiếng Nhật (JP)</button>
      <button class="tab-btn" data-lang="en">Tiếng Anh (EN)</button>
      <button class="tab-btn" data-lang="vi">Tiếng Việt (VI)</button>
    </div>
    <div class="editor-container">
      <textarea class="textarea-field" id="brse-ocr-textarea" placeholder="Nội dung trích xuất..."></textarea>
    </div>
    <footer class="footer">
      <button class="footer-btn" id="brse-ocr-copy-btn">📋 Copy Nhanh</button>
      <button class="footer-btn footer-btn-primary" id="brse-ocr-memo-btn">💾 Thêm vào Note</button>
    </footer>
    <div class="ocr-resize-handle ocr-resize-right" data-resize="right"></div>
    <div class="ocr-resize-handle ocr-resize-bottom" data-resize="bottom"></div>
    <div class="ocr-resize-handle ocr-resize-bottom-right" data-resize="right bottom"></div>
  `;
  shadow.appendChild(panel);

  const textarea = shadow.getElementById('brse-ocr-textarea');
  textarea.value = texts[activeLang];
  textarea.classList.toggle('code-mode', activeLang === 'original' && original.isCodeCapture);

  // Tab switching
  shadow.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      // Save current edited value back to local storage representation
      texts[activeLang] = textarea.value;

      shadow.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLang = btn.getAttribute('data-lang');
      textarea.value = texts[activeLang];
      textarea.classList.toggle('code-mode', activeLang === 'original' && original.isCodeCapture);
      copyBtn.innerText = activeLang === 'original' && original.isCodeCapture ? "📋 Copy Code" : "📋 Copy Nhanh";
    };
  });

  // Close panel
  shadow.getElementById('brse-ocr-close-panel').onclick = () => {
    root.remove();
  };

  // Copy Nhanh
  const copyBtn = shadow.getElementById('brse-ocr-copy-btn');
  copyBtn.innerText = activeLang === 'original' && original.isCodeCapture ? "📋 Copy Code" : "📋 Copy Nhanh";
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(textarea.value).then(() => {
      showToast("📋 Đã copy nội dung vào bộ nhớ tạm!");
      copyBtn.innerText = "✔️ Đã Copy";
      setTimeout(() => {
        copyBtn.innerText = activeLang === 'original' && original.isCodeCapture ? "📋 Copy Code" : "📋 Copy Nhanh";
      }, 1000);
    });
  };

  // Thêm vào Note (Integrate with QuickNote global notepad!)
  const memoBtn = shadow.getElementById('brse-ocr-memo-btn');
  memoBtn.onclick = () => {
    const textToAppend = textarea.value.trim();
    if (!textToAppend) return;

    // Load, append, and save note state globally!
    loadQuickNoteState().then(state => {
      const activeNote = state.notes.find(n => n.id === state.activeId) || state.notes[0];
      const updatedNote = appendTextToNote(activeNote, `--- OCR [${activeLang.toUpperCase()}] ---\n${textToAppend}`);
      state.notes = state.notes.map(n => n.id === updatedNote.id ? updatedNote : n);
      
      saveQuickNoteState(state).then(() => {
        showToast("💾 Đã thêm văn bản OCR vào Quick Note thành công!");
        memoBtn.innerText = "✔️ Đã Thêm";
        setTimeout(() => { memoBtn.innerText = "💾 Thêm vào Note"; }, 1000);

        // If QuickNote is currently open on the screen, force it to refresh its UI!
        const qnRoot = document.getElementById('brse-quick-note-root');
        if (qnRoot && qnRoot.shadowRoot) {
          // Trigger refresh notes inside QuickNote by dispatching a custom event
          window.dispatchEvent(new CustomEvent('brse-quicknotes-update'));
        }
      });
    });
  };

  // Draggable logic (snappy and transition-free dragging)
  const dragHandle = shadow.getElementById('brse-ocr-drag-handle');
  dragHandle.style.cursor = 'move';
  
  let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
  
  dragHandle.onmousedown = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = root.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    root.style.top = `${initialTop}px`;
    root.style.left = `${initialLeft}px`;
    
    const onMouseMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      root.style.left = `${initialLeft + dx}px`;
      root.style.top = `${initialTop + dy}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    e.preventDefault();
  };

  const maxBtn = shadow.getElementById('brse-ocr-max-panel');
  let restoreFrame = null;
  maxBtn.onclick = (e) => {
    e.stopPropagation();
    const rect = root.getBoundingClientRect();
    if (!restoreFrame) {
      restoreFrame = {
        left: root.style.left || `${rect.left}px`,
        top: root.style.top || `${rect.top}px`,
        right: root.style.right || 'auto',
        width: root.style.width || `${rect.width}px`,
        height: root.style.height || `${rect.height}px`,
      };
      Object.assign(root.style, {
        left: '5vw',
        top: '7vh',
        right: 'auto',
        width: '90vw',
        height: '82vh',
      });
      maxBtn.textContent = '❐';
    } else {
      Object.assign(root.style, restoreFrame);
      restoreFrame = null;
      maxBtn.textContent = '□';
    }
  };

  shadow.querySelectorAll('.ocr-resize-handle').forEach((handle) => {
    handle.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      restoreFrame = null;
      maxBtn.textContent = '□';

      const directions = String(handle.getAttribute('data-resize') || '').split(/\s+/);
      const rect = root.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;
      root.style.left = `${rect.left}px`;
      root.style.top = `${rect.top}px`;
      root.style.right = 'auto';

      const onResizeMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (directions.includes('right')) {
          const maxWidth = Math.max(360, window.innerWidth - rect.left - 12);
          root.style.width = `${Math.min(maxWidth, Math.max(360, startWidth + dx))}px`;
        }
        if (directions.includes('bottom')) {
          const maxHeight = Math.max(320, window.innerHeight - rect.top - 12);
          root.style.height = `${Math.min(maxHeight, Math.max(320, startHeight + dy))}px`;
        }
      };

      const onResizeUp = () => {
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', onResizeUp);
      };

      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', onResizeUp);
    };
  });

  document.body.appendChild(root);
}

