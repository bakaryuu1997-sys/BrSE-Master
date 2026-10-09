import { apiBaseUrl } from "@/lib/config";

type RestoreSystemBackupResult = {
  message?: string;
};

export async function createSystemBackup(): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/settings/backup`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Không thể tạo bản sao lưu hệ thống từ PostgreSQL.");
  }

  return response.blob();
}

export async function restoreSystemBackup(file: File): Promise<RestoreSystemBackupResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBaseUrl}/settings/restore`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail || "Khôi phục hệ thống từ tệp tin thất bại.");
  }

  return response.json() as Promise<RestoreSystemBackupResult>;
}

export function downloadSystemBackupBlob(blob: Blob, now = new Date()) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `brse-os-full-backup-${now.toISOString().slice(0, 10)}.brsebackup`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}