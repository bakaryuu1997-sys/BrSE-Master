"use strict";

import { MESSAGE_TYPES } from "../shared/messageTypes.js";
import { escapeHtml } from "../shared/sanitizer.js";

const WRITE_PROMPTS = {
  email: "Write a polite Japanese email to a customer about: ",
  report: "Create a concise daily report from these bullet points: ",
  spec: "Summarize this specification for a BrSE: ",
  qa: "Draft Q&A questions for the customer based on: ",
};

export function initWriteComposer({ formatChatMessage } = {}) {
  const writeInput = document.querySelector("#write-input");
  const btnGenerateWrite = document.querySelector("#btn-generate-write");
  const writeResult = document.querySelector("#write-result");
  const templateButtons = document.querySelectorAll(".tmpl-btn");

  // The Write tab has its own result box. The AI response streams back through
  // the global BRSE_AI_STREAM_CHUNK channel, so sidepanel.js routes chunks here
  // (instead of the chat controller) while a write generation is in flight.
  // Without this the result box stayed stuck on the pending text and the output
  // leaked into the chat tab's last message (or was dropped entirely).
  let generating = false;

  templateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!writeInput) return;
      writeInput.value = WRITE_PROMPTS[button.dataset.type] || "";
      writeInput.focus();
    });
  });

  function handleStreamChunk(message) {
    if (!writeResult) return;

    if (message.error) {
      writeResult.classList.remove("hidden");
      writeResult.innerHTML = `<span style="color: var(--brse-error);">❌ Lỗi: ${escapeHtml(message.error)}</span>`;
      delete writeResult.dataset.pending;
      generating = false;
      return;
    }

    if (message.text) {
      if (writeResult.dataset.pending === "true") {
        writeResult.innerText = "";
        delete writeResult.dataset.pending;
      }
      writeResult.innerText += message.text;
    }

    if (message.done) {
      delete writeResult.dataset.pending;
      if (typeof formatChatMessage === "function") formatChatMessage(writeResult);
      generating = false;
    }
  }

  if (btnGenerateWrite) {
    btnGenerateWrite.addEventListener("click", () => {
      const text = writeInput?.value.trim();
      if (!text || !writeResult) return;

      writeResult.classList.remove("hidden");
      writeResult.innerText = "Đang soạn thảo nội dung chuyên nghiệp...";
      writeResult.dataset.pending = "true";
      generating = true;
      const tone = document.querySelector("#write-tone")?.value || "polite";
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.BRSE_AI_REQUEST,
        action: "rewrite",
        text: `Tone: ${tone}\nContent: ${text}`,
      });
    });
  }

  return {
    isGenerating: () => generating,
    handleStreamChunk,
  };
}
