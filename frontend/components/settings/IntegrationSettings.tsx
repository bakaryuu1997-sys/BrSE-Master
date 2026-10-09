"use client";

import React from "react";

interface ProjectIntegrations {
  jiraUrl: string;
  redmineUrl: string;
  googleDriveUrl: string;
  confluenceUrl: string;
}

interface IntegrationSettingsProps {
  integrations: ProjectIntegrations;
  updateIntegration: (key: keyof ProjectIntegrations, value: string) => void;
}

export function IntegrationSettings({
  integrations,
  updateIntegration
}: IntegrationSettingsProps) {
  return (
    <section className="brse-card brse-card-muted p-4">
      <p className="text-sm font-semibold text-ink">Project integrations</p>
      <p className="mt-1 text-xs leading-5 text-textMuted">
        Metadata trước mắt; các flow AI/slide/report sẽ dùng link này ở các bước sau.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={integrations.jiraUrl}
          onChange={(event) => updateIntegration("jiraUrl", event.target.value)}
          className="field-control px-3 py-2 text-sm"
          placeholder="Jira project URL"
        />
        <input
          value={integrations.redmineUrl}
          onChange={(event) => updateIntegration("redmineUrl", event.target.value)}
          className="field-control px-3 py-2 text-sm"
          placeholder="Redmine project URL"
        />
        <input
          value={integrations.googleDriveUrl}
          onChange={(event) => updateIntegration("googleDriveUrl", event.target.value)}
          className="field-control px-3 py-2 text-sm"
          placeholder="Google Drive root folder"
        />
        <input
          value={integrations.confluenceUrl}
          onChange={(event) => updateIntegration("confluenceUrl", event.target.value)}
          className="field-control px-3 py-2 text-sm"
          placeholder="Confluence root URL"
        />
      </div>
    </section>
  );
}
