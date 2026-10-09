import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_API_BASE, getApiBase, normalizeApiBaseUrl } from "../src/shared/api.js";

let syncStorage = {};

describe("extension API base helper", () => {
  beforeEach(() => {
    syncStorage = {};
    global.chrome = {
      runtime: { lastError: null },
      storage: {
        sync: {
          get: vi.fn((keys, callback) => {
            const result = {};
            keys.forEach((key) => {
              result[key] = syncStorage[key];
            });
            callback(result);
          }),
          set: vi.fn((items, callback) => {
            Object.assign(syncStorage, items);
            callback?.();
          }),
        },
      },
    };
  });

  it("normalizes raw app origins to the frontend API proxy", () => {
    expect(normalizeApiBaseUrl("http://127.0.0.1:3010/app")).toBe(DEFAULT_API_BASE);
    expect(normalizeApiBaseUrl("http://127.0.0.1:3010")).toBe(DEFAULT_API_BASE);
  });

  it("migrates stale localhost 8000 storage before runtime fetches", async () => {
    syncStorage.apiBaseUrl = "http://127.0.0.1:8000/api";

    await expect(getApiBase()).resolves.toBe(DEFAULT_API_BASE);
    expect(syncStorage.apiBaseUrl).toBe(DEFAULT_API_BASE);
  });
});
