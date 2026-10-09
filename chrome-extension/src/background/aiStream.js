"use strict";

import { MESSAGE_TYPES } from "../shared/messageTypes.js";
import { DEFAULT_EXTENSION_MODEL } from "../shared/modelConfig.js";
import { setBackendModel } from "./modelSync.js";
import { safeSendTabMessage } from "./tabMessaging.js";

let activeReader = null;

export async function parseAndStreamResponse(response, sender, message, meta = {}) {
  const reader = response.body.getReader();
  activeReader = reader;
  const decoder = new TextDecoder();
  let fullText = "";
  const startedAt = Date.now();
  const streamMeta = { model: meta.model || "", provider: meta.provider || "local", startedAt };

  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, status: "started", ...streamMeta });
  if (message.quick && sender.tab?.id) {
    safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, status: "started", ...streamMeta });
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const dataStr = line.slice(6).trim();
        if (dataStr === "[DONE]") {
          const elapsedMs = Date.now() - startedAt;
          chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, done: true, status: "done", elapsedMs, ...streamMeta });
          if (message.quick && sender.tab?.id) {
            safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, done: true, status: "done", elapsedMs, ...streamMeta });
          }
          return;
        }

        try {
          const data = JSON.parse(dataStr);
          if (data.error) {
            const errorText = `❌ AI runtime error (${streamMeta.model || "unknown model"}): ${data.error}`;
            if (message.quick && sender.tab?.id) {
              safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_QUICK_AI_RESULT, text: errorText });
              safeSendTabMessage(sender.tab.id, {
                type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK,
                done: true,
                error: data.error,
                status: "error",
                ...streamMeta,
              });
            }
            chrome.runtime.sendMessage({
              type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK,
              done: true,
              error: data.error,
              status: "error",
              ...streamMeta,
            });
            return;
          }

          const text = data.text || data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text) {
            fullText += text;
            if (message.quick && sender.tab?.id) {
              safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_QUICK_AI_RESULT, text: fullText });
              safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, text, fullText, done: false, status: "streaming", ...streamMeta });
            }
            chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, text, fullText, done: false, status: "streaming", ...streamMeta });
          }
        } catch (error) {
          console.warn("[Background] Ignored malformed AI stream chunk:", error.message);
        }
      }
    }
  } catch (err) {
    console.log("[Background] Stream read aborted or failed:", err.message);
  } finally {
    activeReader = null;
  }

  const elapsedMs = Date.now() - startedAt;
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, done: true, status: "done", elapsedMs, ...streamMeta });
  if (message.quick && sender.tab?.id) {
    safeSendTabMessage(sender.tab.id, { type: MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK, done: true, status: "done", elapsedMs, ...streamMeta });
  }
}

export function stopActiveAiStream() {
  if (!activeReader) return false;
  try {
    activeReader.cancel().catch(() => {});
  } catch (error) {
    console.warn("[Background] Failed to cancel active AI stream:", error.message);
  }
  activeReader = null;
  return true;
}

export function isUnauthorizedAiError(error) {
  return /\b(401|403)\b/.test(String(error?.message || ""));
}

export function shouldFallbackRuntimeStatus(status) {
  if (!status || status.runtime_checked !== true) return false;
  if (status.runtime_reachable === false) return true;
  if (typeof status.runtime_status_code === "number" && status.runtime_status_code >= 400) return true;
  if (status.provider === "ollama" && status.runtime_model_available === false) return true;
  return false;
}

export async function ensureRuntimeReadyModel(apiBase, headers, activeModel) {
  const response = await fetch(`${apiBase}/ai/status?check_runtime=true`, { headers });
  if (!response.ok) return activeModel;
  const status = await response.json().catch(() => ({}));
  if (activeModel !== DEFAULT_EXTENSION_MODEL && shouldFallbackRuntimeStatus(status)) {
    console.warn(`[Background] Runtime is not ready for ${activeModel}. Switching to ${DEFAULT_EXTENSION_MODEL}.`);
    await setBackendModel(DEFAULT_EXTENSION_MODEL);
    return DEFAULT_EXTENSION_MODEL;
  }
  return activeModel;
}

export async function fetchAiStream(apiBase, headers, input, message) {
  // Time-to-first-response budget. Local Ollama cold-start (loading a 7B model on
  // CPU) and the free 9router lanes can take well over 14s for the first token,
  // which made page-summary feel broken. 30s gives slow runtimes room; the wider
  // 45s covers chat. The stream itself is not cut once headers arrive.
  const timeoutMs = message.action === "summary" ? 30000 : 45000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBase}/ai/chat/stream`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({ message: input, project_id: message.projectId }),
    });
    if (!response.ok) throw new Error(`Backend AI (${response.status})`);
    return response;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`AI response timed out after ${(timeoutMs / 1000).toFixed(0)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
