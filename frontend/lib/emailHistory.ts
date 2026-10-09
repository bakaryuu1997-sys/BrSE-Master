import { apiBaseUrl } from "@/lib/config";
import type { EmailTemplate, TemplateValues } from "@/lib/emailTemplates";

export type GeneratedEmailHistoryItem = {
  id: string;
  templateId: string;
  templateTitle: string;
  category: string;
  subject: string;
  body: string;
  variables: TemplateValues;
  createdAt: string;
};

const DB_NAME = "brse-os-offline-cache";
const STORE_NAME = "kv";
const HISTORY_KEY_PREFIX = "email-history:";
const MAX_HISTORY_ITEMS = 200;
const DEFAULT_HISTORY_PAGE_SIZE = 50;

let memoryHistory: GeneratedEmailHistoryItem[] = [];

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCache(projectId: string): Promise<GeneratedEmailHistoryItem[]> {
  const db = await openCacheDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(`${HISTORY_KEY_PREFIX}${projectId}`);
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function writeCache(projectId: string, items: GeneratedEmailHistoryItem[]) {
  const db = await openCacheDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).put(items.slice(0, MAX_HISTORY_ITEMS), `${HISTORY_KEY_PREFIX}${projectId}`);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

function fromApi(payload: {
  id: string;
  template_id?: string;
  template_title?: string;
  category?: string;
  subject?: string;
  body?: string;
  variables?: TemplateValues;
  created_at?: string;
}): GeneratedEmailHistoryItem {
  return {
    id: payload.id,
    templateId: payload.template_id ?? "",
    templateTitle: payload.template_title ?? "",
    category: payload.category ?? "",
    subject: payload.subject ?? "",
    body: payload.body ?? "",
    variables: payload.variables ?? {},
    createdAt: payload.created_at ?? new Date().toISOString(),
  };
}

export function getEmailHistory(): GeneratedEmailHistoryItem[] {
  return memoryHistory;
}

export async function fetchEmailHistory(
  projectId = "default",
  options: { query?: string; limit?: number; offset?: number; append?: boolean } = {}
): Promise<GeneratedEmailHistoryItem[]> {
  try {
    const params = new URLSearchParams({
      project_id: projectId,
      limit: String(options.limit ?? DEFAULT_HISTORY_PAGE_SIZE),
      offset: String(options.offset ?? 0),
    });
    if (options.query?.trim()) params.set("q", options.query.trim());
    const response = await fetch(`${apiBaseUrl}/email-history?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Không tải được Email History từ PostgreSQL.");
    const data = (await response.json()) as Array<Parameters<typeof fromApi>[0]>;
    const nextItems = data.map(fromApi);
    memoryHistory = options.append ? [...memoryHistory, ...nextItems] : nextItems;
    await writeCache(projectId, memoryHistory).catch(() => undefined);
    return memoryHistory;
  } catch (error) {
    const cached = await readCache(projectId).catch(() => []);
    memoryHistory = cached;
    if (cached.length) return cached;
    throw error;
  }
}

export async function fetchEmailHistoryItem(id: string): Promise<GeneratedEmailHistoryItem | null> {
  const response = await fetch(`${apiBaseUrl}/email-history/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) return null;
  return fromApi(await response.json());
}

export async function saveEmailHistoryItem(
  input: {
    template: EmailTemplate;
    subject: string;
    body: string;
    variables: TemplateValues;
  },
  projectId = "default"
): Promise<GeneratedEmailHistoryItem> {
  const optimistic: GeneratedEmailHistoryItem = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    templateId: input.template.id,
    templateTitle: input.template.title_vi,
    category: input.template.category,
    subject: input.subject,
    body: input.body,
    variables: input.variables,
    createdAt: new Date().toISOString(),
  };
  memoryHistory = [optimistic, ...memoryHistory].slice(0, MAX_HISTORY_ITEMS);
  await writeCache(projectId, memoryHistory).catch(() => undefined);

  const response = await fetch(`${apiBaseUrl}/email-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId,
      template_id: input.template.id,
      template_title: input.template.title_vi,
      category: input.template.category,
      subject: input.subject,
      body: input.body,
      variables: input.variables,
    }),
  });
  if (!response.ok) return optimistic;
  const saved = fromApi(await response.json());
  memoryHistory = [saved, ...memoryHistory.filter((item) => item.id !== optimistic.id)].slice(0, MAX_HISTORY_ITEMS);
  await writeCache(projectId, memoryHistory).catch(() => undefined);
  return saved;
}

export async function clearEmailHistory(projectId = "default") {
  memoryHistory = [];
  await writeCache(projectId, []).catch(() => undefined);
  await fetch(`${apiBaseUrl}/email-history?project_id=${encodeURIComponent(projectId)}`, { method: "DELETE" }).catch(() => undefined);
}
