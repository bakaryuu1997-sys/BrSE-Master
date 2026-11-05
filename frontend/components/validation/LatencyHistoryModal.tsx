"use client";

import { useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import {
  clearPingHistory,
  getServicePingHistory,
  getServicePingStats,
  type PingRecord,
} from "@/lib/latencyHistory";
import { formatAppTime } from "@/lib/dateUtils";
import { useUiLanguage } from "@/components/LanguageProvider";
import type { TranslationKey } from "@/lib/uiLanguage";

interface ServiceItem {
  id: string;
  nameKey: TranslationKey;
  icon: React.ReactNode;
}

interface LatencyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceItem[];
  initialServiceId?: string;
}

export function LatencyHistoryModal({
  isOpen,
  onClose,
  services,
  initialServiceId = "backend",
}: LatencyHistoryModalProps) {
  const { t, language } = useUiLanguage();
  const [selectedId, setSelectedId] = useState<string>(initialServiceId);
  const [tick, setTick] = useState(0);

  const history = useMemo(() => getServicePingHistory(selectedId), [selectedId, tick]);
  const stats = useMemo(() => getServicePingStats(selectedId), [selectedId, tick]);

  if (!isOpen) return null;

  const handleClear = () => {
    clearPingHistory();
    setTick((t) => t + 1);
  };

  // Sparkline calculations
  const validPings = history.filter((h) => h.status !== "error");
  const maxVal = Math.max(100, ...validPings.map((h) => h.latency));

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        className="fixed inset-0 z-[350] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="brse-card my-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--brse-hairline-border)] p-5 shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--brse-hairline-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/15 text-cyan border border-cyan/30">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Lịch sử đo Ping & Độ trễ 24h</h2>
              <p className="text-xs text-textMuted">Lưu vết và phát hiện sớm hiện tượng nghẽn mạng cục bộ</p>
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

        {/* Service selector tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-[var(--brse-hairline-border)] pb-3">
          {services.map((s) => {
            const isSelected = s.id === selectedId;
            const sStats = getServicePingStats(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface/60 text-textMuted hover:text-ink hover:bg-surface"
                }`}
              >
                {s.icon}
                <span>{t(s.nameKey)}</span>
                {sStats.isDegraded ? (
                  <span className="h-2 w-2 rounded-full bg-vermilion" title="Phát hiện nghẽn mạng" />
                ) : sStats.samplesCount > 0 ? (
                  <span className="font-mono text-[10px] opacity-75">{sStats.avgLatency}ms</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Anomaly warning banner if degraded */}
        {stats.isDegraded && (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-vermilion/30 bg-vermilion/10 p-3 text-xs text-vermilion">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Cảnh báo độ trễ bất thường:</p>
              <p className="mt-0.5 opacity-90">{stats.anomalyReason}</p>
            </div>
          </div>
        )}

        {/* Stats strip */}
        <div className="mt-3.5 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/40 p-2.5">
            <p className="text-[10px] font-bold uppercase text-textMuted">Trung bình</p>
            <p className="mt-1 text-base font-black text-ink">{stats.avgLatency}ms</p>
          </div>
          <div className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/40 p-2.5">
            <p className="text-[10px] font-bold uppercase text-textMuted">Thấp nhất</p>
            <p className="mt-1 text-base font-black text-matcha">{stats.minLatency}ms</p>
          </div>
          <div className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/40 p-2.5">
            <p className="text-[10px] font-bold uppercase text-textMuted">Cao nhất</p>
            <p className="mt-1 text-base font-black text-gold">{stats.maxLatency}ms</p>
          </div>
          <div className="rounded-xl border border-[var(--brse-hairline-border)] bg-surface/40 p-2.5">
            <p className="text-[10px] font-bold uppercase text-textMuted">Tỉ lệ lỗi</p>
            <p className={`mt-1 text-base font-black ${stats.failureRate > 0 ? "text-vermilion" : "text-ink"}`}>
              {stats.failureRate}%
            </p>
          </div>
        </div>

        {/* Chart / Bar timeline */}
        <div className="mt-4 rounded-xl border border-[var(--brse-hairline-border)] bg-background/50 p-3.5">
          <div className="flex items-center justify-between text-xs text-textMuted mb-2">
            <span className="font-semibold">Mẫu ping gần nhất ({history.length} lần đo)</span>
            <span>Trần hiển thị: {maxVal}ms</span>
          </div>

          {history.length === 0 ? (
            <p className="py-8 text-center text-xs text-textMuted italic">
              Chưa có dữ liệu đo ping. Hệ thống tự động ghi lại mỗi 5 giây khi mở tab.
            </p>
          ) : (
            <div className="flex items-end gap-1 h-28 pt-2 overflow-x-auto">
              {history.map((record, index) => {
                const isErr = record.status === "error";
                const barHeight = isErr ? 100 : Math.max(8, Math.round((record.latency / maxVal) * 100));
                const timeStr = formatAppTime(new Date(record.timestamp), language);

                return (
                  <div
                    key={`${record.timestamp}-${index}`}
                    className="flex-1 min-w-[6px] max-w-[14px] flex flex-col items-center justify-end h-full group relative"
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        isErr
                          ? "bg-vermilion"
                          : record.latency < 50
                          ? "bg-matcha"
                          : record.latency < 200
                          ? "bg-cyan"
                          : "bg-gold"
                      }`}
                      style={{ height: `${barHeight}%` }}
                    />
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 whitespace-nowrap rounded bg-slate-900 border border-slate-700 px-2 py-1 text-[10px] text-white shadow-lg">
                      <span>{isErr ? "Lỗi ping" : `${record.latency}ms`}</span>
                      <span className="text-textMuted text-[9px]">{timeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--brse-hairline-border)] pt-3 text-xs">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 text-textMuted hover:text-vermilion transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Xóa lịch sử đo</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-surface px-4 py-1.5 font-semibold text-ink hover:bg-surface/80 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
