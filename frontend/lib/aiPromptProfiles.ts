import { apiBaseUrl } from "@/lib/config";

export type AiPromptUseCase = "keigo" | "report" | "minutes" | "chat" | "requirements" | "knowledge";

export type AiPromptProfile = {
  id: string;
  name: string;
  use_case: AiPromptUseCase;
  system_prompt: string;
  project_id: string;
  customer_name: string;
  notes: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type AiPromptProfileInput = {
  name: string;
  use_case: AiPromptUseCase;
  system_prompt: string;
  project_id: string;
  customer_name: string;
  notes: string;
  is_default: boolean;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail || "AI prompt profile request failed.");
  }
  return response.json() as Promise<T>;
}

export function getAiPromptProfiles(params: { useCase?: string; projectId?: string } = {}) {
  const query = new URLSearchParams();
  if (params.useCase) query.set("use_case", params.useCase);
  if (params.projectId !== undefined) query.set("project_id", params.projectId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson<AiPromptProfile[]>(`/ai/prompt-profiles${suffix}`);
}

export function saveAiPromptProfile(input: AiPromptProfileInput, existingId?: string) {
  return requestJson<AiPromptProfile>(`/ai/prompt-profiles${existingId ? `/${encodeURIComponent(existingId)}` : ""}`, {
    method: existingId ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function deleteAiPromptProfile(profileId: string) {
  return requestJson<{ message: string }>(`/ai/prompt-profiles/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
  });
}

export function resolveAiPromptProfile(params: { useCase: AiPromptUseCase; projectId?: string; promptProfileId?: string }) {
  const query = new URLSearchParams({ use_case: params.useCase });
  if (params.projectId) query.set("project_id", params.projectId);
  if (params.promptProfileId) query.set("prompt_profile_id", params.promptProfileId);
  return requestJson<AiPromptProfile>(`/ai/prompt-profiles/resolve?${query.toString()}`);
}
