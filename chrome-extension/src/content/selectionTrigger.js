"use strict";

const DRAG_SELECT_THRESHOLD_PX = 8;

export function createSelectionMouseState() {
  return {
    downX: 0,
    downY: 0,
    button: -1,
  };
}

export function recordSelectionMouseDown(state, event) {
  state.downX = event.clientX;
  state.downY = event.clientY;
  state.button = event.button;
}

export function shouldShowSelectionToolbar(event, selectedText, state, mode = "auto") {
  if (mode === "alt" && !event.altKey) return false;
  if (!selectedText || selectedText.replace(/\s+/g, "").length < 1) return false;
  if (state?.button !== 0) return false;

  const clickCount = event.detail || 0;
  if (clickCount === 2) return true;
  if (clickCount >= 3) return false;

  const movedX = Math.abs(event.clientX - (state?.downX ?? event.clientX));
  const movedY = Math.abs(event.clientY - (state?.downY ?? event.clientY));
  return Math.max(movedX, movedY) >= DRAG_SELECT_THRESHOLD_PX;
}
