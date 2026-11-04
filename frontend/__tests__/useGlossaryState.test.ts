import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGlossaryState } from "@/hooks/useGlossaryState";
import { useGlossaryStudy } from "@/hooks/useGlossaryStudy";
import { parseCsv, slugifyTerm } from "@/lib/glossaryUtils";
import { createElement, type ReactNode } from "react";
import { ProjectContextProvider } from "@/components/ProjectContextProvider";

// useGlossaryState reads the active project from ProjectContext, as in the real app layout.
const ProjectProviderWrapper = ({ children }: { children: ReactNode }) =>
  createElement(ProjectContextProvider, null, children);

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock @/components/LanguageProvider
vi.mock("@/components/LanguageProvider", () => ({
  useUiLanguage: () => ({
    t: (key: string) => key,
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Glossary Utilities", () => {
  describe("parseCsv", () => {
    it("should correctly parse standard CSV rows", () => {
      const csv = "english,japanese,vietnamese\nterm1,nihongo1,tiengviet1\nterm2,nihongo2,tiengviet2";
      const parsed = parseCsv(csv);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual(["english", "japanese", "vietnamese"]);
      expect(parsed[1]).toEqual(["term1", "nihongo1", "tiengviet1"]);
    });

    it("should handle quoted fields with commas", () => {
      const csv = 'english,japanese,vietnamese\n"term, special",nihongo,tiengviet';
      const parsed = parseCsv(csv);
      expect(parsed).toHaveLength(2);
      expect(parsed[1][0]).toBe("term, special");
    });
  });

  describe("slugifyTerm", () => {
    it("should generate correct slug for English terms", () => {
      expect(slugifyTerm("Hello World!")).toBe("hello-world");
    });

    it("should generate correct slug for mixed terms", () => {
      expect(slugifyTerm("API_Endpoint-Test")).toBe("api-endpoint-test");
    });
  });
});

describe("useGlossaryState Hook", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    
    // Mock global fetch
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], total: 0, pages: 1 }),
      }) as any
    );
  });

  it("should initialize default states", async () => {
    const { result } = renderHook(() => useGlossaryState(), { wrapper: ProjectProviderWrapper });

    expect(result.current.query).toBe("");
    expect(result.current.role).toBe("All Roles");
    expect(result.current.category).toBe("All Categories");
    expect(result.current.currentPage).toBe(1);
    expect(result.current.studyMode).toBe("list");
    expect(result.current.isHydrated).toBe(false);

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should toggle mastered term ids correctly", async () => {
    const { result } = renderHook(() => useGlossaryState(), { wrapper: ProjectProviderWrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    act(() => {
      result.current.toggleMastered("term-123");
    });

    expect(result.current.masteredIds).toContain("term-123");

    act(() => {
      result.current.toggleMastered("term-123");
    });

    expect(result.current.masteredIds).not.toContain("term-123");
  });
});

describe("useGlossaryStudy Hook", () => {
  const dummyTerms = [
    { id: "1", english: "Hello", japanese: "こんにちは", vietnamese: "Xin chào", category: "Business" as const, roles: ["BrSE" as const], note: "" },
    { id: "2", english: "World", japanese: "世界", vietnamese: "Thế giới", category: "Business" as const, roles: ["BrSE" as const], note: "" }
  ];

  it("should initialize default study states", () => {
    const toggleMastered = vi.fn();
    const { result } = renderHook(() => useGlossaryStudy({ displayedTerms: dummyTerms, toggleMastered }));

    expect(result.current.studyMode).toBe("list");
    expect(result.current.flashcardIndex).toBe(0);
    expect(result.current.isFlipped).toBe(false);
    expect(result.current.isShuffled).toBe(false);
    expect(result.current.flashcardTerms).toEqual(dummyTerms);
  });

  it("should shuffle terms correctly", () => {
    const toggleMastered = vi.fn();
    const { result } = renderHook(() => useGlossaryStudy({ displayedTerms: dummyTerms, toggleMastered }));

    act(() => {
      result.current.handleShuffle();
    });

    expect(result.current.isShuffled).toBe(true);
    expect(result.current.flashcardTerms).toHaveLength(2);
  });
});
