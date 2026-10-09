import { describe, expect, it, vi } from "vitest";
import {
  collectVisibleTabContexts,
  getOtherTabContexts,
  isInjectableWebUrl,
  recordTabContext,
  registerTabContextCleanup,
} from "../src/background/tabMessaging.js";
import { MESSAGE_TYPES } from "../src/shared/messageTypes.js";

describe("background tab messaging helpers", () => {
  it("accepts only http and https URLs for content-script injection", () => {
    expect(isInjectableWebUrl("https://example.com")).toBe(true);
    expect(isInjectableWebUrl("http://localhost:3010/app")).toBe(true);
    expect(isInjectableWebUrl("chrome://extensions")).toBe(false);
    expect(isInjectableWebUrl("file:///tmp/test.html")).toBe(false);
  });

  it("records tab context and hides the sender tab from cross-tab context results", () => {
    recordTabContext(
      { tab: { id: 101, title: "Current", url: "https://current.example" } },
      { content: "current content" },
    );
    recordTabContext(
      { tab: { id: 102, title: "Other", url: "https://other.example" } },
      { content: "other content" },
    );

    const visible = getOtherTabContexts({ tab: { id: 101 } });

    expect(visible).toEqual([
      {
        id: 102,
        title: "Other",
        url: "https://other.example",
        content: "other content",
      },
    ]);
  });

  it("collects context only from injectable tabs", async () => {
    const sentMessages = [];
    const chromeApi = {
      tabs: {
        query: vi.fn(async () => [
          { id: 1, url: "https://example.com" },
          { id: 2, url: "chrome://extensions" },
        ]),
        sendMessage: vi.fn(async (tabId, message) => {
          sentMessages.push({ tabId, message });
          return { ok: true };
        }),
        onRemoved: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() },
      },
      scripting: {
        insertCSS: vi.fn(),
        executeScript: vi.fn(),
      },
    };

    registerTabContextCleanup(chromeApi);
    await collectVisibleTabContexts({ tab: { id: 99 } }, chromeApi);

    expect(sentMessages).toEqual([
      { tabId: 1, message: { type: MESSAGE_TYPES.BRSE_PING } },
      { tabId: 1, message: { type: MESSAGE_TYPES.BRSE_COLLECT_TAB_CONTEXT } },
    ]);
    expect(sentMessages.some((message) => message.tabId === 2)).toBe(false);
  });
});
