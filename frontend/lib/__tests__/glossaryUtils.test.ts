import { describe, expect, it } from "vitest";
import {
  csvEscape,
  normalizeCategory,
  normalizeRole,
  parseGlossaryCsv,
  scopedBrowserKey,
  serializeGlossaryToCsv,
  slugifyTerm,
} from "@/lib/glossaryUtils";
import type { GlossaryTerm } from "@/lib/glossary";

describe("normalizeRole / normalizeCategory", () => {
  it("matches known roles case-insensitively, else null", () => {
    expect(normalizeRole("pm")).toBe("PM");
    expect(normalizeRole("  brse ")).toBe("BrSE");
    expect(normalizeRole("unknown")).toBeNull();
  });

  it("defaults unknown categories to Business", () => {
    expect(normalizeCategory("project")).toBe("Project");
    expect(normalizeCategory("totally-made-up")).toBe("Business");
  });
});

describe("slugifyTerm", () => {
  it("lowercases, strips punctuation and collapses separators", () => {
    expect(slugifyTerm("  Foo_Bar Baz!  ")).toBe("foo-bar-baz");
  });

  it("caps length at 52 characters", () => {
    expect(slugifyTerm("a".repeat(100)).length).toBe(52);
  });
});

describe("scopedBrowserKey", () => {
  it("returns the base key for the global scope and a suffixed key otherwise", () => {
    expect(scopedBrowserKey("brse.k", "global")).toBe("brse.k");
    expect(scopedBrowserKey("brse.k", "proj-1")).toBe("brse.k.proj-1");
  });
});

describe("csvEscape", () => {
  it("wraps in quotes and doubles inner quotes", () => {
    expect(csvEscape('a"b')).toBe('"a""b"');
    expect(csvEscape("plain")).toBe('"plain"');
  });
});

describe("parseGlossaryCsv + serializeGlossaryToCsv round-trip", () => {
  it("parses required columns and splits roles", () => {
    const terms = parseGlossaryCsv(
      "english,japanese,vietnamese,roles,category\nRequirement,要件,Yêu cầu,PM;BrSE,Project",
    );
    expect(terms).toHaveLength(1);
    expect(terms[0]).toMatchObject({
      english: "Requirement",
      japanese: "要件",
      vietnamese: "Yêu cầu",
      roles: ["PM", "BrSE"],
      category: "Project",
    });
  });

  it("skips rows missing any of the three required languages", () => {
    const terms = parseGlossaryCsv("english,japanese,vietnamese\nOnlyEnglish,,");
    expect(terms).toEqual([]);
  });

  it("survives a serialize -> parse round-trip", () => {
    const term: GlossaryTerm = {
      id: "x",
      english: "Release, Gate",
      japanese: "リリース",
      vietnamese: "Phát hành",
      category: "Release",
      roles: ["BrSE", "QA"],
      note: 'Has "quotes"',
    };
    const parsed = parseGlossaryCsv(serializeGlossaryToCsv([term]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      english: "Release, Gate",
      japanese: "リリース",
      vietnamese: "Phát hành",
      category: "Release",
      roles: ["BrSE", "QA"],
      note: 'Has "quotes"',
    });
  });
});
