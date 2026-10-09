import { describe, expect, it, vi } from "vitest";
import { initJiraContextSync } from "../src/sidepanel/jiraContext.js";
import { MESSAGE_TYPES } from "../src/shared/messageTypes.js";

function createController(overrides = {}) {
  const elements = {
    contextBanner: document.createElement("div"),
    contextIcon: document.createElement("div"),
    contextTitle: document.createElement("div"),
    contextDesc: document.createElement("div"),
    btnUseContext: document.createElement("button"),
    btnClearContext: document.createElement("button"),
    chatMessages: document.createElement("div"),
  };

  const controller = initJiraContextSync({
    ...elements,
    switchTab: vi.fn(),
    chatController: { addMessage: vi.fn() },
    MESSAGE_TYPES,
    STORAGE_KEYS: { CONTEXT: "brse_context" },
    ...overrides,
  });

  return { ...elements, controller };
}

describe("sidepanel Jira context rendering", () => {
  it("escapes Jira context text before writing system cards as HTML", () => {
    const { chatMessages, controller } = createController();

    controller.handleIncomingContext({
      type: "jira_import",
      key: 'BRSE-1"><img src=x onerror=alert(1)>',
      title: "<script>alert(2)</script>",
      desc: "description",
      comments: [],
    });

    expect(chatMessages.querySelector("img")).toBeNull();
    expect(chatMessages.querySelector("script")).toBeNull();
    expect(chatMessages.innerHTML).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");
  });

  it("escapes backend error text in Jira todo sync notifications", () => {
    const originalSendMessage = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = vi.fn((_message, callback) => {
      if (typeof callback === "function") {
        callback({ ok: false, error: '<img src=x onerror=alert(1)>' });
      }
    });
    const { chatMessages, controller } = createController();

    controller.handleJiraTodoImportDone(
      '```json\n[{"title":"Task","phase":"3. Implementation & Coding","priority":"HIGH","detail":"Detail"}]\n```',
      "project-1",
    );

    expect(chatMessages.querySelector("img")).toBeNull();
    expect(chatMessages.innerHTML).toContain("&lt;img src=x onerror=alert(1)&gt;");
    chrome.runtime.sendMessage = originalSendMessage;
  });
});
