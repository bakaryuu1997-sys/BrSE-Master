import { apiBaseUrl } from "@/lib/config";

export type MemoImage = {
  id: string;
  name: string;
  dataUrl: string;
  url?: string;
  createdAt: string;
};

export type MemoNote = {
  id: string;
  title: string;
  body: string;
  tags: string;
  pinned: boolean;
  images?: MemoImage[];
  createdAt: string;
  updatedAt: string;
};

export type MemoNoteInput = Omit<MemoNote, "id" | "createdAt" | "updatedAt">;

const storageKey = "brse.memoNotes.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `memo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cacheMemoNotes(notes: MemoNote[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(notes));
}

function sortMemoNotes(notes: MemoNote[]) {
  return [...notes].sort((first, second) => Number(second.pinned) - Number(first.pinned) || second.updatedAt.localeCompare(first.updatedAt));
}

function parseUpdatedAt(value: string | undefined): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function fromApiMemo(note: MemoNote & { created_at?: string; updated_at?: string }): MemoNote {
  return {
    id: note.id,
    title: note.title,
    body: note.body ?? "",
    tags: note.tags ?? "",
    pinned: Boolean(note.pinned),
    images: Array.isArray(note.images) ? note.images : [],
    createdAt: note.created_at ?? note.createdAt ?? new Date().toISOString(),
    updatedAt: note.updated_at ?? note.updatedAt ?? new Date().toISOString(),
  };
}

function toMemoInput(note: MemoNote): MemoNoteInput {
  return {
    title: note.title,
    body: note.body,
    tags: note.tags,
    pinned: note.pinned,
    images: Array.isArray(note.images) ? note.images : [],
  };
}

async function writeMemoNoteToDb(input: MemoNoteInput, existingId?: string) {
  const response = await fetch(`${apiBaseUrl}/memos${existingId ? `/${encodeURIComponent(existingId)}` : ""}`, {
    method: existingId ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(existingId ? "Không cập nhật được memo trong PostgreSQL." : "Không lưu được memo vào PostgreSQL.");
  return fromApiMemo(await response.json());
}

export function getMemoNotes(): MemoNote[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MemoNote[];
    if (!Array.isArray(parsed)) return [];

    return sortMemoNotes(parsed
      .filter((note) => note && typeof note.title === "string" && typeof note.body === "string")
      .map((note) => ({ ...note, images: Array.isArray(note.images) ? note.images : [] })));
  } catch {
    return [];
  }
}

export async function fetchMemoNotes(): Promise<MemoNote[]> {
  const localBefore = getMemoNotes();
  const response = await fetch(`${apiBaseUrl}/memos`);
  if (!response.ok) throw new Error("Không tải được Memo Notes từ PostgreSQL.");
  const serverNotes = sortMemoNotes(((await response.json()) as Array<MemoNote & { created_at?: string; updated_at?: string }>).map(fromApiMemo));
  const serverById = new Map(serverNotes.map((note) => [note.id, note]));
  const merged: MemoNote[] = [];
  const toPush: Array<{ note: MemoNote; existingId?: string }> = [];

  for (const server of serverNotes) {
    const local = localBefore.find((note) => note.id === server.id);
    if (local && parseUpdatedAt(local.updatedAt) > parseUpdatedAt(server.updatedAt)) {
      merged.push(local);
      toPush.push({ note: local, existingId: local.id });
    } else {
      merged.push(server);
    }
  }

  for (const local of localBefore) {
    if (!serverById.has(local.id)) {
      merged.push(local);
      toPush.push({ note: local });
    }
  }

  cacheMemoNotes(sortMemoNotes(merged));

  if (toPush.length) {
    const results = await Promise.allSettled(
      toPush.map(async ({ note, existingId }) => ({
        oldId: note.id,
        saved: await writeMemoNoteToDb(toMemoInput(note), existingId),
      })),
    );
    const synced = results
      .filter((result): result is PromiseFulfilledResult<{ oldId: string; saved: MemoNote }> => result.status === "fulfilled")
      .map((result) => result.value);
    if (synced.length) {
      let nextNotes = getMemoNotes();
      for (const { oldId, saved } of synced) {
        nextNotes = nextNotes.filter((note) => note.id !== oldId && note.id !== saved.id);
        nextNotes.push(saved);
      }
      cacheMemoNotes(sortMemoNotes(nextNotes));
    }
  }

  return getMemoNotes();
}

export function saveMemoNote(input: MemoNoteInput, existingId?: string) {
  const now = new Date().toISOString();
  const notes = getMemoNotes();
  const normalized: MemoNoteInput = {
    title: input.title.trim() || "Untitled memo",
    body: input.body.trim(),
    tags: input.tags.trim(),
    pinned: input.pinned,
    images: Array.isArray(input.images) ? input.images : []
  };

  if (existingId) {
    const updated = notes.map((note) =>
      note.id === existingId
        ? {
            ...note,
            ...normalized,
            updatedAt: now
          }
        : note
    );
    window.localStorage.setItem(storageKey, JSON.stringify(updated));
    return updated.find((note) => note.id === existingId) ?? null;
  }

  const nextNote: MemoNote = {
    id: createId(),
    ...normalized,
    createdAt: now,
    updatedAt: now
  };
  window.localStorage.setItem(storageKey, JSON.stringify([nextNote, ...notes]));
  return nextNote;
}

export async function saveMemoNoteToDb(input: MemoNoteInput, existingId?: string) {
  const saved = await writeMemoNoteToDb(input, existingId);
  const notes = getMemoNotes();
  const nextNotes = sortMemoNotes(notes.some((note) => note.id === saved.id)
    ? notes.map((note) => (note.id === saved.id ? saved : note))
    : [saved, ...notes]);
  cacheMemoNotes(nextNotes);
  return saved;
}

export async function uploadMemoImage(file: Blob, name: string): Promise<MemoImage> {
  const formData = new FormData();
  formData.append("file", file, name);
  const response = await fetch(`${apiBaseUrl}/memos/images`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("Không upload được ảnh memo vào backend.");
  const payload = await response.json() as { id: string; name: string; url: string; created_at?: string };
  const url = payload.url.startsWith("http") ? payload.url : `${apiBaseUrl}${payload.url}`;
  return {
    id: payload.id,
    name: payload.name || name,
    dataUrl: url,
    url,
    createdAt: payload.created_at || new Date().toISOString(),
  };
}

export function deleteMemoNote(noteId: string) {
  if (!canUseStorage()) return;
  const notes = getMemoNotes().filter((note) => note.id !== noteId);
  window.localStorage.setItem(storageKey, JSON.stringify(notes));
}

export async function deleteMemoNoteFromDb(noteId: string) {
  const response = await fetch(`${apiBaseUrl}/memos/${encodeURIComponent(noteId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Không xóa được memo trong PostgreSQL.");
  deleteMemoNote(noteId);
}

export function exportMemoNotesMarkdown(notes: MemoNote[]) {
  return notes
    .map((note) => {
      const tags = note.tags ? `\nTags: ${note.tags}` : "";
      const images = note.images?.length
        ? `\n\nImages:\n${note.images.map((image, index) => `${index + 1}. ${image.name}`).join("\n")}`
        : "";
      return `# ${note.title}\n\nUpdated: ${note.updatedAt}${tags}\n\n${note.body}${images}`;
    })
    .join("\n\n---\n\n");
}
