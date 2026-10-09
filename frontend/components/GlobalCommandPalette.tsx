"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, CheckCircle2, ClipboardList, Command, ExternalLink, FileText, Languages, Presentation, Search, Send, Sparkles, StickyNote, X, Zap } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { apiBaseUrl } from "@/lib/config";
import {
  buildCommandCenterDailySummary,
  buildQnaReminderDraft,
  operationHref,
  todoHref,
  type CommandCenterAction,
} from "@/lib/commandCenter";
import { useCommandCenterQuery, useSyncMeetingActionsToTodoMutation } from "@/lib/command-center-hooks";
import { glossaryTerms } from "@/lib/glossary";
import { searchMeetingTranscripts, type MeetingTranscriptSearchResult } from "@/lib/meetings";
import { searchNoteIndex, type NoteIndexResult } from "@/lib/noteIndex";
import { getOperationRecords, type OperationRecord } from "@/lib/operations";

type PaletteItem = {
  id: string;
  title: string;
  helper: string;
  href?: string;
  keywords: string;
  group?: string;
  action?: () => Promise<void> | void;
};

type SearchableKnowledgeItem = {
  id: string | number;
  title: string;
  content?: string;
  category?: string;
};

function actionHref(action: CommandCenterAction) {
  if (action.kind === "copy_daily_summary") return "/app/reports";
  return action.href || "/app";
}

function formatMeetingSearchDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Meeting transcript";
  return `Transcript · ${parsed.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })}`;
}

export function GlobalCommandPalette() {
  const { language, t } = useUiLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [operationRecords, setOperationRecords] = useState<OperationRecord[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<SearchableKnowledgeItem[]>([]);
  const [meetingTranscriptResults, setMeetingTranscriptResults] = useState<MeetingTranscriptSearchResult[]>([]);
  const [noteIndexResults, setNoteIndexResults] = useState<NoteIndexResult[]>([]);
  const [status, setStatus] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandCenterQuery = useCommandCenterQuery(isOpen);
  const syncMeetingActionsMutation = useSyncMeetingActionsToTodoMutation();
  const data = commandCenterQuery.data ?? null;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Arrow key navigation inside palette
  useEffect(() => {
    if (!isOpen) return;
    function handleNav(event: KeyboardEvent) {
      if (event.key === "ArrowDown") { event.preventDefault(); setSelectedIndex((i) => i + 1); }
      if (event.key === "ArrowUp") { event.preventDefault(); setSelectedIndex((i) => Math.max(0, i - 1)); }
    }
    window.addEventListener("keydown", handleNav);
    return () => window.removeEventListener("keydown", handleNav);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (commandCenterQuery.isError) setStatus(t("commandpalette.status"));
    getOperationRecords().then(setOperationRecords).catch(() => setOperationRecords([]));
    fetch(`${apiBaseUrl}/knowledge/`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => setKnowledgeItems(Array.isArray(rows) ? rows : []))
      .catch(() => setKnowledgeItems([]));
  }, [isOpen, commandCenterQuery.isError, t]);

  useEffect(() => {
    if (!isOpen) return;
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      setMeetingTranscriptResults([]);
      setNoteIndexResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      searchMeetingTranscripts(searchTerm)
        .then(setMeetingTranscriptResults)
        .catch(() => setMeetingTranscriptResults([]));
      searchNoteIndex(searchTerm, 6)
        .then(setNoteIndexResults)
        .catch(() => setNoteIndexResults([]));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [isOpen, query]);

  const items = useMemo<PaletteItem[]>(() => {
    const commandData = data;
    const normalizedSearch = query.trim().toLowerCase();
    const glossarySearchTerm = query.trim().replace(/^search\s+glossary\s*/i, "").trim();
    const textMatches = (...values: Array<string | number | null | undefined>) =>
      values.join(" ").toLowerCase().includes(normalizedSearch);
    const globalSearchItems: PaletteItem[] = normalizedSearch.length >= 2 ? [
      ...glossaryTerms
        .filter((term) => textMatches(term.english, term.japanese, term.kana, term.vietnamese, term.category, term.note, term.example))
        .slice(0, 4)
        .map((term) => ({
          id: `search-glossary-${term.id}`,
          title: `Glossary: ${term.japanese}`,
          helper: `${term.english} · ${term.vietnamese}`,
          href: `/app/glossary?q=${encodeURIComponent(term.english)}`,
          keywords: `global search glossary ${term.english} ${term.japanese} ${term.vietnamese} ${term.note}`,
        })),
      ...noteIndexResults
        .slice(0, 4)
        .map((note) => ({
          id: `search-note-${note.id}`,
          title: note.title || "Untitled note",
          helper: note.snippet ? `${note.source_label} · ${note.snippet}` : `Open ${note.source_label}`,
          href: note.href,
          keywords: `global search note index ${note.source} ${note.title} ${note.snippet}`,
          group: `Notes · ${note.source_label}`,
        })),
      ...operationRecords
        .filter((record) => textMatches(record.type, record.title, record.status, record.priority, record.owner, record.customerOwner, record.projectName, record.fieldA, record.fieldB, record.fieldC, record.fieldD, record.fieldE))
        .slice(0, 4)
        .map((record) => ({
          id: `search-operation-${record.id}`,
          title: `${record.type.toUpperCase()}: ${record.title}`,
          helper: `${record.status || "Open"} · ${record.owner || record.customerOwner || "Unassigned"}`,
          href: `/app/operations?type=${record.type}&id=${encodeURIComponent(record.id)}`,
          keywords: `global search operations ${record.type} ${record.title} ${record.status} ${record.priority} ${record.owner} ${record.customerOwner}`,
        })),
      ...knowledgeItems
        .filter((item) => textMatches(item.title, item.category, item.content))
        .slice(0, 4)
        .map((item) => ({
          id: `search-knowledge-${item.id}`,
          title: `Knowledge: ${item.title}`,
          helper: item.category || item.content?.slice(0, 96) || "Knowledge Base",
          href: "/app/knowledge",
          keywords: `global search knowledge kb ${item.title} ${item.category} ${item.content}`,
        })),
      ...meetingTranscriptResults
        .slice(0, 4)
        .map((meeting) => ({
          id: `search-meeting-${meeting.id}`,
          title: `Meeting: ${meeting.title}`,
          helper: meeting.matches[0]?.snippet || formatMeetingSearchDate(meeting.created_at),
          href: `/app/meeting-note?search=${encodeURIComponent(normalizedSearch)}&meeting=${encodeURIComponent(meeting.id)}`,
          keywords: `global search meeting transcript ${meeting.title} ${meeting.matches.map((match) => match.snippet).join(" ")}`,
        })),
    ] : [];
    const baseItems: PaletteItem[] = [
      { id: "quick-new-qna",     title: t("commandpalette.quickNewQnaTitle"),      helper: t("commandpalette.quickNewQnaHelper"), href: "/app/operations?type=qna&new=1", keywords: "new qna create question operations" },
      { id: "quick-new-cr",      title: t("commandpalette.quickNewCrTitle"),       helper: t("commandpalette.quickNewCrHelper"),  href: "/app/operations?type=cr&new=1",  keywords: "new qna create change request operations" },
      { id: "quick-recording",   title: t("commandpalette.quickRecordingTitle"),   helper: t("commandpalette.quickRecordingHelper"), href: "/app/meeting-note",             keywords: "start recording meeting note recorder" },
      { id: "quick-daily-report", title: t("commandpalette.quickDailyReportTitle"), helper: t("commandpalette.quickDailyReportHelper"), href: "/app/reports",                  keywords: "daily report horenso today" },
      { id: "quick-search-glossary", title: glossarySearchTerm ? `${t("commandpalette.quickSearchGlossaryTitle")}: ${glossarySearchTerm}` : t("commandpalette.quickSearchGlossaryTitle"), helper: t("commandpalette.quickSearchGlossaryHelper"), href: `/app/glossary${glossarySearchTerm ? `?q=${encodeURIComponent(glossarySearchTerm)}` : ""}`, keywords: "search glossary term dictionary" },
      { id: "go-dashboard",    title: t("commandpalette.goDashboardTitle"),    helper: t("commandpalette.goDashboardHelper"),    href: "/app",                 keywords: "dashboard command center today" },
      { id: "go-todo",         title: t("commandpalette.goTodoTitle"),         helper: t("commandpalette.goTodoHelper"),         href: "/app/brse-todo",        keywords: "todo checklist phase" },
      { id: "go-meeting",      title: t("commandpalette.goMeetingTitle"),      helper: t("commandpalette.goMeetingHelper"),      href: "/app/meeting-note",     keywords: "meeting note ai recorder memo" },
      { id: "go-operations",   title: t("commandpalette.goOperationsTitle"),   helper: t("commandpalette.goOperationsHelper"),   href: "/app/operations",       keywords: "operations qna bug cr sla" },
      { id: "go-reports",      title: t("commandpalette.goReportsTitle"),      helper: t("commandpalette.goReportsHelper"),      href: "/app/reports",          keywords: "reports daily weekly" },
      { id: "go-keigo",        title: t("commandpalette.goKeigoTitle"),          helper: t("commandpalette.goKeigoHelper"),      href: "/app/keigo",            keywords: "keigo ai email compose japanese" },
      { id: "go-glossary",     title: t("commandpalette.goGlossaryTitle"),       helper: t("commandpalette.goGlossaryHelper"),   href: "/app/glossary",         keywords: "glossary dictionary term translate" },
      { id: "go-notes",        title: t("commandpalette.goNotesTitle"),          helper: t("commandpalette.goNotesHelper"),      href: "/app/notes",            keywords: "notes memo sticky quick capture" },
      { id: "go-slides",       title: t("commandpalette.goSlidesTitle"),         helper: t("commandpalette.goSlidesHelper"),     href: "/app/slides",           keywords: "slides presentation studio deck" },
      { id: "go-power-tools",  title: t("commandpalette.goPowerToolsTitle"),     helper: t("commandpalette.goPowerToolsHelper"), href: "/app/power-tools",      keywords: "power tools sprint risk capacity" },
      { id: "go-knowledge",    title: t("commandpalette.goKnowledgeTitle"),     helper: t("commandpalette.goKnowledgeHelper"),  href: "/app/knowledge",        keywords: "knowledge base docs internal" },
      { id: "go-minutes",      title: t("commandpalette.goMinutesTitle"),        helper: t("commandpalette.goMinutesHelper"),    href: "/app/minutes/new",      keywords: "minutes meeting formal document" },
      { id: "go-templates",    title: t("commandpalette.goTemplatesTitle"),      helper: t("commandpalette.goTemplatesHelper"),  href: "/app/templates",        keywords: "templates email draft" },
      { id: "go-calendar",     title: t("commandpalette.goCalendarTitle"),       helper: t("commandpalette.goCalendarHelper"),   href: "/app/calendar",         keywords: "calendar schedule week plan" },
    ];
    if (!commandData) return [...globalSearchItems, ...baseItems];

    const dynamicItems: PaletteItem[] = [
      {
        id: "copy-daily-summary",
        title: t("commandpalette.copyDailySummaryTitle"),
        helper: t("commandpalette.dailyFocusHelper"),
        keywords: "copy daily summary report",
        action: async () => {
          await navigator.clipboard.writeText(buildCommandCenterDailySummary(commandData));
          setStatus(t("commandpalette.dailyFocusCopied"));
        },
      },
      {
        id: "copy-qna-reminder",
        title: `${t("commandpalette.copyQnaReminderTitle")} (${commandData.metrics.qna_due})`,
        helper: t("commandpalette.qnaReminderHelper"),
        keywords: "qna reminder horenso customer",
        action: async () => {
          await navigator.clipboard.writeText(buildQnaReminderDraft(commandData.waiting_qna.slice(0, 5), commandData.active_project?.name));
          setStatus(t("commandpalette.qnaReminderCopied"));
        },
      },
      {
        id: "sync-meeting-actions",
        title: `${t("commandpalette.syncMeetingActionsTitle")} (${commandData.metrics.unsynced_meeting_actions})`,
        helper: t("commandpalette.syncMeetingActionsHelper"),
        keywords: "sync meeting actions todo auto",
        action: async () => {
          const result = await syncMeetingActionsMutation.mutateAsync();
          setStatus(
            t("commandpalette.todoCreatedFromMeeting")
              .replace("{created}", String(result.created))
              .replace("{project}", result.project_name)
          );
        },
      },
      ...commandData.actions.map((action) => ({
        id: `action-${action.kind}`,
        title: action.title,
        helper: action.body,
        href: actionHref(action),
        keywords: `${action.kind} ${action.title} ${action.body}`,
      })),
      ...commandData.deadline_risk.slice(0, 5).map((item) => ({
        id: `deadline-${item.id}`,
        title: `Deadline: ${item.title}`,
        helper: `${item.phase} · ${item.deadline || "No date"}`,
        href: todoHref(item),
        keywords: `deadline todo ${item.title} ${item.phase}`,
      })),
      ...commandData.waiting_qna.slice(0, 5).map((record) => ({
        id: `qna-${record.id}`,
        title: `Q&A: ${record.title}`,
        helper: `${record.status}${record.due_date ? ` · ${record.due_date}` : ""}`,
        href: operationHref(record),
        keywords: `qna waiting customer ${record.title}`,
      })),
    ];
    return [...globalSearchItems, ...dynamicItems, ...baseItems];
  }, [data, t, language, query, operationRecords, knowledgeItems, meetingTranscriptResults, noteIndexResults, syncMeetingActionsMutation]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items.slice(0, 14);
    return items.filter((item) => `${item.title} ${item.helper} ${item.keywords}`.toLowerCase().includes(normalized)).slice(0, 14);
  }, [items, query]);

  // Reset selectedIndex when filteredItems changes
  useEffect(() => setSelectedIndex(0), [filteredItems]);

  async function runItem(item: PaletteItem) {
    if (item.action) {
      await item.action();
      setIsOpen(false);
      return;
    }
    if (item.href) {
      window.location.href = item.href;
      setIsOpen(false);
    }
  }

  async function handleEnterKey() {
    const item = filteredItems[selectedIndex];
    if (item) await runItem(item);
  }

  const urgentCount = data ? data.metrics.qna_due + data.metrics.pending_cr : 0;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-24 z-40 hidden rounded-full border border-[var(--brse-panel-border)] bg-surface/95 px-3 py-2 text-xs font-semibold text-textMuted shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-primary/40 hover:text-primary lg:inline-flex items-center gap-2"
      >
        <Command className="h-3.5 w-3.5" />
        Ctrl+K
        {urgentCount > 0 && (
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white">
            {urgentCount > 9 ? "9+" : urgentCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 px-4 py-6 backdrop-blur-sm" onMouseDown={() => setIsOpen(false)}>
      <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-[var(--brse-panel-border)] bg-surface shadow-[0_28px_90px_rgba(0,0,0,0.45)]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[var(--brse-panel-border)] px-4 py-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">BrSE Command Center</p>
            <p className="text-sm text-textMuted">{t("commandpalette.headerDesc")}</p>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 p-2 text-textMuted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="flex items-center gap-3 border-b border-[var(--brse-panel-border)] px-4 py-3">
          <Search className="h-4 w-4 text-textMuted" />
          <input
            autoFocus
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleEnterKey(); }}
            placeholder={t("commandpalette.placeholder")}
            className="min-h-10 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-textMuted"
          />
        </label>
        {status ? (
          <p className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">{status}</p>
        ) : null}
        {data ? (
          <div className="grid grid-cols-4 gap-2 border-b border-[var(--brse-panel-border)] bg-background/35 p-3">
            {[
              { label: "Todo",        value: `${data.metrics.todo_done}/${data.metrics.todo_total}`, color: "text-emerald-400" },
              { label: "Q&A due",     value: data.metrics.qna_due,                                    color: data.metrics.qna_due > 0 ? "text-amber-400" : "text-textMuted" },
              { label: "CR",          value: data.metrics.pending_cr,                                  color: data.metrics.pending_cr > 0 ? "text-primary" : "text-textMuted" },
              { label: "Meet action", value: data.metrics.unsynced_meeting_actions,                    color: data.metrics.unsynced_meeting_actions > 0 ? "text-orange-400" : "text-textMuted" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-[var(--brse-panel-border)] bg-surface/60 px-3 py-2">
                <p className="text-[11px] text-textMuted">{label}</p>
                <p className={`mt-1 text-base font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filteredItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            const previousGroup = index > 0 ? filteredItems[index - 1]?.group : "";
            const showGroup = item.group && item.group !== previousGroup;
            const content = (
              <div>
                {showGroup ? (
                  <p className="px-2 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    {item.group}
                  </p>
                ) : null}
                <div className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                  isSelected
                    ? "border-primary/40 bg-primary/10"
                    : "border-transparent hover:border-primary/20 hover:bg-background/70"
                }`}>
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    isSelected ? "border-primary/40 bg-primary/20 text-primary" : "border-primary/20 bg-primary/10 text-primary"
                  }`}>
                    {item.id.includes("keigo") ? <Languages className="h-4 w-4" /> :
                     item.id.includes("glossary") ? <BookOpenText className="h-4 w-4" /> :
                     item.id.includes("note") ? <StickyNote className="h-4 w-4" /> :
                     item.id.includes("slides") ? <Presentation className="h-4 w-4" /> :
                     item.id.includes("reports") ? <FileText className="h-4 w-4" /> :
                     item.action ? <ClipboardList className="h-4 w-4" /> :
                     <ExternalLink className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-textMuted">{item.helper}</p>
                  </div>
                  {item.action ? <CheckCircle2 className="mt-1 h-4 w-4 text-matcha" /> : <ExternalLink className="mt-1 h-4 w-4 text-textMuted/40" />}
                </div>
              </div>
            );
            if (item.href && !item.action) {
              return <Link key={item.id} href={item.href} onClick={() => setIsOpen(false)}>{content}</Link>;
            }
            return <button key={item.id} type="button" onClick={() => runItem(item)} className="block w-full text-left">{content}</button>;
          })}
          {!filteredItems.length ? (
            <p className="rounded-xl border border-[var(--brse-panel-border)] bg-background/55 p-4 text-sm text-textMuted">{t("commandpalette.noMatch")}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--brse-panel-border)] px-4 py-3 text-[11px] text-textMuted">
          <span>{t("commandpalette.footerHintKeys")}</span>
          <span>
            {data
              ? `${language === "vi" ? "Snapshot:" : language === "ja" ? "スナップショット:" : "Snapshot:"} ${data.today}`
              : t("commandpalette.loadingBackend")}
          </span>
        </div>
      </section>
    </div>
  );
}
