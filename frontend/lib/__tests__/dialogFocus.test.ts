import { describe, expect, it } from "vitest";
import { nextTrappedFocusIndex } from "@/lib/useDialogFocus";

describe("nextTrappedFocusIndex (B-019)", () => {
  it("does nothing special when there is nothing focusable", () => {
    expect(nextTrappedFocusIndex(0, -1, false)).toBeNull();
  });

  it("wraps Tab from the last element to the first", () => {
    expect(nextTrappedFocusIndex(5, 4, false)).toBe(0);
  });

  it("wraps Shift+Tab from the first element to the last", () => {
    expect(nextTrappedFocusIndex(5, 0, true)).toBe(4);
  });

  it("lets the browser move focus normally inside the dialog", () => {
    expect(nextTrappedFocusIndex(5, 2, false)).toBeNull();
    expect(nextTrappedFocusIndex(5, 2, true)).toBeNull();
  });

  it("pulls focus back in when it is outside the dialog (index -1)", () => {
    expect(nextTrappedFocusIndex(5, -1, false)).toBe(0);
    expect(nextTrappedFocusIndex(5, -1, true)).toBe(4);
  });
});
