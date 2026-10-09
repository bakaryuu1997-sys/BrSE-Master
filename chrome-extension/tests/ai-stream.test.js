import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAiStream } from "../src/background/aiStream.js";

describe("background AI stream fetch", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete global.fetch;
  });

  it("times out summary refine requests instead of hanging forever", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    }));

    const pending = fetchAiStream(
      "http://127.0.0.1:3010/api",
      { "Content-Type": "application/json" },
      "Summarize this page",
      { action: "summary" }
    );
    const expectation = expect(pending).rejects.toThrow("AI response timed out after 30s");

    await vi.advanceTimersByTimeAsync(30000);

    await expectation;
  });
});
