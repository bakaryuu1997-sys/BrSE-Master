"use client";

import { useState, useEffect, useRef } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { X, MessageSquare, Bug, FileSpreadsheet, Plus, Check, Calendar, User, Briefcase, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveOperationRecord, type OperationRecord, type OperationRecordInput, type OperationType } from "@/lib/operations";
import { upsertOperationTodo } from "@/lib/brseTodo";
import type { ProjectSetting } from "@/lib/projectSettings";
import type { TranslationKey } from "@/lib/uiLanguage";

interface QuickCreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  projects: ProjectSetting[];
  defaultProjectId?: string;
  onCreated: (record: OperationRecord) => void;
  notify?: (message: string, tone?: "success" | "warning" | "error") => void;
  t: (key: TranslationKey) => string;
}

export function QuickCreateTicketModal({
  open,
  onClose,
  projects,
  defaultProjectId,
  onCreated,
  notify,
  t,
}: QuickCreateTicketModalProps) {
  const [type, setType] = useState<OperationType>("qna");
  const [projectId, setProjectId] = useState<string>(defaultProjectId || projects[0]?.id || "personal");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"P0" | "P1" | "P2">("P1");
  const [dueDate, setDueDate] = useState<string>("");
  const [customerOwner, setCustomerOwner] = useState("");
  const [owner, setOwner] = useState("");
  const [fieldA, setFieldA] = useState("");
  const [fieldB, setFieldB] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (defaultProjectId && defaultProjectId !== "all") {
        setProjectId(defaultProjectId);
      } else if (projects.length > 0) {
        setProjectId(projects[0].id);
      }
      // Default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().slice(0, 10));
      setTitle("");
      setFieldA("");
      setFieldB("");
      setError(null);
      setTimeout(() => titleInputRef.current?.focus(), 80);
    }
  }, [open, defaultProjectId, projects]);

  if (!open) return null;

  const activeProject = projects.find((p) => p.id === projectId) ?? projects[0];

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề ticket.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input: OperationRecordInput = {
        type,
        title: title.trim(),
        status: type === "qna" ? "Open" : type === "bug" ? "Open" : "Draft",
        priority,
        owner: owner.trim() || "BrSE",
        dueDate: dueDate || new Date().toISOString().slice(0, 10),
        customerOwner: customerOwner.trim() || (activeProject?.customer_name || "Khách hàng Nhật"),
        projectName: activeProject?.name || "Sensei Hub",
        fieldA: fieldA.trim(),
        fieldB: fieldB.trim(),
        fieldC: "",
        fieldD: "",
        fieldE: "",
      };

      const saved = await saveOperationRecord(input);
      if (saved) {
        // 2-Way Sync into Todo List
        upsertOperationTodo(projectId, saved);
        onCreated(saved);
        notify?.(
          `Đã tạo ${type.toUpperCase()}: "${saved.title}" và tự động đồng bộ vào BrSE Todo List!`,
          "success"
        );
        onClose();
      } else {
        setError("Không lưu được ticket vào hệ thống.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định khi tạo ticket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <ModalPortal isOpen={open}>
      <div
        className="fixed inset-0 z-[350] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
        onKeyDown={handleKeyDown}
      >
        <div
          className="relative my-auto flex w-full max-w-xl flex-col rounded-2xl border border-[var(--brse-panel-border)] bg-[linear-gradient(180deg,rgba(24,25,30,0.98),rgba(16,17,20,0.99))] p-5 sm:p-6 shadow-2xl backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--brse-panel-border)] pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-textPrimary flex items-center gap-2">
                <span>Tạo Ticket Nhanh (Q&A / Bug / CR)</span>
                <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[9px] font-bold text-textMuted">
                  Ctrl+Enter để lưu
                </span>
              </h2>
              <p className="text-[11px] text-textMuted">
                Tự động đồng bộ 2 chiều vào BrSE Todo List và Operations Board
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-textMuted hover:bg-white/[0.08] hover:text-textPrimary transition"
            title="Đóng (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-vermilion/30 bg-vermilion/10 px-3 py-2 text-xs font-bold text-vermilion">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Row 1: Type Switcher & Project Picker */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1.5">
                Loại Ticket
              </label>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-1">
                <button
                  type="button"
                  onClick={() => setType("qna")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-black transition",
                    type === "qna"
                      ? "bg-amber/20 text-amber border border-amber/30 shadow-sm"
                      : "text-textMuted hover:text-textPrimary"
                  )}
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>Q&A</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("bug")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-black transition",
                    type === "bug"
                      ? "bg-rose/20 text-rose border border-rose/30 shadow-sm"
                      : "text-textMuted hover:text-textPrimary"
                  )}
                >
                  <Bug className="h-3 w-3" />
                  <span>Bug</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("cr")}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-black transition",
                    type === "cr"
                      ? "bg-cyan/20 text-cyan border border-cyan/30 shadow-sm"
                      : "text-textMuted hover:text-textPrimary"
                  )}
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  <span>CR</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1.5">
                Dự án
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="field-control w-full py-2 text-xs font-bold"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.customer_name ? `(${p.customer_name})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1">
              Tiêu đề Ticket <span className="text-vermilion">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "qna"
                  ? "Ví dụ: Xác nhận logic auth và timeout session với khách hàng"
                  : type === "bug"
                    ? "Ví dụ: Lỗi tràn chữ trên màn hình thanh toán mobile"
                    : "Ví dụ: Khách hàng yêu cầu thêm export PDF cho báo cáo tháng"
              }
              className="field-control w-full py-2 text-xs font-medium placeholder:text-textMuted/60"
            />
          </div>

          {/* Row 2: Priority, Due Date, Customer Owner */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1">
                Độ ưu tiên
              </label>
              <div className="flex gap-1">
                {(["P0", "P1", "P2"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex-1 rounded-lg py-1 text-xs font-black transition border",
                      priority === p
                        ? p === "P0"
                          ? "bg-rose/20 text-rose border-rose/40"
                          : p === "P1"
                            ? "bg-amber/20 text-amber border-amber/40"
                            : "bg-primary/20 text-primary border-primary/40"
                        : "border-[var(--brse-panel-border)] bg-background/40 text-textMuted hover:text-textPrimary"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1">
                Hạn phản hồi (Due)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="field-control w-full py-1 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1">
                Phía khách (PIC)
              </label>
              <input
                type="text"
                value={customerOwner}
                onChange={(e) => setCustomerOwner(e.target.value)}
                placeholder={activeProject?.customer_name || "Yamada-san"}
                className="field-control w-full py-1 text-xs font-medium"
              />
            </div>
          </div>

          {/* Details / Content */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1">
              {type === "qna"
                ? "Nội dung câu hỏi / Vấn đề cần làm rõ"
                : type === "bug"
                  ? "Mô tả lỗi & Các bước tái hiện"
                  : "Nội dung yêu cầu thay đổi"}
            </label>
            <textarea
              rows={2}
              value={fieldA}
              onChange={(e) => setFieldA(e.target.value)}
              placeholder={
                type === "qna"
                  ? "Ghi chi tiết câu hỏi, màn hình hoặc API liên quan..."
                  : type === "bug"
                    ? "Bước 1: Vào trang..., Bước 2: Bấm nút..."
                    : "Mô tả yêu cầu mới của khách hàng và phạm vi màn hình/API..."
              }
              className="field-control w-full py-1.5 text-xs font-medium leading-relaxed"
            />
          </div>

          {/* Solution / Estimate */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-textMuted mb-1">
              {type === "qna"
                ? "Đề xuất giải pháp của BrSE (nếu có)"
                : type === "bug"
                  ? "Hành vi mong muốn (Expected Result)"
                  : "Đánh giá công số (Man-day) & Tác động sơ bộ"}
            </label>
            <textarea
              rows={2}
              value={fieldB}
              onChange={(e) => setFieldB(e.target.value)}
              placeholder={
                type === "qna"
                  ? "Đề xuất giải pháp kỹ thuật trước khi hỏi khách..."
                  : type === "bug"
                    ? "Hệ thống cần hiển thị thông báo đúng chuẩn..."
                    : "Ước tính khoảng 2-3 man-days, cần chỉnh sửa DB và UI..."
              }
              className="field-control w-full py-1.5 text-xs font-medium leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-[var(--brse-panel-border)] pt-3.5 mt-2">
            <span className="text-[10px] text-textMuted">
              💡 Phím tắt: <kbd className="rounded bg-white/[0.08] px-1 py-0.5 font-mono">Ctrl+Enter</kbd>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="brse-button h-8 px-3 text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="brse-button brse-button-primary h-8 gap-1.5 px-4 text-xs font-black disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Đang lưu..." : "Tạo Ticket & Đồng bộ"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
