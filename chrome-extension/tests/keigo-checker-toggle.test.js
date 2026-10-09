import { beforeEach, describe, expect, it, vi } from "vitest";

import { initKeigoChecker } from "../src/content/ui/KeigoChecker.js";

let localStorageState = {};
let storageChangeListener = null;

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

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
  chrome.storage.onChanged = {
    addListener: vi.fn((listener) => {
      storageChangeListener = listener;
    }),
  };
}

describe("Keigo checker toggle", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorageState = { brseKeigoEnabled: true };
    storageChangeListener = null;
    global.ResizeObserver = ResizeObserverMock;
    installChromeStorageMock();
  });

  it("removes the Keigo badge when the menu toggle disables Keigo", () => {
    initKeigoChecker();

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.dispatchEvent(new FocusEvent("focus"));

    expect(document.getElementById("brse-keigo-badge")).toBeTruthy();

    storageChangeListener({ brseKeigoEnabled: { newValue: false } }, "local");

    expect(document.getElementById("brse-keigo-badge")).toBeNull();
  });
});
