/**
 * BrSE OS Premium Full Page Screen Capture Component
 * Implements high-performance page auto-scrolling, canvas stitching, 
 * clipboard image writing, and Cốc Cốc/Chrome native downloads integration.
 */

import { safeSendMessage } from '../utils/dom.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { showToast } from './Toast.js';
import { BRSE_LAYER } from './layers.js';
import { THEME } from '../../shared/theme.js';
import { openScreenshotAnnotator } from './ScreenshotAnnotator.js';

export async function startFullPageCapture() {
  // 1. Create elegant glassmorphic loading progress overlay
  const loading = document.createElement('div');
  loading.id = 'brse-fullpage-loading';
  Object.assign(loading.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: BRSE_LAYER.overlay,
    background: 'rgba(18, 19, 22, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: THEME.text,
    fontFamily: "'Outfit', 'Inter', sans-serif",
    userSelect: 'none'
  });

  loading.innerHTML = `
    <div style="background: rgba(29, 30, 34, 0.95); border: 1px solid rgba(255, 107, 94, 0.3); border-radius: 16px; padding: 30px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); display: flex; flexDirection: column; align-items: center; gap: 15px; text-align: center; width: 320px; box-sizing: border-box;">
      <div class="ocr-spinner" style="
        width: 32px; height: 32px; 
        border: 3px solid rgba(255, 107, 94, 0.2); 
        border-radius: 50%; 
        border-top-color: ${THEME.primary}; 
        animation: brseOcrSpin 1s linear infinite;
        margin: 0 auto;
      "></div>
      <div style="font-size: 14px; font-weight: bold; color: ${THEME.primary}; margin-top: 10px; text-shadow: 0 0 8px rgba(255, 107, 94,0.3);">
        ĐANG CHỤP ẢNH TOÀN TRANG
      </div>
      <div id="brse-capture-progress-text" style="font-size: 12px; color: ${THEME.textMuted}; margin-top: 4px;">
        Đang chuẩn bị...
      </div>
      <div style="width: 100%; height: 6px; bg: rgba(0,0,0,0.3); background: ${THEME.surface}; border-radius: 10px; overflow: hidden; margin-top: 10px; border: 1px solid rgba(110, 112, 121, 0.4);">
        <div id="brse-capture-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, ${THEME.primary}, ${THEME.secondary}); border-radius: 10px; transition: width 0.2s ease;"></div>
      </div>
    </div>
    <style>
      @keyframes brseOcrSpin { to { transform: rotate(360deg); } }
    </style>
  `;
  document.body.appendChild(loading);

  const progressText = loading.querySelector('#brse-capture-progress-text');
  const progressBar = loading.querySelector('#brse-capture-progress-bar');

  // 2. Capture dimensions and save original scroll state
  const originalScrollTop = window.scrollY;
  const originalScrollLeft = window.scrollX;

  const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth);
  const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight);
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Set style overflow-y hidden temporarily on body to prevent double scrollbars during scrolling
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const captures = [];
  const totalSteps = Math.ceil(docHeight / viewportHeight);

  try {
    for (let i = 0; i < totalSteps; i++) {
      let scrollY = i * viewportHeight;
      // Step to exactly the bottom at the last step
      if (scrollY + viewportHeight > docHeight) {
        scrollY = docHeight - viewportHeight;
      }
      
      window.scrollTo(0, scrollY);
      
      // Allow 200ms to let visual assets, sticky headers, and lazy images load & settle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Update loader progress first
      const percent = Math.round(((i + 1) / totalSteps) * 100);
      progressText.innerText = `Đang cuộn chụp: ${percent}% (Bước ${i + 1}/${totalSteps})`;
      progressBar.style.width = `${percent}%`;

      // Hide the loading overlay from the viewport so it doesn't get captured in the screenshot
      loading.style.display = 'none';
      
      // Force repaint to make sure browser registers the hidden state
      await new Promise(resolve => requestAnimationFrame(resolve));

      const res = await safeSendMessage({ type: MESSAGE_TYPES.BRSE_CAPTURE_TAB });
      
      // Restore the loading overlay for the user
      loading.style.display = 'flex';

      if (res && res.dataUrl) {
        captures.push({
          y: scrollY,
          dataUrl: res.dataUrl
        });
      } else {
        throw new Error("Không thể chụp ảnh phân đoạn visible tab.");
      }
    }

    progressText.innerText = "Đang xử lý & ghép ảnh...";
    progressBar.style.width = "95%";
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. Perform canvas stitching
    const canvas = document.createElement('canvas');
    canvas.width = docWidth;
    canvas.height = docHeight;
    const ctx = canvas.getContext('2d');

    for (const cap of captures) {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.src = cap.dataUrl;
        img.onload = () => {
          // If the last step has overlaps, compute source clipping to draw cleanly
          if (cap.y + viewportHeight > docHeight && totalSteps > 1) {
            const overlap = (cap.y + viewportHeight) - docHeight;
            const drawHeight = viewportHeight - overlap;
            
            // Draw overlap part correctly from source
            ctx.drawImage(
              img, 
              0, overlap * (img.height / viewportHeight), img.width, drawHeight * (img.height / viewportHeight), // source
              0, cap.y + overlap, docWidth, drawHeight // destination
            );
          } else {
            ctx.drawImage(img, 0, cap.y, docWidth, viewportHeight);
          }
          resolve();
        };
        img.onerror = () => reject(new Error("Lỗi khi load phân đoạn ảnh."));
      });
    }

    // 4. Open the annotator so the user can mark up before saving.
    //    The annotator provides download / copy / attach-to-note actions.
    const dataUrl = canvas.toDataURL('image/png');

    // Restore scroll/overflow before showing the editor (finally also runs).
    loading.remove();
    document.body.style.overflow = originalOverflow;
    window.scrollTo(originalScrollLeft, originalScrollTop);

    openScreenshotAnnotator(dataUrl);
    showToast("📸 Đã chụp toàn trang — thêm chú thích rồi lưu/copy/đính Note.");
    return;

  } catch (err) {
    console.error("[FullPageCapture] Process failed:", err);
    showToast(`❌ Lỗi chụp toàn trang: ${err.message || "lỗi không xác định."}`);
  } finally {
    // 5. Cleanup loader, restore original scroll, overflow and viewport state
    loading.remove();
    document.body.style.overflow = originalOverflow;
    window.scrollTo(originalScrollLeft, originalScrollTop);
  }
}
