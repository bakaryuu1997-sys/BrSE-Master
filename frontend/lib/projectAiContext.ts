import { getProjectMemorySummary, type ProjectSetting } from "@/lib/projectSettings";

export type ProjectAiContextPayload = {
  project_id?: string;
  customer_style?: string;
  report_rule?: string;
  timezone_rule?: string;
  communication_notes?: string;
  project_context?: string;
};

export function buildProjectAiContext(project: ProjectSetting | null): string {
  const memory = getProjectMemorySummary(project);
  const lines = [
    project?.name ? `Project: ${project.name}` : "",
    project?.customer_name ? `Customer: ${project.customer_name}` : "",
    memory.currentPhase ? `Current phase: ${memory.currentPhase}` : "",
    memory.healthStatus ? `Health: ${memory.healthStatus}` : "",
    memory.nextMilestoneDate ? `Next milestone: ${memory.nextMilestoneDate}` : "",
    memory.customerStyle ? `Customer style: ${memory.customerStyle}` : "",
    memory.reportRule ? `Report rule: ${memory.reportRule}` : "",
    memory.timezoneRule ? `Timezone rule: ${memory.timezoneRule}` : "",
    memory.communicationNotes ? `Communication notes: ${memory.communicationNotes}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}

export function buildProjectAiPayload(project: ProjectSetting | null): ProjectAiContextPayload {
  const memory = getProjectMemorySummary(project);
  const context = buildProjectAiContext(project);

  return {
    project_id: project?.id || undefined,
    customer_style: memory.customerStyle || undefined,
    report_rule: memory.reportRule || undefined,
    timezone_rule: memory.timezoneRule || undefined,
    communication_notes: memory.communicationNotes || undefined,
    project_context: context || undefined,
  };
}
