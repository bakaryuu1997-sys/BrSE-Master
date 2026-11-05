"use client";

import { useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  CheckCircle2,
  Database,
  Cpu,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { apiBaseUrl } from "@/lib/config";

interface SelfHealingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

interface HealAction {
  step: string;
  status: "ok" | "warn" | "error";
  message: string;
}

export function SelfHealingModal({
  isOpen,
  onClose,
  onCompleted,
}: SelfHealingModalProps) {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [actions, setActions] = useState<HealAction[]>([]);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleStartHeal = async () => {
    setRunning(true);
    setError("");
    setActions([]);
    setCompleted(false);

    try {
      const res = await fetch(`${apiBaseUrl}/health/self-heal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Không thể thực hiện Self-Healing`);
      }
      const data = await res.json();
      setActions(data.actions || []);
      setCompleted(true);
      if (onCompleted) {
        onCompleted();
      }
    } catch (err: any) {
      setError(err.message || "Quá trình tự phục hồi gặp sự cố");
    } finally {
      setRunning(false);
    }
  };

  const stepIcons: Record<string, React.ReactNode> = {
    db_pool: <Database className="h-4 w-4 text-cyan" />,
    stale_jobs: <RefreshCw className="h-4 w-4 text-gold" />,
    ai_runtime: <Cpu className="h-4 w-4 text-primary" />,
    client_state: <Layers className="h-4 w-4 text-matcha" />,
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="fixed inset-0 z-[350] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="brse-card my-auto w-full max-w-lg rounded-2xl border border-[var(--brse-hairline-border)] p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--brse-hairline-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-matcha/15 text-matcha border border-matcha/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Self-Healing Recovery Daemon</h2>
              <p className="text-xs text-textMuted">Tự động chẩn đoán và khắc phục sự cố hệ thống 1-click</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-textMuted hover:bg-surface hover:text-ink transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <div className="mt-3.5 rounded-xl border border-[var(--brse-hairline-border)] bg-surface/30 p-3 text-xs leading-relaxed text-textMuted">
          Quy trình sẽ tự động kiểm tra và xử lý các điểm nghẽn phổ biến:
          <ul className="mt-2 list-disc list-inside space-y-1 text-slate-300">
            <li><b>Database Pool:</b> Giải phóng kết nối treo và reset kết nối PostgreSQL.</li>
            <li><b>Queue unblocking:</b> Quét dọn các job ghi âm cuộc họp bị đứt đoạn quá 45 phút.</li>
            <li><b>AI Runtime:</b> Thử thông tuyến cổng kết nối AI 9Router / Ollama.</li>
            <li><b>Client State:</b> Đồng bộ dữ liệu cấu hình cục bộ và loại bỏ deadlock.</li>
          </ul>
        </div>

        {/* Steps Result / Progress */}
        {running ? (
          <div className="mt-4 flex flex-col items-center justify-center py-6 text-textMuted">
            <Loader2 className="h-7 w-7 animate-spin text-matcha mb-2" />
            <p className="text-xs font-semibold text-ink">Đang chạy quy trình tự phục hồi...</p>
            <p className="text-[11px] text-textMuted mt-0.5">Kiểm tra kết nối DB, dọn dẹp hàng đợi và AI proxy</p>
          </div>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-vermilion/30 bg-vermilion/10 p-3 text-xs text-vermilion">
            <div className="flex items-center gap-2 font-bold">
              <XCircle className="h-4 w-4" />
              <span>Sự cố phục hồi:</span>
            </div>
            <p className="mt-1">{error}</p>
          </div>
        ) : actions.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold text-ink flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-matcha" />
              <span>Kết quả các bước khắc phục:</span>
            </p>
            <div className="space-y-1.5">
              {actions.map((act) => (
                <div
                  key={act.step}
                  className="flex items-start gap-2.5 rounded-lg border border-[var(--brse-hairline-border)] bg-surface/40 px-3 py-2 text-xs"
                >
                  <div className="mt-0.5 shrink-0">{stepIcons[act.step] || <Wrench className="h-4 w-4" />}</div>
                  <div className="flex-1">
                    <p className="text-ink font-semibold">{act.message}</p>
                  </div>
                  <span className={`font-mono text-[10px] font-bold uppercase shrink-0 ${
                    act.status === "ok" ? "text-matcha" : "text-gold"
                  }`}>
                    {act.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-[var(--brse-hairline-border)] pt-3 text-xs">
          <span className="text-[11px] text-textMuted">
            {completed ? "✅ Đã chạy xong quy trình phục hồi" : "An toàn · Không ảnh hưởng dữ liệu đang có"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-surface px-3 py-1.5 font-semibold text-ink hover:bg-surface/80 transition"
            >
              {completed ? "Hoàn tất" : "Hủy"}
            </button>
            <button
              type="button"
              onClick={handleStartHeal}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg bg-matcha px-4 py-1.5 font-semibold text-slate-950 hover:bg-matcha/90 disabled:opacity-50 transition shadow-sm"
            >
              {running ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{completed ? "Chạy lại" : "Kích hoạt tự phục hồi"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
