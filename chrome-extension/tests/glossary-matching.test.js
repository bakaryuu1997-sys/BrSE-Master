import { describe, expect, it } from "vitest";

import {
  buildGlossaryPattern,
  hasAsciiBoundary,
  isUsefulEnglishVariant,
  normalizeGlossaryKey,
  splitGlossaryVariants,
} from "../src/content/ui/glossaryMatching.js";

function matchedTerms(pattern, text) {
  const regex = new RegExp(`(${pattern})`, "gi");
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (hasAsciiBoundary(text, match.index, match[0].length)) {
      matches.push(match[0]);
    }
  }
  return matches;
}

describe("glossary matching helpers", () => {
  it("keeps multi-word terms stable with flexible whitespace", () => {
    const regex = new RegExp(buildGlossaryPattern("system validation"), "i");

    expect(regex.test("System   Validation")).toBe(true);
    expect(normalizeGlossaryKey("System   Validation")).toBe("system validation");
  });

  it("does not match partial code identifiers", () => {
    const text = "defineConfig";

    expect(hasAsciiBoundary(text, 0, 4)).toBe(false);
    expect(hasAsciiBoundary(" defineConfig ", 1, "defineConfig".length)).toBe(true);
  });

  it("filters noisy lowercase fragments but keeps useful acronyms", () => {
    expect(isUsefulEnglishVariant("def")).toBe(false);
    expect(isUsefulEnglishVariant("API")).toBe(true);
    expect(isUsefulEnglishVariant("defineConfig")).toBe(true);
  });

  it("splits glossary variants without breaking terms that contain dot underscore or hyphen", () => {
    expect(splitGlossaryVariants("React / Reacts; API・JWT、Cloud Fallback，Next.js")).toEqual([
      "React",
      "Reacts",
      "API",
      "JWT",
      "Cloud Fallback",
      "Next.js",
    ]);
    expect(splitGlossaryVariants("feature_flag / client-state")).toEqual([
      "feature_flag",
      "client-state",
    ]);
  });

  it("matches uppercase acronyms as standalone terms only", () => {
    const pattern = buildGlossaryPattern("HMR");

    expect(matchedTerms(pattern, "Use HMR with React.")).toEqual(["HMR"]);
    expect(matchedTerms(pattern, "Use XHMRValue in code.")).toEqual([]);
  });

  it("matches long multi-word and punctuation-heavy terms", () => {
    const patterns = [
      buildGlossaryPattern("Cloud Fallback"),
      buildGlossaryPattern("Next.js"),
      buildGlossaryPattern("feature_flag"),
      buildGlossaryPattern("client-state"),
    ].join("|");

    expect(matchedTerms(patterns, "Cloud   Fallback uses Next.js and feature_flag in client-state.")).toEqual([
      "Cloud   Fallback",
      "Next.js",
      "feature_flag",
      "client-state",
    ]);
  });
});
