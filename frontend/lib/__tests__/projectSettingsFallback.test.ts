import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchProjectSettingsWithFallback } from "@/lib/projectSettings";

const PROJECTS_KEY = "brse.projectSettings.v1";

describe("fetchProjectSettingsWithFallback (silent sync error)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns the local cache AND reports the failure when the server request fails", async () => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([{ id: "p1", name: "Cached", updatedAt: "2026-05-23T10:00:00.000Z" }]));
    (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const onFallback = vi.fn();

    const result = await fetchProjectSettingsWithFallback(onFallback);

    expect(result.map((p) => p.name)).toEqual(["Cached"]);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("reports a network error too (fetch rejects)", async () => {
    (global.fetch as any).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const onFallback = vi.fn();

    const result = await fetchProjectSettingsWithFallback(onFallback);

    expect(result).toEqual([]);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("does not report anything when the server answers", async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => [] });
    const onFallback = vi.fn();

    await fetchProjectSettingsWithFallback(onFallback);

    expect(onFallback).not.toHaveBeenCalled();
  });
});
