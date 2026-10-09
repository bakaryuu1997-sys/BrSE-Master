/**
 * BrSE OS Premium Color Picker & Interactive Color Dashboard
 * Features native browser EyeDropper API, multi-format conversion (HEX/RGB/HSL),
 * custom palette history saved in local storage, and real-time color adjustment.
 */

import { showToast } from './Toast.js';
import { BRSE_LAYER } from './layers.js';
import { THEME } from '../../shared/theme.js';

let activeDashboard = null;

// Conversion Utilities
function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToHsl(hex) {
  const cleanHex = hex.replace('#', '');
  let r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  let g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  let b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// History & Favorites Helpers
function getColorHistory() {
  try {
    const raw = localStorage.getItem('brse.colorHistory');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(hexColor) {
  let history = getColorHistory().filter(c => c !== hexColor);
  history.unshift(hexColor);
  history = history.slice(0, 5); // Keep last 5
  localStorage.setItem('brse.colorHistory', JSON.stringify(history));
  return history;
}

// Entry Point
export function startColorPicker() {
  if (!window.EyeDropper) {
    showToast("⚠️ Trình duyệt không hỗ trợ API EyeDropper native!");
    return;
  }

  const eyeDropper = new window.EyeDropper();
  eyeDropper.open()
    .then(result => {
      const hexColor = result.sRGBHex.toUpperCase();
      
      // Save color to clipboard first
      navigator.clipboard.writeText(hexColor)
        .then(() => {
          showToast(`🎨 Đã sao chép mã màu: ${hexColor}`);
          saveToHistory(hexColor);
          showColorDashboard(hexColor);
        })
        .catch(() => {
          saveToHistory(hexColor);
          showColorDashboard(hexColor);
        });
    })
    .catch(err => {
      console.log("[ColorPicker] Dropper cancelled or failed:", err.message);
    });
}

// Display Premium Dashboard
export function showColorDashboard(initialHex) {
  // If active dashboard exists, just update its color and don't re-create DOM
  if (activeDashboard) {
    updateDashboardColor(initialHex);
    return;
  }

  // Create elegant float wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'brse-color-dashboard';
  wrapper.className = 'brse-theme-container';
  Object.assign(wrapper.style, {
    position: 'fixed',
    bottom: '80px',
    right: '20px',
    zIndex: BRSE_LAYER.overlay,
    fontFamily: "'Outfit', 'Inter', sans-serif",
    userSelect: 'none',
    transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: '0',
    transform: 'translateY(10px) scale(0.95)'
  });

  document.body.appendChild(wrapper);
  activeDashboard = wrapper;

  renderDashboardSkeleton(wrapper, initialHex);
  updateDashboardColor(initialHex);

  // Draggable logic for the header (snappy, transition-free dragging)
  const card = wrapper.querySelector('.brse-card');
  const header = card ? card.querySelector('div') : null;
  if (header) {
    header.style.cursor = 'move';
    let startX, startY, initialLeft, initialTop;

    header.onmousedown = (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = wrapper.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      
      wrapper.style.bottom = 'auto';
      wrapper.style.right = 'auto';
      wrapper.style.left = `${initialLeft}px`;
      wrapper.style.top = `${initialTop}px`;
      
      const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        wrapper.style.left = `${initialLeft + dx}px`;
        wrapper.style.top = `${initialTop + dy}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      
      e.preventDefault();
    };
  }

  // Trigger smooth entrance animation
  requestAnimationFrame(() => {
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translateY(0) scale(1)';
  });
}

function renderDashboardSkeleton(wrapper, color) {
  wrapper.innerHTML = `
    <div class="brse-card" style="
      width: 290px;
      padding: 16px;
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
    ">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
        <span style="font-size: 13px; font-weight: bold; color: ${THEME.primary}; text-transform: uppercase; letter-spacing: 0.08em; display: flex; align-items: center; gap: 6px;">
          🎨 BẢNG MÀU BRSE
        </span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="brse-color-minimize" title="Thu nhỏ" style="background: none; border: none; color: ${THEME.textMuted}; cursor: pointer; font-size: 12px; padding: 2px;">➖</button>
          <button id="brse-color-close" title="Đóng" style="background: none; border: none; color: ${THEME.error}; cursor: pointer; font-size: 14px; padding: 2px; font-weight: bold;">✕</button>
        </div>
      </div>

      <!-- Color Preview Grid -->
      <div style="display: grid; grid-template-columns: 1fr 50px; gap: 10px;">
        <!-- Large preview rectangle -->
        <div id="brse-color-preview-box" style="
          height: 70px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);
          transition: background-color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span id="brse-color-preview-hex" style="
            background: rgba(0,0,0,0.6);
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            font-family: monospace;
            padding: 4px 8px;
            border-radius: 6px;
            letter-spacing: 0.05em;
          ">#FFFFFF</span>
        </div>

        <!-- Controls: Spectrums & Picker -->
        <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center;">
          <!-- Launcher Native Spectrum Picker -->
          <label style="
            width: 32px; height: 32px; 
            border-radius: 50%; 
            border: 1px solid rgba(255,255,255,0.3);
            background: linear-gradient(135deg, red, yellow, green, cyan, blue, magenta, red);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            transition: transform 0.2s;
          " title="Tự chọn màu tự do" class="spectrum-label">
            <input type="color" id="brse-color-native-input" style="opacity: 0; width: 0; height: 0; position: absolute; pointer-events: none;" />
            <span style="font-size: 10px;">🌈</span>
          </label>
          
          <!-- Launcher EyeDropper directly -->
          <button id="brse-color-redropper" title="Chấm lấy màu trên màn hình" style="
            width: 32px; height: 32px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.25);
            background: rgba(255,255,255,0.08);
            color: #5eead4;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            transition: all 0.2s;
          ">
            ✒️
          </button>
        </div>
      </div>

      <!-- Format Values List -->
      <div style="display: flex; flex-direction: column; gap: 8px;" id="brse-color-formats">
        <!-- HEX -->
        <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 4px 8px;">
          <span style="font-size: 10px; font-weight: bold; color: ${THEME.secondary}; width: 30px;">HEX</span>
          <input id="brse-val-hex" readonly style="flex: 1; background: none; border: none; outline: none; color: ${THEME.text}; font-family: monospace; font-size: 11px; padding: 2px;" value="#FFFFFF" />
          <button class="brse-color-copy-btn" data-target="brse-val-hex" style="background: none; border: none; color: ${THEME.primary}; cursor: pointer; font-size: 11px; padding: 2px;" title="Copy HEX">📋</button>
        </div>
        
        <!-- RGB -->
        <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 4px 8px;">
          <span style="font-size: 10px; font-weight: bold; color: ${THEME.primary}; width: 30px;">RGB</span>
          <input id="brse-val-rgb" readonly style="flex: 1; background: none; border: none; outline: none; color: ${THEME.text}; font-family: monospace; font-size: 11px; padding: 2px;" value="rgb(255, 255, 255)" />
          <button class="brse-color-copy-btn" data-target="brse-val-rgb" style="background: none; border: none; color: ${THEME.primary}; cursor: pointer; font-size: 11px; padding: 2px;" title="Copy RGB">📋</button>
        </div>

        <!-- HSL -->
        <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 4px 8px;">
          <span style="font-size: 10px; font-weight: bold; color: #4ec9a5; width: 30px;">HSL</span>
          <input id="brse-val-hsl" readonly style="flex: 1; background: none; border: none; outline: none; color: ${THEME.text}; font-family: monospace; font-size: 11px; padding: 2px;" value="hsl(0, 0%, 100%)" />
          <button class="brse-color-copy-btn" data-target="brse-val-hsl" style="background: none; border: none; color: ${THEME.primary}; cursor: pointer; font-size: 11px; padding: 2px;" title="Copy HSL">📋</button>
        </div>
      </div>

      <!-- History Palette -->
      <div>
        <div style="font-size: 10px; color: ${THEME.textMuted}; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">LỊCH SỬ MÀU GẦN ĐÂY</div>
        <div id="brse-color-history-grid" style="display: flex; gap: 10px; align-items: center; min-height: 24px;">
          <!-- History bubbles loaded dynamically -->
        </div>
      </div>
    </div>
  `;

  // Bind Actions
  const btnClose = wrapper.querySelector('#brse-color-close');
  btnClose.onclick = () => {
    closeColorDashboard();
  };

  const btnMinimize = wrapper.querySelector('#brse-color-minimize');
  btnMinimize.onclick = () => {
    const card = wrapper.querySelector('.brse-card');
    const isMinimized = card.style.height === '40px';
    if (isMinimized) {
      card.style.height = 'auto';
      card.style.overflow = 'visible';
      btnMinimize.innerText = '➖';
    } else {
      card.style.height = '40px';
      card.style.overflow = 'hidden';
      btnMinimize.innerText = '➕';
    }
  };

  const redropper = wrapper.querySelector('#brse-color-redropper');
  redropper.onclick = () => {
    startColorPicker();
  };

  // Spectrum picker change handler
  const nativeInput = wrapper.querySelector('#brse-color-native-input');
  nativeInput.oninput = (e) => {
    const nextVal = e.target.value.toUpperCase();
    updateDashboardColor(nextVal);
  };
  nativeInput.onchange = (e) => {
    const nextVal = e.target.value.toUpperCase();
    saveToHistory(nextVal);
    updateDashboardColor(nextVal);
  };

  // Bind Copy Buttons
  wrapper.querySelectorAll('.brse-color-copy-btn').forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.getAttribute('data-target');
      const input = wrapper.querySelector(`#${targetId}`);
      if (input) {
        navigator.clipboard.writeText(input.value)
          .then(() => {
            showToast(`📋 Đã copy: ${input.value}`);
            btn.innerText = '✔️';
            setTimeout(() => { btn.innerText = '📋'; }, 1000);
          });
      }
    };
  });
}

function updateDashboardColor(hexColor) {
  if (!activeDashboard) return;

  // Convert Formats
  const rgb = hexToRgb(hexColor);
  const hsl = hexToHsl(hexColor);

  // Update inputs
  activeDashboard.querySelector('#brse-color-preview-box').style.backgroundColor = hexColor;
  activeDashboard.querySelector('#brse-color-preview-hex').innerText = hexColor;
  activeDashboard.querySelector('#brse-val-hex').value = hexColor;
  activeDashboard.querySelector('#brse-val-rgb').value = rgb;
  activeDashboard.querySelector('#brse-val-hsl').value = hsl;
  
  const nativeInput = activeDashboard.querySelector('#brse-color-native-input');
  if (nativeInput) nativeInput.value = hexColor;

  // Render History
  const historyGrid = activeDashboard.querySelector('#brse-color-history-grid');
  if (historyGrid) {
    const history = getColorHistory();
    if (history.length === 0) {
      historyGrid.innerHTML = `<span style="font-size: 10px; color: ${THEME.textDim}; font-style: italic;">Chưa có lịch sử màu</span>`;
    } else {
      historyGrid.innerHTML = history.map(c => `
        <button class="brse-history-bubble" data-color="${c}" style="
          width: 24px; height: 24px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.2);
          background-color: ${c};
          cursor: pointer;
          transition: transform 0.2s;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        " title="${c}"></button>
      `).join('');

      // Bind history bubble clicks
      historyGrid.querySelectorAll('.brse-history-bubble').forEach(bub => {
        bub.onclick = () => {
          const clickedColor = bub.getAttribute('data-color');
          updateDashboardColor(clickedColor);
          showToast(`🎨 Chọn lại màu: ${clickedColor}`);
        };
        bub.onmouseenter = () => {
          bub.style.transform = 'scale(1.2)';
        };
        bub.onmouseleave = () => {
          bub.style.transform = 'scale(1)';
        };
      });
    }
  }
}

export function closeColorDashboard() {
  if (activeDashboard) {
    activeDashboard.style.opacity = '0';
    activeDashboard.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => {
      if (activeDashboard) {
        activeDashboard.remove();
        activeDashboard = null;
      }
    }, 300);
  }
}
