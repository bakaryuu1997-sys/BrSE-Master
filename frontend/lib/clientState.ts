import { z } from "zod";
import { apiRequest } from "@/lib/api-client";

const clientStateResponseSchema = z
  .object({
    key: z.string(),
    value: z.string().nullable().optional(),
  })
  .passthrough();

export async function fetchClientStateValue(key: string): Promise<string> {
  try {
    const data = await apiRequest<unknown>(`/client-state/entry/${encodeURIComponent(key)}`);
    const parsed = clientStateResponseSchema.parse(data);
    return typeof parsed.value === "string" ? parsed.value : "";
  } catch (err) {
    console.error(`Failed to fetch client state for key ${key}:`, err);
    return "";
  }
}

export async function saveClientStateValue(key: string, value: string): Promise<void> {
  await apiRequest<void>(`/client-state/entry/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: { key, value },
  });
}
