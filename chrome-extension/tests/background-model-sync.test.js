import { describe, expect, it, vi } from "vitest";
import { createModelSync } from "../src/background/modelSync.js";

describe("background model sync", () => {
  it("sets backend model through canonical AI model endpoint and persists normalized model", async () => {
    const stableModel = "openrouter/nvidia/nemotron-3-super-120b-a12b:free";
    const persistModel = vi.fn().mockResolvedValue(stableModel);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ model: stableModel }),
    });
    const sync = createModelSync({
      fetchImpl,
      getApiBaseImpl: async () => "http://127.0.0.1:3010/api",
      getAuthHeadersImpl: async () => ({ "X-BrSE-Token": "secret" }),
      normalizeModelImpl: (model) => model,
      persistModelImpl: persistModel,
    });

    await expect(sync.setBackendModel(stableModel)).resolves.toEqual({ model: stableModel });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:3010/api/ai/model",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ model: stableModel }),
      })
    );
    expect(persistModel).toHaveBeenCalledWith(stableModel);
  });

  it("falls back to default model when backend reports unsupported selected model", async () => {
    const stableModel = "openrouter/nvidia/nemotron-3-super-120b-a12b:free";
    const persistModel = vi.fn().mockResolvedValue(stableModel);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ model: "old-cloud-model" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ model: stableModel }),
      });
    const sync = createModelSync({
      defaultModel: stableModel,
      fetchImpl,
      getApiBaseImpl: async () => "http://127.0.0.1:3010/api",
      getAuthHeadersImpl: async () => ({}),
      normalizeModelImpl: (model) => (model === stableModel ? model : stableModel),
      persistModelImpl: persistModel,
    });

    await expect(sync.syncActiveModelFromBackend()).resolves.toMatchObject({
      model: stableModel,
      selected_model: stableModel,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      "http://127.0.0.1:3010/api/ai/model",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ model: stableModel }),
      })
    );
  });
});
