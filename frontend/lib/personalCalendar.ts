import { apiBaseUrl } from "@/lib/config";

export type PersonalSchedule = {
  id: string;
  date: string;
  title: string;
  note: string;
  startTime: string;
  endTime: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type PersonalScheduleInput = {
  date: string;
  title: string;
  note: string;
  startTime: string;
  endTime: string;
  timezone?: string;
};

const storageKey = "brse.personalSchedules.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `schedule-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTimeValue(value: unknown) {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? match[0] : "";
}

function normalizeSchedule(raw: Partial<PersonalSchedule>) {
  return {
    id: typeof raw.id === "string" ? raw.id : createId(),
    date: typeof raw.date === "string" ? raw.date : "",
    title: typeof raw.title === "string" ? raw.title : "",
    note: typeof raw.note === "string" ? raw.note : "",
    startTime: normalizeTimeValue(raw.startTime),
    endTime: normalizeTimeValue(raw.endTime),
    timezone: typeof raw.timezone === "string" && raw.timezone ? raw.timezone : "Asia/Tokyo",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString()
  } satisfies PersonalSchedule;
}

function compareSchedules(first: PersonalSchedule, second: PersonalSchedule) {
  return (
    first.date.localeCompare(second.date) ||
    (first.startTime || "99:99").localeCompare(second.startTime || "99:99") ||
    (first.endTime || "99:99").localeCompare(second.endTime || "99:99") ||
    first.createdAt.localeCompare(second.createdAt)
  );
}

function parseUpdatedAt(value: string | undefined): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function fromApiSchedule(schedule: PersonalSchedule & { start_time?: string; end_time?: string; created_at?: string; updated_at?: string }): PersonalSchedule {
  return {
    id: schedule.id,
    date: schedule.date,
    title: schedule.title,
    note: schedule.note ?? "",
    startTime: normalizeTimeValue(schedule.start_time ?? schedule.startTime),
    endTime: normalizeTimeValue(schedule.end_time ?? schedule.endTime),
    timezone: schedule.timezone || "Asia/Tokyo",
    createdAt: schedule.created_at ?? schedule.createdAt ?? new Date().toISOString(),
    updatedAt: schedule.updated_at ?? schedule.updatedAt ?? new Date().toISOString(),
  };
}

function toScheduleInput(schedule: PersonalSchedule): PersonalScheduleInput {
  return {
    date: schedule.date,
    title: schedule.title,
    note: schedule.note,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    timezone: schedule.timezone,
  };
}

async function writePersonalScheduleToDb(input: PersonalScheduleInput, scheduleId?: string) {
  const payload = {
    date: input.date,
    title: input.title,
    note: input.note,
    start_time: input.startTime,
    end_time: input.endTime,
    timezone: input.timezone || "Asia/Tokyo",
  };
  const response = await fetch(`${apiBaseUrl}/calendar/schedules${scheduleId ? `/${encodeURIComponent(scheduleId)}` : ""}`, {
    method: scheduleId ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(scheduleId ? "Không cập nhật được lịch trong PostgreSQL." : "Không lưu được lịch vào PostgreSQL.");
  return fromApiSchedule(await response.json());
}

export function getPersonalSchedules(): PersonalSchedule[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PersonalSchedule>[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeSchedule(item))
      .filter((item) => item.date && item.title)
      .sort(compareSchedules);
  } catch {
    return [];
  }
}

export function setPersonalSchedules(schedules: PersonalSchedule[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify([...schedules].sort(compareSchedules)));
}

export async function fetchPersonalSchedules(): Promise<PersonalSchedule[]> {
  const localBefore = getPersonalSchedules();
  const response = await fetch(`${apiBaseUrl}/calendar/schedules`);
  if (!response.ok) throw new Error("Không tải được Calendar schedules từ PostgreSQL.");
  const serverSchedules = ((await response.json()) as Array<PersonalSchedule & { start_time?: string; end_time?: string; created_at?: string; updated_at?: string }>)
    .map(fromApiSchedule)
    .sort(compareSchedules);
  const serverById = new Map(serverSchedules.map((schedule) => [schedule.id, schedule]));
  const merged: PersonalSchedule[] = [];
  const toPush: Array<{ schedule: PersonalSchedule; existingId?: string }> = [];

  for (const server of serverSchedules) {
    const local = localBefore.find((schedule) => schedule.id === server.id);
    if (local && parseUpdatedAt(local.updatedAt) > parseUpdatedAt(server.updatedAt)) {
      merged.push(local);
      toPush.push({ schedule: local, existingId: local.id });
    } else {
      merged.push(server);
    }
  }

  for (const local of localBefore) {
    if (!serverById.has(local.id)) {
      merged.push(local);
      toPush.push({ schedule: local });
    }
  }

  setPersonalSchedules(merged);

  if (toPush.length) {
    const results = await Promise.allSettled(
      toPush.map(async ({ schedule, existingId }) => ({
        oldId: schedule.id,
        saved: await writePersonalScheduleToDb(toScheduleInput(schedule), existingId),
      })),
    );
    const synced = results
      .filter((result): result is PromiseFulfilledResult<{ oldId: string; saved: PersonalSchedule }> => result.status === "fulfilled")
      .map((result) => result.value);
    if (synced.length) {
      let nextSchedules = getPersonalSchedules();
      for (const { oldId, saved } of synced) {
        nextSchedules = nextSchedules.filter((schedule) => schedule.id !== oldId && schedule.id !== saved.id);
        nextSchedules.push(saved);
      }
      setPersonalSchedules(nextSchedules);
    }
  }

  return getPersonalSchedules();
}

export function savePersonalSchedule(input: PersonalScheduleInput, scheduleId?: string) {
  const now = new Date().toISOString();
  const schedules = getPersonalSchedules();
  const normalized = {
    date: input.date,
    title: input.title.trim(),
    note: input.note.trim(),
    startTime: normalizeTimeValue(input.startTime),
    endTime: normalizeTimeValue(input.endTime),
    timezone: input.timezone || "Asia/Tokyo"
  } satisfies Required<PersonalScheduleInput>;

  if (scheduleId) {
    const updated = schedules.map((schedule) =>
      schedule.id === scheduleId
        ? {
            ...schedule,
            ...normalized,
            updatedAt: now
          }
        : schedule
    );
    setPersonalSchedules(updated);
    return updated.find((schedule) => schedule.id === scheduleId) ?? null;
  }

  const nextSchedule: PersonalSchedule = {
    id: createId(),
    ...normalized,
    createdAt: now,
    updatedAt: now
  };
  setPersonalSchedules([...schedules, nextSchedule]);
  return nextSchedule;
}

export async function savePersonalScheduleToDb(input: PersonalScheduleInput, scheduleId?: string) {
  const saved = await writePersonalScheduleToDb(input, scheduleId);
  const schedules = getPersonalSchedules();
  const nextSchedules = schedules.some((schedule) => schedule.id === saved.id)
    ? schedules.map((schedule) => (schedule.id === saved.id ? saved : schedule))
    : [...schedules, saved];
  setPersonalSchedules(nextSchedules);
  return saved;
}

export function deletePersonalSchedule(scheduleId: string) {
  const schedules = getPersonalSchedules().filter((schedule) => schedule.id !== scheduleId);
  setPersonalSchedules(schedules);
}

export async function deletePersonalScheduleFromDb(scheduleId: string) {
  const response = await fetch(`${apiBaseUrl}/calendar/schedules/${encodeURIComponent(scheduleId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Không xóa được lịch trong PostgreSQL.");
  deletePersonalSchedule(scheduleId);
}

export function groupSchedulesByDate(schedules: PersonalSchedule[]) {
  return schedules.reduce<Record<string, PersonalSchedule[]>>((grouped, schedule) => {
    grouped[schedule.date] = [...(grouped[schedule.date] ?? []), schedule].sort(compareSchedules);
    return grouped;
  }, {});
}
