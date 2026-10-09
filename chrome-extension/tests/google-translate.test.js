import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  googleTranslatePro,
  parseEnglishDictionaryResponse,
  parseGoogleTranslateResponse,
} from "../src/shared/google-translate.js";

const MOCK_GOOGLE_JSON = [
  [["thử nghiệm", "testing", null, "testing"]],
  [["động từ", ["thiết lập", "thử"], [["thiết lập", ["setup"]]], "test", 2]],
  "en",
  null, null,
  [["testing", null, [["thử nghiệm", null, true]]]],
  1, [], [["en"]], null, null,
  [["động từ", [["assay"]], "test", 2]],
  [["danh từ", [["the action of testing", "m_id", "Testing helps releases."]], "testing", 1]],
  [["<b>testing</b> example"]],
];

describe("Google Translate Pro Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("parses complex google response correctly", () => {
    const result = parseGoogleTranslateResponse("testing", MOCK_GOOGLE_JSON);

    expect(result.translation).toBe("thử nghiệm");
    expect(result.translationLanguage).toBe("vi");
    expect(result.sourceLang).toBe("en");
    expect(result.dictionary[0].type).toBe("động từ");
    expect(result.definitions[0].entries[0].desc).toBe("the action of testing");
    expect(result.synonyms[0].terms).toContain("assay");
  });

  it("falls back to a fast translation request when rich dictionary lookup fails", async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes("tl=ja")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([[["高速翻訳", "fast translation"]], null, "en"]),
        });
      }
      if (String(url).includes("api.dictionaryapi.dev")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ meanings: [] }]),
        });
      }
      if (String(url).includes("dt=bd")) {
        return Promise.reject(new Error("Network fail"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([[["bản dịch nhanh", "fast translation"]], null, "en"]),
      });
    });

    const result = await googleTranslatePro("fast translation");

    expect(result.translation).toBe("bản dịch nhanh");
    expect(result.japaneseTranslation).toBe("高速翻訳");
    expect(global.fetch.mock.calls.some((call) => String(call[0]).includes("dt=t&dt=rm"))).toBe(true);
  });

  it("uses English dictionary structure when Google translation fails", async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes("api.dictionaryapi.dev")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{
            meanings: [{
              partOfSpeech: "noun",
              definitions: [
                { definition: "The first item in a sequence.", example: "This is the first release." },
                { definition: "The earliest point in time." },
              ],
              synonyms: ["initial"],
            }],
          }]),
        });
      }
      return Promise.reject(new Error("Network fail"));
    });

    const result = await googleTranslatePro("first");

    expect(result.translation).toBe("The first item in a sequence.");
    expect(result.translationLanguage).toBe("en");
    expect(result.definitions[0].type).toBe("noun");
    expect(result.definitions[0].entries).toHaveLength(2);
  });

  it("parses dictionaryapi.dev meanings into structured dictionary entries", () => {
    const result = parseEnglishDictionaryResponse([{
      meanings: [{
        partOfSpeech: "adverb",
        definitions: [
          { definition: "Before anything else.", example: "Finish this first." },
        ],
        synonyms: ["firstly"],
      }],
    }]);

    expect(result.definitions[0].type).toBe("adverb");
    expect(result.dictionary[0].terms).toContain("firstly");
    expect(result.translationFallback).toBe("Before anything else.");
  });
});
