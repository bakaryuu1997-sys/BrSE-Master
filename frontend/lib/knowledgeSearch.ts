import { type KnowledgeItem } from "./knowledge";

const RANK_WEIGHTS = {
  exactTitle: 100,
  titlePhrase: 70,
  categoryPhrase: 45,
  sourcePhrase: 35,
  contentPhrase: 30,
  titleToken: 14,
  categoryToken: 8,
  sourceToken: 5,
  contentToken: 3,
  reference: 2,
  maxReferenceBonus: 12,
} as const;

type RankableKnowledgeItem = KnowledgeItem & {
  source?: string;
};

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tokenizeSearch(value: string): string[] {
  return normalizeSearchText(value)
    .split(/[^a-z0-9ぁ-んァ-ン一-龥]+/i)
    .filter((token) => token.length >= 2);
}

export function extractReferences(content: string): string[] {
  return Array.from(new Set(content.match(/\[\[[^\]]+\]\]|https?:\/\/\S+/g) ?? []));
}

export function rankKnowledgeItem(item: RankableKnowledgeItem, query: string): number {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) return 0;
  const tokens = tokenizeSearch(normalizedQuery);
  const title = normalizeSearchText(item.title);
  const category = normalizeSearchText(item.category);
  const source = normalizeSearchText(item.source ?? "knowledge");
  const content = normalizeSearchText(item.content);
  let score = 0;
  if (title === normalizedQuery) score += RANK_WEIGHTS.exactTitle;
  if (title.includes(normalizedQuery)) score += RANK_WEIGHTS.titlePhrase;
  if (category.includes(normalizedQuery)) score += RANK_WEIGHTS.categoryPhrase;
  if (source.includes(normalizedQuery)) score += RANK_WEIGHTS.sourcePhrase;
  if (content.includes(normalizedQuery)) score += RANK_WEIGHTS.contentPhrase;
  tokens.forEach((token) => {
    if (title.includes(token)) score += RANK_WEIGHTS.titleToken;
    if (category.includes(token)) score += RANK_WEIGHTS.categoryToken;
    if (source.includes(token)) score += RANK_WEIGHTS.sourceToken;
    if (content.includes(token)) score += RANK_WEIGHTS.contentToken;
  });
  score += Math.min(RANK_WEIGHTS.maxReferenceBonus, extractReferences(item.content).length * RANK_WEIGHTS.reference);
  return score;
}

export function sortKnowledgeByRank<TItem extends RankableKnowledgeItem>(items: TItem[], query: string): TItem[] {
  return [...items].sort((left, right) => {
    const scoreDiff = rankKnowledgeItem(right, query) - rankKnowledgeItem(left, query);
    if (scoreDiff !== 0) return scoreDiff;

    const titleDiff = left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
    if (titleDiff !== 0) return titleDiff;

    return left.id - right.id;
  });
}
