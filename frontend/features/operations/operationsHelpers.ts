import type { OperationRecord } from "@/lib/operations";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function daysSince(iso: string) {
  const start = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const now = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.max(0, Math.floor((now - start) / 86400000));
}

export function subjectFor(record: OperationRecord) {
  if (record.type === "qna") return `【ご確認】${record.title}`;
  if (record.type === "bug") return `【不具合報告】${record.title}`;
  return `【変更依頼】${record.title}`;
}
