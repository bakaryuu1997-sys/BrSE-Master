"use client";

import Link from "next/link";
import { Clipboard, Edit3, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { formatAppDateTime } from "@/lib/dateUtils";
import { clearEmailHistory, fetchEmailHistory, getEmailHistory, type GeneratedEmailHistoryItem } from "@/lib/emailHistory";
import { getActiveProject } from "@/lib/projectSettings";
import { PageHeader } from "@/components/PageHeader";

export default function HistoryPage() {
  const { t, language } = useUiLanguage();
  const [history, setHistory] = useState<GeneratedEmailHistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [serverFiltered, setServerFiltered] = useState(false);

  useEffect(() => {
    setHistory(getEmailHistory());
    fetchEmailHistory(getActiveProject()?.id || "default", { limit: 50 }).then((items) => {
      setHistory(items);
      setHasMore(items.length >= 50);
      setServerFiltered(false);
    }).catch(() => {
      // Keep IndexedDB/in-memory cache if PostgreSQL is not ready.
    });
  }, []);

  async function loadHistory(offset = 0, append = false) {
    setIsLoading(true);
    try {
      const items = await fetchEmailHistory(getActiveProject()?.id || "default", {
        query,
        limit: 50,
        offset,
        append,
      });
      setHistory([...items]);
      setHasMore(items.length >= offset + 50);
      setServerFiltered(Boolean(query.trim()));
    } finally {
      setIsLoading(false);
    }
  }

  const filteredHistory = useMemo(() => {
    if (serverFiltered) return history;
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return history;

    return history.filter((item) => {
      return [item.templateTitle, item.category, item.subject, item.body]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [history, query, serverFiltered]);
  const categories = useMemo(() => new Set(history.map((item) => item.category)).size, [history]);

  async function copyItem(item: GeneratedEmailHistoryItem) {
    await navigator.clipboard.writeText(`件名：${item.subject}\n\n${item.body}`);
    setCopiedId(item.id);
  }

  async function clearHistory() {
    await clearEmailHistory(getActiveProject()?.id || "default");
    setHistory([]);
    setCopiedId("");
  }

  return (
    <main className="brse-page">
      <PageHeader
        badge={t("history.badge")}
        title={t("history.title")}
        description={t("history.body")}
        actions={
          <Link
            href="/app/templates"
            className="inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover"
          >
            {t("history.newEmail")}
          </Link>
        }
        stats={[
          { label: t("history.total"), value: history.length },
          { label: t("history.categories"), value: categories, variant: "primary" },
          { label: t("history.filtered"), value: filteredHistory.length, variant: "success" },
        ]}
      />

      <div className="brse-section mb-5 mt-5 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setServerFiltered(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") void loadHistory(0, false);
          }}
          className="field-control px-3 py-2 text-sm md:w-96"
          placeholder={t("history.searchPlaceholder")}
        />
        <button
          type="button"
          onClick={() => void loadHistory(0, false)}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:border-primary/60"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {isLoading ? t("history.searching") : t("history.searchDb")}
        </button>
        {history.length > 0 ? (
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-ink/15 bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t("history.clear")}
          </button>
        ) : null}
      </div>

      <section className="grid gap-4">
        {filteredHistory.length === 0 ? (
          <div className="rounded-xl border border-ink/10 bg-washi p-8 text-center">
            <p className="font-semibold text-ink">{t("history.empty")}</p>
            <p className="mt-2 text-sm text-ink/60">{t("history.emptyHint")}</p>
            <Link
              href="/app/templates"
              className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover"
            >
              {t("history.openTemplates")}
            </Link>
          </div>
        ) : (
          <div className="relative space-y-6 border-l border-primary/20 ml-3 pl-6 md:ml-6 md:pl-8">
            {filteredHistory.map((item) => (
              <div key={item.id} className="relative group">
                <div className="absolute -left-[31px] md:-left-[39px] top-6 h-3 w-3 rounded-full border-2 border-primary bg-background shadow-[0_0_8px_rgba(255,107,94,0.5)] transition group-hover:scale-125 group-hover:bg-primary"></div>
                <article className="brse-section p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-sm bg-vermilion/10 px-2 py-1 text-xs font-semibold text-vermilion">
                      {item.category}
                    </span>
                    <h2 className="font-semibold text-ink">{item.templateTitle}</h2>
                  </div>
                  <p className="mt-2 text-xs text-ink/50">{formatAppDateTime(item.createdAt, language)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyItem(item)}
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover"
                >
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  {copiedId === item.id ? t("history.copied") : t("history.copyAgain")}
                </button>
                {item.templateId ? (
                  <Link
                    href={`/app/templates/${item.templateId}?historyId=${encodeURIComponent(item.id)}`}
                    className="inline-flex w-fit items-center gap-2 rounded-md border border-ink/15 bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    {t("history.reopenEditor")}
                  </Link>
                ) : null}
              </div>
              <div className="mt-4 rounded-md border border-ink/10 bg-surfaceHover/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">件名</p>
                <p className="mt-2 text-sm font-semibold text-ink">{item.subject}</p>
              </div>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-ink/10 bg-surfaceHover/45 p-4 text-sm leading-7 text-ink">
                {item.body}
              </pre>
                </article>
              </div>
            ))}
          </div>
        )}
      </section>
      {hasMore && filteredHistory.length > 0 ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void loadHistory(history.length, true)}
            className="rounded-md border border-ink/15 bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/40"
          >
            {isLoading ? t("history.loading") : t("history.loadMore")}
          </button>
        </div>
      ) : null}
    </main>
  );
}
