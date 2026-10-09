"use client";

import type { FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import type { OperationRecordInput, OperationType } from "@/lib/operations";
import { configs } from "./operationsConfig";

type OperationRecordSlideOverProps = {
  isOpen: boolean;
  isLoading: boolean;
  activeType: OperationType;
  typeTitle: string;
  form: OperationRecordInput;
  editingId: string;
  status: { text: string; kind: "success" | "error" | "info" } | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: <K extends keyof OperationRecordInput>(key: K, value: OperationRecordInput[K]) => void;
};

export function OperationRecordSlideOver({
  isOpen,
  isLoading,
  activeType,
  typeTitle,
  form,
  editingId,
  status,
  onClose,
  onSubmit,
  onFieldChange,
}: OperationRecordSlideOverProps) {
  const { t } = useUiLanguage();
  const config = configs[activeType];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm" onClick={onClose}>
      <aside
        className={`ml-auto flex h-full w-full max-w-xl flex-col border-l border-[var(--brse-panel-border)] bg-slate-950/95 shadow-[0_28px_90px_rgba(0,0,0,0.48)] ${isLoading ? "pointer-events-none opacity-70" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--brse-panel-border)] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{editingId ? "Edit operation" : "Create operation"}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{typeTitle}</h2>
            <p className="mt-1 text-xs leading-5 text-textMuted">{config.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--brse-panel-border)] bg-background/70 p-2 text-textMuted transition hover:border-primary/35 hover:text-primary">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <form id="operation-record-form" onSubmit={onSubmit} className="grid flex-1 gap-3 overflow-y-auto p-5">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">{t("operations.titleField")}</span>
            <input
              required
              value={form.title}
              onChange={(event) => onFieldChange("title", event.target.value)}
              placeholder="Short summary"
              className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.status")}</span>
              <select value={form.status} onChange={(event) => onFieldChange("status", event.target.value)} className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                {config.statuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.priority")}</span>
              <select value={form.priority} onChange={(event) => onFieldChange("priority", event.target.value)} className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                {config.priorities.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.owner")}</span>
              <input value={form.owner} onChange={(event) => onFieldChange("owner", event.target.value)} className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.dueDate")}</span>
              <input type="date" value={form.dueDate} onChange={(event) => onFieldChange("dueDate", event.target.value)} className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.project")}</span>
              <input value={form.projectName} onChange={(event) => onFieldChange("projectName", event.target.value)} className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{t("operations.customerOwner")}</span>
              <input value={form.customerOwner} onChange={(event) => onFieldChange("customerOwner", event.target.value)} className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
          </div>

          {config.fields.map((field) => (
            <label key={field.key} className="grid gap-2">
              <span className="text-sm font-semibold text-ink">{field.label}</span>
              <textarea
                value={form[field.key]}
                onChange={(event) => onFieldChange(field.key, event.target.value)}
                rows={field.key === "fieldA" ? 3 : 2}
                placeholder={field.placeholder}
                className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-textMuted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          ))}

          {status ? (
            <p className={`text-sm ${status.kind === "error" ? "text-vermilion" : status.kind === "info" ? "text-primary" : "text-matcha"}`}>
              {status.text}
            </p>
          ) : null}
        </form>

        <footer className="flex flex-wrap gap-2 border-t border-[var(--brse-panel-border)] p-5">
          <button
            type="submit"
            form="operation-record-form"
            disabled={isLoading}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {editingId ? t("operations.update") : t("operations.create")}
          </button>
          <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[var(--brse-panel-border)] bg-background/70 px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary/40">
            {t("operations.cancelEdit")}
          </button>
        </footer>
      </aside>
    </div>
  );
}
