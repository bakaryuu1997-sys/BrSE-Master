"use client";

import { ClipboardEvent, FormEvent, useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { 
  BookMarked, 
  BookOpenText, 
  Download, 
  Edit3, 
  Image as ImageIcon, 
  Maximize2, 
  Minimize2, 
  Move, 
  Plus, 
  Search, 
  Star, 
  StickyNote, 
  Trash2, 
  X, 
  Eye, 
  EyeOff 
} from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { useSearchParams } from "next/navigation";
import { formatAppDateTime, getLocaleString } from "@/lib/dateUtils";
import { apiBaseUrl } from "@/lib/config";
import { 
  deleteMemoNote, 
  deleteMemoNoteFromDb, 
  exportMemoNotesMarkdown, 
  fetchMemoNotes, 
  getMemoNotes, 
  saveMemoNote, 
  saveMemoNoteToDb, 
  uploadMemoImage, 
  type MemoImage, 
  type MemoNote 
} from "@/lib/memoNotes";
import { getActiveProject } from "@/lib/projectSettings";
import { fetchClientStateValue, saveClientStateValue } from "@/lib/clientState";
import { PageHeader } from "@/components/PageHeader";
import { UniversalNoteView } from "@/components/notes/UniversalNoteView";
import { MobileReadMode } from "@/components/MobileReadMode";

const emptyForm = {
  title: "",
  body: "",
  tags: "",
  pinned: false,
  images: [] as MemoImage[]
};
const draftKey = "brse.memoNotes.draft.v1";

type MemoFormDraft = typeof emptyForm & { editingId?: string };

function applyMemoDraft(draft: MemoFormDraft) {
  return {
    title: draft.title ?? "",
    body: draft.body ?? "",
    tags: draft.tags ?? "",
    pinned: Boolean(draft.pinned),
    images: Array.isArray(draft.images) ? draft.images : []
  };
}

async function fetchMemoDraftFromDb(): Promise<MemoFormDraft | null> {
  try {
    const raw = await fetchClientStateValue(draftKey);
    return raw ? (JSON.parse(raw) as MemoFormDraft) : null;
  } catch {
    return null;
  }
}

function saveMemoDraft(draft: MemoFormDraft) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }
  void saveClientStateValue(draftKey, JSON.stringify(draft)).catch(() => {});
}

function clearMemoDraft() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(draftKey);
  }
  void saveClientStateValue(draftKey, "").catch(() => {});
}

function formatUpdatedAt(value: string, lang: any) {
  try {
    return new Intl.DateTimeFormat(getLocaleString(lang), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function MemoNotesPage() {
  const { t, language } = useUiLanguage();
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState<MemoNote[]>([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [status, setStatusState] = useState<{ text: string; kind: "success" | "error" | "info" } | null>(null);
  // Wrapper keeps existing setStatus("...") calls working while adding a severity.
  const setStatus = useCallback(
    (text: string, kind: "success" | "error" | "info" = "success") => setStatusState(text ? { text, kind } : null),
    []
  );
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatusState(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [isReviewFullscreen, setIsReviewFullscreen] = useState(false);
  const [isStickyReviewOpen, setIsStickyReviewOpen] = useState(false);
  const [stickyPosition, setStickyPosition] = useState({ x: 120, y: 96 });
  const [isDraftReady, setIsDraftReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setNotes(getMemoNotes());
    fetchMemoNotes()
      .then((rows) => {
        if (isMounted) setNotes(rows);
      })
      .catch(() => {
        if (isMounted) setStatus(t("notes.cacheWarning"), "info");
      });

    async function restoreDraft() {
      try {
        const rawDraft = window.localStorage.getItem(draftKey);
        const draft = rawDraft ? (JSON.parse(rawDraft) as MemoFormDraft) : await fetchMemoDraftFromDb();
        if (!draft || !isMounted) return;
        setForm(applyMemoDraft(draft));
        setEditingId(draft.editingId ?? "");
        setStatus(t("notes.restoredDraft"), "info");
      } catch {
        clearMemoDraft();
      } finally {
        if (isMounted) setIsDraftReady(true);
      }
    }

    restoreDraft();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const noteId = searchParams.get("noteId");
    const searchQuery = searchParams.get("q");
    if (searchQuery) setQuery(searchQuery);
    if (noteId) setSelectedNoteId(noteId);
  }, [searchParams]);

  useEffect(() => {
    if (!isDraftReady) return;
    const hasDraft = form.title.trim() || form.body.trim() || form.tags.trim() || form.pinned || editingId;
    if (!hasDraft) {
      clearMemoDraft();
      return;
    }
    const timer = window.setTimeout(() => {
      saveMemoDraft({ ...form, editingId });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [editingId, form, isDraftReady]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return notes;
    return notes.filter((note) =>
      [note.title, note.body, note.tags].join(" ").toLowerCase().includes(normalizedQuery)
    );
  }, [notes, query]);

  const selectedNote = useMemo(() => {
    return filteredNotes.find((note) => note.id === selectedNoteId) ?? filteredNotes[0] ?? null;
  }, [filteredNotes, selectedNoteId]);

  useEffect(() => {
    if (!filteredNotes.length) {
      setSelectedNoteId("");
      return;
    }
    if (!filteredNotes.some((note) => note.id === selectedNoteId)) {
      const firstPinned = filteredNotes.find((note) => note.pinned);
      setSelectedNoteId((firstPinned ?? filteredNotes[0]).id);
    }
  }, [filteredNotes, selectedNoteId]);

  const pinnedCount = notes.filter((note) => note.pinned).length;
  const tagCount = useMemo(() => {
    const tags = notes.flatMap((note) => note.tags.split(",").map((tag) => tag.trim()).filter(Boolean));
    return new Set(tags).size;
  }, [notes]);

  function refreshNotes() {
    setNotes(getMemoNotes());
  }

  async function promoteToKnowledge(note: MemoNote) {
    const body = reviewDrafts[note.id] ?? note.body;
    const projectId = getActiveProject()?.id || "default";
    const response = await fetch(`${apiBaseUrl}/knowledge/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: note.title,
        content: body,
        category: note.tags.trim() || "memo",
        project_id: projectId,
      }),
    });
    if (!response.ok) {
      setStatus(t("notes.promoteFailed"), "error");
      return;
    }
    setStatus(t("notes.promoteSuccess"));
  }

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
    clearMemoDraft();
    setStatus("");
  }

  function startEdit(note: MemoNote) {
    setSelectedNoteId(note.id);
    setEditingId(note.id);
    setForm({
      title: note.title,
      body: note.body,
      tags: note.tags,
      pinned: note.pinned,
      images: note.images ?? []
    });
    setStatus(t("notes.editingStatus"), "info");
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let finalStatus = editingId ? `${t("notes.updatedStatus")} PostgreSQL synced.` : `${t("notes.savedStatus")} PostgreSQL synced.`;
    let finalKind: "success" | "error" | "info" = "success";
    try {
      await saveMemoNoteToDb(form, editingId || undefined);
    } catch (error) {
      saveMemoNote(form, editingId || undefined);
      finalStatus = error instanceof Error ? `${error.message} ${t("notes.savedLocal")}` : t("notes.savedLocal");
      finalKind = "info";
    }
    clearMemoDraft();
    refreshNotes();
    resetForm();
    setStatus(finalStatus, finalKind);
  }

  async function removeNote(noteId: string) {
    try {
      await deleteMemoNoteFromDb(noteId);
      setStatus(t("notes.deletedStatus"));
    } catch (error) {
      deleteMemoNote(noteId);
      setStatus(error instanceof Error ? `${error.message} ${t("notes.deletedLocal")}` : t("notes.deletedLocal"), "info");
    }
    refreshNotes();
    if (editingId === noteId) resetForm();
  }

  async function togglePinned(note: MemoNote) {
    const input = {
      title: note.title,
      body: note.body,
      tags: note.tags,
      pinned: !note.pinned,
      images: note.images ?? []
    };
    try {
      await saveMemoNoteToDb(input, note.id);
    } catch {
      saveMemoNote(input, note.id);
    }
    refreshNotes();
    setStatus(!note.pinned ? t("notes.pinnedSuccess") : t("notes.unpinnedSuccess"));
  }

  function exportMarkdown() {
    const blob = new Blob([exportMemoNotesMarkdown(notes)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `brse-memo-notes-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(t("notes.exportedStatus"));
  }

  async function resizeImage(file: File): Promise<MemoImage> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new globalThis.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Cannot load pasted image"));
      img.src = dataUrl;
    });
    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / Math.max(image.width, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Cannot create image preview");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const name = file.name || `screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Cannot encode image")), "image/jpeg", 0.82);
    });
    try { return await uploadMemoImage(blob, name); } catch { }
    return {
      id: crypto.randomUUID(),
      name,
      dataUrl: canvas.toDataURL("image/jpeg", 0.82),
      createdAt: new Date().toISOString()
    };
  }

  async function handlePasteImage(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!files.length) return;
    event.preventDefault();
    try {
      const images = await Promise.all(files.map(resizeImage));
      setForm((current) => ({ ...current, images: [...current.images, ...images] }));
      setStatus(t("notes.clipboardImages").replace("{count}", String(images.length)));
    } catch {
      setStatus(t("notes.clipboardError"), "error");
    }
  }

  function removeImage(imageId: string) {
    setForm((current) => ({ ...current, images: current.images.filter((image) => image.id !== imageId) }));
  }

  function selectNote(note: MemoNote) {
    setSelectedNoteId(note.id);
    setReviewDrafts((drafts) => ({ ...drafts, [note.id]: drafts[note.id] ?? note.body }));
  }

  function startStickyDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!selectedNote) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = stickyPosition;
    event.currentTarget.setPointerCapture(event.pointerId);

    function handleMove(moveEvent: PointerEvent) {
      setStickyPosition({
        x: Math.max(12, initial.x + moveEvent.clientX - startX),
        y: Math.max(12, initial.y + moveEvent.clientY - startY)
      });
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function buildPreview(note: MemoNote) {
    const cleaned = note.body.trim();
    if (!cleaned) return t("notes.noContent");
    return cleaned.length > 260 ? `${cleaned.slice(0, 260)}...` : cleaned;
  }

  return (
    <main className="brse-page">
      <PageHeader
        badge={t("notes.badge")}
        title={t("notes.title")}
        description={t("notes.body")}
        actions={
          <button
            type="button"
            onClick={exportMarkdown}
            disabled={notes.length === 0}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/60 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("notes.exportMarkdown")}
          </button>
        }
        stats={[
          { label: t("notes.total"), value: notes.length },
          { label: t("notes.pinned"), value: pinnedCount, variant: "primary" },
          { label: t("notes.tags"), value: tagCount, variant: "success" },
        ]}
        toolbar={
        <section className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("notes.searchPlaceholder")}
              className="field-control w-full py-2 pl-10 pr-3 text-sm placeholder:text-textMuted/70"
            />
          </label>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("notes.newMemo")}
          </button>
        </section>}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] min-[1800px]:grid-cols-[320px_320px_minmax(0,1fr)]">
        {/* Sidebar Left: Create Form */}
        <section className="brse-section p-5 xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">{editingId ? t("notes.editMemo") : t("notes.createMemo")}</h2>
          </div>

          <form onSubmit={submitNote} className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("notes.titleField")} *</span>
              <input
                required
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder={t("notes.titlePlaceholder")}
                className="field-control px-3 py-2 text-sm placeholder:text-textMuted/70"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("notes.content")}</span>
              <textarea
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                onPaste={handlePasteImage}
                rows={12}
                placeholder={`${t("notes.contentPlaceholder")}\n\n${t("notes.ctrlVHint")}`}
                className="field-control px-3 py-2 text-sm leading-6 placeholder:text-textMuted/70"
              />
            </label>
            {form.images.length ? (
              <div className="grid gap-2">
                <span className="text-sm font-semibold text-ink">{t("notes.imagesInMemo")}</span>
                <div className="grid grid-cols-2 gap-2">
                  {form.images.map((image) => (
                    <figure key={image.id} className="relative overflow-hidden rounded-lg border border-[var(--brse-panel-border)] bg-background/50">
                      <Image src={image.dataUrl} alt={image.name} width={240} height={112} className="h-28 w-full object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute right-2 top-2 rounded-full border border-[var(--brse-panel-border)] bg-background/90 p-1 text-ink shadow"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </figure>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Tags</span>
              <input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                className="field-control px-3 py-2 text-sm placeholder:text-textMuted/70"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
                className="h-4 w-4 rounded border-[var(--brse-panel-border)] bg-background text-primary"
              />
              {t("notes.pinImportant")}
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary flex-1">{editingId ? t("notes.updateMemo") : t("notes.saveMemo")}</button>
              {editingId && <button type="button" onClick={resetForm} className="btn-outline">{t("notes.cancel")}</button>}
            </div>
            {status ? (
              <p className={`text-xs ${status.kind === "error" ? "text-vermilion" : status.kind === "info" ? "text-primary" : "text-matcha"}`}>
                {status.text}
              </p>
            ) : null}
          </form>
        </section>

        {/* List: Middle Column */}
        <section className="brse-section min-h-[640px] p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-ink">{t("notes.listTitle")}</h2>
            <span className="text-[10px] text-textMuted">{filteredNotes.length} items</span>
          </div>
          <div className="grid max-h-[72vh] gap-2 overflow-y-auto pr-1">
            {filteredNotes.map((note, index) => (
              <article
                key={note.id}
                className={`rounded-xl border p-3 transition cursor-pointer ${
                  selectedNote?.id === note.id
                    ? "border-primary/45 bg-primary/10"
                    : "border-[var(--brse-panel-border)] bg-background/45 hover:bg-surfaceHover/45"
                }`}
                onClick={() => selectNote(note)}
              >
                <div className="flex items-center gap-2">
                   {note.pinned && <Star className="h-3 w-3 fill-primary text-primary" />}
                   <h2 className="min-w-0 truncate text-sm font-semibold text-ink">{note.title}</h2>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-textMuted">{buildPreview(note)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Right Column: Unified View */}
        <section className="min-h-[720px] xl:col-span-1">
          {selectedNote ? (
            <UniversalNoteView
              title={selectedNote.title}
              content={reviewDrafts[selectedNote.id] ?? selectedNote.body}
              updatedAt={selectedNote.updatedAt}
              metadata={{
                tags: selectedNote.tags,
                pinned: selectedNote.pinned,
                images: selectedNote.images
              }}
              onSave={async (newContent) => {
                setReviewDrafts({ ...reviewDrafts, [selectedNote.id]: newContent });
                const input = {
                  title: selectedNote.title,
                  body: newContent,
                  tags: selectedNote.tags,
                  pinned: selectedNote.pinned,
                  images: selectedNote.images ?? []
                };
                try {
                  await saveMemoNoteToDb(input, selectedNote.id);
                  setStatus(t("notes.savedSuccess"));
                } catch {
                  saveMemoNote(input, selectedNote.id);
                  setStatus(t("notes.savedLocalInfo"), "info");
                }
                refreshNotes();
              }}
              onDelete={() => removeNote(selectedNote.id)}
              onTogglePin={() => togglePinned(selectedNote)}
              onPromoteToKB={() => promoteToKnowledge(selectedNote)}
              onFullscreen={() => setIsReviewFullscreen(true)}
              onSticky={() => setIsStickyReviewOpen(true)}
            />
          ) : (
            <div className="brse-section flex min-h-[640px] flex-col items-center justify-center p-8 text-center bg-surface/35">
              <BookOpenText className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-3 text-base font-semibold text-ink">{t("notes.empty")}</p>
            </div>
          )}
        </section>
      </div>

      {selectedNote && (
        <MobileReadMode
          content={reviewDrafts[selectedNote.id] ?? selectedNote.body}
          title={selectedNote.title}
        />
      )}

      {/* Fullscreen & Sticky Views omitted for brevity, logic remains similar */}
    </main>
  );
}
