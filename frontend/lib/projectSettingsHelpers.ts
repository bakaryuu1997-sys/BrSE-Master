/**
 * Shared types, parsers, and constants for Project Settings UI.
 * Extracted from settings/projects/page.tsx to avoid duplication
 * across DataSafetyPanel, ProjectListPanel, NotificationsPanel,
 * and the main route shell.
 */

import { type ProjectSettingInput } from "@/lib/projectSettings";

/* ─── domain types ─── */

export type ProjectStakeholder = {
  role: string;
  name: string;
  email: string;
  chatId: string;
};

export type ProjectIntegrations = {
  jiraUrl: string;
  redmineUrl: string;
  googleDriveUrl: string;
  confluenceUrl: string;
  slackWebhookUrl?: string;
  chatworkToken?: string;
  chatworkRoomId?: string;
  notifyOnQna?: boolean;
  notifyOnCr?: boolean;
};

/* ─── empty defaults ─── */

export const emptyForm: ProjectSettingInput = {
  name: "",
  customer_name: "",
  customer_email: "",
  brse_name: "",
  pm_name: "",
  timezone: "Asia/Tokyo",
  language: "vi",
  customer_style: "",
  report_rule: "",
  timezone_rule: "",
  communication_notes: "",
  current_phase: "",
  health_status: "Green",
  next_milestone_date: "",
  stakeholders_json: "[]",
  integrations_json: "{}",
};

export const emptyStakeholder: ProjectStakeholder = {
  role: "",
  name: "",
  email: "",
  chatId: "",
};

export const emptyIntegrations: ProjectIntegrations = {
  jiraUrl: "",
  redmineUrl: "",
  googleDriveUrl: "",
  confluenceUrl: "",
  slackWebhookUrl: "",
  chatworkToken: "",
  chatworkRoomId: "",
  notifyOnQna: false,
  notifyOnCr: false,
};

/* ─── parsers ─── */

export function parseStakeholders(value?: string): ProjectStakeholder[] {
  try {
    const parsed = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        role: typeof item.role === "string" ? item.role : "",
        name: typeof item.name === "string" ? item.name : "",
        email: typeof item.email === "string" ? item.email : "",
        chatId:
          typeof item.chatId === "string"
            ? item.chatId
            : typeof item.chat_id === "string"
            ? item.chat_id
            : "",
      }))
      .filter((item) => item.role || item.name || item.email || item.chatId);
  } catch {
    return [];
  }
}

export function parseIntegrations(value?: string): ProjectIntegrations {
  try {
    const parsed = value ? JSON.parse(value) : {};
    if (!parsed || typeof parsed !== "object") return emptyIntegrations;
    return {
      jiraUrl:
        typeof parsed.jiraUrl === "string"
          ? parsed.jiraUrl
          : typeof parsed.jira === "string"
          ? parsed.jira
          : "",
      redmineUrl:
        typeof parsed.redmineUrl === "string"
          ? parsed.redmineUrl
          : typeof parsed.redmine === "string"
          ? parsed.redmine
          : "",
      googleDriveUrl:
        typeof parsed.googleDriveUrl === "string"
          ? parsed.googleDriveUrl
          : typeof parsed.google_drive === "string"
          ? parsed.google_drive
          : "",
      confluenceUrl:
        typeof parsed.confluenceUrl === "string"
          ? parsed.confluenceUrl
          : typeof parsed.confluence === "string"
          ? parsed.confluence
          : "",
      slackWebhookUrl:
        typeof parsed.slackWebhookUrl === "string"
          ? parsed.slackWebhookUrl
          : "",
      chatworkToken:
        typeof parsed.chatworkToken === "string"
          ? parsed.chatworkToken
          : "",
      chatworkRoomId:
        typeof parsed.chatworkRoomId === "string"
          ? parsed.chatworkRoomId
          : "",
      notifyOnQna:
        typeof parsed.notifyOnQna === "boolean" ? parsed.notifyOnQna : false,
      notifyOnCr:
        typeof parsed.notifyOnCr === "boolean" ? parsed.notifyOnCr : false,
    };
  } catch {
    return emptyIntegrations;
  }
}

export function countIntegrations(value?: string): number {
  return Object.values(parseIntegrations(value)).filter(Boolean).length;
}
