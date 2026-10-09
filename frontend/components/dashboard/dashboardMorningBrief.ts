export type MorningBriefItem = {
  kind: string;
  title: string;
  helper?: string;
};

export type MorningBriefSchedule = {
  title: string;
  time?: string;
};

export type DashboardMorningBriefInput = {
  projectName?: string;
  projectContext?: string;
  focus?: MorningBriefItem | null;
  priorityItems: MorningBriefItem[];
  todaySchedules: MorningBriefSchedule[];
  counts: {
    todoRisks: number;
    waitingQna: number;
    pendingCr: number;
    overdueOperations: number;
    meetingFollowUps: number;
  };
};

export type DashboardMorningBriefFallbackLabels = {
  todoRisk: string;
  qnaWaiting: string;
  crPending: string;
  overdueOperation: string;
  meetingFollowUp: string;
  focusLabel: string;
  riskLabel: string;
  calendarLabel: string;
  noHotspot: string;
  noVisibleRisk: string;
  noFixedSchedule: string;
};

function formatItems(items: MorningBriefItem[], emptyText: string) {
  return items.length
    ? items.map((item, index) => `${index + 1}. [${item.kind}] ${item.title}${item.helper ? ` (${item.helper})` : ""}`).join("\n")
    : emptyText;
}

function formatSchedules(schedules: MorningBriefSchedule[]) {
  return schedules.length
    ? schedules.map((schedule, index) => `${index + 1}. ${schedule.time ? `${schedule.time} ` : ""}${schedule.title}`).join("\n")
    : "No fixed schedule today.";
}

export function buildDashboardMorningBriefPrompt(input: DashboardMorningBriefInput) {
  return [
    "Create a concise BrSE morning brief in Vietnamese with customer-facing Japanese phrases only when useful.",
    "Structure: 1) Focus now, 2) Risks/Blockers, 3) Communication plan, 4) Calendar notes.",
    "Keep it practical and under 180 words.",
    "",
    "Project context:",
    input.projectContext || `Project: ${input.projectName || "Current project"}`,
    "",
    "Cockpit counts:",
    `- Todo risks: ${input.counts.todoRisks}`,
    `- Waiting Q&A: ${input.counts.waitingQna}`,
    `- Pending CR: ${input.counts.pendingCr}`,
    `- Overdue operations: ${input.counts.overdueOperations}`,
    `- Meeting follow-ups not synced: ${input.counts.meetingFollowUps}`,
    "",
    "Top focus:",
    input.focus ? `[${input.focus.kind}] ${input.focus.title}${input.focus.helper ? ` (${input.focus.helper})` : ""}` : "No hot item.",
    "",
    "Priority stack:",
    formatItems(input.priorityItems, "No priority stack."),
    "",
    "Today schedule:",
    formatSchedules(input.todaySchedules),
  ].join("\n");
}

export function buildFallbackMorningBrief(input: DashboardMorningBriefInput, labels: DashboardMorningBriefFallbackLabels) {
  const risks = [
    input.counts.todoRisks ? `${input.counts.todoRisks} ${labels.todoRisk}` : "",
    input.counts.waitingQna ? `${input.counts.waitingQna} ${labels.qnaWaiting}` : "",
    input.counts.pendingCr ? `${input.counts.pendingCr} ${labels.crPending}` : "",
    input.counts.overdueOperations ? `${input.counts.overdueOperations} ${labels.overdueOperation}` : "",
    input.counts.meetingFollowUps ? `${input.counts.meetingFollowUps} ${labels.meetingFollowUp}` : "",
  ].filter(Boolean);

  return [
    `${labels.focusLabel}: ${input.focus?.title || labels.noHotspot}`,
    `${labels.riskLabel}: ${risks.length ? risks.join(", ") : labels.noVisibleRisk}`,
    `${labels.calendarLabel}: ${input.todaySchedules.length ? formatSchedules(input.todaySchedules) : labels.noFixedSchedule}`,
  ].join("\n");
}
