"use strict";

export const DEFAULT_QUICK_BOX_SIZE = {
  width: 800,
  height: 620,
};

export function getInitialQuickBoxFrame(selectionRect, options = {}, viewport = window) {
  const { width, height } = DEFAULT_QUICK_BOX_SIZE;
  const centerRequested = options.action === "summary"
    || options.tab === "chat"
    || isSyntheticCenterRect(selectionRect, viewport);

  if (centerRequested) {
    return {
      top: Math.max(20, (viewport.innerHeight - height) / 2),
      left: Math.max(20, (viewport.innerWidth - width) / 2),
      width,
      height,
    };
  }

  return {
    ...getFrameNearSelection(selectionRect, width, height, viewport),
    width,
    height,
  };
}

export function applyQuickBoxBaseStyle(element, frame) {
  const safeFrame = clampQuickBoxFrame(frame);
  Object.assign(element.style, {
    position: "fixed",
    top: `${safeFrame.top}px`,
    left: `${safeFrame.left}px`,
    width: `${safeFrame.width}px`,
    height: `${safeFrame.height}px`,
    minWidth: "320px",
    minHeight: "250px",
    maxWidth: "95vw",
    maxHeight: "95vh",
    zIndex: "var(--brse-z-index)",
    pointerEvents: "none",
  });
}

export function clampQuickBoxElement(element, viewport = window) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const frame = clampQuickBoxFrame({
    top: rect.top,
    left: rect.left,
    width: rect.width || DEFAULT_QUICK_BOX_SIZE.width,
    height: rect.height || DEFAULT_QUICK_BOX_SIZE.height,
  }, viewport);
  element.style.top = `${frame.top}px`;
  element.style.left = `${frame.left}px`;
  element.style.width = `${frame.width}px`;
  element.style.height = `${frame.height}px`;
}

export function repositionQuickBoxNearSelection(element, selectionRect, options = {}, viewport = window) {
  if (!selectionRect || options.tab === "chat" || options.action === "summary") return;

  const frame = getFrameNearSelection(
    selectionRect,
    element.offsetWidth,
    element.offsetHeight,
    viewport,
  );
  element.style.top = `${frame.top}px`;
  element.style.left = `${frame.left}px`;
}

function getFrameNearSelection(selectionRect, width, height, viewport) {
  let top = selectionRect.bottom + 8;
  if (top + height > viewport.innerHeight) {
    top = Math.max(10, selectionRect.top - height - 8);
  }

  let left = selectionRect.left;
  if (left + width > viewport.innerWidth) {
    left = Math.max(10, viewport.innerWidth - width - 20);
  }

  return clampQuickBoxFrame({ top, left, width, height }, viewport);
}

export function clampQuickBoxFrame(frame, viewport = window) {
  const margin = 10;
  const minWidth = 320;
  const minHeight = 250;
  const maxWidth = Math.max(minWidth, viewport.innerWidth - margin * 2);
  const maxHeight = Math.max(minHeight, viewport.innerHeight - margin * 2);
  const width = Math.min(Math.max(frame.width || DEFAULT_QUICK_BOX_SIZE.width, minWidth), maxWidth);
  const height = Math.min(Math.max(frame.height || DEFAULT_QUICK_BOX_SIZE.height, minHeight), maxHeight);
  const left = Math.min(Math.max(frame.left || margin, margin), Math.max(margin, viewport.innerWidth - width - margin));
  const top = Math.min(Math.max(frame.top || margin, margin), Math.max(margin, viewport.innerHeight - height - margin));
  return { top, left, width, height };
}

function isSyntheticCenterRect(selectionRect, viewport) {
  return Boolean(
    selectionRect
      && selectionRect.left === viewport.innerWidth / 2 - 290
      && selectionRect.bottom === viewport.innerHeight / 2,
  );
}
