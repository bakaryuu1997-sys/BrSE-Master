import { describe, expect, it } from "vitest";
import {
  annotatedFilename,
  arrowHead,
  isMeaningfulDrag,
  toNatural,
  undoLast,
} from "../src/shared/annotateModel.js";

describe("toNatural", () => {
  it("converts displayed pixels back to natural image pixels", () => {
    expect(toNatural({ x: 50, y: 100 }, 0.5)).toEqual({ x: 100, y: 200 });
  });
  it("defaults scale to 1", () => {
    expect(toNatural({ x: 7, y: 9 })).toEqual({ x: 7, y: 9 });
  });
});

describe("undoLast", () => {
  it("removes the last shape without mutating the input", () => {
    const shapes = [{ type: "pen" }, { type: "arrow" }];
    const next = undoLast(shapes);
    expect(next).toHaveLength(1);
    expect(shapes).toHaveLength(2);
  });
  it("is safe on empty/invalid input", () => {
    expect(undoLast([])).toEqual([]);
    expect(undoLast(null)).toEqual([]);
  });
});

describe("isMeaningfulDrag", () => {
  it("rejects tiny drags and accepts real ones", () => {
    expect(isMeaningfulDrag({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false);
    expect(isMeaningfulDrag({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(true);
  });
});

describe("arrowHead", () => {
  it("returns two points near the arrow tip", () => {
    const head = arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, 14);
    expect(head).toHaveLength(2);
    head.forEach((p) => expect(p.x).toBeLessThan(100)); // head sits behind the tip
  });
});

describe("annotatedFilename", () => {
  it("sanitizes the hostname and embeds a timestamp", () => {
    expect(annotatedFilename("ex/am ple.com", 123)).toBe("brse-annotated-ex_am_ple.com-123.png");
  });
});
