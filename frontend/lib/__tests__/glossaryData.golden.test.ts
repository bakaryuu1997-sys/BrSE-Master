import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { glossaryCategories, glossaryRoles, glossaryTerms } from "@/lib/glossary";

/**
 * Golden test for the static glossary data. It locks the content so that splitting
 * lib/glossary.ts into smaller files cannot change a single term, its order, or the exports.
 * If you intentionally edit the data, update EXPECTED_* here in the same change.
 */
const EXPECTED_COUNT = 257;
const EXPECTED_HASH = "41b9d2f857eb9482a041c420e8857d844c790d0ef47677cf410c5c331fb7f6e8";

// Known data issue (B-021): these ids appear twice with different content. Locked on purpose so a
// later de-duplication is a conscious change.
const KNOWN_DUPLICATE_IDS = [
  "asynchronous",
  "authentication",
  "authorization",
  "dependency",
  "deployment",
  "hotfix",
  "integration-test",
  "migration",
  "rollback",
  "unit-test",
];

describe("static glossary data", () => {
  it("keeps the exact same terms in the same order", () => {
    expect(glossaryTerms).toHaveLength(EXPECTED_COUNT);
    expect(createHash("sha256").update(JSON.stringify(glossaryTerms)).digest("hex")).toBe(EXPECTED_HASH);
    expect(glossaryTerms[0].id).toBe("ringi");
    expect(glossaryTerms[glossaryTerms.length - 1].id).toBe("legacy");
  });

  it("keeps the role and category lists", () => {
    expect(glossaryRoles).toHaveLength(18);
    expect(glossaryCategories).toHaveLength(26);
    expect(glossaryRoles[0]).toBe("BrSE");
    expect(glossaryCategories[glossaryCategories.length - 1]).toBe("E-Government");
  });

  it("only uses valid roles and categories", () => {
    for (const term of glossaryTerms) {
      expect(glossaryCategories).toContain(term.category);
      for (const role of term.roles) expect(glossaryRoles).toContain(role);
    }
  });

  it("has exactly the known duplicate ids (B-021)", () => {
    const counts = new Map<string, number>();
    for (const term of glossaryTerms) counts.set(term.id, (counts.get(term.id) ?? 0) + 1);
    const duplicates = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id).sort();
    expect(duplicates).toEqual(KNOWN_DUPLICATE_IDS);
  });
});
