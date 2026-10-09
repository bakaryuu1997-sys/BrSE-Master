import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const localeRoot = path.resolve(process.cwd(), "public/_locales");
const namedPlaceholderPattern = /\$([A-Za-z_][A-Za-z0-9_]*)\$/g;

describe("extension locale placeholders", () => {
  it("does not contain undeclared named placeholders that break unpacked loading", () => {
    const failures = [];
    for (const locale of fs.readdirSync(localeRoot)) {
      const filePath = path.join(localeRoot, locale, "messages.json");
      const messages = JSON.parse(fs.readFileSync(filePath, "utf8"));
      for (const [key, value] of Object.entries(messages)) {
        const message = String(value.message ?? "");
        const declared = new Set(Object.keys(value.placeholders ?? {}));
        for (const match of message.matchAll(namedPlaceholderPattern)) {
          const name = match[1];
          if (!declared.has(name)) {
            failures.push(`${locale}/${key}: $${name}$`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
