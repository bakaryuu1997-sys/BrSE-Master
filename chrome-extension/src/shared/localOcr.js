"use strict";

/**
 * Local (in-browser) OCR via tesseract.js. Lazy-imported so the worker + wasm
 * + language data only load when offline OCR is actually used. Shared by the
 * content-script screen capture (OCR.js) and the sidepanel OCR tool (ocrTool.js)
 * so both have the same offline extraction path.
 */
export async function extractTextWithTesseract(imageDataUrl, langs = "jpn+eng") {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(langs);
  try {
    const { data } = await worker.recognize(imageDataUrl);
    return String(data?.text || "").trim();
  } finally {
    await worker.terminate();
  }
}
