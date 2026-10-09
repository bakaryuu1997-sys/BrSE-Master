import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bindQuickBoxTabs, switchTabInShadow } from "../src/content/ui/quickbox/tabs.js";

function createShadowLikeDocument() {
  const dom = new JSDOM(`
    <button id="qb-tab-dict" class="tab-item active"></button>
    <button id="qb-tab-chat" class="tab-item"></button>
    <section id="brse-tab-content-dict" class="content active"></section>
    <section id="brse-tab-content-chat" class="content"></section>
    <input id="brse-qb-chat-input" />
  `);
  return dom.window.document;
}

describe("QuickBox tab lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("switches to chat and focuses the chat input", () => {
    vi.useFakeTimers();
    const shadow = createShadowLikeDocument();

    switchTabInShadow(shadow, "chat");
    vi.runAllTimers();

    expect(shadow.getElementById("qb-tab-chat").classList.contains("active")).toBe(true);
    expect(shadow.getElementById("brse-tab-content-chat").classList.contains("active")).toBe(true);
    expect(shadow.activeElement.id).toBe("brse-qb-chat-input");
  });

  it("binds tab buttons without keeping tab logic in QuickBox shell", () => {
    vi.useFakeTimers();
    const shadow = createShadowLikeDocument();

    bindQuickBoxTabs(shadow, "dict");
    shadow.getElementById("qb-tab-chat").click();
    vi.runAllTimers();

    expect(shadow.getElementById("qb-tab-chat").classList.contains("active")).toBe(true);
  });
});
