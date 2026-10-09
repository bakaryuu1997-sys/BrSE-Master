import { describe, it, expect } from "vitest";
import { shouldObserveElement, GLOSSARY_SKIP_TAGS } from "../src/content/ui/glossaryDom.js";

describe("shouldObserveElement", () => {
  it("returns false for nullish or non-element nodes", () => {
    expect(shouldObserveElement(null)).toBe(false);
    expect(shouldObserveElement(undefined)).toBe(false);
    expect(shouldObserveElement(document.createTextNode("hi"))).toBe(false);
  });

  it("returns true for a normal text container", () => {
    const p = document.createElement("p");
    p.textContent = "設計書 review";
    document.body.appendChild(p);
    expect(shouldObserveElement(p)).toBe(true);
  });

  it("skips structural / interactive tags", () => {
    for (const tag of GLOSSARY_SKIP_TAGS) {
      const el = document.createElement(tag);
      expect(shouldObserveElement(el)).toBe(false);
    }
  });

  it("skips editable elements", () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    expect(shouldObserveElement(editable)).toBe(false);

    const textbox = document.createElement("div");
    textbox.setAttribute("role", "textbox");
    expect(shouldObserveElement(textbox)).toBe(false);
  });

  it("skips elements inside code/pre containers", () => {
    const pre = document.createElement("pre");
    const span = document.createElement("span");
    pre.appendChild(span);
    document.body.appendChild(pre);
    expect(shouldObserveElement(span)).toBe(false);
  });

  it("skips the extension's own injected UI (brse- ids) and existing highlights", () => {
    const root = document.createElement("div");
    root.id = "brse-command-palette";
    const inner = document.createElement("span");
    root.appendChild(inner);
    document.body.appendChild(root);
    expect(shouldObserveElement(inner)).toBe(false);

    const hl = document.createElement("span");
    hl.className = "brse-glossary-highlight";
    const child = document.createElement("span");
    hl.appendChild(child);
    document.body.appendChild(hl);
    expect(shouldObserveElement(child)).toBe(false);
  });
});
