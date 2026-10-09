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
  type EmailTemplate,
  type TemplateValues
} from "@/lib/emailTemplates";
import { fetchEmailHistoryItem, saveEmailHistoryItem } from "@/lib/emailHistory";
import { findPersonalEmailTemplate, savePersonalEmailTemplate } from "@/lib/personalEmailTemplates";
import { ACTIVE_PROJECT_CHANGED_EVENT, getActiveProject, getProjectMemorySummary, getProjectTemplateValues, type ProjectSetting } from "@/lib/projectSettings";
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
  const [activeProject, setActiveProject] = useState<ProjectSetting | null>(null);
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
          setActiveProject(project);
          setValues(historyItem ? { ...defaults, ...historyItem.variables } : nextValues);
          setIsBodyEdited(Boolean(historyItem || draft?.isBodyEdited));
          setCustomBody(historyItem ? historyItem.body : draft?.isBodyEdited ? draft.customBody : renderTemplate(data.body_template, nextValues));
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
    function handleProjectChange() {
      setActiveProject(getActiveProject());
    }

    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
  }, []);

  useEffect(() => {
    if (!template || !isDraftReady) return;
    saveEmailDraft(templateId, { values, customBody, isBodyEdited });
  }, [template, templateId, values, customBody, isBodyEdited, isDraftReady]);

  const renderedSubject = useMemo(() => {
    return template ? renderTemplate(template.subject_template, values) : "";
  }, [template, values]);

  const renderedBody = useMemo(() => {
    return template ? renderTemplate(template.body_template, values) : "";
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
    setCustomBody(renderTemplate(template.body_template, defaults));
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
      <header className="glass-panel mb-6 rounded-2xl p-6">
        <Link href="/app/templates" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("templates.title")}
        </Link>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{template.category}</p>
            <h1 className="text-h1 mt-2">{template.title_vi}</h1>
            <p className="mt-2 text-sm text-ink/60">{template.title_ja}</p>
          </div>
          <Link
            href="/app/history"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            {t("templates.viewHistory")}
          </Link>
        </div>
        {activeProject ? (
          <div className="mt-4 grid gap-3">
            <p className="rounded-md border border-matcha/20 bg-matcha/10 p-3 text-sm text-matcha">
              {t("templates.autoFillProject")} <span className="font-semibold">{activeProject.name}</span>
            </p>
            {projectMemory.hasMemory ? (
              <div className="rounded-md border border-primary/20 bg-primary/10 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Customer memory</p>
                <div className="mt-3 grid gap-2 text-ink/80">
                  {projectMemory.customerStyle ? <p><span className="font-semibold text-ink">Style:</span> {projectMemory.customerStyle}</p> : null}
                  {projectMemory.reportRule ? <p><span className="font-semibold text-ink">Report / wording rule:</span> {projectMemory.reportRule}</p> : null}
                  {projectMemory.timezoneRule ? <p><span className="font-semibold text-ink">Timezone rule:</span> {projectMemory.timezoneRule}</p> : null}
                  {projectMemory.communicationNotes ? <p><span className="font-semibold text-ink">Notes:</span> {projectMemory.communicationNotes}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Link
            href="/app/settings/projects"
            className="mt-4 inline-flex rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
          >
            {t("templates.setupProject")}
          </Link>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <section className="brse-card rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">{t("templates.requiredInfo")}</h2>
              <p className="mt-2 text-sm text-textMuted">{t("templates.realtimePreview")}</p>
            </div>
            <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {completion}%
            </span>
          </div>
          <div className="mt-5 grid gap-4">
            {template.variables.length === 0 ? (
              <p className="text-sm text-ink/70">{t("templates.noVariables")}</p>
            ) : (
              template.variables.map((variable) => (
                <label key={variable.key} className="grid gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {variable.label}
                    {variable.required ? <span className="text-vermilion"> *</span> : null}
                  </span>
                  {isTextareaVariable(variable) ? (
                    <>
                      <textarea
                        value={values[variable.key] ?? ""}
                        onChange={(event) => updateValue(variable.key, event.target.value)}
                        rows={getTextareaRows(variable)}
                        className="min-h-28 resize-y rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-textMuted focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder={getVariablePlaceholder(variable, language)}
                      />
                      <span className="text-xs leading-5 text-textMuted">{getEditorHelpText(variable, language)}</span>
                    </>
                  ) : (
                    <input
                      value={values[variable.key] ?? ""}
                      onChange={(event) => updateValue(variable.key, event.target.value)}
                      className="min-h-11 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-textMuted focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder={getVariablePlaceholder(variable, language)}
                    />
                  )}
                </label>
              ))
            )}
          </div>
          {missingRequired.length > 0 ? (
            <p className="mt-5 rounded-md border border-vermilion/20 bg-vermilion/10 p-3 text-sm text-vermilion">
              {t("templates.missing")}: {missingRequired.join(", ")}
            </p>
          ) : null}
        </section>

        <section className="brse-card rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">{t("templates.emailPreview")}</h2>
              <p className="mt-1 text-xs text-textMuted">{t("templates.shortcut")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetBody}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t("templates.resetBody")}
              </button>
              <button
                type="button"
                onClick={clearDraft}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t("templates.clearDraft")}
              </button>
              <button
                type="button"
                onClick={saveToHistory}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {t("templates.save")}
              </button>
              <button
                type="button"
                onClick={openGmailCompose}
                className="inline-flex items-center gap-2 rounded-md border border-matcha/30 bg-matcha/10 px-3 py-2 text-sm font-semibold text-matcha transition hover:border-matcha/60 hover:bg-matcha/15"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t("templates.openGmail")}
              </button>
              <button
                type="button"
                onClick={copyEmail}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover"
              >
                <Clipboard className="h-4 w-4" aria-hidden="true" />
                {t("templates.copyText")}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="grid gap-2">
              <div className="grid gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/45 p-3 text-xs text-textMuted sm:grid-cols-3">
                <span>
                  {t("templates.lines")}: <strong className="text-ink">{draftStats.lines}</strong>
                </span>
                <span>
                  {t("templates.characters")}: <strong className="text-ink">{draftStats.chars}</strong>
                </span>
                <span>
                  {t("templates.missingRequired")}: <strong className="text-ink">{missingRequired.length}</strong>
                </span>
              </div>
              {isBodyEdited ? (
                <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning">
                  {t("templates.bodyEdited")}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => insertSnippet(buildStructuredEmailSnippet())}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-xs font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Background/Confirm
              </button>
              <button
                type="button"
                onClick={() => insertSnippet(buildDecisionEmailSnippet())}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-xs font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Decision/Action
              </button>
              <button
                type="button"
                onClick={() => insertSnippet(buildRiskEmailSnippet())}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-xs font-semibold text-ink transition hover:border-primary/40 hover:bg-surfaceHover"
              >
                <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Risk/Impact
              </button>
              {projectMemory.hasMemory ? (
                <button
                  type="button"
                  onClick={() => insertSnippet(buildCustomerToneSnippet({
                    customerStyle: projectMemory.customerStyle,
                    reportRule: projectMemory.reportRule,
                    timezoneRule: projectMemory.timezoneRule,
                    communicationNotes: projectMemory.communicationNotes,
                  }))}
                  className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/15"
                >
                  <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Customer tone
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-[var(--brse-panel-border)] bg-background/60">
            <div className="grid gap-3 border-b border-[var(--brse-panel-border)] p-4 text-sm sm:grid-cols-[80px_1fr]">
              <span className="text-textMuted">To:</span>
              <span className="font-semibold text-ink">{activeProject?.customer_name || "Customer / JP Team"}</span>
              <span className="text-textMuted">{t("templates.subject")}:</span>
              <span className="font-semibold text-ink">{renderedSubject}</span>
            </div>

            <label className="grid gap-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-textMuted">{t("templates.bodyLabel")}</span>
              <textarea
                value={bodyForCopy}
                onChange={(event) => {
                  setCustomBody(event.target.value);
                  setIsBodyEdited(true);
                  setCopyStatus("idle");
                  setGmailStatus("idle");
                  setSaveStatus("");
                }}
                className="min-h-[620px] resize-y rounded-md border border-[var(--brse-panel-border)] bg-surface p-4 font-mono text-sm leading-7 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <div className="mt-4 min-h-6 text-sm">
            {copyStatus === "copied" ? <p className="text-matcha">{t("templates.copyDone")}</p> : null}
            {copyStatus === "error" ? <p className="text-vermilion">{t("templates.copyError")}</p> : null}
            {gmailStatus === "opened" ? (
              <p className="text-matcha">
                {t("templates.gmailOpened")}
              </p>
            ) : null}
            {saveStatus ? <p className="text-matcha">{saveStatus}</p> : null}
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
