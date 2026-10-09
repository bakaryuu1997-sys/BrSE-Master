"use strict";

import { MESSAGE_TYPES } from "../shared/messageTypes.js";
import { buildGlossaryTermsFromOcr, buildOriginalOcrText, buildTranslatedText } from "../shared/ocrLayout.js";
import { extractTextWithTesseract } from "../shared/localOcr.js";
import { fillMissingTranslations, needsTranslationFill } from "../shared/ocrTranslate.js";

const OCR_HISTORY_KEY = "brse.ocrHistory";
const OCR_HISTORY_MAX = 8;

export function initOcrTool() {
  const toolsMenu = document.querySelector("#tools-menu-list");
  const ocrView = document.querySelector("#ocr-translate-view");
  const toolOcrCard = document.querySelector("#tool-ocr-translate");
  const btnOcrBack = document.querySelector("#btn-ocr-back");
  const btnStartOcr = document.querySelector("#btn-start-ocr");
  const btnUpload = document.querySelector("#btn-ocr-upload");
  const fileInput = document.querySelector("#ocr-file-input");
  const urlInput = document.querySelector("#ocr-url-input");
  const btnUrl = document.querySelector("#btn-ocr-url");
  const pasteZone = document.querySelector("#ocr-paste-zone");
  const statusMessage = document.querySelector("#ocr-status-message");
  const statusText = document.querySelector("#ocr-status-text");
  const resultBox = document.querySelector("#ocr-result");
  const resultText = document.querySelector("#ocr-result-text");
  const engineBadge = document.querySelector("#ocr-engine-badge");
  const langTabs = document.querySelector("#ocr-lang-tabs");
  const btnCopy = document.querySelector("#btn-ocr-copy");
  const btnAsk = document.querySelector("#btn-ocr-ask");
  const btnGlossary = document.querySelector("#btn-ocr-glossary");
  const btnRetranslate = document.querySelector("#btn-ocr-retranslate");
  const historyBox = document.querySelector("#ocr-history");
  const historyList = document.querySelector("#ocr-history-list");

  let lastTranslations = [];
  let activeLang = "original";

  if (toolOcrCard && toolsMenu && ocrView) {
    toolOcrCard.addEventListener("click", () => {
      toolsMenu.classList.add("hidden");
      ocrView.classList.remove("hidden");
    });
  }
  if (btnOcrBack && toolsMenu && ocrView) {
    btnOcrBack.addEventListener("click", () => {
      ocrView.classList.add("hidden");
      toolsMenu.classList.remove("hidden");
    });
  }

  function setStatus(text) {
    if (!statusMessage || !statusText) return;
    statusText.innerText = text;
    statusMessage.classList.remove("hidden");
  }
  function hideStatus() {
    statusMessage?.classList.add("hidden");
  }

  function renderLang(lang) {
    if (!resultText) return;
    activeLang = lang;
    langTabs?.querySelectorAll(".ocr-lang-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.lang === lang);
    });
    resultText.textContent = lang === "original"
      ? buildOriginalOcrText(lastTranslations).text
      : buildTranslatedText(lastTranslations, lang);
  }

  function engineLabel(mode, translatedBy) {
    const base = mode === "tesseract"
      ? "Tesseract (offline)"
      : mode === "offline"
        ? "Dịch AI (văn bản)"
        : "Gemini Vision";
    return translatedBy === "google" ? `${base} · Google dịch` : base;
  }

  function showResult(translations, mode, opts = {}) {
    lastTranslations = Array.isArray(translations) ? translations : [];
    if (engineBadge) {
      engineBadge.textContent = engineLabel(mode, opts.translatedBy);
      engineBadge.classList.toggle("offline", mode !== "hybrid");
    }
    resultBox?.classList.remove("hidden");
    renderLang(activeLang || "original");
    if (!opts.skipHistory) saveHistory(lastTranslations, mode, opts.translatedBy);
  }

  function saveHistory(translations, mode, translatedBy) {
    if (!translations.length || !chrome.storage?.local) return;
    const preview = buildOriginalOcrText(translations).text.slice(0, 60).replace(/\n/g, " ");
    chrome.storage.local.get([OCR_HISTORY_KEY], (res) => {
      const prev = Array.isArray(res?.[OCR_HISTORY_KEY]) ? res[OCR_HISTORY_KEY] : [];
      const entry = { id: `ocr-${Date.now()}`, ts: Date.now(), mode, translatedBy, preview, translations };
      const next = [entry, ...prev].slice(0, OCR_HISTORY_MAX);
      chrome.storage.local.set({ [OCR_HISTORY_KEY]: next }, () => renderHistory(next));
    });
  }

  function renderHistory(entries) {
    if (!historyBox || !historyList) return;
    if (!entries.length) {
      historyBox.classList.add("hidden");
      return;
    }
    historyBox.classList.remove("hidden");
    historyList.replaceChildren();
    for (const entry of entries) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "ocr-history-item";
      item.textContent = entry.preview || "(trống)";
      item.title = `${entry.mode === "offline" ? "Tesseract" : "Gemini"} · bấm để xem lại`;
      item.addEventListener("click", () => showResult(entry.translations, entry.mode, { skipHistory: true, translatedBy: entry.translatedBy }));
      historyList.appendChild(item);
    }
  }

  function loadHistory() {
    if (!chrome.storage?.local) return;
    chrome.storage.local.get([OCR_HISTORY_KEY], (res) => {
      renderHistory(Array.isArray(res?.[OCR_HISTORY_KEY]) ? res[OCR_HISTORY_KEY] : []);
    });
  }

  function runOcr(payload, pendingText, opts = {}) {
    setStatus(pendingText);
    resultBox?.classList.add("hidden");
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_PERFORM_OCR, mode: "hybrid", ...payload }, (res) => {
      void handleOcrResponse(res, opts);
    });
  }

  async function handleOcrResponse(res, opts) {
    if (chrome.runtime.lastError || !res || res.success === false) {
      const backendError = chrome.runtime.lastError?.message || res?.error || "OCR thất bại";
      if (opts.fallbackImage) {
        await runLocalOcrFallback(opts.fallbackImage, backendError);
        return;
      }
      setStatus(`❌ Lỗi: ${backendError}`);
      return;
    }
    let translations = res.translations;
    let translatedBy = null;
    // Backend ran, but the AI may have left some target languages empty.
    if (needsTranslationFill(translations)) {
      setStatus("Đang bổ sung bản dịch bằng Google Translate...");
      translations = await fillMissingTranslations(translations);
      translatedBy = "google";
    }
    hideStatus();
    showResult(translations, res.mode, { translatedBy });
  }

  // Backend OCR unreachable: OCR locally with Tesseract, then translate via Google.
  async function runLocalOcrFallback(imageDataUrl, backendError) {
    try {
      setStatus("Backend lỗi — đang OCR offline bằng Tesseract...");
      const text = await extractTextWithTesseract(imageDataUrl);
      if (!text) throw new Error("Không trích xuất được chữ từ ảnh.");
      setStatus("Đã OCR xong — đang dịch bằng Google Translate...");
      const translations = await fillMissingTranslations([{
        text,
        source_language: "unknown",
        translation_ja: "",
        translation_vi: "",
        translation: "",
        translation_en: "",
        leftPercent: 0,
        topPercent: 0,
        wPercent: 100,
        hPercent: 100,
      }]);
      hideStatus();
      showResult(translations, "tesseract", { translatedBy: "google" });
    } catch (err) {
      setStatus(`❌ Lỗi backend: ${backendError}. Offline cũng thất bại: ${err.message}`);
    }
  }

  function ocrFromFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("⚠️ Vui lòng chọn một tệp ảnh.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => runOcr({ image: reader.result }, "Đang OCR ảnh đã tải lên...", { fallbackImage: reader.result });
    reader.onerror = () => setStatus("❌ Không đọc được tệp ảnh.");
    reader.readAsDataURL(file);
  }

  // Screen-region capture (existing flow, runs in the page content script).
  if (btnStartOcr) {
    btnStartOcr.addEventListener("click", () => {
      setStatus("Vui lòng kéo chuột quét vùng trên trang web...");
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_START_OCR_ON_ACTIVE_TAB }, (response) => {
        if (chrome.runtime.lastError || !response?.ok) {
          setStatus(`❌ Lỗi: ${chrome.runtime.lastError?.message || response?.error || "Cần mở một trang web để chụp."}`);
          return;
        }
        setStatus("Đang chọn vùng trên trang...");
      });
    });
  }

  if (btnUpload && fileInput) {
    btnUpload.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      if (fileInput.files?.[0]) ocrFromFile(fileInput.files[0]);
      fileInput.value = "";
    });
  }

  function submitUrl() {
    const url = (urlInput?.value || "").trim();
    if (!url) return;
    runOcr({ imageUrl: url }, "Đang tải & OCR ảnh từ link...");
  }
  btnUrl?.addEventListener("click", submitUrl);
  urlInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submitUrl(); }
  });

  if (pasteZone) {
    pasteZone.addEventListener("paste", (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          ocrFromFile(item.getAsFile());
          return;
        }
      }
    });
  }

  langTabs?.addEventListener("click", (e) => {
    const tab = e.target.closest(".ocr-lang-tab");
    if (tab) renderLang(tab.dataset.lang);
  });

  btnCopy?.addEventListener("click", () => {
    const text = resultText?.textContent || "";
    if (text) navigator.clipboard.writeText(text).then(() => setStatus("✓ Đã sao chép."));
  });

  // Re-run translation through the backend AI on the current OCR text. Useful
  // after a Google-fallback translation when the AI backend is back online.
  btnRetranslate?.addEventListener("click", () => {
    if (!lastTranslations.length) return;
    const text = buildOriginalOcrText(lastTranslations).text.trim();
    if (!text) {
      setStatus("⚠️ Không có văn bản gốc để dịch lại.");
      return;
    }
    setStatus("Đang dịch lại bằng AI backend...");
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.BRSE_PERFORM_OCR, mode: "offline", text },
      (res) => {
        if (chrome.runtime.lastError || !res || res.success === false || !Array.isArray(res.translations)) {
          setStatus(`❌ Dịch lại thất bại: ${chrome.runtime.lastError?.message || res?.error || "backend không phản hồi"}`);
          return;
        }
        hideStatus();
        showResult(res.translations, "offline");
      },
    );
  });

  // Lot C — load the OCR content into the chat tab to discuss with the AI.
  btnAsk?.addEventListener("click", () => {
    if (!lastTranslations.length) return;
    const original = buildOriginalOcrText(lastTranslations).text;
    const vi = buildTranslatedText(lastTranslations, "vi");
    const contextText = `Đây là nội dung trích từ ảnh (OCR):\n\n--- Bản gốc ---\n${original}\n\n--- Dịch (VI) ---\n${vi}\n\nHãy giúp tôi: `;

    document.querySelector('.tab-btn[data-tab="chat"]')?.click();
    const chatInput = document.querySelector("#chat-input");
    if (chatInput) {
      chatInput.value = contextText;
      chatInput.dispatchEvent(new Event("input", { bubbles: true }));
      chatInput.focus();
      chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
    }
  });

  // Lot D — save detected Japanese terms to the glossary.
  btnGlossary?.addEventListener("click", () => {
    const terms = buildGlossaryTermsFromOcr(lastTranslations);
    if (!terms.length) {
      setStatus("⚠️ Không tìm thấy thuật ngữ tiếng Nhật để lưu.");
      return;
    }
    setStatus(`Đang lưu ${terms.length} thuật ngữ vào Glossary...`);
    let done = 0;
    let ok = 0;
    terms.forEach((term) => {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_ADD_GLOSSARY_TERM, term }, (res) => {
        done += 1;
        if (res && res.ok) ok += 1;
        if (done === terms.length) {
          setStatus(
            ok === terms.length
              ? `✓ Đã lưu ${ok}/${terms.length} thuật ngữ vào Glossary.`
              : ok === 0
                ? `❌ Không lưu được thuật ngữ nào vào Glossary (0/${terms.length}).`
                : `⚠️ Đã lưu ${ok}/${terms.length} thuật ngữ (một số bị lỗi).`,
          );
        }
      });
    });
  });

  loadHistory();

  // Screen-capture path still notifies completion from the content script.
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== MESSAGE_TYPES.BRSE_OCR_COMPLETE) return;
    if (Array.isArray(message.translations) && message.translations.length) {
      hideStatus();
      showResult(message.translations, message.mode || "hybrid");
    } else {
      setStatus("✓ Đã dịch đè lên giao diện trang!");
      setTimeout(hideStatus, 3000);
    }
  });
}
