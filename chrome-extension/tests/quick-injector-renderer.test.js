import { describe, expect, it } from "vitest";
import { buildQuickInjectorItemHtml } from "../src/content/ui/QuickInjector.js";

function render(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

describe("QuickInjector item renderer", () => {
  it("escapes backend Q&A text before rendering into innerHTML", () => {
    const node = render(
      buildQuickInjectorItemHtml(
        {
          title: '<img src=x onerror=alert(1)>',
          content: '<script>alert(2)</script> **markdown**',
          category: '<svg onload=alert(3)>',
          project_id: 'p"><img src=x onerror=alert(4)>',
        },
        "qna",
      ),
    );

    expect(node.querySelector("img")).toBeNull();
    expect(node.querySelector("script")).toBeNull();
    expect(node.querySelector("svg")).toBeNull();
    expect(node.innerHTML).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");
  });

  it("escapes meeting and memo metadata", () => {
    const meeting = render(
      buildQuickInjectorItemHtml(
        {
          title: "Minutes",
          body_markdown: "Body",
          meeting_date: '2026-06-01T00:00:00"><img src=x>',
          location: '<script>alert(1)</script>',
        },
        "minutes",
      ),
    );
    const memo = render(
      buildQuickInjectorItemHtml(
        {
          title: "Memo",
          body: "Body",
          tags: '<img src=x onerror=alert(1)>',
          pinned: true,
        },
        "memo",
      ),
    );

    expect(meeting.querySelector("img")).toBeNull();
    expect(meeting.querySelector("script")).toBeNull();
    expect(memo.querySelector("img")).toBeNull();
  });
});
