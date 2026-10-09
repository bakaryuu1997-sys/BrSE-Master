import { describe, expect, it, vi } from "vitest";
import { getCorruptLocalStorageKey, quarantineLocalStorageValue } from "../localStorageSafety";

describe("localStorageSafety", () => {
  it("builds a stable corrupt storage key", () => {
    expect(getCorruptLocalStorageKey("brse.key", new Date("2026-05-24T01:02:03.004Z"))).toBe(
      "brse.key.corrupt.2026-05-24T01-02-03-004Z",
    );
  });

  it("moves a corrupt value to a recovery key before removing the active key", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T01:02:03.004Z"));
    window.localStorage.setItem("brse.key", "{bad json");

    quarantineLocalStorageValue("brse.key");

    expect(window.localStorage.getItem("brse.key")).toBeNull();
    expect(window.localStorage.getItem("brse.key.corrupt.2026-05-24T01-02-03-004Z")).toBe("{bad json");
    vi.useRealTimers();
  });

  it("does not create a quarantine key when the active value is missing", () => {
    quarantineLocalStorageValue("missing.key");

    expect(Object.keys(window.localStorage).some((key) => key.startsWith("missing.key.corrupt."))).toBe(false);
  });
});
