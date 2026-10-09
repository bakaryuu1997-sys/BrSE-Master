import { describe, expect, it } from "vitest";

import { appendBubbleTimestamp, formatMessageTime, renderBubbleTimestampHtml } from "../src/content/ui/quickbox/chatTime.js";

describe("QuickBox chat timestamps", () => {
  it("renders a real local time marker for chat bubbles", () => {
    const date = new Date("2026-06-01T07:08:09Z");

    expect(formatMessageTime(date)).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(renderBubbleTimestampHtml(date)).toContain("bubble-time");
  });

  it("appends one timestamp per bubble", () => {
    const bubble = document.createElement("div");

    appendBubbleTimestamp(bubble, new Date("2026-06-01T07:08:09Z"));
    appendBubbleTimestamp(bubble, new Date("2026-06-01T07:08:10Z"));

    expect(bubble.querySelectorAll(".bubble-time")).toHaveLength(1);
  });
});
