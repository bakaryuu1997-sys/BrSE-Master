import { apiBaseUrl } from "@/lib/config";

export type SprintTask = {
  id: string;
  name: string;
  owner: string;
  hours: number;
  status: "todo" | "doing" | "done";
};

export type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
};

export type RiskItem = {
  id: string;
  title: string;
  impact: "Low" | "Medium" | "High";
  probability: "Low" | "Medium" | "High";
  mitigation: string;
  status: "Open" | "Watching" | "Closed";
};

export type PowerToolsState = {
  teamSize: number;
  sprintDays: number;
  focusRatio: number;
  tasks: SprintTask[];
  checklist: ChecklistItem[];
  risks: RiskItem[];
};

export const defaultPowerToolsState: PowerToolsState = {
  teamSize: 3,
  sprintDays: 10,
  focusRatio: 80,
  tasks: [
    { id: "seed-task-1", name: "Review customer spec", owner: "BrSE", hours: 6, status: "todo" },
    { id: "seed-task-2", name: "Prepare Q&A list", owner: "BrSE", hours: 4, status: "doing" },
  ],
  checklist: [
    { id: "seed-check-1", title: "Kick-off agenda ready", done: false },
    { id: "seed-check-2", title: "Input documents checked", done: false },
    { id: "seed-check-3", title: "Release date avoids VN/JP holidays", done: false },
  ],
  risks: [
    {
      id: "seed-risk-1",
      title: "Customer answer delay affects implementation",
      impact: "High",
      probability: "Medium",
      mitigation: "Batch Q&A and set expected answer date.",
      status: "Watching",
    },
  ],
};

const dbName = "brse-os-offline-cache";
const storeName = "kv";

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedState(projectId: string): Promise<PowerToolsState | null> {
  if (!canUseIndexedDb()) return null;
  const db = await openCacheDb();
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(`power-tools:${projectId}`);
    request.onsuccess = () => resolve((request.result as PowerToolsState | undefined) ?? null);
    request.onerror = () => resolve(null);
  });
}

async function setCachedState(projectId: string, state: PowerToolsState) {
  if (!canUseIndexedDb()) return;
  const db = await openCacheDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(state, `power-tools:${projectId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

function normalizeState(value: Partial<PowerToolsState> | null | undefined): PowerToolsState {
  return {
    ...defaultPowerToolsState,
    ...(value ?? {}),
    tasks: Array.isArray(value?.tasks) ? value.tasks : defaultPowerToolsState.tasks,
    checklist: Array.isArray(value?.checklist) ? value.checklist : defaultPowerToolsState.checklist,
    risks: Array.isArray(value?.risks) ? value.risks : defaultPowerToolsState.risks,
  };
}

export async function fetchPowerToolsState(projectId: string): Promise<{ state: PowerToolsState; source: "postgres" | "indexeddb" | "default" }> {
  try {
    const response = await fetch(`${apiBaseUrl}/power-tools/${encodeURIComponent(projectId)}`);
    if (response.ok) {
      const payload = (await response.json()) as { payload?: Partial<PowerToolsState> };
      const state = normalizeState(payload.payload);
      await setCachedState(projectId, state);
      return { state, source: "postgres" };
    }
  } catch {
    // Fall through to offline cache.
  }
  const cached = await getCachedState(projectId);
  if (cached) return { state: normalizeState(cached), source: "indexeddb" };
  return { state: defaultPowerToolsState, source: "default" };
}

export async function savePowerToolsState(projectId: string, state: PowerToolsState): Promise<"postgres" | "indexeddb"> {
  await setCachedState(projectId, state);
  try {
    const response = await fetch(`${apiBaseUrl}/power-tools/${encodeURIComponent(projectId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, payload: state }),
    });
    if (!response.ok) throw new Error("Power Tools sync failed");
    return "postgres";
  } catch {
    return "indexeddb";
  }
}
