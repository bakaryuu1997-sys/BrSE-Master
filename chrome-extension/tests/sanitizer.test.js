import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";
import { sanitizeAiHtml } from "../src/shared/sanitizer.js";

describe("shared AI output sanitizer", () => {
  afterEach(() => {
    delete global.window;
    delete global.document;
  });

  it("removes executable tags and event handlers from generated AI HTML", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    global.document = dom.window.document;

    const html = sanitizeAiHtml(`
      <div onclick="alert(1)">
        Safe
        <script>alert(2)</script>
        <span onmouseover="alert(3)">text</span>
      </div>
    `);

    expect(html).toContain("<div>");
    expect(html).toContain("<span>text</span>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onmouseover");
  });

  it("keeps safe glossary action spans from sanitized AI summary HTML", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    global.window = dom.window;
    global.document = dom.window.document;

    const html = sanitizeAiHtml(`
      <span class="quick-add-to-glossary-btn-pro" data-index="0" onclick="alert(1)">
        Quick add
      </span>
    `);

    expect(html).toContain("<span");
    expect(html).toContain('class="quick-add-to-glossary-btn-pro"');
    expect(html).toContain('data-index="0"');
    expect(html).not.toContain("onclick");
  });
});
