import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectContextProvider } from "@/components/ProjectContextProvider";
import { useGlossaryState } from "@/hooks/useGlossaryState";
import { setActiveProjectId } from "@/lib/projectSettings";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/LanguageProvider", () => ({
  useUiLanguage: () => ({ t: (key: string) => key, language: "vi" }),
}));

const wrapper = ({ children }: { children: ReactNode }) => createElement(ProjectContextProvider, null, children);

describe("glossary scope isolation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    window.localStorage.setItem(
      "brse.projectSettings.v1",
      JSON.stringify([
        { id: "p1", name: "One", createdAt: "", updatedAt: "" },
        { id: "p2", name: "Two", createdAt: "", updatedAt: "" },
      ])
    );
    window.localStorage.setItem("brse.activeProjectId.v1", "p1");
    window.localStorage.setItem("brse-glossary-mastered-v1.p1", JSON.stringify(["term-a"]));
  });

  it("does not copy the previous project's data into the new project's storage on switch", async () => {
    const { result } = renderHook(() => useGlossaryState(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.masteredIds).toEqual(["term-a"]);

    act(() => setActiveProjectId("p2"));
    await waitFor(() => expect(result.current.activeProjectId).toBe("p2"));
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(result.current.masteredIds).toEqual([]);
    const keys = Object.keys(window.localStorage).filter((k) => k.includes("mastered"));
    const p2Key = keys.find((k) => k.endsWith(".p2"));
    expect(p2Key ? JSON.parse(window.localStorage.getItem(p2Key) || "[]") : []).toEqual([]);
  });

  it("global scope ignores sidebar project changes", async () => {
    const { result } = renderHook(() => useGlossaryState(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => result.current.setScopeMode("global"));
    await waitFor(() => expect(result.current.activeProjectId).toBe("global"));

    act(() => setActiveProjectId("p2"));
    await waitFor(() => expect(result.current.hasProject).toBe(true));
    expect(result.current.activeProjectId).toBe("global");
  });
});
