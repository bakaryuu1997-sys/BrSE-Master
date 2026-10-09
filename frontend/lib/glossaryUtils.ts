import { glossaryCategories, glossaryRoles, type GlossaryRole, type GlossaryTerm } from "@/lib/glossary";

type GlossaryCategory = GlossaryTerm["category"];

export const allRoles = "All Roles";
export const allCategories = "All Categories";
export const masteredStorageKey = "brse-glossary-mastered-v1";
export const customGlossaryStorageKey = "brse-glossary-custom-v1";
export const masteredSyncKey = "brse.glossary.masteredIds.v1";
export const customGlossarySyncKey = "brse.glossary.customTerms.v1";
export const globalProjectScope = "global";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function normalizeRole(value: string): GlossaryRole | null {
  const normalized = value.trim().toLowerCase();
  return glossaryRoles.find((item) => item.toLowerCase() === normalized) ?? null;
}

export function normalizeCategory(value: string): GlossaryCategory {
  const normalized = value.trim().toLowerCase();
  return glossaryCategories.find((item) => item.toLowerCase() === normalized) ?? "Business";
}

export function slugifyTerm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 52);
}

export function scopedBrowserKey(baseKey: string, projectId: string): string {
  return projectId === globalProjectScope ? baseKey : `${baseKey}.${projectId}`;
}

export function scopedClientStateKey(baseKey: string, projectId: string): string {
  return projectId === globalProjectScope ? baseKey : `${baseKey}.${projectId}`;
}

export function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function parseGlossaryCsv(text: string): GlossaryTerm[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((item) => item.trim().toLowerCase());
  const read = (row: string[], keys: string[]) => {
    const index = header.findIndex((item) => keys.includes(item));
    return index >= 0 ? row[index]?.trim() ?? "" : "";
  };

  return rows.slice(1).flatMap((row, index): GlossaryTerm[] => {
    const english = read(row, ["english", "en", "term", "thuật ngữ", "thuat ngu"]);
    const japanese = read(row, ["japanese", "jp", "ja", "日本語", "nhật", "nhat"]);
    const vietnamese = read(row, ["vietnamese", "vi", "vn", "meaning", "nghĩa", "nghia"]);
    if (!english || !japanese || !vietnamese) return [];

    const rawRoles = read(row, ["roles", "role", "vai trò", "vai tro"]);
    const roles = rawRoles
      .split(/[;/|]/)
      .map(normalizeRole)
      .filter((item): item is GlossaryRole => Boolean(item));

    return [
      {
        id: `custom-${slugifyTerm(english || japanese) || "term"}-${Date.now()}-${index}`,
        english,
        japanese,
        kana: read(row, ["kana", "furigana", "読み", "yomi"]) || undefined,
        vietnamese,
        category: normalizeCategory(read(row, ["category", "loại", "loai"])),
        roles: roles.length > 0 ? roles : ["BrSE"],
        note: read(row, ["note", "notes", "ghi chú", "ghi chu"]) || "Thuật ngữ import từ CSV.",
        example: read(row, ["example", "ví dụ", "vi du"]) || undefined,
      },
    ];
  });
}

export function serializeGlossaryToCsv(terms: GlossaryTerm[]): string {
  const header = ["english", "japanese", "vietnamese", "kana", "category", "roles", "note", "example"];
  const rows = terms.map((term) =>
    [
      term.english,
      term.japanese,
      term.vietnamese,
      term.kana ?? "",
      term.category,
      term.roles.join(";"),
      term.note,
      term.example ?? "",
    ]
      .map((value) => csvEscape(value))
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export function serializeGlossaryToAnkiCsv(terms: GlossaryTerm[]): string {
  const rows = terms.map((term) =>
    [
      `${term.english}${term.kana ? ` (${term.kana})` : ""}`,
      `${term.japanese}\n${term.vietnamese}`,
      term.note,
      term.example ?? "",
    ]
      .map((value) => csvEscape(value))
      .join(",")
  );
  return rows.join("\n");
}
