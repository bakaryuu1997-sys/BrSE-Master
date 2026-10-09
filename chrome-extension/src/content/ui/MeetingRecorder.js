"use strict";

import { injectThemeTokens } from '../../shared/theme.js';
import { safeSendMessage } from '../utils/dom.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { showToast } from './Toast.js';
import { getApiBase, getAuthHeaders } from '../../shared/api.js';

let systemStream = null;
let micStream = null;
let audioCtx = null;
let dest = null;
let mediaRecorder = null;
let chunks = [];
let recordStartTime = null;
let timerInterval = null;

let floatingTriggerEl = null;
let floatingRecorderEl = null;

export function initMeetingRecorder() {
  const hostname = window.location.hostname;
  const isMeetingPage = hostname.includes('meet.google.com') || 
                        hostname.includes('zoom.us') || 
                        hostname.includes('teams.microsoft.com') ||
                        hostname.includes('teams.live.com');

  if (isMeetingPage) {
    injectMeetingTrigger();
  }

  // Handle message from sidepanel/background script
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "BRSE_START_MEETING_RECORD") {
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        startMeetingRecording();
      } else {
        showToast("⚠️ Cuộc họp đã đang được ghi âm!");
      }
      if (sendResponse) sendResponse({ ok: true });
    } else if (msg.type === "BRSE_STOP_MEETING_RECORD") {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        stopMeetingRecording();
      }
      if (sendResponse) sendResponse({ ok: true });
    }
    return false;
  });
}

function injectMeetingTrigger() {
  const existing = document.getElementById('brse-meeting-trigger-root');
  if (existing) existing.remove();

  floatingTriggerEl = document.createElement('div');
  floatingTriggerEl.id = 'brse-meeting-trigger-root';
  Object.assign(floatingTriggerEl.style, {
    position: 'fixed',
    bottom: '80px',
    right: '24px',
    zIndex: '1000000',
    pointerEvents: 'auto'
  });

  const shadow = floatingTriggerEl.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = `
    .trigger-btn {
      background: rgba(29, 30, 34, 0.95);
      border: 1.5px solid var(--brse-error);
      border-radius: 30px;
      color: var(--brse-error);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 800;
      padding: 10px 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 93, 108, 0.3);
      backdrop-filter: blur(10px);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      user-select: none;
      outline: none;
    }
    .trigger-btn:hover {
      background: rgba(35, 37, 41, 0.98);
      border-color: var(--brse-accent);
      color: var(--brse-accent);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 180, 84, 0.5);
      transform: translateY(-2px);
    }
    .trigger-btn:active {
      transform: translateY(1px);
    }
    .pulse-icon {
      width: 10px;
      height: 10px;
      background: var(--brse-error);
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(255, 93, 108, 0.7);
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(255, 93, 108, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 6px rgba(255, 93, 108, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(255, 93, 108, 0);
      }
    }
  `;

  const btn = document.createElement('button');
  btn.className = 'trigger-btn';
  btn.innerHTML = `<span class="pulse-icon"></span>🔴 Record Meeting`;
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    startMeetingRecording();
  };

  shadow.appendChild(style);
  shadow.appendChild(btn);
  document.body.appendChild(floatingTriggerEl);
}

async function startMeetingRecording() {
  try {
    showToast("🎙️ Đang khởi động hệ thống ghi âm...");

    // 1. Get system/tab audio
    systemStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1, height: 1 },
      audio: true
    });

    if (systemStream.getAudioTracks().length === 0) {
      systemStream.getTracks().forEach(t => t.stop());
      throw new Error("Bạn PHẢI chọn 'Chia sẻ âm thanh hệ thống/tab' (Share tab/system audio) để ghi âm tiếng khách hàng!");
    }

    // 2. Get microphone audio
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.warn("[MeetingRecorder] Microphone access denied or unavailable:", e);
      showToast("⚠️ Không truy cập được Mic. Chỉ ghi âm âm thanh hệ thống.");
    }

    // 3. Mix streams via AudioContext
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    dest = audioCtx.createMediaStreamDestination();

    if (systemStream && systemStream.getAudioTracks().length > 0) {
      const sysSource = audioCtx.createMediaStreamSource(systemStream);
      sysSource.connect(dest);
    }

    if (micStream && micStream.getAudioTracks().length > 0) {
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(dest);
    }

    const mixedStream = dest.stream;

    // 4. Instantiate MediaRecorder
    mediaRecorder = new MediaRecorder(mixedStream, { mimeType: 'audio/webm' });
    chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      await handleRecordingStop();
    };

    mediaRecorder.start(1000); // chunk every second
    recordStartTime = Date.now();

    // Hide the basic floating trigger
    if (floatingTriggerEl) {
      floatingTriggerEl.style.display = 'none';
    }

    // Show beautiful active recorder console
    showFloatingRecorder();
    startTimer();

    showToast("🔴 Cuộc họp đang được ghi âm song song!");
  } catch (err) {
    showToast("✕ Lỗi ghi âm: " + err.message);
    console.error("[MeetingRecorder] Start failed:", err);
    cleanupTracks();
    if (floatingTriggerEl) {
      floatingTriggerEl.style.display = 'block';
    }
  }
}

function showFloatingRecorder() {
  const existing = document.getElementById('brse-meeting-recorder-root');
  if (existing) existing.remove();

  floatingRecorderEl = document.createElement('div');
  floatingRecorderEl.id = 'brse-meeting-recorder-root';
  Object.assign(floatingRecorderEl.style, {
    position: 'fixed',
    bottom: '80px',
    right: '24px',
    zIndex: '10000000',
    pointerEvents: 'auto'
  });

  const shadow = floatingRecorderEl.attachShadow({ mode: 'open' });
  injectThemeTokens(shadow);
  const style = document.createElement('style');
  style.textContent = `
    .recorder-card {
      background: rgba(29, 30, 34, 0.96);
      border: 1.5px solid var(--brse-secondary);
      border-radius: 14px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(255, 138, 125, 0.25);
      padding: 12px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--brse-text);
      display: flex;
      align-items: center;
      gap: 14px;
      backdrop-filter: blur(12px);
      width: 280px;
      box-sizing: border-box;
      animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes slideIn {
      from { transform: translateY(15px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .recorder-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .recorder-title {
      font-size: 11px;
      font-weight: 800;
      color: var(--brse-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .recorder-timer {
      font-size: 18px;
      font-weight: 900;
      color: #ffffff;
      font-family: monospace;
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
    }
    
    .pulse-dot {
      width: 14px;
      height: 14px;
      background: var(--brse-error);
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(255, 93, 108, 0.6);
      animation: recordPulse 1.2s infinite;
      flex-shrink: 0;
    }
    @keyframes recordPulse {
      0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(255, 93, 108, 0.6); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(255, 93, 108, 0); }
      100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(255, 93, 108, 0); }
    }
    
    .stop-btn {
      background: var(--brse-error);
      border: none;
      color: var(--brse-surface);
      font-size: 11.5px;
      font-weight: 800;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(255, 93, 108, 0.35);
      transition: all 0.2s ease;
      outline: none;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .stop-btn:hover {
      background: #ff5d6c;
      transform: scale(1.03);
      box-shadow: 0 6px 16px rgba(255, 93, 108, 0.5);
    }
    .stop-btn:active {
      transform: scale(0.97);
    }
    .square-icon {
      width: 8px;
      height: 8px;
      background: var(--brse-surface);
      display: inline-block;
      border-radius: 1px;
    }
    .recorder-card.completed {
      width: 320px;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      border-color: var(--brse-success, #4ec9a5);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.75), 0 0 25px rgba(78, 201, 165, 0.25);
    }
    .completed-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .check-icon {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--brse-success, #4ec9a5);
      color: #121316;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 15px;
      flex-shrink: 0;
    }
    .completed-title {
      font-size: 13px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.3px;
    }
    .completed-sub {
      font-size: 11px;
      color: var(--brse-secondary, #ff8a7d);
      margin-top: 2px;
    }
    .completed-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .action-btn-primary {
      background: linear-gradient(135deg, #4ec9a5 0%, #2bb88e 100%);
      color: #121316;
      border: none;
      border-radius: 8px;
      font-weight: 800;
      font-size: 12px;
      padding: 10px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(78, 201, 165, 0.35);
    }
    .action-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(78, 201, 165, 0.5);
    }
    .action-btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--brse-text, #e2e8f0);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 8px;
      font-weight: 700;
      font-size: 11.5px;
      padding: 9px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .action-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .action-btn-close {
      background: transparent;
      color: var(--brse-text-muted, #94a3b8);
      border: none;
      font-size: 11px;
      padding: 4px;
      cursor: pointer;
      text-align: center;
      transition: color 0.2s;
    }
    .action-btn-close:hover {
      color: #ffffff;
    }
  `;

  const container = document.createElement('div');
  container.className = 'recorder-card';

  container.innerHTML = `
    <div class="pulse-dot" id="pulse-dot"></div>
    <div class="recorder-info">
      <span class="recorder-title">GHI ÂM CUỘC HỌP</span>
      <span class="recorder-timer" id="recorder-timer">00:00</span>
    </div>
    <button class="stop-btn" id="btn-stop-rec">
      <span class="square-icon"></span> Dừng
    </button>
  `;

  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(floatingRecorderEl);

  shadow.getElementById('btn-stop-rec').onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    stopMeetingRecording();
  };
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!recordStartTime || !floatingRecorderEl) return;
    const diff = Date.now() - recordStartTime;
    const mins = Math.floor(diff / 60000).toString().padStart(2, '0');
    const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    
    const timerText = floatingRecorderEl.shadowRoot.getElementById('recorder-timer');
    if (timerText) {
      timerText.innerText = `${mins}:${secs}`;
    }
  }, 1000);
}

function stopMeetingRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function handleRecordingStop() {
  clearInterval(timerInterval);

  const audioBlob = new Blob(chunks, { type: 'audio/webm' });
  chunks = [];

  // Cleanup all recording resources
  cleanupTracks();

  // Change UI to saving/uploading state
  if (floatingRecorderEl) {
    const timerText = floatingRecorderEl.shadowRoot.getElementById('recorder-timer');
    if (timerText) {
      timerText.innerText = "ĐANG LƯU...";
      timerText.style.color = "var(--brse-primary)";
      timerText.style.fontSize = "13px";
      timerText.style.textShadow = "0 0 8px rgba(255, 107, 94, 0.4)";
    }
    const pulseDot = floatingRecorderEl.shadowRoot.getElementById('pulse-dot');
    if (pulseDot) {
      pulseDot.style.background = "var(--brse-primary)";
      pulseDot.style.boxShadow = "none";
      pulseDot.style.animation = "none";
    }
    const stopBtn = floatingRecorderEl.shadowRoot.getElementById('btn-stop-rec');
    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.innerText = "Đang xử lý...";
      stopBtn.style.background = "var(--brse-text-dim)";
      stopBtn.style.color = "var(--brse-text-muted)";
      stopBtn.style.boxShadow = "none";
      stopBtn.style.cursor = "not-allowed";
    }
  }

  const originalFilename = `meeting_live_${Date.now()}.webm`;
  let savedDownloadId = null;

  // 1. Convert blob to DataURL and save locally via chrome.downloads
  try {
    const audioDataUrl = await blobToDataUrl(audioBlob);
    const saveRes = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.BRSE_SAVE_AND_SHOW_RECORDING,
        audioDataUrl: audioDataUrl,
        filename: originalFilename
      }, (res) => resolve(res || {}));
    });

    if (saveRes && saveRes.ok && saveRes.downloadId) {
      savedDownloadId = saveRes.downloadId;
    }
  } catch (err) {
    console.warn("[MeetingRecorder] Local download failed:", err);
  }

  // 2. Upload meeting recording to Backend in background
  let uploadResult = null;
  try {
    showToast("⏳ Đang tải file lên Backend & lưu vào máy...");

    const apiBase = await getApiBase();
    const headers = await getAuthHeaders();
    
    // Boundary generated automatically for multipart/form-data
    const uploadHeaders = { ...headers };
    delete uploadHeaders["Content-Type"];

    const formData = new FormData();
    formData.append("file", audioBlob, originalFilename);
    formData.append("language", "ja"); // default to Japanese since BrSE meetings are customer-facing
    formData.append("template", "meeting");

    const response = await fetch(`${apiBase}/meetings/upload`, {
      method: "POST",
      headers: uploadHeaders,
      body: formData
    });

    if (response.ok) {
      uploadResult = await response.json();
    }
  } catch (err) {
    console.warn("[MeetingRecorder] Upload to backend failed:", err);
  }

  // 3. Render completed card with click-to-open folder button
  if (floatingRecorderEl && floatingRecorderEl.shadowRoot) {
    const shadow = floatingRecorderEl.shadowRoot;
    const cardEl = shadow.querySelector('.recorder-card');
    if (cardEl) {
      cardEl.className = 'recorder-card completed';
      cardEl.innerHTML = `
        <div class="completed-header">
          <div class="check-icon">✓</div>
          <div>
            <div class="completed-title">ĐÃ LƯU BẢN GHI ÂM!</div>
            <div class="completed-sub">Đã lưu: Downloads/BrSE_Meetings/${originalFilename}</div>
          </div>
        </div>
        <div class="completed-actions">
          <button class="action-btn-primary" id="btn-open-folder" title="Mở trực tiếp thư mục chứa file ghi âm trong File Explorer">
            📂 Mở thư mục chứa ghi âm (Click để mở)
          </button>
          <button class="action-btn-secondary" id="btn-open-webapp" title="Xem biên bản cuộc họp và xử lý AI trên BrSE OS">
            📝 Xem biên bản cuộc họp trên BrSE OS
          </button>
          <button class="action-btn-close" id="btn-close-completed">
            ✕ Đóng thông báo
          </button>
        </div>
      `;

      // Handle folder open button
      const openFolderBtn = shadow.getElementById('btn-open-folder');
      if (openFolderBtn) {
        openFolderBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.BRSE_SHOW_RECORDING_FOLDER,
            downloadId: savedDownloadId
          });
          showToast("📂 Đang mở thư mục chứa file ghi âm trong File Explorer...");
        };
      }

      // Handle Web App redirect button
      const openWebappBtn = shadow.getElementById('btn-open-webapp');
      if (openWebappBtn) {
        openWebappBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetUrl = uploadResult?.id 
            ? `http://127.0.0.1:3010/app/meeting-note?job_id=${uploadResult.id}`
            : "http://127.0.0.1:3010/app/meeting-note";
          window.open(targetUrl, "_blank");
          removeFloatingRecorder();
        };
      }

      // Handle close button
      const closeBtn = shadow.getElementById('btn-close-completed');
      if (closeBtn) {
        closeBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          removeFloatingRecorder();
        };
      }

      // Auto-trigger folder highlight once for immediate convenience
      if (savedDownloadId) {
        try {
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.BRSE_SHOW_RECORDING_FOLDER,
            downloadId: savedDownloadId
          });
        } catch (_) {}
      }

      showToast("✨ Ghi âm hoàn tất! Click nút để mở thư mục chứa file ghi âm.");
      return;
    }
  }

  showToast("✨ Đã lưu file ghi âm cuộc họp thành công!");
  removeFloatingRecorder();
}

function removeFloatingRecorder() {
  if (floatingRecorderEl) {
    floatingRecorderEl.remove();
    floatingRecorderEl = null;
  }
  // Restore basic trigger
  if (floatingTriggerEl) {
    floatingTriggerEl.style.display = 'block';
  }
}

function cleanupTracks() {
  if (systemStream) {
    systemStream.getTracks().forEach(t => t.stop());
    systemStream = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (audioCtx && audioCtx.state !== 'closed') {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  dest = null;
  mediaRecorder = null;
}
