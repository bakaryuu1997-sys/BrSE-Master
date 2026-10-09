/**
 * BrSE OS Screenshot Annotator
 * Overlay editor for marking up a captured screenshot (pen, arrow, box,
 * highlight, text) before saving. Exports at the image's full natural
 * resolution, then downloads / copies / attaches to QuickNote.
 */

import { safeSendMessage } from '../utils/dom.js';
import { showToast } from './Toast.js';
import { BRSE_LAYER } from './layers.js';
import { THEME } from '../../shared/theme.js';
import { loadQuickNoteState, saveQuickNoteState } from './QuickNoteStore.js';
import { arrowHead, annotatedFilename, isMeaningfulDrag, toNatural } from '../../shared/annotateModel.js';

const COLORS = ['#ff5d6c', '#ffb454', '#ffb454', '#4ec9a5', '#ff6b5e'];
const TOOLS = [
  { id: 'select', label: '👆 Chọn' },
  { id: 'pen', label: '✏️ Bút' },
  { id: 'arrow', label: '➹ Mũi tên' },
  { id: 'box', label: '▭ Khung' },
  { id: 'highlight', label: '🖍️ Tô sáng' },
  { id: 'blur', label: '🌫️ Che mờ' },
  { id: 'crop', label: '✂️ Cắt' },
  { id: 'text', label: '🔤 Chữ' },
];

const FONT_SIZES = [16, 22, 32];
const FONT_SIZE_LABELS = ['A⁻', 'A', 'A⁺'];

export function openScreenshotAnnotator(imageDataUrl) {
  const baseImage = new Image();
  baseImage.onload = () => buildAnnotator(baseImage, imageDataUrl);
  baseImage.onerror = () => showToast('❌ Không tải được ảnh để chú thích.');
  baseImage.src = imageDataUrl;
}

function buildAnnotator(baseImage) {
  const naturalW = baseImage.naturalWidth;
  const naturalH = baseImage.naturalHeight;

  const root = document.createElement('div');
  root.id = 'brse-annotator-root';
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: BRSE_LAYER.overlay,
    background: 'rgba(18, 19, 22,0.9)', backdropFilter: 'blur(6px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'flex-start', overflowY: 'auto',
    gap: '8px', padding: '10px 12px', boxSizing: 'border-box',
    fontFamily: "'Outfit','Inter',sans-serif",
  });

  // Reserve space for toolbar (~56px) + footer (~52px) + gaps so the canvas
  // fits visible on small screens (e.g. 14" @ 768px height) without scrolling.
  const CHROME_OVERHEAD = 120;
  const maxW = Math.min(window.innerWidth * 0.96, naturalW);
  const maxH = Math.max(180, window.innerHeight - CHROME_OVERHEAD);
  const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
  const displayW = Math.round(naturalW * scale);
  const displayH = Math.round(naturalH * scale);

  const toolbar = document.createElement('div');
  const compact = window.innerHeight < 800;
  Object.assign(toolbar.style, {
    display: 'flex', flexWrap: 'wrap', gap: compact ? '4px' : '6px', alignItems: 'center',
    background: 'rgba(29, 30, 34,0.96)', border: `1px solid ${THEME.border || 'rgba(255, 107, 94,0.3)'}`,
    borderRadius: '10px', padding: compact ? '5px 8px' : '8px 10px',
    maxWidth: `${displayW}px`, width: '100%', boxSizing: 'border-box',
  });

  let activeTool = 'arrow';
  let activeColor = COLORS[0];
  let activeFontSize = 22;

  const toolButtons = TOOLS.map((tool) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = tool.label;
    btn.dataset.tool = tool.id;
    styleChip(btn, tool.id === activeTool, compact);
    btn.onclick = () => {
      activeTool = tool.id;
      selectedIndex = -1;
      toolButtons.forEach((b) => styleChip(b, b.dataset.tool === activeTool, compact));
      redraw();
    };
    toolbar.appendChild(btn);
    return btn;
  });

  const sep = document.createElement('div');
  Object.assign(sep.style, { width: '1px', height: '20px', background: 'rgba(110, 112, 121,0.4)' });
  toolbar.appendChild(sep);

  COLORS.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    Object.assign(swatch.style, {
      width: '20px', height: '20px', borderRadius: '50%', background: color,
      border: color === activeColor ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer',
    });
    swatch.onclick = () => {
      activeColor = color;
      colorSwatches.forEach((s) => { s.style.border = s.dataset.color === activeColor ? '2px solid #fff' : '2px solid transparent'; });
    };
    swatch.dataset.color = color;
    toolbar.appendChild(swatch);
    return swatch;
  });
  const colorSwatches = [...toolbar.querySelectorAll('button[data-color]')];

  // Font-size control for the Text tool.
  const sizeSep = document.createElement('div');
  Object.assign(sizeSep.style, { width: '1px', height: '20px', background: 'rgba(110, 112, 121,0.4)' });
  toolbar.appendChild(sizeSep);
  const sizeButtons = FONT_SIZES.map((px, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = FONT_SIZE_LABELS[i];
    btn.dataset.size = String(px);
    btn.title = `Cỡ chữ ${px}px`;
    styleChip(btn, px === activeFontSize);
    btn.onclick = () => {
      activeFontSize = px;
      sizeButtons.forEach((b) => styleChip(b, Number(b.dataset.size) === activeFontSize));
    };
    toolbar.appendChild(btn);
    return btn;
  });

  const actions = document.createElement('div');
  Object.assign(actions.style, { display: 'flex', gap: '6px', marginLeft: 'auto' });
  const btnUndo = actionButton('↩︎ Hoàn tác');
  const btnRedo = actionButton('↪︎ Làm lại');
  const btnClear = actionButton('🗑️ Xóa hết');
  toolbar.appendChild(actions);
  actions.appendChild(btnUndo);
  actions.appendChild(btnRedo);
  actions.appendChild(btnClear);

  const canvas = document.createElement('canvas');
  canvas.width = displayW;
  canvas.height = displayH;
  Object.assign(canvas.style, {
    borderRadius: '8px', boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
    cursor: 'crosshair', touchAction: 'none', background: '#fff',
  });
  const ctx = canvas.getContext('2d');

  const footer = document.createElement('div');
  Object.assign(footer.style, { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' });
  const btnDownload = footerButton('💾 Tải về', true);
  const btnCopy = footerButton('📋 Copy ảnh', false);
  const btnNote = footerButton('🗒️ Vào Note', false);
  const btnClose = footerButton('✕ Đóng', false);
  footer.append(btnDownload, btnCopy, btnNote, btnClose);

  root.append(toolbar, canvas, footer);
  document.body.appendChild(root);

  // --- drawing state ---
  let shapes = [];
  let drawing = null;     // current in-progress shape
  let selectedIndex = -1; // selected shape index (Select tool)
  let selDrag = null;     // { mode:'move'|'resize', handle, start, orig }
  let selMoved = false;   // whether the current select-drag actually changed anything

  // Snapshot-based history so undo/redo covers add / move / resize / delete / clear.
  const cloneShapes = (arr) => arr.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }));
  let history = [[]];
  let historyIndex = 0;
  function pushHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(cloneShapes(shapes));
    historyIndex = history.length - 1;
  }
  function restoreHistory() {
    shapes = cloneShapes(history[historyIndex]);
    selectedIndex = -1;
    selDrag = null;
    redraw();
  }

  function hitShapeIndex(p) {
    for (let i = shapes.length - 1; i >= 0; i -= 1) {
      const b = shapeBounds(shapes[i]);
      const pad = 6;
      if (p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad) {
        return i;
      }
    }
    return -1;
  }

  function commitShape(shape) {
    shapes.push(shape);
    pushHistory();
  }
  function doUndo() {
    if (historyIndex === 0) return;
    historyIndex -= 1;
    restoreHistory();
  }
  function doRedo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    restoreHistory();
  }

  function redraw() {
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(baseImage, 0, 0, displayW, displayH);
    [...shapes, drawing].filter(Boolean).forEach((shape) => drawShape(ctx, shape, scale, baseImage));
    if (selectedIndex >= 0 && shapes[selectedIndex]) {
      const b = shapeBounds(shapes[selectedIndex]);
      ctx.save();
      ctx.strokeStyle = '#ff6b5e';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale);
      ctx.setLineDash([]);
      if (isResizable(shapes[selectedIndex])) {
        ctx.fillStyle = '#ff6b5e';
        handlePoints(b).forEach((h) => ctx.fillRect(h.x * scale - 4, h.y * scale - 4, 8, 8));
      }
      ctx.restore();
    }
  }
  redraw();

  function localPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return toNatural({ x: e.clientX - rect.left, y: e.clientY - rect.top }, scale);
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (activeTool === 'text') {
      // Prevent the canvas from grabbing focus back, which previously made the
      // text input blur (and auto-commit empty) the instant it appeared.
      e.preventDefault();
      placeTextInput(e);
      return;
    }
    if (activeTool === 'select') {
      const sp = localPoint(e);
      if (selectedIndex >= 0 && isResizable(shapes[selectedIndex])) {
        const tol = 10 / scale;
        const hs = handlePoints(shapeBounds(shapes[selectedIndex]));
        const hi = hs.findIndex((h) => Math.abs(h.x - sp.x) <= tol && Math.abs(h.y - sp.y) <= tol);
        if (hi >= 0) {
          canvas.setPointerCapture(e.pointerId);
          selDrag = { mode: 'resize', handle: hi, start: sp, orig: shapes[selectedIndex].points.map((pt) => ({ ...pt })) };
          return;
        }
      }
      selectedIndex = hitShapeIndex(sp);
      if (selectedIndex >= 0) {
        canvas.setPointerCapture(e.pointerId);
        selDrag = { mode: 'move', start: sp, orig: shapes[selectedIndex].points.map((pt) => ({ ...pt })) };
      }
      redraw();
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    const p = localPoint(e);
    drawing = { type: activeTool, color: activeColor, points: [p, p] };
    if (activeTool === 'pen') drawing.points = [p];
  });
  canvas.addEventListener('pointermove', (e) => {
    if (selDrag && selectedIndex >= 0) {
      selMoved = true;
      const p = localPoint(e);
      const dx = p.x - selDrag.start.x;
      const dy = p.y - selDrag.start.y;
      const shape = shapes[selectedIndex];
      if (selDrag.mode === 'move') {
        shape.points = selDrag.orig.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
      } else {
        const [oa, ob] = selDrag.orig;
        let left = Math.min(oa.x, ob.x);
        let top = Math.min(oa.y, ob.y);
        let right = Math.max(oa.x, ob.x);
        let bottom = Math.max(oa.y, ob.y);
        if (selDrag.handle === 0) { left += dx; top += dy; }
        else if (selDrag.handle === 1) { right += dx; top += dy; }
        else if (selDrag.handle === 2) { right += dx; bottom += dy; }
        else { left += dx; bottom += dy; }
        shape.points = [{ x: left, y: top }, { x: right, y: bottom }];
      }
      redraw();
      return;
    }
    if (!drawing) return;
    const p = localPoint(e);
    if (drawing.type === 'pen') drawing.points.push(p);
    else drawing.points[1] = p;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (selDrag) {
      selDrag = null;
      if (selMoved) { selMoved = false; pushHistory(); }
      redraw();
      return;
    }
    if (!drawing) return;
    const pts = drawing.points;
    if (drawing.type === 'crop') {
      const rect = drawing.points.slice();
      const ok = isMeaningfulDrag(pts[0], pts[1]);
      drawing = null;
      redraw();
      if (ok) cropTo(rect);
      return;
    }
    const keep = drawing.type === 'pen' ? pts.length > 1 : isMeaningfulDrag(pts[0], pts[1]);
    if (keep) commitShape(drawing);
    drawing = null;
    redraw();
  });

  // Bake the current image + annotations, then crop to the selected region and
  // reopen the editor on the cropped result (annotations are preserved).
  function cropTo(rectPoints) {
    const [a, b] = rectPoints;
    const nx = Math.round(Math.min(a.x, b.x));
    const ny = Math.round(Math.min(a.y, b.y));
    const nw = Math.round(Math.abs(b.x - a.x));
    const nh = Math.round(Math.abs(b.y - a.y));
    if (nw < 4 || nh < 4) return;
    const fullUrl = exportDataUrl();
    const baked = new Image();
    baked.onload = () => {
      const out = document.createElement('canvas');
      out.width = nw;
      out.height = nh;
      out.getContext('2d').drawImage(baked, nx, ny, nw, nh, 0, 0, nw, nh);
      const cropped = out.toDataURL('image/png');
      document.removeEventListener('keydown', onKeydown);
      root.remove();
      openScreenshotAnnotator(cropped);
    };
    baked.src = fullUrl;
  }

  function placeTextInput(e) {
    const rect = canvas.getBoundingClientRect();
    const area = document.createElement('textarea');
    area.rows = 1;
    area.placeholder = 'Nhập chữ — Enter xuống dòng, Ctrl+Enter xong';
    const displayFont = Math.max(12, activeFontSize * scale);
    Object.assign(area.style, {
      position: 'fixed', left: `${e.clientX}px`, top: `${e.clientY}px`, zIndex: BRSE_LAYER.overlayResult,
      font: `700 ${displayFont}px Outfit, sans-serif`, lineHeight: '1.25', color: activeColor,
      background: 'rgba(0,0,0,0.6)', border: `1px solid ${activeColor}`, borderRadius: '6px',
      padding: '4px 6px', outline: 'none', resize: 'both', overflow: 'hidden',
      minWidth: '80px', minHeight: `${displayFont + 12}px`, whiteSpace: 'pre',
    });
    const natural = toNatural({ x: e.clientX - rect.left, y: e.clientY - rect.top }, scale);
    const fontSize = activeFontSize;
    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const text = area.value.replace(/\s+$/, '');
      if (text) {
        commitShape({ type: 'text', color: activeColor, points: [natural], text, fontSize });
        redraw();
      }
      area.remove();
    };
    const autoGrow = () => { area.style.height = 'auto'; area.style.height = `${area.scrollHeight}px`; };
    area.addEventListener('input', autoGrow);
    area.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); commit(); }
      else if (ev.key === 'Escape') { committed = true; area.remove(); }
    });
    area.addEventListener('blur', commit);
    document.body.appendChild(area);
    autoGrow();
    // Defer focus past the in-flight pointerdown so the browser does not move
    // focus back to the canvas and blur (auto-commit) the empty box.
    setTimeout(() => area.focus(), 0);
  }

  btnUndo.onclick = doUndo;
  btnRedo.onclick = doRedo;
  btnClear.onclick = () => { shapes = []; selectedIndex = -1; pushHistory(); redraw(); };

  // Keyboard: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z = redo.
  // Bubble phase so typing inside the text input (which stops propagation) keeps
  // native text undo instead of undoing canvas shapes.
  function onKeydown(e) {
    if (e.key === 'Delete' && selectedIndex >= 0) {
      e.preventDefault();
      shapes.splice(selectedIndex, 1);
      selectedIndex = -1;
      pushHistory();
      redraw();
      return;
    }
    if (!e.ctrlKey && !e.metaKey) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      doUndo();
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      doRedo();
    }
  }
  document.addEventListener('keydown', onKeydown);

  function exportDataUrl() {
    const out = document.createElement('canvas');
    out.width = naturalW;
    out.height = naturalH;
    const octx = out.getContext('2d');
    octx.drawImage(baseImage, 0, 0, naturalW, naturalH);
    shapes.forEach((shape) => drawShape(octx, shape, 1, baseImage));
    return out.toDataURL('image/png');
  }

  btnDownload.onclick = async () => {
    await safeSendMessage({ type: 'BRSE_DOWNLOAD_FILE', url: exportDataUrl(), filename: annotatedFilename(window.location.hostname) });
    showToast('💾 Đã lưu ảnh có chú thích vào Downloads.');
  };
  btnCopy.onclick = () => {
    exportToBlob(exportDataUrl(), async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('📋 Đã copy ảnh có chú thích vào clipboard.');
      } catch {
        showToast('⚠️ Trình duyệt chặn copy ảnh — hãy dùng Tải về.');
      }
    });
  };
  btnNote.onclick = async () => {
    try {
      const dataUrl = exportDataUrl();
      const state = await loadQuickNoteState();
      const active = state.notes.find((n) => n.id === state.activeId) || state.notes[0];
      active.images = [...(active.images || []), {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: annotatedFilename(window.location.hostname),
        dataUrl,
        createdAt: new Date().toISOString(),
      }];
      active.updatedAt = Date.now();
      await saveQuickNoteState(state);
      window.dispatchEvent(new CustomEvent('brse-quicknotes-update'));
      showToast('🗒️ Đã đính ảnh chú thích vào Quick Note.');
    } catch (err) {
      showToast(`❌ Không lưu được vào Note: ${err.message}`);
    }
  };
  btnClose.onclick = () => {
    document.removeEventListener('keydown', onKeydown);
    root.remove();
  };
}

function exportToBlob(dataUrl, cb) {
  fetch(dataUrl).then((r) => r.blob()).then(cb).catch(() => showToast('⚠️ Không tạo được ảnh.'));
}

function drawShape(ctx, shape, scale, baseImage) {
  const pts = shape.points.map((p) => ({ x: p.x * scale, y: p.y * scale }));
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (shape.type === 'pen') {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  } else if (shape.type === 'box') {
    const [a, b] = pts;
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (shape.type === 'highlight') {
    const [a, b] = pts;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (shape.type === 'arrow') {
    const [a, b] = pts;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const head = arrowHead(a, b, Math.max(12, 14 * scale));
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    head.forEach((h) => ctx.lineTo(h.x, h.y));
    ctx.closePath();
    ctx.fill();
  } else if (shape.type === 'blur') {
    drawMosaic(ctx, shape, scale, baseImage);
  } else if (shape.type === 'crop') {
    const [a, b] = pts;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (shape.type === 'text') {
    const [p] = pts;
    const fs = Math.max(12, (shape.fontSize || 18) * scale);
    ctx.font = `700 ${fs}px Outfit, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.lineWidth = Math.max(3, fs / 5);
    ctx.lineJoin = 'round';
    const lineHeight = fs * 1.25;
    String(shape.text).split('\n').forEach((line, i) => {
      const y = p.y + i * lineHeight;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(line, p.x, y);
      ctx.fillStyle = shape.color;
      ctx.fillText(line, p.x, y);
    });
  }
  ctx.restore();
}

// --- Geometry helpers for the Select tool (move/resize placed shapes) ---
function shapeBounds(shape) {
  const xs = shape.points.map((p) => p.x);
  const ys = shape.points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  let w = Math.max(...xs) - x;
  let h = Math.max(...ys) - y;
  if (shape.type === 'text') {
    const fs = shape.fontSize || 18;
    const lines = String(shape.text || '').split('\n');
    const longest = lines.reduce((m, l) => Math.max(m, l.length), 1);
    w = Math.max(w, longest * fs * 0.62);
    h = Math.max(h, lines.length * fs * 1.25);
  }
  return { x, y, w: Math.max(w, 6), h: Math.max(h, 6) };
}

function isResizable(shape) {
  return shape.type === 'box' || shape.type === 'highlight' || shape.type === 'blur';
}

function handlePoints(b) {
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ];
}

// Pixelate (mosaic) a region from the original image — used by the Blur tool to
// hide sensitive info. Works at any scale (display redraw and full-res export).
function drawMosaic(ctx, shape, scale, baseImage) {
  const [a, b] = shape.points; // natural coordinates
  const nx = Math.min(a.x, b.x);
  const ny = Math.min(a.y, b.y);
  const nw = Math.abs(b.x - a.x);
  const nh = Math.abs(b.y - a.y);
  if (nw < 2 || nh < 2 || !baseImage) return;
  const block = Math.max(6, Math.round(Math.min(nw, nh) / 12));
  const tw = Math.max(1, Math.round(nw / block));
  const th = Math.max(1, Math.round(nh / block));
  const tmp = document.createElement('canvas');
  tmp.width = tw;
  tmp.height = th;
  tmp.getContext('2d').drawImage(baseImage, nx, ny, nw, nh, 0, 0, tw, th);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, tw, th, nx * scale, ny * scale, nw * scale, nh * scale);
  ctx.restore();
}

function styleChip(btn, active, compact = false) {
  Object.assign(btn.style, {
    background: active ? 'rgba(255, 107, 94,0.25)' : 'transparent',
    border: `1px solid ${active ? 'rgba(255, 107, 94,0.5)' : 'rgba(110, 112, 121,0.3)'}`,
    color: active ? '#fff' : (THEME.textMuted || '#a2a3aa'),
    fontSize: compact ? '11px' : '12px',
    fontWeight: '700',
    padding: compact ? '3px 6px' : '5px 9px',
    borderRadius: '7px', cursor: 'pointer',
  });
}

function actionButton(label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  Object.assign(btn.style, {
    background: 'transparent', border: '1px solid rgba(110, 112, 121,0.3)', color: THEME.textMuted || '#a2a3aa',
    fontSize: '12px', fontWeight: '700', padding: '5px 9px', borderRadius: '8px', cursor: 'pointer',
  });
  return btn;
}

function footerButton(label, primary) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  Object.assign(btn.style, {
    background: primary ? `linear-gradient(90deg, ${THEME.primary}, ${THEME.secondary})` : 'rgba(29, 30, 34,0.96)',
    border: `1px solid ${primary ? 'transparent' : 'rgba(255, 107, 94,0.3)'}`,
    color: primary ? '#121316' : (THEME.text || '#ededf0'),
    fontSize: '13px', fontWeight: '800', padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
  });
  return btn;
}
