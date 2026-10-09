import { normalizeApiBaseUrl } from "./api.js";

export { normalizeApiBaseUrl };

export function redactRuntimeStatusMessage(value) {
  return String(value || "")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\b(api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^"',\s}]+/gi, "$1=[REDACTED]")
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, "data:image/[REDACTED]");
}

export async function checkRuntimeStatus(apiBaseUrl, secretToken = "") {
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl).replace(/\/$/, "");
  const headers = {};
  if (secretToken) headers["X-BrSE-Token"] = secretToken;

  const response = await fetch(`${baseUrl}/ai/status?check_runtime=true`, {
    headers,
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Backend HTTP ${response.status}`);
  }

  const data = await response.json().catch(() => ({}));
  if (data.runtime_reachable === false) {
    return {
      ok: false,
      message: redactRuntimeStatusMessage(data.runtime_error || "AI runtime chưa reachable"),
    };
  }
  if (typeof data.runtime_status_code === "number" && data.runtime_status_code >= 400) {
    return {
      ok: false,
      message: `AI runtime HTTP ${data.runtime_status_code}`,
    };
  }

  return {
    ok: true,
    message: data.model ? `AI OK: ${data.model}` : "Backend/AI OK",
  };
}
