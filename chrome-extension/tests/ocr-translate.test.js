import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTranslations,
  fillMissingTranslations,
  needsTranslationFill,
  regionMissingTargets,
} from "../src/shared/ocrTranslate.js";
import { translateText } from "../src/shared/google-translate.js";

describe("regionMissingTargets", () => {
  it("lists empty target languages and skips the source language", () => {
    const region = { text: "ログイン", source_language: "ja", translation_ja: "ログイン" };
    expect(regionMissingTargets(region)).toEqual(["vi", "en"]);
  });

  it("returns nothing when all targets are present", () => {
    const region = {
      text: "Login",
      source_language: "en",
      translation_ja: "ログイン",
      translation_vi: "Đăng nhập",
      translation_en: "Login",
    };
    expect(regionMissingTargets(region)).toEqual([]);
  });

  it("ignores regions without source text", () => {
    expect(regionMissingTargets({ text: "  " })).toEqual([]);
  });
});

describe("needsTranslationFill", () => {
  it("is true when any region is missing a target", () => {
    expect(needsTranslationFill([{ text: "あ", source_language: "ja" }])).toBe(true);
  });
  it("is false when every region is complete", () => {
    expect(needsTranslationFill([
      { text: "Login", source_language: "en", translation_ja: "ログイン", translation_vi: "Đăng nhập", translation_en: "Login" },
    ])).toBe(false);
  });
});

describe("applyTranslations", () => {
  it("fills missing fields without overwriting existing ones", () => {
    const region = { text: "ログイン", source_language: "ja", translation_vi: "Đăng nhập (cũ)" };
    const out = applyTranslations(region, { vi: "MỚI", en: "Login" });
    expect(out.translation_vi).toBe("Đăng nhập (cũ)"); // not overwritten
    expect(out.translation_en).toBe("Login");
    expect(out.translation_ja).toBe("ログイン"); // source field filled from text
    expect(out.translation).toBe("Đăng nhập (cũ)"); // alias synced to vi
  });
});

describe("fillMissingTranslations", () => {
  it("only translates missing targets and leaves complete regions untouched", async () => {
    const translate = vi.fn(async (_text, lang) => `T-${lang}`);
    const input = [
      { text: "ログイン", source_language: "ja" },
      { text: "Login", source_language: "en", translation_ja: "ログイン", translation_vi: "Đăng nhập", translation_en: "Login" },
    ];
    const out = await fillMissingTranslations(input, { translate });
    // First region: vi + en translated (ja is source). Second region: untouched.
    expect(translate).toHaveBeenCalledTimes(2);
    expect(out[0].translation_vi).toBe("T-vi");
    expect(out[0].translation_en).toBe("T-en");
    expect(out[0].translation_ja).toBe("ログイン");
    expect(out[1].translation_vi).toBe("Đăng nhập");
  });

  it("leaves a field empty when its translation call fails", async () => {
    const translate = vi.fn(async (_text, lang) => {
      if (lang === "en") throw new Error("network");
      return `T-${lang}`;
    });
    const out = await fillMissingTranslations([{ text: "ログイン", source_language: "ja" }], { translate });
    expect(out[0].translation_vi).toBe("T-vi");
    expect(out[0].translation_en || "").toBe(""); // failed lang stays empty
  });
});

describe("translateText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("returns the joined translation and caches repeat lookups", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([[["Đăng nhập", "Login"]], null, "en"]),
    });
    const first = await translateText("Login", "vi");
    const second = await translateText("Login", "vi");
    expect(first).toBe("Đăng nhập");
    expect(second).toBe("Đăng nhập");
    expect(global.fetch).toHaveBeenCalledTimes(1); // cached on the second call
  });

  it("returns empty string for blank input without hitting the network", async () => {
    expect(await translateText("   ", "vi")).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
