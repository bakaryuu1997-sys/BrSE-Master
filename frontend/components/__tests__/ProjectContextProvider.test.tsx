import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { ProjectContextProvider, useProjectContext } from "@/components/ProjectContextProvider";
import { setActiveProjectId } from "@/lib/projectSettings";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ProjectContextProvider>{children}</ProjectContextProvider>
);

describe("ProjectContextProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "brse.projectSettings.v1",
      JSON.stringify([
        { id: "p1", name: "One", createdAt: "", updatedAt: "" },
        { id: "p2", name: "Two", createdAt: "", updatedAt: "" },
      ])
    );
    window.localStorage.setItem("brse.activeProjectId.v1", "p1");
  });

  it("exposes the persisted active project", () => {
    const { result } = renderHook(() => useProjectContext(), { wrapper });
    expect(result.current.activeProjectId).toBe("p1");
    expect(result.current.activeProject?.name).toBe("One");
  });

  it("follows active-project changes made elsewhere (sidebar switcher)", () => {
    const { result } = renderHook(() => useProjectContext(), { wrapper });
    act(() => setActiveProjectId("p2"));
    expect(result.current.activeProject?.name).toBe("Two");
  });

  it("throws outside the provider", () => {
    expect(() => renderHook(() => useProjectContext())).toThrow();
  });
});
