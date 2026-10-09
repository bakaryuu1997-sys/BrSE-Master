import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRuntimeStatus, normalizeApiBaseUrl, redactRuntimeStatusMessage } from "../src/shared/settingsStatus.js";

describe("extension settings status helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes app URLs and raw origins to the API base URL", () => {
    expect(normalizeApiBaseUrl("http://127.0.0.1:3010/app")).toBe("http://127.0.0.1:3010/api");
    expect(normalizeApiBaseUrl("http://127.0.0.1:3010")).toBe("http://127.0.0.1:3010/api");
    expect(normalizeApiBaseUrl("http://127.0.0.1:3010/api")).toBe("http://127.0.0.1:3010/api");
  });

  it("migrates stale extension backend URLs away from localhost port 8000", () => {
    expect(normalizeApiBaseUrl("http://127.0.0.1:8000/api")).toBe("http://127.0.0.1:3010/api");
    expect(normalizeApiBaseUrl("http://localhost:8000/api")).toBe("http://127.0.0.1:3010/api");
    expect(normalizeApiBaseUrl("http://backend:8000/api")).toBe("http://127.0.0.1:3010/api");
  });

  it("returns a clear success message when backend AI runtime is reachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ model: "openrouter/nvidia/nemotron-3-super-120b-a12b:free", runtime_reachable: true }),
    })));

    const result = await checkRuntimeStatus("http://127.0.0.1:3010/api", "secret");

    expect(result).toEqual({ ok: true, message: "AI OK: openrouter/nvidia/nemotron-3-super-120b-a12b:free" });
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3010/api/ai/status?check_runtime=true",
      expect.objectContaining({
        headers: { "X-BrSE-Token": "secret" },
      }),
    );
  });

  it("returns a warning message when runtime is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ runtime_reachable: false, runtime_error: "connection refused" }),
    })));

    await expect(checkRuntimeStatus("http://127.0.0.1:3010/api")).resolves.toEqual({
      ok: false,
      message: "connection refused",
    });
  });

  it("redacts secrets before runtime errors reach settings UI", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        runtime_reachable: false,
        runtime_error: "Bearer sk-live-abc token=secret-123 data:image/png;base64,abcdef123",
      }),
    })));

    await expect(checkRuntimeStatus("http://127.0.0.1:3010/api")).resolves.toEqual({
      ok: false,
      message: "Bearer [REDACTED] token=[REDACTED] data:image/[REDACTED]",
    });
  });

  it("redacts runtime status text directly", () => {
    expect(redactRuntimeStatusMessage("api_key: sk-demo password=hunter2")).toBe(
      "api_key=[REDACTED] password=[REDACTED]",
    );
  });
});
