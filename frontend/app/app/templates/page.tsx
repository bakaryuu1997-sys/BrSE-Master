"use client";

import Link from "next/link";
import { Check, Copy, History, Mail, Search, Trash2, X, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { apiBaseUrl } from "@/lib/config";
import { getTemplateSearchText, type EmailTemplate } from "@/lib/emailTemplates";
import { deletePersonalEmailTemplate, getPersonalEmailTemplates } from "@/lib/personalEmailTemplates";
import { PageHeader } from "@/components/PageHeader";

const CATEGORY_META: Record<string, { labelVi: string; labelEn: string; labelJa: string; color: string }> = {
  qna: { labelVi: "Q&A / Xác nhận", labelEn: "Q&A", labelJa: "Q&A・仕様確認", color: "border-sky-500/25 bg-sky-500/10 text-sky-400" },
  confirmation: { labelVi: "Xác nhận", labelEn: "Confirmation", labelJa: "確認・合意", color: "border-cyan-500/25 bg-cyan-500/10 text-cyan-400" },
  meeting: { labelVi: "Họp hành", labelEn: "Meeting", labelJa: "会議・打合せ", color: "border-amber-500/25 bg-amber-500/10 text-amber-400" },
  report: { labelVi: "Báo cáo", labelEn: "Report", labelJa: "進捗報告", color: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" },
  request: { labelVi: "Yêu cầu", labelEn: "Request", labelJa: "依頼・お願い", color: "border-purple-500/25 bg-purple-500/10 text-purple-400" },
  incident: { labelVi: "Sự cố / Lỗi", labelEn: "Incident / Bug", labelJa: "障害・不具合", color: "border-rose-500/25 bg-rose-500/10 text-rose-400" },
  escalation: { labelVi: "Báo động (Escalate)", labelEn: "Escalation", labelJa: "エスカレーション", color: "border-vermilion/25 bg-vermilion/10 text-vermilion" },
  estimate: { labelVi: "Báo giá", labelEn: "Estimate", labelJa: "見積・工数", color: "border-blue-500/25 bg-blue-500/10 text-blue-400" },
  handover: { labelVi: "Bàn giao", labelEn: "Handover", labelJa: "引継ぎ", color: "border-teal-500/25 bg-teal-500/10 text-teal-400" },
  release: { labelVi: "Release", labelEn: "Release", labelJa: "リリース", color: "border-indigo-500/25 bg-indigo-500/10 text-indigo-400" },
  closing: { labelVi: "Chào / Chốt", labelEn: "Closing", labelJa: "結び・挨拶", color: "border-slate-500/25 bg-slate-500/10 text-slate-300" },
};

export default function TemplatesPage() {
  const { language, t } = useUiLanguage();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [personalTemplates, setPersonalTemplates] = useState<EmailTemplate[]>([]);
  const [copiedSubjectId, setCopiedSubjectId] = useState<string | null>(null);

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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length + personalTemplates.length };
    for (const item of [...personalTemplates, ...templates]) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
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

  function handleCopySubject(e: React.MouseEvent, templateId: string, subject: string) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(subject);
    setCopiedSubjectId(templateId);
    setTimeout(() => {
      setCopiedSubjectId(null);
    }, 2000);
  }

  const getCategoryLabel = (cat: string) => {
    const meta = CATEGORY_META[cat];
    if (!meta) return cat;
    if (language === "ja") return meta.labelJa;
    if (language === "en") return meta.labelEn;
    return meta.labelVi;
  };

  return (
    <main className="brse-page">
      <PageHeader
        compact
        badge={t("templates.badge")}
        title={t("templates.title")}
        className="mb-2"
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[var(--brse-hairline-border)] bg-surface/80 px-2.5 py-1 text-xs font-semibold text-textMuted">
              <span className="font-bold text-primary">{isLoading ? "..." : templates.length + personalTemplates.length}</span> {t("templates.available")}
            </span>
            <Link
              href="/app/history"
              className="brse-button inline-flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              <History className="h-3.5 w-3.5" />
              {t("nav.history")}
            </Link>
          </div>
        }
      />

      {/* Search & Filter Bar */}
      <section className="brse-section my-2.5 space-y-2 p-2.5 sm:p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field-control w-full py-2 pl-10 pr-9 text-xs placeholder:text-textMuted/70"
            placeholder="Tìm template theo tình huống, tiêu đề Nhật / Việt, subject..."
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink/40 hover:text-ink transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Categories as clean segmented pills */}
        <div className="flex flex-wrap gap-1.5 pb-1 text-xs">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
              category === "all"
                ? "bg-primary text-white shadow-sm"
                : "border border-[var(--brse-hairline-border)] bg-surface/60 text-textMuted hover:text-ink hover:border-primary/30"
            }`}
          >
            <span>{t("templates.all")}</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
              {categoryCounts.all ?? 0}
            </span>
          </button>
          {categories.map((item) => {
            const count = categoryCounts[item] ?? 0;
            const meta = CATEGORY_META[item];
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
                  category === item
                    ? "bg-primary text-white shadow-sm"
                    : "border border-[var(--brse-hairline-border)] bg-surface/60 text-textMuted hover:text-ink hover:border-primary/30"
                }`}
              >
                <span>{getCategoryLabel(item)}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  category === item ? "bg-white/20 text-white" : "bg-white/5 text-textMuted"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Templates Grid - 2 columns on desktop/laptop */}
      <section className="grid gap-3 sm:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-xl border border-ink/10 bg-surfaceHover/50" />
          ))
        ) : error ? (
          <div className="col-span-full rounded-xl border border-vermilion/20 bg-vermilion/10 p-4 text-xs text-vermilion">
            {error} {t("templates.checkBackend")} <span className="font-semibold">/health</span>.
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full rounded-xl border border-ink/10 bg-washi p-8 text-center">
            <Mail className="mx-auto h-8 w-8 text-ink/35" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-ink">{t("templates.empty")}</p>
            <p className="mt-1 text-xs text-ink/60">{t("templates.emptyHint")}</p>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const isPersonal = template.id.startsWith("personal-");
            const catMeta = CATEGORY_META[template.category] ?? {
              labelVi: template.category,
              labelEn: template.category,
              labelJa: template.category,
              color: "border-primary/20 bg-primary/10 text-primary",
            };
            const isCopied = copiedSubjectId === template.id;

            return (
              <div
                key={template.id}
                className="brse-section group relative flex flex-col justify-between p-3.5 sm:p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surfaceHover/70 hover:shadow-glow-sm"
              >
                <Link href={`/app/templates/${template.id}`} className="block flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${catMeta.color}`}>
                        {getCategoryLabel(template.category)}
                      </span>
                      <span className="rounded-md bg-matcha/10 px-2 py-0.5 text-[11px] font-semibold text-matcha">
                        {template.keigo_level}
                      </span>
                      {isPersonal && (
                        <span className="rounded-md border border-cyan/25 bg-cyan/10 px-2 py-0.5 text-[11px] font-bold text-cyan">
                          Personal
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition group-hover:translate-x-0.5">
                      {t("templates.openEditor")}
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-ink group-hover:text-primary transition-colors line-clamp-1">
                    {template.title_vi}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink/55 line-clamp-1 font-sans">
                    {template.title_ja}
                  </p>
                </Link>

                {/* Subject box with 1-click copy */}
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-[var(--brse-hairline-border)] bg-background/60 p-2 text-xs">
                  <span className="font-mono text-textMuted line-clamp-1 flex-1 text-[11px]">
                    {template.subject_template}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopySubject(e, template.id, template.subject_template)}
                    className="inline-flex shrink-0 items-center gap-1 rounded border border-[var(--brse-hairline-border)] bg-surface px-1.5 py-0.5 text-[10px] font-bold text-textMuted hover:text-ink hover:border-primary/40 transition"
                    title="Sao chép tiêu đề"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {isPersonal && (
                  <div className="mt-2.5 pt-2 border-t border-[var(--brse-hairline-border)]">
                    <button
                      type="button"
                      onClick={() => removePersonalTemplate(template.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-vermilion/25 bg-vermilion/10 px-2.5 py-1 text-xs font-semibold text-vermilion transition hover:bg-vermilion/15"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      Xóa template cá nhân
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
