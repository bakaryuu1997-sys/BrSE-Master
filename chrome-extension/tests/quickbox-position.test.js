import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUICK_BOX_SIZE,
  clampQuickBoxFrame,
  getInitialQuickBoxFrame,
  repositionQuickBoxNearSelection,
} from "../src/content/ui/quickbox/position.js";

const viewport = { innerWidth: 1200, innerHeight: 800 };

describe("QuickBox positioning", () => {
  it("centers summary and chat QuickBox sessions", () => {
    const frame = getInitialQuickBoxFrame({ left: 10, top: 10, bottom: 30 }, { action: "summary" }, viewport);

    expect(frame.width).toBe(DEFAULT_QUICK_BOX_SIZE.width);
    expect(frame.height).toBe(DEFAULT_QUICK_BOX_SIZE.height);
    expect(frame.left).toBe(200);
    expect(frame.top).toBe(90);
  });

  it("places dictionary QuickBox near selection and keeps it inside viewport", () => {
    const frame = getInitialQuickBoxFrame({ left: 1100, top: 760, bottom: 780 }, { tab: "dict" }, viewport);

    expect(frame.left).toBe(380);
    expect(frame.top).toBe(132);
  });

  it("does not reposition summary sessions on reuse", () => {
    const element = {
      offsetWidth: 800,
      offsetHeight: 620,
      style: { top: "90px", left: "200px" },
    };

    repositionQuickBoxNearSelection(element, { left: 10, top: 10, bottom: 20 }, { action: "summary" }, viewport);

    expect(element.style.top).toBe("90px");
    expect(element.style.left).toBe("200px");
  });

  it("clamps oversized or offscreen frames back into the viewport", () => {
    const frame = clampQuickBoxFrame({
      top: -900,
      left: 990,
      width: 1600,
      height: 1200,
    }, viewport);

    expect(frame.top).toBe(10);
    expect(frame.left).toBe(10);
    expect(frame.width).toBe(1180);
    expect(frame.height).toBe(780);
  });
});
