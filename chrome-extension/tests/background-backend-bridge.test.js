import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkJiraExists,
  getQuickInjectItems,
  getShadowReply,
  handleCreateTodoItems,
} from "../src/background/backendBridge.js";

function mockChromeStorage(values = {}) {
  global.chrome = {
    runtime: { lastError: null },
    storage: {
      sync: {
        get: vi.fn((keys, callback) => {
          const result = {};
          for (const key of keys) {
            if (values[key] !== undefined) result[key] = values[key];
          }
          callback(result);
        }),
      },
    },
  };
}

function jsonResponse(data, ok = true, status = 200) {
  return { ok, status, json: async () => data };
}

describe("background backend bridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockChromeStorage();
  });

  it("loads quick-inject memos, knowledge, and meeting minutes by project", async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.endsWith("/memos")) return jsonResponse([{ id: "memo-1" }]);
      if (url.endsWith("/knowledge/")) return jsonResponse([{ id: "qna-1" }]);
      if (url.endsWith("/projects")) return jsonResponse([{ id: "project-1" }]);
      if (url.includes("project_id=default")) return jsonResponse([{ id: "minute-default" }]);
      if (url.includes("project_id=project-1")) return jsonResponse([{ id: "minute-project" }]);
      return jsonResponse({}, false, 404);
    });

    const result = await getQuickInjectItems();

    expect(result).toEqual({
      qnas: [{ id: "qna-1" }],
      minutes: [{ id: "minute-default" }, { id: "minute-project" }],
      memos: [{ id: "memo-1" }],
    });
  });

  it("checks Jira existence through Operations records", async () => {
    global.fetch = vi.fn(async () => jsonResponse([{ id: "op-1", field_d: "BRSE-123" }]));

    await expect(checkJiraExists("BRSE-123")).resolves.toEqual({
      exists: true,
      record: { id: "op-1", field_d: "BRSE-123" },
    });
  });

  it("wraps create todo items handler responses without changing the runtime contract", async () => {
    global.fetch = vi.fn(async () => jsonResponse({ id: "todo-1" }));

    const response = await new Promise((resolve) => {
      handleCreateTodoItems(
        { payload: { projectId: "project 1", items: [{ title: "Implement" }] } },
        resolve,
      );
    });

    expect(response).toEqual({ ok: true, data: [{ id: "todo-1" }] });
    expect(global.fetch.mock.calls[0][0]).toContain("/todos/projects/project%201/items");
  });

  it("keeps empty Todo item creation as a no-op success response", async () => {
    global.fetch = vi.fn();

    const response = await new Promise((resolve) => {
      handleCreateTodoItems({ payload: { projectId: "project-1", items: [] } }, resolve);
    });

    expect(response).toEqual({ ok: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns trimmed Shadow Reply text from the backend", async () => {
    global.fetch = vi.fn(async (_url, init) => {
      const payload = JSON.parse(init.body);
      expect(payload.message).toContain("障害対応お願いします");
      return jsonResponse({ text: "  承知いたしました。  " });
    });

    await expect(getShadowReply("障害対応お願いします")).resolves.toBe("承知いたしました。");
  });
});
