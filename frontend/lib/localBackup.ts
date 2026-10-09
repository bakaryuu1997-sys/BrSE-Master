import { apiBaseUrl } from "@/lib/config";

const backupPrefix = "brse.";

export type LocalBackupPayload = {
  version: 1;
  exportedAt: string;
  items: Record<string, string>;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createLocalBackup(): LocalBackupPayload {
  const items: Record<string, string> = {};
  if (!canUseStorage()) return { version: 1, exportedAt: new Date().toISOString(), items };

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(backupPrefix)) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) items[key] = value;
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items
  };
}

export function downloadLocalBackup() {
  const backup = createLocalBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `brse-os-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return backup;
}

export function restoreLocalBackup(text: string) {
  if (!canUseStorage()) throw new Error("Browser localStorage không khả dụng.");
  const payload = JSON.parse(text) as LocalBackupPayload;
  if (!payload || payload.version !== 1 || typeof payload.items !== "object") {
    throw new Error("Backup file không đúng định dạng.");
  }

  Object.entries(payload.items).forEach(([key, value]) => {
    if (key.startsWith(backupPrefix) && typeof value === "string") {
      window.localStorage.setItem(key, value);
    }
  });

  return payload;
}

export async function pushLocalBackupToPostgres() {
  const backup = createLocalBackup();
  const response = await fetch(`${apiBaseUrl}/client-state/snapshot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: backup.version,
      exported_at: backup.exportedAt,
      items: backup.items,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Không sync được dữ liệu local lên PostgreSQL.");
  }

  return response.json() as Promise<{ version: number; exported_at: string; saved_at?: string; items: Record<string, string> }>;
}

export async function restoreLocalBackupFromPostgres() {
  const response = await fetch(`${apiBaseUrl}/client-state/snapshot/current`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || "Chưa có snapshot PostgreSQL để restore.");
  }

  const payload = await response.json() as { version: number; exported_at: string; saved_at?: string; items: Record<string, string> };
  restoreLocalBackup(JSON.stringify({
    version: payload.version,
    exportedAt: payload.exported_at,
    items: payload.items,
  }));
  return payload;
}
