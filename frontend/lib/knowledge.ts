import { apiBaseUrl } from "@/lib/config";

export interface KnowledgeItem {
  id: number;
  title: string;
  content: string;
  category: string;
  project_id: string;
  created_at: string;
}

export type SaveKnowledgeInput = {
  title: string;
  content: string;
  category: string;
  projectId: string;
  id?: number;
};

export async function listKnowledge(projectId?: string): Promise<KnowledgeItem[]> {
  const url = projectId ? `${apiBaseUrl}/knowledge/?project_id=${projectId}` : `${apiBaseUrl}/knowledge/`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load knowledge.");
  }
  return response.json() as Promise<KnowledgeItem[]>;
}

export async function saveKnowledgeItem(input: SaveKnowledgeInput): Promise<void> {
  const response = await fetch(input.id ? `${apiBaseUrl}/knowledge/${input.id}` : `${apiBaseUrl}/knowledge/`, {
    method: input.id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      category: input.category,
      project_id: input.projectId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save knowledge.");
  }
}

export async function deleteKnowledgeItem(id: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/knowledge/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete knowledge.");
  }
}

export async function searchKnowledge(query: string, projectId?: string): Promise<KnowledgeItem[]> {
  const response = await fetch(
    `${apiBaseUrl}/knowledge/search?q=${encodeURIComponent(query)}&project_id=${projectId || ""}`,
  );
  if (!response.ok) {
    throw new Error("Search failed.");
  }
  return response.json() as Promise<KnowledgeItem[]>;
}

export async function askKnowledge(question: string, projectId?: string | null): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/ai/ask-knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      project_id: projectId || null,
    }),
  });

  if (!response.ok) {
    throw new Error("AI Q&A failed.");
  }

  const data = (await response.json()) as { answer?: string };
  return data.answer || "";
}