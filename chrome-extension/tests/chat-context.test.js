import { describe, expect, it } from "vitest";
import { shouldAttachPageContext } from "../src/content/ui/quickbox/chatComposer.js";

describe("QuickBox current page context", () => {
  it("attaches page context for questions about the current web page", () => {
    expect(shouldAttachPageContext("hãy giải thích trang web này có gì")).toBe(true);
    expect(shouldAttachPageContext("what is this page about?")).toBe(true);
    expect(shouldAttachPageContext("このページの内容を説明して")).toBe(true);
  });

  it("does not attach page context for unrelated short chat by default", () => {
    expect(shouldAttachPageContext("dịch câu này sang tiếng nhật")).toBe(false);
  });
});
