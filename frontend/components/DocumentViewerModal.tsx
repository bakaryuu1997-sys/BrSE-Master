"use client";

import { useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  X,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentViewerModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

export function DocumentViewerModal({
  open,
  onClose,
  url,
  title,
}: DocumentViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!open || !url) return null;

  const normalizedUrl =
    url.startsWith("http") || url.startsWith("/") ? url : `https://${url}`;
  const filename = title || url.split("/").pop() || "Tài liệu";

  const isImg = /\.(png|jpg|jpeg|webp|gif|svg)($|\?)/i.test(url);
  const isPdf = /\.pdf($|\?)/i.test(url);
  const isExcel = /\.(xlsx|xls|csv)($|\?)/i.test(url);
  const isWord = /\.(docx|doc)($|\?)/i.test(url);
  const isHtml = /\.(html|htm)($|\?)/i.test(url);

  return (
    <ModalPortal isOpen={open}>
      <div
        className="fixed inset-0 z-[360] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className={cn(
            "relative my-auto flex flex-col rounded-2xl border border-[var(--brse-panel-border)] bg-[linear-gradient(180deg,rgba(20,21,26,0.98),rgba(14,15,18,0.99))] shadow-2xl backdrop-blur-2xl transition-all duration-300 overflow-hidden",
            isFullscreen
              ? "h-[98vh] w-[98vw]"
              : "h-[88vh] w-full max-w-5xl"
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--brse-panel-border)] px-4 py-3 bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
              {isImg ? (
                <ImageIcon className="h-4 w-4" />
              ) : isPdf ? (
                <FileText className="h-4 w-4 text-vermilion" />
              ) : isExcel ? (
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              ) : isWord ? (
                <FileText className="h-4 w-4 text-cyan-400" />
              ) : isHtml ? (
                <FileCode className="h-4 w-4 text-amber-400" />
              ) : (
                <File className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-textPrimary truncate max-w-sm sm:max-w-md md:max-w-xl" title={filename}>
                {filename}
              </h3>
              <p className="text-[10px] text-textMuted truncate max-w-xs sm:max-w-md">
                {url}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={normalizedUrl}
              download={filename}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--brse-panel-border)] bg-background/60 px-2.5 text-xs font-semibold text-textPrimary hover:border-primary/40 hover:text-primary transition"
              title="Tải tệp này về máy tính"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </a>
            <a
              href={normalizedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-primary/35 bg-primary/15 px-2.5 text-xs font-semibold text-primary hover:bg-primary/25 transition"
              title="Mở trong tab trình duyệt mới"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tab mới</span>
            </a>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-textMuted hover:bg-white/[0.08] hover:text-textPrimary transition"
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-textMuted hover:bg-white/[0.08] hover:text-textPrimary transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-3 flex items-center justify-center bg-black/40">
          {isImg ? (
            <div className="flex h-full w-full items-center justify-center">
              <img
                src={normalizedUrl}
                alt={filename}
                className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
              />
            </div>
          ) : isPdf || isHtml ? (
            <iframe
              src={normalizedUrl}
              title={filename}
              className="h-full w-full rounded-lg border border-white/10 bg-white"
            />
          ) : isExcel ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-textPrimary mb-1">
                  Bảng tính Excel / CSV
                </h4>
                <p className="text-xs text-textMuted leading-relaxed">
                  Tài liệu: <strong>{filename}</strong>. Bạn có thể mở trực tiếp bằng Microsoft Excel, Google Sheets hoặc phần mềm bảng tính trên máy tính.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <a
                  href={normalizedUrl}
                  download={filename}
                  className="brse-button brse-button-primary h-9 gap-1.5 px-4 text-xs font-bold"
                >
                  <Download className="h-4 w-4" />
                  <span>Tải file Excel về máy</span>
                </a>
                <a
                  href={normalizedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="brse-button h-9 gap-1.5 px-4 text-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Mở liên kết</span>
                </a>
              </div>
            </div>
          ) : isWord ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-textPrimary mb-1">
                  Tài liệu Word (DOCX / DOC)
                </h4>
                <p className="text-xs text-textMuted leading-relaxed">
                  Tài liệu: <strong>{filename}</strong>. Bạn có thể tải về để mở trực tiếp trong Microsoft Word hoặc Google Docs.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <a
                  href={normalizedUrl}
                  download={filename}
                  className="brse-button brse-button-primary h-9 gap-1.5 px-4 text-xs font-bold"
                >
                  <Download className="h-4 w-4" />
                  <span>Tải file Word về máy</span>
                </a>
                <a
                  href={normalizedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="brse-button h-9 gap-1.5 px-4 text-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Mở liên kết</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
                <File className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-textPrimary mb-1">
                  {filename}
                </h4>
                <p className="text-xs text-textMuted leading-relaxed">
                  Định dạng tệp đính kèm. Bạn có thể tải về để mở bằng ứng dụng tương ứng trên máy tính.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <a
                  href={normalizedUrl}
                  download={filename}
                  className="brse-button brse-button-primary h-9 gap-1.5 px-4 text-xs font-bold"
                >
                  <Download className="h-4 w-4" />
                  <span>Tải tệp về máy</span>
                </a>
                <a
                  href={normalizedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="brse-button h-9 gap-1.5 px-4 text-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Mở trong tab mới</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
