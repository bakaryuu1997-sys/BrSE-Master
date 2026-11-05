"use client";

import Link from "next/link";
import { ArrowLeft, Clipboard, History, RotateCcw, Save, Send, Wand2 } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/config";
import {
  getDefaultValues,
  appendSnippet,
  buildDecisionEmailSnippet,
  buildCustomerToneSnippet,
  buildRiskEmailSnippet,
  buildStructuredEmailSnippet,
  getCopyPayload,
  getDraftStats,
  getEditorHelpText,
  getMissingRequiredVariables,
  getTemplateCompleteness,
  getTextareaRows,
  getVariablePlaceholder,
  isTextareaVariable,
  renderTemplate,
  buildRequiredPlaceholders,
  type EmailTemplate,
  type TemplateValues
} from "@/lib/emailTemplates";
import { fetchEmailHistoryItem, saveEmailHistoryItem } from "@/lib/emailHistory";
import { findPersonalEmailTemplate, savePersonalEmailTemplate } from "@/lib/personalEmailTemplates";
import { getActiveProject, getProjectMemorySummary, getProjectTemplateValues } from "@/lib/projectSettings";
import { useProjectContext } from "@/components/ProjectContextProvider";
import { fetchClientStateValue, saveClientStateValue } from "@/lib/clientState";
import { useUiLanguage } from "@/components/LanguageProvider";

type CopyStatus = "idle" | "copied" | "error";
type GmailStatus = "idle" | "opened";

type EmailDraft = {
  values: TemplateValues;
  customBody: string;
  isBodyEdited: boolean;
};

function draftStorageKey(templateId: string) {
  return `brse.emailDraft.${templateId}.v1`;
}

function getEmailDraft(templateId: string): EmailDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(draftStorageKey(templateId));
    return raw ? (JSON.parse(raw) as EmailDraft) : null;
  } catch {
    return null;
  }
}

async function fetchEmailDraftFromDb(templateId: string): Promise<EmailDraft | null> {
  try {
    const raw = await fetchClientStateValue(draftStorageKey(templateId));
    return raw ? (JSON.parse(raw) as EmailDraft) : null;
  } catch {
    return null;
  }
}

function saveEmailDraft(templateId: string, draft: EmailDraft) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(draftStorageKey(templateId), JSON.stringify(draft));
  }
  void saveClientStateValue(draftStorageKey(templateId), JSON.stringify(draft)).catch(() => {
    /* browser draft remains the fast local cache */
  });
}

function clearEmailDraft(templateId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(draftStorageKey(templateId));
  }
  void saveClientStateValue(draftStorageKey(templateId), "").catch(() => {
    /* ignore */
  });
}

export default function TemplateEditorPage() {
  const { language, t } = useUiLanguage();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const templateId = params.id;
  const historyId = searchParams.get("historyId") || "";
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [values, setValues] = useState<TemplateValues>({});
  const [customBody, setCustomBody] = useState("");
  const [isBodyEdited, setIsBodyEdited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>("idle");
  const [saveStatus, setSaveStatus] = useState("");
  const { activeProject } = useProjectContext();
  const [isDraftReady, setIsDraftReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplate() {
      try {
        const personalTemplate = findPersonalEmailTemplate(templateId);
        const data = personalTemplate
          ? personalTemplate
          : await (async () => {
              const response = await fetch(`${apiBaseUrl}/email-templates/${templateId}`);
              if (!response.ok) throw new Error("Template not found");
              return (await response.json()) as EmailTemplate;
            })();
        const project = getActiveProject();
        const defaults = { ...getDefaultValues(data), ...getProjectTemplateValues(project) };
        const historyItem = historyId ? await fetchEmailHistoryItem(historyId).catch(() => null) : null;
        const draft = historyItem ? null : getEmailDraft(templateId) ?? await fetchEmailDraftFromDb(templateId);
        const nextValues = draft ? { ...defaults, ...draft.values } : defaults;
        if (isMounted) {
          setTemplate(data);
          setValues(historyItem ? { ...defaults, ...historyItem.variables } : nextValues);
          setIsBodyEdited(Boolean(historyItem || draft?.isBodyEdited));
          setCustomBody(historyItem ? historyItem.body : draft?.isBodyEdited ? draft.customBody : renderTemplate(data.body_template, nextValues, buildRequiredPlaceholders(data)));
          if (historyItem) setSaveStatus(t("templates.reopenedFromHistory"));
          else if (draft) setSaveStatus(t("templates.draftRestored"));
          setIsDraftReady(true);
        }
      } catch {
        if (isMounted) setTemplate(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTemplate();
    return () => {
      isMounted = false;
    };
  }, [historyId, templateId, t]);

  useEffect(() => {
    if (!template || !isDraftReady) return;
    saveEmailDraft(templateId, { values, customBody, isBodyEdited });
  }, [template, templateId, values, customBody, isBodyEdited, isDraftReady]);

  const renderedSubject = useMemo(() => {
    return template ? renderTemplate(template.subject_template, values, buildRequiredPlaceholders(template)) : "";
  }, [template, values]);

  const renderedBody = useMemo(() => {
    return template ? renderTemplate(template.body_template, values, buildRequiredPlaceholders(template)) : "";
  }, [template, values]);
  const projectMemory = getProjectMemorySummary(activeProject);

  const bodyForCopy = isBodyEdited ? customBody : renderedBody;
  const missingRequired = template ? getMissingRequiredVariables(template, values) : [];
  const draftStats = getDraftStats(bodyForCopy);
  const completion = template ? getTemplateCompleteness(template, values) : 0;

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setCopyStatus("idle");
    setGmailStatus("idle");
    setSaveStatus("");
  }

  function resetBody() {
    setCustomBody(renderedBody);
    setIsBodyEdited(false);
    setSaveStatus("");
  }

  function insertSnippet(snippet: string) {
    setCustomBody((current) => appendSnippet(isBodyEdited ? current : renderedBody, snippet));
    setIsBodyEdited(true);
    setCopyStatus("idle");
    setGmailStatus("idle");
    setSaveStatus(t("templates.snippetInserted"));
  }

  function clearDraft() {
    if (!template) return;
    const defaults = { ...getDefaultValues(template), ...getProjectTemplateValues(activeProject) };
    clearEmailDraft(templateId);
    setValues(defaults);
    setCustomBody(renderTemplate(template.body_template, defaults, buildRequiredPlaceholders(template)));
    setIsBodyEdited(false);
    setCopyStatus("idle");
    setGmailStatus("idle");
    setSaveStatus(t("templates.draftCleared"));
  }

  const copyEmail = useCallback(async () => {
    if (!template) return;

    try {
      await navigator.clipboard.writeText(getCopyPayload(renderedSubject, bodyForCopy));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }, [bodyForCopy, renderedSubject, template]);

  async function saveToHistory() {
    if (!template) return;
    await saveEmailHistoryItem({
      template,
      subject: renderedSubject,
      body: bodyForCopy,
      variables: values
    }, activeProject?.id || "default");
    setSaveStatus(t("templates.historySaved"));
  }

  function saveAsMyTemplate() {
    if (!template) return;
    const id = template.id.startsWith("personal-")
      ? template.id
      : `personal-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`;
    savePersonalEmailTemplate({
      ...template,
      id,
      slug: id,
      category: template.category,
      title_vi: template.id.startsWith("personal-") ? template.title_vi : `${template.title_vi} ${t("templates.personalSuffix")}`,
      title_ja: template.id.startsWith("personal-") ? template.title_ja : `${template.title_ja}（個人）`,
      subject_template: renderedSubject,
      body_template: bodyForCopy,
      variables: [],
    });
    setSaveStatus(template.id.startsWith("personal-") ? t("templates.updatedPersonal") : t("templates.savedPersonal"));
  }

  function openGmailCompose() {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: activeProject?.customer_email ?? "",
      su: renderedSubject,
      body: bodyForCopy
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener,noreferrer");
    setGmailStatus("opened");
  }

  useEffect(() => {
    function handleCopyShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void copyEmail();
      }
    }

    window.addEventListener("keydown", handleCopyShortcut);
    return () => window.removeEventListener("keydown", handleCopyShortcut);
  }, [copyEmail]);

  if (isLoading) {
    return (
      <main className="brse-page">
        <p className="brse-card rounded-md p-5 text-sm text-ink/70">{t("templates.loading")}</p>
      </main>
    );
  }

  if (!template) {
    return (
      <main className="brse-page">
        <Link href="/app/templates" className="inline-flex items-center gap-2 text-sm font-semibold text-vermilion">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("templates.back")}
        </Link>
        <p className="mt-6 brse-card rounded-md p-5 text-sm text-ink/70">
          {t("templates.notFound")}
        </p>
      </main>
    );
  }

  return (
    <main className="brse-page">
      <header className="spectral-panel mb-3.5 rounded-xl p-3.5 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link href="/app/templates" className="inline-flex items-center gap-1.5 text-xs font-semibold text-textMuted hover:text-ink transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Quay lại danh sách template
            </Link>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {template.category.toUpperCase()}
              </span>
              <span className="rounded-md bg-matcha/10 px-2 py-0.5 text-[11px] font-semibold text-matcha">
                {template.keigo_level}
              </span>
              <h1 className="text-base sm:text-lg font-bold text-ink">{template.title_vi}</h1>
              <span className="text-xs text-textMuted font-sans">({template.title_ja})</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeProject ? (
              <span className="rounded-lg border border-matcha/30 bg-matcha/10 px-2.5 py-1 text-xs font-semibold text-matcha">
                📁 Dự án: <strong>{activeProject.name}</strong>
              </span>
            ) : null}
            <Link
              href="/app/history"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brse-hairline-border)] bg-surface/70 px-2.5 py-1 text-xs font-semibold text-textMuted hover:text-ink transition hover:border-primary/40"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              {t("templates.viewHistory")}
            </Link>
          </div>
        </div>

        {projectMemory.hasMemory && (
          <details className="mt-2.5 rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs text-ink/80">
            <summary className="cursor-pointer font-bold text-primary select-none outline-none">
              Customer memory ({activeProject?.name}) ▾
            </summary>
            <div className="mt-1.5 grid gap-1 text-[11px] sm:grid-cols-2">
              {projectMemory.customerStyle && <p><span className="font-semibold text-ink">Style:</span> {projectMemory.customerStyle}</p>}
              {projectMemory.reportRule && <p><span className="font-semibold text-ink">Rule:</span> {projectMemory.reportRule}</p>}
              {projectMemory.timezoneRule && <p><span className="font-semibold text-ink">Timezone:</span> {projectMemory.timezoneRule}</p>}
              {projectMemory.communicationNotes && <p><span className="font-semibold text-ink">Notes:</span> {projectMemory.communicationNotes}</p>}
            </div>
          </details>
        )}
      </header>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr] items-start">
        {/* Left Column: Required Inputs */}
        <section className="brse-section p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--brse-hairline-border)] pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-ink">{t("templates.requiredInfo")}</h2>
              <p className="text-[11px] text-textMuted">{t("templates.realtimePreview")}</p>
            </div>
            <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {completion}%
            </span>
          </div>

          <div className="grid gap-2.5">
            {template.variables.length === 0 ? (
              <p className="text-xs text-textMuted">{t("templates.noVariables")}</p>
            ) : (
              template.variables.map((variable) => (
                <div key={variable.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">
                      {variable.label}
                      {variable.required ? <span className="text-vermilion"> *</span> : null}
                    </span>
                    <span className="text-[10px] text-textMuted font-mono">{variable.key}</span>
                  </div>
                  {isTextareaVariable(variable) ? (
                    <textarea
                      value={values[variable.key] ?? ""}
                      onChange={(event) => updateValue(variable.key, event.target.value)}
                      rows={3}
                      className="field-control w-full p-2 text-xs leading-relaxed resize-y min-h-[64px]"
                      placeholder={getVariablePlaceholder(variable, language)}
                    />
                  ) : (
                    <input
                      value={values[variable.key] ?? ""}
                      onChange={(event) => updateValue(variable.key, event.target.value)}
                      className="field-control w-full py-1.5 px-2.5 text-xs"
                      placeholder={getVariablePlaceholder(variable, language)}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {missingRequired.length > 0 && (
            <p className="rounded-lg border border-vermilion/20 bg-vermilion/10 p-2 text-xs text-vermilion">
              {t("templates.missing")}: {missingRequired.join(", ")}
            </p>
          )}

          <div className="pt-2 border-t border-[var(--brse-hairline-border)]">
            <button
              type="button"
              onClick={saveAsMyTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan transition hover:bg-cyan/15"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {template.id.startsWith("personal-") ? t("templates.updatePersonalBtn") : t("templates.saveAsPersonalBtn")}
            </button>
          </div>
        </section>

        {/* Right Column: Email Preview */}
        <section className="brse-section p-3.5 sm:p-4 space-y-2.5">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--brse-hairline-border)] pb-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">{t("templates.emailPreview")}</h2>
              <span className="rounded-md border border-[var(--brse-hairline-border)] bg-surface px-1.5 py-0.5 text-[10px] font-mono text-textMuted">
                {draftStats.lines} dòng · {draftStats.chars} ký tự
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {isBodyEdited && (
                <button
                  type="button"
                  onClick={resetBody}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition"
                  title="Khôi phục lại nội dung tự động sinh từ biến"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset body</span>
                </button>
              )}
              <button
                type="button"
                onClick={clearDraft}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--brse-hairline-border)] bg-surface px-2 py-1 text-xs font-semibold text-textMuted hover:text-ink transition"
                title="Xóa nháp"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Xoá draft</span>
              </button>
              <button
                type="button"
                onClick={saveToHistory}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--brse-hairline-border)] bg-surface px-2 py-1 text-xs font-semibold text-textMuted hover:text-ink transition"
                title="Lưu vào lịch sử"
              >
                <Save className="h-3 w-3" />
                <span>Lưu</span>
              </button>
              <button
                type="button"
                onClick={openGmailCompose}
                className="inline-flex items-center gap-1 rounded-md border border-matcha/30 bg-matcha/10 px-2.5 py-1 text-xs font-semibold text-matcha hover:bg-matcha/20 transition"
              >
                <Send className="h-3 w-3" />
                <span>Gmail</span>
              </button>
              <button
                type="button"
                onClick={copyEmail}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-primaryHover transition active:scale-95"
                title="Ctrl/Cmd + Enter để copy nhanh"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>{copyStatus === "copied" ? "Đã copy!" : "Copy Text"}</span>
              </button>
            </div>
          </div>

          {/* Snippet Pills & Warning Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] font-bold text-textMuted mr-1">Chèn nhanh:</span>
              <button
                type="button"
                onClick={() => insertSnippet(buildStructuredEmailSnippet())}
                className="rounded border border-[var(--brse-hairline-border)] bg-surface/80 px-2 py-0.5 text-[11px] text-textMuted hover:text-ink hover:border-primary/40 transition"
              >
                + Confirm
              </button>
              <button
                type="button"
                onClick={() => insertSnippet(buildDecisionEmailSnippet())}
                className="rounded border border-[var(--brse-hairline-border)] bg-surface/80 px-2 py-0.5 text-[11px] text-textMuted hover:text-ink hover:border-primary/40 transition"
              >
                + Action
              </button>
              <button
                type="button"
                onClick={() => insertSnippet(buildRiskEmailSnippet())}
                className="rounded border border-[var(--brse-hairline-border)] bg-surface/80 px-2 py-0.5 text-[11px] text-textMuted hover:text-ink hover:border-primary/40 transition"
              >
                + Risk
              </button>
              {projectMemory.hasMemory && (
                <button
                  type="button"
                  onClick={() => insertSnippet(buildCustomerToneSnippet({
                    customerStyle: projectMemory.customerStyle,
                    reportRule: projectMemory.reportRule,
                    timezoneRule: projectMemory.timezoneRule,
                    communicationNotes: projectMemory.communicationNotes,
                  }))}
                  className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20 transition"
                >
                  + Tone
                </button>
              )}
            </div>

            {isBodyEdited && (
              <span className="text-[11px] text-amber-400 font-semibold">
                ⚡ Đang sửa tay nội dung
              </span>
            )}
          </div>

          {/* Email Container (To, Subject, and immediately the Body Textarea) */}
          <div className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/40 overflow-hidden shadow-glow-sm">
            <div className="border-b border-[var(--brse-hairline-border)] bg-surface/70 px-3 py-2 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-14 text-textMuted font-mono">To:</span>
                <span className="font-semibold text-ink truncate">{activeProject?.customer_name || "Customer / JP Team"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-14 text-textMuted font-mono">Subject:</span>
                <span className="font-semibold text-primary font-mono text-[11px] truncate">{renderedSubject}</span>
              </div>
            </div>

            {/* Content Textarea - immediately visible! */}
            <textarea
              value={bodyForCopy}
              onChange={(event) => {
                setCustomBody(event.target.value);
                setIsBodyEdited(true);
                setCopyStatus("idle");
                setGmailStatus("idle");
                setSaveStatus("");
              }}
              rows={16}
              className="w-full resize-y bg-slate-950/50 p-3 font-mono text-xs leading-relaxed text-ink outline-none transition focus:ring-1 focus:ring-primary/40 min-h-[380px]"
              placeholder="Nội dung email..."
            />
          </div>

          {/* Status feedback line */}
          <div className="min-h-4 text-xs">
            {copyStatus === "copied" && <p className="text-matcha font-semibold">✓ {t("templates.copyDone")}</p>}
            {copyStatus === "error" && <p className="text-vermilion">✕ {t("templates.copyError")}</p>}
            {gmailStatus === "opened" && <p className="text-matcha font-semibold">✓ {t("templates.gmailOpened")}</p>}
            {saveStatus && <p className="text-matcha font-semibold">✓ {saveStatus}</p>}
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveAsMyTemplate}
          className="inline-flex items-center gap-2 rounded-md border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:border-cyan/45"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {template.id.startsWith("personal-") ? t("templates.updatePersonalBtn") : t("templates.saveAsPersonalBtn")}
        </button>
      </div>
    </main>
  );
}
