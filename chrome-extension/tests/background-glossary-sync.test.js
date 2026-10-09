import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getGlossaryTerms,
  handleAddGlossaryTerm,
} from "../src/background/glossarySync.js";
import { MESSAGE_TYPES } from "../src/shared/messageTypes.js";
import { STORAGE_KEYS } from "../src/shared/storage.js";

function createChromeApi(cache = {}) {
  return {
    runtime: { lastError: null },
    storage: {
      sync: {
        get: vi.fn((_keys, callback) => callback({})),
      },
      local: {
        get: vi.fn(async (keys) => {
          const key = Array.isArray(keys) ? keys[0] : keys;
          return { [key]: cache[key] };
        }),
        set: vi.fn(async (items) => Object.assign(cache, items)),
      },
    },
    tabs: {
      query: vi.fn((_query, callback) => callback([{ id: 7, url: "https://example.com" }])),
      sendMessage: vi.fn(async () => ({ ok: true })),
    },
  };
}

describe("background glossary sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("combines database, custom, and knowledge glossary terms through a single module", async () => {
    const cache = {};
    const chromeApi = createChromeApi(cache);
    global.chrome = chromeApi;
    global.fetch = vi.fn(async (url) => {
      if (url.includes("/client-state/entry/")) {
        return { ok: true, json: async () => ({ value: JSON.stringify([{ id: "custom-1", english: "Spec", japanese: "仕様" }]) }) };
      }
      if (url.includes("/knowledge/")) {
        return { ok: true, json: async () => [{ id: "k1", category: "glossary", title: "要件 / Requirement", content: "Requirement note" }] };
      }
      if (url.includes("/glossary/")) {
        return { ok: true, json: async () => ({ items: [{ id: "db-1", english: "ISO", japanese: "ISO" }] }) };
      }
      return { ok: false, json: async () => ({}) };
    });

    const terms = await getGlossaryTerms(chromeApi);

    expect(terms.map((term) => term.id)).toEqual(["db-1", "custom-1", "knowledge-k1"]);
    expect(cache[STORAGE_KEYS.GLOSSARY_CACHE]).toEqual([{ id: "db-1", english: "ISO", japanese: "ISO" }]);
  });

  it("falls back to PUT on glossary id collisions and notifies content scripts", async () => {
    const cache = { [STORAGE_KEYS.GLOSSARY_CACHE]: [] };
    const chromeApi = createChromeApi(cache);
    global.chrome = chromeApi;
    const savedTerm = { id: "term-1", english: "API", japanese: "API" };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ detail: "ID already exists" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => savedTerm });

    const response = await new Promise((resolve) => {
      handleAddGlossaryTerm({ term: savedTerm }, resolve, chromeApi);
    });

    expect(response).toEqual({ ok: true, term: savedTerm });
    expect(cache[STORAGE_KEYS.GLOSSARY_CACHE]).toEqual([savedTerm]);
    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledWith(7, {
      type: MESSAGE_TYPES.BRSE_GLOSSARY_UPDATED,
      term: savedTerm,
    });
  });

  it("updates the existing glossary term when backend reports a duplicate term pair", async () => {
    const cache = { [STORAGE_KEYS.GLOSSARY_CACHE]: [] };
    const chromeApi = createChromeApi(cache);
    global.chrome = chromeApi;
    const newTerm = {
      id: "api",
      english: "API",
      japanese: "API",
      vietnamese: "Giao dien lap trinh ung dung",
      roles: ["BrSE", "Dev"],
      category: "Backend",
      note: "Updated from quick add",
    };
    const existingTerm = {
      id: "existing-api",
      english: "API",
      japanese: "API",
      vietnamese: "Old value",
      roles: ["BrSE"],
      category: "Technical",
    };
    const savedTerm = { ...existingTerm, ...newTerm, id: existingTerm.id };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Thuat ngu API da ton tai trong Glossary." }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [existingTerm] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => savedTerm,
      });

    const response = await new Promise((resolve) => {
      handleAddGlossaryTerm({ term: newTerm }, resolve, chromeApi);
    });

    expect(response).toEqual({ ok: true, term: savedTerm });
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/glossary/?search=API&size=20"),
      expect.objectContaining({ method: "GET" })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("/glossary/existing-api"),
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("Giao dien lap trinh ung dung"),
      })
    );
    expect(cache[STORAGE_KEYS.GLOSSARY_CACHE]).toEqual([savedTerm]);
    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledWith(7, {
      type: MESSAGE_TYPES.BRSE_GLOSSARY_UPDATED,
      term: savedTerm,
    });
  });
});
