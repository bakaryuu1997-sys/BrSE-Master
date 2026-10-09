import { describe, test, expect } from "vitest";
import { vi } from "@/lib/i18n/vi";
import { en } from "@/lib/i18n/en";
import { ja } from "@/lib/i18n/ja";

describe("i18n Translation Key Parity", () => {
  const viKeys = Object.keys(vi);
  const enKeys = Object.keys(en);
  const jaKeys = Object.keys(ja);

  test("should have exact key counts across all languages", () => {
    expect(enKeys.length).toBe(viKeys.length);
    expect(jaKeys.length).toBe(viKeys.length);
  });

  test("should have no missing keys in English compared to Vietnamese", () => {
    const missingInEn = viKeys.filter((key) => !enKeys.includes(key));
    expect(missingInEn).toEqual([]);
  });

  test("should have no missing keys in Japanese compared to Vietnamese", () => {
    const missingInJa = viKeys.filter((key) => !jaKeys.includes(key));
    expect(missingInJa).toEqual([]);
  });

  test("should have no extra keys in English compared to Vietnamese", () => {
    const extraInEn = enKeys.filter((key) => !viKeys.includes(key));
    expect(extraInEn).toEqual([]);
  });

  test("should have no extra keys in Japanese compared to Vietnamese", () => {
    const extraInJa = jaKeys.filter((key) => !viKeys.includes(key));
    expect(extraInJa).toEqual([]);
  });

  test("should have all keys sorted alphabetically in the files (sanity check)", () => {
    const sortedViKeys = [...viKeys].sort();
    expect(viKeys).toEqual(sortedViKeys);
    
    const sortedEnKeys = [...enKeys].sort();
    expect(enKeys).toEqual(sortedEnKeys);

    const sortedJaKeys = [...jaKeys].sort();
    expect(jaKeys).toEqual(sortedJaKeys);
  });
});
