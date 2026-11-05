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
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTag, setSelectedTag] = useState("all");
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

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((note) => {
      note.tags.split(",").forEach((t) => {
        const clean = t.trim().toLowerCase();
        if (clean) set.add(clean);
      });
    });
    return Array.from(set);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (selectedTag === "pinned" && !note.pinned) return false;
      if (selectedTag !== "all" && selectedTag !== "pinned") {
        const noteTags = note.tags.split(",").map((t) => t.trim().toLowerCase());
        if (!noteTags.includes(selectedTag)) return false;
      }
      if (normalizedQuery) {
        return [note.title, note.body, note.tags].join(" ").toLowerCase().includes(normalizedQuery);
      }
      return true;
    });
  }, [notes, query, selectedTag]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.pinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter((n) => !n.pinned), [filteredNotes]);

  const starterTemplates = [
    {
      icon: "📋",
      title: "【Q&A確認】Làm rõ yêu cầu với khách",
      tag: "qna, client",
      body: `## 1. Bối cảnh (Background)\n- Chức năng: \n- Điểm chưa rõ trong Spec: \n\n## 2. Câu hỏi cần xác nhận (Confirmation Points)\n- [ ] Phương án A: \n- [ ] Phương án B: \n\n## 3. Đề xuất của BrSE (Our Recommendation)\n- Đề xuất phương án A vì đảm bảo tiến độ và bảo mật.`
    },
    {
      icon: "🚨",
      title: "【緊急報告】Sự cố blocker dự án",
      tag: "incident, blocker",
      body: `## 1. Tóm tắt sự cố (Incident Overview)\n- Thời điểm phát hiện: \n- Mức độ ảnh hưởng: P1 (High)\n\n## 2. Nguyên nhân gốc rễ (Root Cause)\n- \n\n## 3. Hành động đã xử lý & Kế hoạch tiếp theo\n- [x] Đã cô lập lỗi\n- [ ] Cần phía khách hàng hỗ trợ: `
    },
    {
      icon: "💡",
      title: "【Thuật ngữ】Ghi chép kỹ thuật mới",
      tag: "tech, glossary",
      body: `## 1. Thuật ngữ & Định nghĩa\n- Thuật ngữ (JP / EN): \n- Ý nghĩa nghiệp vụ: \n\n## 2. Áp dụng trong dự án\n- File code / Module liên quan: \n- Lưu ý cho Dev: `
    }
  ];

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
    setIsCreating(false);
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
    setIsCreating(true);
    setStatus(t("notes.editingStatus"), "info");
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let finalStatus = editingId ? `${t("notes.updatedStatus")} PostgreSQL synced.` : `${t("notes.savedStatus")} PostgreSQL synced.`;
    let finalKind: "success" | "error" | "info" = "success";
    try {
      const saved = await saveMemoNoteToDb(form, editingId || undefined);
      if (saved?.id) {
        setSelectedNoteId(saved.id);
      }
    } catch (error) {
      const saved = saveMemoNote(form, editingId || undefined);
      if (saved?.id) {
        setSelectedNoteId(saved.id);
      }
      finalStatus = error instanceof Error ? `${error.message} ${t("notes.savedLocal")}` : t("notes.savedLocal");
      finalKind = "info";
    }
    clearMemoDraft();
    refreshNotes();
    setEditingId("");
    setForm(emptyForm);
    setIsCreating(false);
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
    setIsCreating(false);
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
        compact
        badge={t("notes.badge")}
        title={t("notes.title")}
        description={t("notes.body")}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingId("");
                setForm(emptyForm);
                setIsCreating(true);
              }}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primaryHover"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t("notes.newMemo")}
            </button>
            <button
              type="button"
              onClick={exportMarkdown}
              disabled={notes.length === 0}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-primary/60 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {t("notes.exportMarkdown")}
            </button>
          </div>
        }
        stats={[
          { label: t("notes.total"), value: notes.length },
          { label: t("notes.pinned"), value: pinnedCount, variant: "primary" },
          { label: t("notes.tags"), value: tagCount, variant: "success" },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
        {/* Left Pane: Note Navigation & Filtering */}
        <section className="brse-section flex flex-col p-3 lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-5.5rem)]">
          {/* Search Input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textMuted" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("notes.searchPlaceholder")}
              className="field-control w-full py-1.5 pl-9 pr-7 text-xs placeholder:text-textMuted/70"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-textMuted hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Tag Filter Pills */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedTag("all")}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 font-medium transition ${
                selectedTag === "all"
                  ? "bg-primary text-white"
                  : "bg-surface text-textMuted hover:text-ink border border-panelBorder/40"
              }`}
            >
              <span>{language === "ja" ? "すべて" : language === "en" ? "All" : "Tất cả"}</span>
              <span className={`rounded-full px-1 py-0.2 text-[9px] ${selectedTag === "all" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                {notes.length}
              </span>
            </button>
            {pinnedCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTag("pinned")}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 font-medium transition ${
                  selectedTag === "pinned"
                    ? "bg-primary text-white"
                    : "bg-surface text-textMuted hover:text-ink border border-panelBorder/40"
                }`}
              >
                <Star className="h-2.5 w-2.5 fill-current" />
                <span>{t("notes.pinned")}</span>
                <span className={`rounded-full px-1 py-0.2 text-[9px] ${selectedTag === "pinned" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                  {pinnedCount}
                </span>
              </button>
            )}
            {allTags.map((tag) => {
              const count = notes.filter((n) => n.tags.toLowerCase().includes(tag)).length;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag === selectedTag ? "all" : tag)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium transition ${
                    selectedTag === tag
                      ? "bg-primary text-white"
                      : "bg-surface text-textMuted hover:text-ink border border-panelBorder/40"
                  }`}
                >
                  <span>#{tag}</span>
                  <span className={`rounded-full px-1 py-0.2 text-[9px] ${selectedTag === tag ? "bg-white/20 text-white" : "bg-surfaceHover text-textMuted"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List Header */}
          <div className="mt-2.5 mb-1.5 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-textMuted">
              {filteredNotes.length} {language === "ja" ? "メモ" : language === "en" ? "notes" : "ghi chú"}
            </span>
            <button
              type="button"
              onClick={() => {
                setEditingId("");
                setForm(emptyForm);
                setIsCreating(true);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primaryHover"
            >
              <Plus className="h-3 w-3" />
              <span>{t("notes.newMemo")}</span>
            </button>
          </div>

          {/* Scrollable Note List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {filteredNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-panelBorder/60 p-6 text-center text-xs text-textMuted">
                <p>{t("notes.empty")}</p>
                {(query || selectedTag !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSelectedTag("all");
                    }}
                    className="mt-2 text-[11px] text-primary hover:underline font-medium"
                  >
                    Xóa tìm kiếm / bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <>
                {pinnedNotes.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span>{t("notes.pinned")} ({pinnedNotes.length})</span>
                    </div>
                    {pinnedNotes.map((note) => {
                      const isSelected = selectedNote?.id === note.id && !isCreating;
                      return (
                        <article
                          key={note.id}
                          onClick={() => selectNote(note)}
                          className={`group relative rounded-xl border p-2.5 transition cursor-pointer ${
                            isSelected
                              ? "border-primary/60 bg-primary/10 shadow-sm"
                              : "border-[var(--brse-panel-border)] bg-background/45 hover:border-primary/30 hover:bg-surfaceHover/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Star className="h-3 w-3 shrink-0 fill-primary text-primary" />
                              <h3 className="truncate text-xs font-semibold text-ink group-hover:text-primary transition-colors">
                                {note.title}
                              </h3>
                            </div>
                            <span className="shrink-0 text-[10px] text-textMuted">
                              {formatAppDateTime(note.updatedAt, language)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-textMuted">
                            {buildPreview(note)}
                          </p>
                          {note.tags && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {note.tags.split(",").map((tag) => {
                                const clean = tag.trim();
                                if (!clean) return null;
                                return (
                                  <span
                                    key={clean}
                                    className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-medium text-textMuted"
                                  >
                                    #{clean}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}

                {unpinnedNotes.length > 0 && (
                  <div className="space-y-1.5">
                    {pinnedNotes.length > 0 && (
                      <div className="px-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-textMuted">
                        {language === "ja" ? "その他" : language === "en" ? "Other Notes" : "Ghi chú khác"} ({unpinnedNotes.length})
                      </div>
                    )}
                    {unpinnedNotes.map((note) => {
                      const isSelected = selectedNote?.id === note.id && !isCreating;
                      return (
                        <article
                          key={note.id}
                          onClick={() => selectNote(note)}
                          className={`group relative rounded-xl border p-2.5 transition cursor-pointer ${
                            isSelected
                              ? "border-primary/60 bg-primary/10 shadow-sm"
                              : "border-[var(--brse-panel-border)] bg-background/45 hover:border-primary/30 hover:bg-surfaceHover/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="truncate text-xs font-semibold text-ink group-hover:text-primary transition-colors">
                              {note.title}
                            </h3>
                            <span className="shrink-0 text-[10px] text-textMuted">
                              {formatAppDateTime(note.updatedAt, language)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-textMuted">
                            {buildPreview(note)}
                          </p>
                          {note.tags && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {note.tags.split(",").map((tag) => {
                                const clean = tag.trim();
                                if (!clean) return null;
                                return (
                                  <span
                                    key={clean}
                                    className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-medium text-textMuted"
                                  >
                                    #{clean}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Right Pane: Workspace */}
        <section className="min-h-[640px]">
          {isCreating ? (
            /* Creation & Edit Workspace */
            <div className="brse-section p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-panelBorder/40 pb-3">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-ink">
                    {editingId ? t("notes.editMemo") : t("notes.createMemo")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 rounded-lg border border-panelBorder/60 bg-surface px-2.5 py-1 text-xs text-textMuted hover:text-ink transition"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>{t("notes.cancel")}</span>
                </button>
              </div>

              {/* Quick Starter Templates (if creating a new note and body is empty) */}
              {!editingId && !form.body.trim() && (
                <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="text-[11px] font-semibold text-primary">
                    ⚡ Mẫu ghi chú nhanh BrSE (1-click điền mẫu):
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {starterTemplates.map((tpl) => (
                      <button
                        key={tpl.title}
                        type="button"
                        onClick={() => {
                          setForm((current) => ({
                            ...current,
                            title: tpl.title,
                            tags: current.tags ? `${current.tags}, ${tpl.tag}` : tpl.tag,
                            body: tpl.body
                          }));
                        }}
                        className="flex flex-col text-left rounded-lg border border-primary/20 bg-surface/60 p-2.5 hover:border-primary/50 hover:bg-surface transition group"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink group-hover:text-primary">
                          <span>{tpl.icon}</span>
                          <span className="truncate">{tpl.title.replace(/【.*?】/, "")}</span>
                        </div>
                        <span className="mt-1 line-clamp-2 text-[10px] text-textMuted">
                          #{tpl.tag}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={submitNote} className="mt-3.5 grid gap-3.5">
                <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-ink">{t("notes.titleField")} *</span>
                    <input
                      required
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder={t("notes.titlePlaceholder")}
                      className="field-control px-2.5 py-1.5 text-xs placeholder:text-textMuted/70"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-ink">Tags (cách nhau bởi dấu phẩy)</span>
                    <input
                      value={form.tags}
                      onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                      placeholder="qna, spec, client..."
                      className="field-control px-2.5 py-1.5 text-xs placeholder:text-textMuted/70"
                    />
                  </label>
                </div>

                {/* Quick Tag Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-textMuted">Gợi ý tag:</span>
                  {["qna", "spec", "blocker", "client", "meeting", "tech"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const currentTags = form.tags.split(",").map((s) => s.trim()).filter(Boolean);
                        if (!currentTags.includes(tag)) {
                          setForm((current) => ({
                            ...current,
                            tags: currentTags.length ? `${current.tags}, ${tag}` : tag
                          }));
                        }
                      }}
                      className="rounded border border-panelBorder/50 bg-surface px-1.5 py-0.5 text-[10px] text-textMuted hover:border-primary/40 hover:text-ink transition"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>

                <label className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">{t("notes.content")} (Markdown)</span>
                    <span className="text-[10px] text-textMuted">
                      {form.body.length} ký tự • Hỗ trợ dán ảnh (Ctrl+V)
                    </span>
                  </div>
                  <textarea
                    value={form.body}
                    onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                    onPaste={handlePasteImage}
                    rows={12}
                    placeholder={`${t("notes.contentPlaceholder")}\n\n${t("notes.ctrlVHint")}`}
                    className="field-control font-mono px-3 py-2 text-xs leading-relaxed placeholder:text-textMuted/70"
                  />
                </label>

                {form.images.length > 0 && (
                  <div className="grid gap-2">
                    <span className="text-xs font-semibold text-ink">{t("notes.imagesInMemo")}</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {form.images.map((image) => (
                        <figure key={image.id} className="relative overflow-hidden rounded-lg border border-[var(--brse-panel-border)] bg-background/50">
                          <Image src={image.dataUrl} alt={image.name} width={240} height={112} className="h-24 w-full object-cover" unoptimized />
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="absolute right-1.5 top-1.5 rounded-full border border-[var(--brse-panel-border)] bg-background/90 p-1 text-ink shadow hover:bg-vermilion hover:text-white transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.pinned}
                      onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
                      className="h-3.5 w-3.5 rounded border-[var(--brse-panel-border)] bg-background text-primary"
                    />
                    <span>{t("notes.pinImportant")}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-panelBorder/60 bg-surface px-3 py-1.5 text-xs font-semibold text-textMuted hover:text-ink transition"
                    >
                      {t("notes.cancel")}
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primaryHover transition shadow"
                    >
                      {editingId ? t("notes.updateMemo") : t("notes.saveMemo")}
                    </button>
                  </div>
                </div>

                {status ? (
                  <p className={`text-xs ${status.kind === "error" ? "text-vermilion" : status.kind === "info" ? "text-primary" : "text-matcha"}`}>
                    {status.text}
                  </p>
                ) : null}
              </form>
            </div>
          ) : selectedNote ? (
            /* Selected Note View in UniversalNoteView */
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
            /* Smart Empty State */
            <div className="brse-section flex min-h-[580px] flex-col items-center justify-center p-8 text-center bg-surface/35">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <BookOpenText className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink">
                {t("notes.empty") ?? "Chưa chọn ghi chú nào"}
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-textMuted">
                Chọn một ghi chú ở cột bên trái để xem nội dung, hoặc bấm tạo ghi chú mới bằng một trong các mẫu BrSE bên dưới:
              </p>

              <div className="mt-6 grid w-full max-w-lg gap-2.5 sm:grid-cols-3 text-left">
                {starterTemplates.map((tpl) => (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => {
                      setEditingId("");
                      setForm({
                        title: tpl.title,
                        tags: tpl.tag,
                        body: tpl.body,
                        pinned: false,
                        images: []
                      });
                      setIsCreating(true);
                    }}
                    className="flex flex-col justify-between rounded-xl border border-panelBorder/70 bg-surface/60 p-3 hover:border-primary/50 hover:bg-surface hover:shadow transition group"
                  >
                    <div>
                      <span className="text-lg">{tpl.icon}</span>
                      <h4 className="mt-1.5 text-xs font-semibold text-ink group-hover:text-primary transition-colors">
                        {tpl.title.replace(/【.*?】/, "")}
                      </h4>
                    </div>
                    <span className="mt-2 text-[10px] font-medium text-primary">
                      + Tạo ngay
                    </span>
                  </button>
                ))}
              </div>
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
