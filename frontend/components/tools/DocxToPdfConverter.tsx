"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileType,
} from "lucide-react";
import { apiBaseUrl } from "@/lib/config";
import { useUiLanguage } from "@/components/LanguageProvider";

export function DocxToPdfConverter() {
  const { t } = useUiLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedBlobUrl, setConvertedBlobUrl] = useState<string | null>(null);
  const [convertedFilename, setConvertedFilename] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(file: File) {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setErrorMsg(t("tools.errSelectDocx"));
      setSelectedFile(null);
      return;
    }
    setErrorMsg(null);
    setConvertedBlobUrl(null);
    setSelectedFile(file);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  async function handleConvert() {
    if (!selectedFile) return;

    setIsConverting(true);
    setErrorMsg(null);
    setConvertedBlobUrl(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const endpoint = `${apiBaseUrl}/power-tools/convert-docx-to-pdf`;
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errDetail = `${t("tools.serverError")} (${response.status})`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const contentType = response.headers.get("content-type") || "";
      const contentDisposition = response.headers.get("content-disposition") || "";
      let outputName = selectedFile.name.replace(/\.docx$/i, ".pdf");

      if (contentDisposition) {
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        const regularMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (utf8Match && utf8Match[1]) {
          outputName = decodeURIComponent(utf8Match[1]);
        } else if (regularMatch && regularMatch[1]) {
          outputName = regularMatch[1];
        }
      }

      if (contentType.includes("text/html") && !outputName.endsWith(".html")) {
        outputName = outputName.replace(/\.pdf$/i, ".html");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setConvertedBlobUrl(url);
      setConvertedFilename(outputName);

      // Trigger auto download
      const a = document.createElement("a");
      a.href = url;
      a.download = outputName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("tools.errConvertFailed");
      setErrorMsg(message);
    } finally {
      setIsConverting(false);
    }
  }

  function resetState() {
    if (convertedBlobUrl) {
      URL.revokeObjectURL(convertedBlobUrl);
    }
    setSelectedFile(null);
    setConvertedBlobUrl(null);
    setConvertedFilename("");
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <section className="brse-section space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <FileType className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">{t("tools.docxToPdfTitle")}</h2>
            <p className="text-xs text-textMuted">
              {t("tools.docxToPdfSubtitle")}
            </p>
          </div>
        </div>

        {selectedFile && (
          <button
            onClick={resetState}
            className="brse-button text-xs text-textMuted hover:text-ink"
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("tools.selectAnotherFile")}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onInputChange}
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />

      {/* Dropzone */}
      {!selectedFile && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-cardMuted"
          }`}
        >
          <div className="rounded-full bg-primary/15 p-3 text-primary mb-3">
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-ink">
            {t("tools.dropzonePrompt")}
          </p>
          <p className="mt-1 text-xs text-textMuted">
            {t("tools.dropzoneHelp")}
          </p>
        </div>
      )}

      {/* Selected File Details & Conversion Action */}
      {selectedFile && (
        <div className="brse-card space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan/15 p-2.5 text-cyan">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">{selectedFile.name}</p>
                <p className="text-xs text-textMuted">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Microsoft Word Document
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleConvert}
                disabled={isConverting}
                className="brse-button brse-button-primary px-4 py-2 text-sm font-bold"
                type="button"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("tools.convertingPdf")}
                  </>
                ) : (
                  <>
                    <FileType className="h-4 w-4" />
                    {t("tools.convertToPdfNow")}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Success Result */}
          {convertedBlobUrl && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-matcha/30 bg-matcha/10 p-3.5 text-matcha">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">{t("tools.convertSuccess")}</p>
                  <p className="text-xs opacity-90">{t("tools.fileReady")}{convertedFilename}</p>
                </div>
              </div>
              <a
                href={convertedBlobUrl}
                download={convertedFilename}
                className="brse-button bg-matcha text-slate-900 font-bold hover:bg-matcha/90 px-3 py-1.5 text-xs flex items-center gap-1.5 shadow"
              >
                <Download className="h-3.5 w-3.5" />
                {t("tools.redownloadPdf")}
              </a>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-lg border border-vermilion/30 bg-vermilion/10 p-3 text-vermilion">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-xs font-semibold">{errorMsg}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
