import { describe, expect, it } from "vitest";
import { buildLearnedTermsHtml } from "../src/shared/learnedTermsRenderer.js";

describe("learned terms renderer", () => {
  it("escapes glossary cache text before rendering hidden learned terms", () => {
    const html = buildLearnedTermsHtml(
      ["term-1"],
      [
        {
          id: "term-1",
          english: '<img src=x onerror="alert(1)">',
          japanese: '<script>alert(2)</script>',
        },
      ],
    );

    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('onerror="');
  });

  it("escapes fallback ids used in data attributes", () => {
    const html = buildLearnedTermsHtml(['bad"id<script>'], []);

    expect(html).toContain("data-id=");
    expect(html).toContain("&quot;");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('data-id="bad"id');
  });
});
