"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Sparkles,
  X,
  FileText,
  RotateCcw,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrseTodoCommandSummary } from "@/lib/brseTodo";
import type { OperationRecord } from "@/lib/operations";
import type { ProjectSetting } from "@/lib/projectSettings";
import { useNotify } from "@/components/ToastProvider";
import {
  buildJapaneseHouRenSoReport,
  buildVietnameseHouRenSoReport,
} from "@/lib/dailyHouRenSo";

interface DailySyncModalProps {
  open: boolean;
  onClose: () => void;
  todoCommand: BrseTodoCommandSummary;
  operations: OperationRecord[];
  activeProject: ProjectSetting | null;
  dailySyncTime: string;
  onUpdateSyncTime: (time: string) => void;
}

export function DailySyncModal({
  open,
  onClose,
  todoCommand,
  operations,
  activeProject,
  dailySyncTime,
  onUpdateSyncTime,
}: DailySyncModalProps) {
  const { notify } = useNotify();
  const [copied, setCopied] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [newTime, setNewTime] = useState(dailySyncTime);
  const [reportLang, setReportLang] = useState<"ja" | "vi">("ja");

  const todayIso = new Date().toISOString().slice(0, 10);

  // Generate Japanese Hou-Ren-So Daily Report draft
  const generatedJa = useMemo(() => {
    return buildJapaneseHouRenSoReport({
      todoCommand,
      operations,
      activeProject,
      reporterName: "BrSE担当チーム",
    });
  }, [activeProject, todoCommand, operations]);

  // Generate Internal Vietnamese Report draft
  const generatedVi = useMemo(() => {
    return buildVietnameseHouRenSoReport({
      todoCommand,
      operations,
      activeProject,
    });
  }, [activeProject, todoCommand, operations]);

  // Active editable content
  const [content, setContent] = useState(generatedJa);

  useEffect(() => {
    setContent(reportLang === "ja" ? generatedJa : generatedVi);
  }, [reportLang, generatedJa, generatedVi]);

  if (!open) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      notify(
        reportLang === "ja"
          ? "Đã sao chép Báo cáo ngày (Hou-Ren-So) chuẩn Nhật 100% vào Clipboard!"
          : "Đã sao chép Báo cáo nội bộ Tiếng Việt vào Clipboard!",
        "success"
      );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify("Không thể sao chép vào clipboard.", "error");
    }
  }

  function handleSaveTime() {
    onUpdateSyncTime(newTime);
    setEditingTime(false);
    notify(`Đã đổi giờ nhắc tổng kết ngày thành ${newTime}`, "success");
  }

  function handleResetTemplate() {
    setContent(reportLang === "ja" ? generatedJa : generatedVi);
    notify("Đã khôi phục bản nháp tự động từ dữ liệu thực tế", "info");
  }

  return (
    <ModalPortal isOpen={open}>
      <div
        className="fixed inset-0 z-[350] flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="relative my-auto flex w-full max-w-3xl flex-col max-h-[92vh] rounded-2xl border border-[var(--brse-panel-border)] bg-[linear-gradient(180deg,rgba(24,25,30,0.98),rgba(16,17,20,0.99))] p-4 sm:p-6 shadow-2xl backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header with Customizable Time */}
        <div className="flex items-start justify-between border-b border-[var(--brse-panel-border)] pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black text-textPrimary">
                  Tổng kết ngày (Daily Hou-Ren-So)
                </h2>
                {editingTime ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="rounded border border-primary/40 bg-black/50 px-1.5 py-0.5 text-xs font-bold text-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTime}
                      className="rounded bg-primary px-2 py-0.5 text-[10px] font-black text-white hover:bg-primary/90"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTime(false)}
                      className="text-[10px] text-textMuted hover:text-white"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingTime(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition cursor-pointer"
                    title="Bấm để đổi giờ tự động nhắc tổng kết ngày"
                  >
                    <Clock className="h-2.5 w-2.5" />
                    <span>Giờ nhắc: {dailySyncTime}</span>
                    <span className="text-[9px] opacity-75">✏️</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-textMuted mt-0.5">
                Báo cáo ngày chuẩn doanh nghiệp Nhật Bản: không lộ mã số nội bộ, dịch chuẩn thuật ngữ BrSE và đính kèm evidence đầy đủ.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-textMuted hover:bg-white/[0.08] hover:text-textPrimary transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Daily Stats Summary */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 sm:p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Task hoàn thành</span>
            <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
              {todoCommand.doneToday.length}
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 sm:p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">Ticket xử lý (Q&A/Bug/CR)</span>
            <p className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">
              {operations.filter((op) => op.updatedAt?.slice(0, 10) === todayIso).length}
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5 sm:p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400/80">Rủi ro / Blocker</span>
            <p className="text-lg sm:text-xl font-black text-rose-400 mt-0.5">
              {todoCommand.deadlineRisk.length}
            </p>
          </div>
        </div>

        {/* Language Tabs & Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--brse-panel-border)] bg-background/60 p-0.5">
            <button
              type="button"
              onClick={() => setReportLang("ja")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer",
                reportLang === "ja"
                  ? "bg-primary text-white shadow-sm"
                  : "text-textMuted hover:text-textPrimary"
              )}
            >
              🇯🇵 Báo cáo Khách Nhật (100% Keigo)
            </button>
            <button
              type="button"
              onClick={() => setReportLang("vi")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer",
                reportLang === "vi"
                  ? "bg-primary text-white shadow-sm"
                  : "text-textMuted hover:text-textPrimary"
              )}
            >
              🇻🇳 Bản đối chiếu Tiếng Việt (Nội bộ)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetTemplate}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-textMuted hover:text-textPrimary transition"
              title="Đặt lại về bản nháp tự động ban đầu"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Khôi phục bản nháp gốc</span>
            </button>
          </div>
        </div>

        {/* Report Preview & Editor */}
        <div className="flex-1 flex flex-col min-h-0 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-primary" />
              {reportLang === "ja"
                ? "Nội dung Báo cáo Nhật Bản (Hou-Ren-So / 日次報告書) - Có thể chỉnh sửa trực tiếp"
                : "Nội dung Báo cáo Tiến độ Tiếng Việt - Có thể chỉnh sửa trực tiếp"}
            </span>
            <span className="text-[10px] text-textMuted">
              Dự án: <strong className="text-textPrimary">{activeProject?.name || "Sensei Hub"}</strong>
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="field-control w-full p-3 font-mono text-xs leading-relaxed text-textPrimary bg-black/50 resize-none select-text border-white/10 focus:border-primary/50"
            placeholder="Nội dung báo cáo..."
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--brse-panel-border)] pt-3">
          <Link
            href="/app/reports"
            onClick={onClose}
            className="brse-button h-8.5 gap-1.5 px-3 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mở trình tạo báo cáo chi tiết (/app/reports)</span>
            <span className="sm:hidden">Chi tiết</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="brse-button h-8.5 px-3.5 text-xs"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="brse-button brse-button-primary h-8.5 gap-1.5 px-4 text-xs font-black shadow-glow-sm cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>
                {copied
                  ? "Đã sao chép!"
                  : reportLang === "ja"
                    ? "Copy Báo cáo Nhật (Hou-Ren-So)"
                    : "Copy Báo cáo Tiếng Việt"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
