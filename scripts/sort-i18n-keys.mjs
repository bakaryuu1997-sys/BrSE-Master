import fs from "node:fs";

const files = [
  "frontend/lib/i18n/vi.ts",
  "frontend/lib/i18n/en.ts",
  "frontend/lib/i18n/ja.ts",
];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(/^(export const \w+ = \{\n)([\s\S]*?)(\n\} as const;\n?)$/);
  if (!match) {
    throw new Error(`Unsupported i18n file shape: ${file}`);
  }

  const entries = match[2]
    .split("\n")
    .map((line) => line.trimEnd().replace(/,$/, ""))
    .filter((line) => line.trim().length > 0)
    .sort((a, b) => {
      const keyA = a.match(/^\s*"([^"]+)":/)?.[1] ?? a;
      const keyB = b.match(/^\s*"([^"]+)":/)?.[1] ?? b;
      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
      return 0;
    })
    .map((line) => `${line},`);

  fs.writeFileSync(file, `${match[1]}${entries.join("\n")}${match[3]}`, "utf8");
}
