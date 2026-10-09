import type { EmailTemplate } from "@/lib/emailTemplates";

const STORAGE_KEY = "brse.personalEmailTemplates.v1";

function readRawTemplates(): EmailTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as EmailTemplate[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTemplates(templates: EmailTemplate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function getPersonalEmailTemplates() {
  return readRawTemplates();
}

export function findPersonalEmailTemplate(templateId: string) {
  return readRawTemplates().find((template) => template.id === templateId) ?? null;
}

export function savePersonalEmailTemplate(template: EmailTemplate) {
  const current = readRawTemplates();
  const next = [template, ...current.filter((item) => item.id !== template.id)];
  writeTemplates(next);
  return template;
}

export function deletePersonalEmailTemplate(templateId: string) {
  writeTemplates(readRawTemplates().filter((template) => template.id !== templateId));
}
