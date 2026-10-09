import { describe, expect, it } from "vitest";
import {
  createSelectionMouseState,
  recordSelectionMouseDown,
  shouldShowSelectionToolbar,
} from "../src/content/selectionTrigger.js";

describe("selection toolbar trigger", () => {
  it("opens on double-click word selection without blocking native selection", () => {
    const state = createSelectionMouseState();
    recordSelectionMouseDown(state, { clientX: 10, clientY: 10, button: 0 });

    expect(shouldShowSelectionToolbar({ clientX: 10, clientY: 10, detail: 2 }, "word", state)).toBe(true);
  });

  it("does not open on triple-click so native paragraph selection can finish", () => {
    const state = createSelectionMouseState();
    recordSelectionMouseDown(state, { clientX: 10, clientY: 10, button: 0 });

    expect(shouldShowSelectionToolbar({ clientX: 10, clientY: 10, detail: 3 }, "paragraph", state)).toBe(false);
  });

  it("still opens on real drag selection", () => {
    const state = createSelectionMouseState();
    recordSelectionMouseDown(state, { clientX: 10, clientY: 10, button: 0 });

    expect(shouldShowSelectionToolbar({ clientX: 45, clientY: 12, detail: 1 }, "dragged text", state)).toBe(true);
  });
});
