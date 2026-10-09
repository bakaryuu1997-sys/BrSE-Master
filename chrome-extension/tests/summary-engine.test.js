import { describe, expect, it } from "vitest";
import {
  appendAiFailureNotice,
  buildAiSummaryInput,
  buildFastPageSummary,
  buildLocalizedFastSummary,
  isAiErrorText,
} from "../src/content/summaryEngine.js";

describe("fast page summary engine", () => {
  const source = {
    kind: "page",
    sourceLabel: "Page body text",
    status: "Live page text",
    charCount: 980,
    isFallback: false,
    title: "React TypeScript Setup",
    promptText: [
      "This guide explains how to configure TypeScript with React and Vite for production projects.",
      "The most important step is enabling type-aware lint rules so defineConfig and parserOptions are validated correctly.",
      "Developers should install eslint-plugin-react-x and eslint-plugin-react-dom before turning on strict validation.",
      "If the application uses Cloudflare Tunnel or Docker, check API routes and environment variables before release.",
      "Action items include updating eslint.config.js, verifying npm run build, and documenting warnings for the team.",
    ].join(" "),
  };

  it("builds an immediate local summary with glossary candidates", () => {
    const summary = buildFastPageSummary(source, { lang: "vi", title: "React TypeScript Setup" });

    expect(summary).toContain("Tóm tắt nhanh");
    expect(summary).toContain("React TypeScript Setup");
    expect(summary).toContain("--- DICTIONARY START ---");
    expect(summary).toMatch(/TypeScript|Cloudflare|defineConfig/);
  });

  it("builds a compact AI refine prompt without JSON glossary instructions", () => {
    const localSummary = buildFastPageSummary(source, { lang: "vi" });
    const prompt = buildAiSummaryInput(source, { lang: "vi", title: "React TypeScript Setup", localSummary });

    expect(prompt).toContain("Return concise Markdown only");
    expect(prompt).toContain("Do not output JSON");
    expect(prompt).not.toContain("DICTIONARY START");
    expect(prompt.length).toBeLessThan(9000);
  });

  it("keeps the local summary when AI fails", () => {
    const localSummary = buildFastPageSummary(source, { lang: "vi" });
    const fallback = appendAiFailureNotice(localSummary, "❌ Backend AI (503)", "vi");

    expect(isAiErrorText("❌ Backend AI (503)")).toBe(true);
    expect(fallback).toContain("Tóm tắt nhanh");
    expect(fallback).toContain("AI chưa refine được");
  });

  it("summarizes readable page text even when it has no sentence punctuation", () => {
    const summary = buildFastPageSummary({
      ...source,
      promptText: "Dashboard Workflow Todo Prompt Library Cheatsheet Rules Checklist Templates Agent Settings Design Prompts Prompt Library supports a workflow rail Audit Plan Build Test Refactor Commit Release",
    }, { lang: "vi", title: "GitHub repo page" });

    expect(summary).toContain("GitHub repo page");
    expect(summary).not.toContain("Không lấy được đủ nội dung");
    expect(summary).toContain("Dashboard Workflow Todo");
  });

  it("localizes extractive sentences via the injected translator", async () => {
    const translate = async (text, lang) => `[${lang}] ${text}`;
    const localized = await buildLocalizedFastSummary(
      source,
      { lang: "vi", title: "React TypeScript Setup" },
      translate,
    );
    // Structure/labels preserved; the page sentences run through the translator.
    expect(localized).toContain("Tóm tắt nhanh");
    expect(localized).toContain("[vi] ");
    // Glossary block still derives from the original (untranslated) text.
    expect(localized).toContain("--- DICTIONARY START ---");
  });

  it("falls back to the plain draft when no translator is provided", async () => {
    const localized = await buildLocalizedFastSummary(source, { lang: "vi" }, null);
    expect(localized).toBe(buildFastPageSummary(source, { lang: "vi" }));
  });

  it("keeps a sentence's original text when its translation throws", async () => {
    const translate = async () => {
      throw new Error("network down");
    };
    const localized = await buildLocalizedFastSummary(source, { lang: "vi" }, translate);
    // Never throws; the original English sentence survives the failure.
    expect(localized).toMatch(/TypeScript|Cloudflare|eslint/);
  });

  it("dedups near-duplicate sentences so distinct ideas survive the pick", () => {
    const dupBase = "The deployment pipeline relies on Docker containers for the microservice release process";
    const dups = [
      dupBase, `${dupBase} now`, `${dupBase} here`,
      `${dupBase} today`, `${dupBase} again`, `${dupBase} still`,
    ];
    const distinct = [
      "Kubernetes orchestrates container scheduling across the production cluster nodes automatically today",
      "Cloudflare Tunnel exposes internal API endpoints securely to remote partners without any VPN setup",
      "The PostgreSQL database stores glossary terms and meeting minutes for the bridge software engineers",
      "Continuous integration runs eslint checks and the unit test suite before every merge to master",
      "Playwright end to end tests validate the login and checkout flows on every nightly build schedule",
      "The observability stack ships structured logs and traces to help engineers debug production incidents",
    ];
    // 6 near-identical sentences lead (high position score) followed by 6 distinct
    // ones; without dedup the duplicates crowd out the later distinct ideas.
    const summary = buildFastPageSummary(
      { promptText: `${[...dups, ...distinct].join(". ")}.` },
      { lang: "vi" },
    );
    for (const keyword of ["Kubernetes", "Cloudflare", "PostgreSQL", "eslint", "Playwright", "observability"]) {
      expect(summary).toContain(keyword);
    }
  });
});
