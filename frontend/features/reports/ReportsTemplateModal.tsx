"use client";

import { useState } from "react";
import { Settings2, X, RotateCcw, Check, Info } from "lucide-react";
import {
  getCustomReportTemplate,
  saveCustomReportTemplate,
  resetCustomReportTemplate,
  DEFAULT_DAILY_TEMPLATES,
} from "@/lib/reportTemplates";
import type { ReportLanguage } from "./useReportsState";

interface ReportsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: ReportLanguage;
  onTemplateSaved: () => void;
}

export function ReportsTemplateModal({
  isOpen,
  onClose,
  language,
  onTemplateSaved,
}: ReportsTemplateModalProps) {
  const [templateText, setTemplateText] = useState(() => getCustomReportTemplate("daily", language));
  const [selectedLang, setSelectedLang] = useState<ReportLanguage>(language);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  function handleLanguageChange(nextLang: ReportLanguage) {
    setSelectedLang(nextLang);
    setTemplateText(getCustomReportTemplate("daily", nextLang));
    setIsSaved(false);
  }

  function handleSave() {
    saveCustomReportTemplate("daily", selectedLang, templateText);
    setIsSaved(true);
    onTemplateSaved();
    setTimeout(() => setIsSaved(false), 2000);
  }

  function handleReset() {
    resetCustomReportTemplate("daily", selectedLang);
    setTemplateText(DEFAULT_DAILY_TEMPLATES[selectedLang] || DEFAULT_DAILY_TEMPLATES.vi);
    setIsSaved(true);
    onTemplateSaved();
    setTimeout(() => setIsSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--brse-panel-border)] bg-surface p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--brse-hairline-border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Tùy chỉnh Template Báo cáo</h2>
              <p className="text-[11px] text-textMuted">Tự cấu trúc mẫu Daily Report và lưu lại vĩnh viễn.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-textMuted hover:bg-surfaceHover hover:text-ink transition"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-textMuted">Ngôn ngữ áp dụng:</label>
            <div className="flex gap-1.5">
              {(["vi", "en", "ja", "jp-business"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    selectedLang === lang
                      ? "border border-primary/40 bg-primary/15 text-primary"
                      : "border border-[var(--brse-panel-border)] bg-background/60 text-textMuted hover:text-ink"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-ink/80">
            <p className="flex items-center gap-1.5 font-bold text-primary mb-1">
              <Info className="h-3.5 w-3.5" />
              Các biến thay thế tự động (Placeholders):
            </p>
            <p className="font-mono text-[11px] text-textMuted space-x-2">
              <span className="text-primary">{`{reportDate}`}</span>: Ngày · 
              <span className="text-primary">{`{projectName}`}</span>: Tên dự án · 
              <span className="text-primary">{`{owner}`}</span>: Người làm · 
              <span className="text-primary">{`{progressPercent}`}</span>: Tiến độ · 
              <span className="text-primary">{`{tasksDone}`}</span>: Đã xong · 
              <span className="text-primary">{`{tasksInProgress}`}</span>: Đang làm · 
              <span className="text-primary">{`{tasksTomorrow}`}</span>: Ngày mai · 
              <span className="text-primary">{`{blockers}`}</span>: Vấn đề tồn đọng
            </p>
          </div>

          <textarea
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            rows={12}
            className="field-control w-full font-mono text-xs leading-relaxed p-3 min-h-[260px] resize-y"
            placeholder="Nhập cấu trúc template của bạn..."
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--brse-hairline-border)] pt-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] px-3 py-1.5 text-xs font-semibold text-textMuted hover:text-ink transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Khôi phục mặc định
          </button>

          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-matcha animate-in fade-in">
                <Check className="h-3.5 w-3.5" />
                Đã lưu template!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white shadow transition hover:bg-primaryHover active:scale-95"
            >
              Lưu mẫu template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
