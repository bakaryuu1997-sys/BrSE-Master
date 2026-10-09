import { z } from "zod";
import { apiRequest } from "@/lib/api-client";

const deepHealthSchema = z
  .object({
    status: z.string().optional(),
    warnings: z.array(z.string()).optional(),
  })
  .passthrough();

export type DeepHealth = z.infer<typeof deepHealthSchema>;

export async function fetchDeepHealth(signal?: AbortSignal) {
  const data = await apiRequest<unknown>("/health/deep", {
    signal,
    cache: "no-store",
  });
  return deepHealthSchema.parse(data);
}
