import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectGenericPageSummarySource,
  collectYouTubeSummarySource,
  formatSummarySourceNotice,
  readVisibleYouTubeTranscriptPanel,
} from "../src/content/summarySource.js";

describe("summary source collection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
  });

  it("reports page source and input length", () => {
    const dom = new JSDOM("<!doctype html><body><main>Alpha Beta Gamma</main></body>");

    const source = collectGenericPageSummarySource(dom.window.document);

    expect(source.sourceLabel).toBe("Page body text");
    expect(source.charCount).toBeGreaterThan(0);
    expect(formatSummarySourceNotice(source)).toContain("Input length");
  });

  it("prefers readable main content over navigation noise", () => {
    const dom = new JSDOM(`
      <!doctype html>
      <body>
        <nav>Home Settings Login Logout Menu Menu Menu</nav>
        <main>
          This production guide explains how to configure React, TypeScript, Vite, and ESLint for a stable project.
          It focuses on type-aware lint rules, parser options, dependency setup, and build verification.
          Developers should update eslint.config.js, run npm scripts, and document warnings before release.
        </main>
      </body>
    `);

    const source = collectGenericPageSummarySource(dom.window.document);

    expect(source.promptText).toContain("production guide");
    expect(source.promptText).not.toContain("Login Logout");
  });

  it("ignores serialized HTML and script payloads inside content candidates", () => {
    const dom = new JSDOM(`
      <!doctype html>
      <body>
        <main class="container-lg">
          <script>
            self.__next_f.push(["class=\\\"markdown-body entry-content container-lg\\\" itemprop=\\\"text\\\" dir=\\\"auto\\\" \\u003cdiv\\u003e noisy serialized markup"]);
          </script>
          <article class="markdown-body" itemprop="text">
            This repository guide explains how Sensei-Hub organizes Next.js, React, TypeScript, and Tailwind CSS.
            The readable section describes installation, local development, route structure, component ownership,
            deployment checks, issue triage, and release verification for a stable engineering workflow.
            It should be summarized as normal project documentation instead of escaped HTML attributes.
          </article>
        </main>
      </body>
    `);

    const source = collectGenericPageSummarySource(dom.window.document);

    expect(source.promptText).toContain("Sensei-Hub organizes");
    expect(source.promptText).not.toContain("self.__next_f.push");
    expect(source.promptText).not.toContain("\\u003cdiv");
    expect(source.promptText).not.toContain("itemprop=");
  });

  it("reads an already visible YouTube transcript panel", () => {
    const dom = new JSDOM(`
      <!doctype html>
      <body>
        <ytd-transcript-segment-renderer>First transcript line with enough text.</ytd-transcript-segment-renderer>
        <ytd-transcript-segment-renderer>Second transcript line with enough text for summary.</ytd-transcript-segment-renderer>
      </body>
    `);

    const transcript = readVisibleYouTubeTranscriptPanel(dom.window.document);

    expect(transcript).toContain("First transcript line");
    expect(transcript).toContain("Second transcript line");
  });

  it("makes YouTube no-caption fallback explicit", async () => {
    const dom = new JSDOM(`
      <!doctype html>
      <title>Video title</title>
      <body>
        <h1 class="ytd-watch-metadata">Video title</h1>
        <div id="description-inline-expander">Short description.</div>
      </body>
    `, { url: "https://www.youtube.com/watch?v=abc123" });
    global.fetch = vi.fn().mockRejectedValue(new Error("blocked"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const source = await collectYouTubeSummarySource(dom.window.location, dom.window.document);

    expect(source.noTranscript).toBe(true);
    expect(source.status).toContain("No captions found");
    expect(formatSummarySourceNotice(source)).toContain("no subtitles/captions");
  });
});
