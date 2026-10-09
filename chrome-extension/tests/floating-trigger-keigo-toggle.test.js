import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFloatingBButton } from "../src/content/ui/FloatingTrigger.js";

let localStorageState = {};

function installChromeStorageMock() {
  chrome.storage.local = {
    get: vi.fn((keys, callback) => {
      const result = {};
      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      requestedKeys.forEach((key) => {
        result[key] = localStorageState[key];
      });
      callback?.(result);
      return Promise.resolve(result);
    }),
    set: vi.fn((items, callback) => {
      Object.assign(localStorageState, items);
      callback?.();
      return Promise.resolve();
    }),
  };
}

describe("floating Subaru trigger Keigo toggle", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorageState = {};
    installChromeStorageMock();
    chrome.storage.sync.get = vi.fn().mockResolvedValue({});
    chrome.storage.sync.set = vi.fn().mockResolvedValue({});
  });

  it("adds a menu item that toggles the Keigo checker storage flag", () => {
    createFloatingBButton({ onOpenChat: vi.fn() });

    const root = document.getElementById("brse-trigger-root");
    const shadow = root.shadowRoot;
    const button = shadow.getElementById("btn-toggle-keigo");
    const label = shadow.getElementById("text-toggle-keigo");

    expect(button).toBeTruthy();
    expect(label.textContent).toContain("Keigo");

    button.click();
    expect(localStorageState.brseKeigoEnabled).toBe(false);
    expect(label.textContent).toBe("Tắt Keigo (Click: Bật)");

    button.click();
    expect(localStorageState.brseKeigoEnabled).toBe(true);
    expect(label.textContent).toBe("Bật Keigo (Click: Tắt)");
  });
});
