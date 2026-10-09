import { apiBaseUrl } from "@/lib/config";

export type NoteIndexSource = "memo_note" | "meeting_minutes" | "meeting_memo";

export type NoteIndexResult = {
  id: string;
  source: NoteIndexSource;
  source_label: string;
  title: string;
  snippet: string;
  href: string;
  updated_at: string;
  score: number;
};

export async function searchNoteIndex(query: string, limit = 6): Promise<NoteIndexResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const response = await fetch(`${apiBaseUrl}/note-index/search?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to search note index");
  }
  return response.json() as Promise<NoteIndexResult[]>;
}
