"use client";

import Link from "next/link";
import { Mail, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { apiBaseUrl } from "@/lib/config";
import { getTemplateSearchText, type EmailTemplate } from "@/lib/emailTemplates";
import { deletePersonalEmailTemplate, getPersonalEmailTemplates } from "@/lib/personalEmailTemplates";
import { PageHeader } from "@/components/PageHeader";

export default function TemplatesPage() {
  const { t } = useUiLanguage();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [personalTemplates, setPersonalTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplates() {
      setError("");
      try {
        const response = await fetch(`${apiBaseUrl}/email-templates`);
        if (!response.ok) throw new Error(t("templates.loadError"));
        const data = (await response.json()) as EmailTemplate[];
        if (isMounted) {
          setTemplates(data);
          setPersonalTemplates(getPersonalEmailTemplates());
        }
      } catch (loadError) {
        if (isMounted) {
          setTemplates([]);
          setError(loadError instanceof Error ? loadError.message : t("templates.loadError"));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTemplates();
    return () => {
      isMounted = false;
    };
  }, [t]);

  const categories = useMemo(() => {
    return Array.from(new Set([...templates, ...personalTemplates].map((template) => template.category))).sort();
  }, [personalTemplates, templates]);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...personalTemplates, ...templates].filter((template) => {
      const matchesCategory = category === "all" || template.category === category;
      const searchable = getTemplateSearchText(template);
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [personalTemplates, templates, query, category]);

  function removePersonalTemplate(templateId: string) {
    deletePersonalEmailTemplate(templateId);
    setPersonalTemplates(getPersonalEmailTemplates());
  }

  return (
    <main className="brse-page">
      <PageHeader
        badge={t("templates.badge")}
        title={t("templates.title")}
        description={t("templates.body")}
        stats={[{ label: t("templates.available"), value: isLoading ? "..." : templates.length }]}
      />

      <section className="brse-section mb-5 mt-5 grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field-control w-full py-2 pl-9 pr-3 text-sm placeholder:text-textMuted"
            placeholder={t("templates.search")}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
              category === "all" ? "bg-primary text-white" : "bg-background/70 text-ink/70 hover:bg-surfaceHover"
            }`}
          >
            {t("templates.all")}
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${
                category === item ? "bg-primary text-white" : "bg-background/70 text-ink/70 hover:bg-surfaceHover"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-ink/10 bg-surfaceHover/50" />
          ))
        ) : error ? (
          <div className="rounded-xl border border-vermilion/20 bg-vermilion/10 p-5 text-sm text-vermilion">
            {error} {t("templates.checkBackend")} <span className="font-semibold">/health</span>.
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-xl border border-ink/10 bg-washi p-8 text-center">
            <Mail className="mx-auto h-8 w-8 text-ink/35" aria-hidden="true" />
            <p className="mt-3 font-semibold text-ink">{t("templates.empty")}</p>
            <p className="mt-2 text-sm text-ink/60">{t("templates.emptyHint")}</p>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const isPersonal = template.id.startsWith("personal-");
            return (
            <div
              key={template.id}
              className="brse-section group p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surfaceHover/70"
            >
              <Link href={`/app/templates/${template.id}`} className="block">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {template.category}
                    </span>
                    <span className="rounded-full bg-matcha/10 px-2.5 py-1 text-xs font-semibold text-matcha">
                      {template.keigo_level}
                    </span>
                    {isPersonal ? (
                      <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-xs font-semibold text-cyan">
                        Personal
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{template.title_vi}</h2>
                  <p className="mt-1 text-sm text-ink/55">{template.title_ja}</p>
                </div>
                <p className="text-sm font-semibold text-primary transition group-hover:translate-x-1">{t("templates.openEditor")}</p>
              </div>
              <p className="mt-4 rounded-md border border-[var(--brse-panel-border)] bg-background/55 px-3 py-2 text-sm font-semibold text-ink/70">
                {template.subject_template}
              </p>
              </Link>
              {isPersonal ? (
                <button
                  type="button"
                  onClick={() => removePersonalTemplate(template.id)}
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-vermilion/25 bg-vermilion/10 px-3 py-2 text-xs font-semibold text-vermilion transition hover:bg-vermilion/15"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Xóa template cá nhân
                </button>
              ) : null}
            </div>
          )})
        )}
      </section>
    </main>
  );
}
