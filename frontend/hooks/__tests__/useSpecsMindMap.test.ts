import { describe, it, expect } from "vitest";
import { flattenNodes, nodeIdToPath, parseMarkdownToMindMap } from "../useSpecsMindMap";

describe("nodeIdToPath", () => {
  it("turns a node id into a readable breadcrumb", () => {
    expect(nodeIdToPath("root/Cart/Item_list")).toBe("Cart → Item list");
  });
});

describe("parseMarkdownToMindMap", () => {
  // Bullets sit under a ### subsection, matching the real spec templates.
  const md = [
    "# Spec",
    "## Section A",
    "### Detail A1",
    "- bullet a",
    "- bullet b",
    "## Section B",
    "### Detail B1",
    "- bullet c",
  ].join("\n");

  it("builds a nested tree by heading/bullet depth", () => {
    const tree = parseMarkdownToMindMap(md);
    expect(tree).toHaveLength(1); // single root "# Spec"

    const root = tree[0];
    expect(root.title).toBe("Spec");
    expect(root.level).toBe(1);
    expect(root.children.map((c) => c.title)).toEqual(["Section A", "Section B"]);

    const sectionA = root.children[0];
    expect(sectionA.children.map((c) => c.title)).toEqual(["Detail A1"]);
    expect(sectionA.children[0].children.map((c) => c.title)).toEqual(["bullet a", "bullet b"]);

    const sectionB = root.children[1];
    expect(sectionB.children[0].children.map((c) => c.title)).toEqual(["bullet c"]);
  });

  it("derives stable, slugified node ids from the path", () => {
    const tree = parseMarkdownToMindMap("# A\n## B C\n### d/e");
    const root = tree[0];
    expect(root.id).toBe("root/A");
    expect(root.children[0].id).toBe("root/A/B_C");
    expect(root.children[0].children[0].id).toBe("root/A/B_C/d_e");
  });

  it("ignores blank lines and non-outline text", () => {
    const tree = parseMarkdownToMindMap("\n\nplain paragraph\n# Title\n");
    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe("Title");
  });

  it("supports '*' bullets under a subsection", () => {
    const tree = parseMarkdownToMindMap("# T\n## S\n### Sub\n* star bullet");
    expect(tree[0].children[0].children[0].children[0].title).toBe("star bullet");
  });

  it("nests a bullet placed directly under a ## into that section (depth-gap)", () => {
    // A level-4 bullet with no intervening "### " walks up to the nearest
    // shallower node (the "## " section) instead of orphaning onto the root.
    const tree = parseMarkdownToMindMap("# T\n## Sec\n- bullet");
    expect(tree.map((n) => n.title)).toEqual(["T"]);

    const section = tree[0].children[0];
    expect(section.title).toBe("Sec");
    expect(section.children.map((c) => c.title)).toEqual(["bullet"]);
    expect(section.children[0].id).toBe("root/T/Sec/bullet");
  });

  it("nests a ### placed directly under a # into that heading (depth-gap)", () => {
    // Same upward walk for a level-3 heading missing its "## " parent.
    const tree = parseMarkdownToMindMap("# T\n### Detail");
    expect(tree.map((n) => n.title)).toEqual(["T"]);
    expect(tree[0].children.map((c) => c.title)).toEqual(["Detail"]);
    expect(tree[0].children[0].id).toBe("root/T/Detail");
  });
});

describe("flattenNodes", () => {
  it("flattens a tree depth-first in document order", () => {
    const tree = parseMarkdownToMindMap("# A\n## B\n### c\n## D");
    expect(flattenNodes(tree).map((n) => n.title)).toEqual(["A", "B", "c", "D"]);
  });
});
