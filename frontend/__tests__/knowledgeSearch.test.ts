import { describe, expect, it } from "vitest";
import { rankKnowledgeItem, sortKnowledgeByRank, tokenizeSearch } from "@/lib/knowledgeSearch";
import { type KnowledgeItem } from "@/lib/knowledge";

function knowledgeItem(overrides: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id: 1,
    title: "",
    content: "",
    category: "General",
    project_id: "pytest-project",
    created_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("knowledgeSearch ranking", () => {
  it("normalizes accents and splits predictable search tokens", () => {
    expect(tokenizeSearch("Tài liệu API-v2 と 仕様")).toEqual(["tai", "lieu", "api", "v2", "仕様"]);
  });

  it("weights exact title, title phrase, category, then content matches", () => {
    const exactTitle = knowledgeItem({ title: "Release Plan", content: "misc", category: "General" });
    const titlePhrase = knowledgeItem({ title: "Customer Release Plan", content: "misc", category: "General" });
    const categoryMatch = knowledgeItem({ title: "Checklist", content: "misc", category: "Release Plan" });
    const sourceMatch = { ...knowledgeItem({ title: "Notes", content: "misc", category: "General" }), source: "Release Plan" };
    const contentMatch = knowledgeItem({ title: "Notes", content: "Release Plan details", category: "General" });

    expect(rankKnowledgeItem(exactTitle, "release plan")).toBeGreaterThan(rankKnowledgeItem(titlePhrase, "release plan"));
    expect(rankKnowledgeItem(titlePhrase, "release plan")).toBeGreaterThan(rankKnowledgeItem(categoryMatch, "release plan"));
    expect(rankKnowledgeItem(categoryMatch, "release plan")).toBeGreaterThan(rankKnowledgeItem(sourceMatch, "release plan"));
    expect(rankKnowledgeItem(sourceMatch, "release plan")).toBeGreaterThan(rankKnowledgeItem(contentMatch, "release plan"));
  });

  it("sorts by score, then title, then id for deterministic ties", () => {
    const items = [
      knowledgeItem({ id: 3, title: "Beta", content: "release", category: "General" }),
      knowledgeItem({ id: 2, title: "Alpha", content: "release", category: "General" }),
      knowledgeItem({ id: 1, title: "Release", content: "misc", category: "General" }),
    ];

    expect(sortKnowledgeByRank(items, "release").map((item) => item.id)).toEqual([1, 2, 3]);
  });
});