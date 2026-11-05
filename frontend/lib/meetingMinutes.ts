import { apiBaseUrl } from "./config";

export type MeetingMinutesAiContext = {
  projectId?: string;
  promptProfileId?: string;
  customerStyle?: string;
  reportRule?: string;
  timezoneRule?: string;
  communicationNotes?: string;
  projectContext?: string;
};

export interface MeetingMinutesRecord {
  id: string;
  project_id: string;
  title: string;
  meeting_date: string;
  location?: string;
  status: string;
  template?: string;
  language?: string;
  attendees?: string[];
  agenda_items?: any[];
  action_items?: any[];
  body_markdown?: string;
  created_at?: string;
}

export async function getMeetingMinutesList(projectId: string, limit: number = 20) {
  const response = await fetch(`${apiBaseUrl}/meeting-minutes?project_id=${encodeURIComponent(projectId)}&limit=${limit}`);
  if (!response.ok) throw new Error("Failed to fetch meeting minutes list");
  return response.json() as Promise<Array<{ id: string; title: string; meeting_date: string }>>;
}

export async function getMeetingMinutes(id: string) {
  const response = await fetch(`${apiBaseUrl}/meeting-minutes/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("Failed to fetch meeting minutes");
  return response.json() as Promise<MeetingMinutesRecord>;
}

export async function createMeetingMinutes(payload: Partial<MeetingMinutesRecord>) {
  const response = await fetch(`${apiBaseUrl}/meeting-minutes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to save meeting minutes");
  return response.json() as Promise<MeetingMinutesRecord>;
}

export async function updateMeetingMinutes(id: string, payload: Partial<MeetingMinutesRecord>) {
  const response = await fetch(`${apiBaseUrl}/meeting-minutes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to update meeting minutes");
  return response.json() as Promise<MeetingMinutesRecord>;
}

function buildMeetingMinutesAiFields(context?: MeetingMinutesAiContext) {
  return {
    project_id: context?.projectId || undefined,
    prompt_profile_id: context?.promptProfileId || undefined,
    customer_style: context?.customerStyle || undefined,
    report_rule: context?.reportRule || undefined,
    timezone_rule: context?.timezoneRule || undefined,
    communication_notes: context?.communicationNotes || undefined,
    project_context: context?.projectContext || undefined,
  };
}

export async function extractMinutesFromTranscript(transcript: string, context?: MeetingMinutesAiContext) {
  const response = await fetch(`${apiBaseUrl}/ai/minutes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
      ...buildMeetingMinutesAiFields(context),
    }),
  });
  if (!response.ok) throw new Error("AI minutes extraction failed");
  return response.json();
}
