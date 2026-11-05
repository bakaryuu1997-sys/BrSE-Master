"use client";

import { useEffect, useMemo, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  Table as TableIcon,
  X,
} from "lucide-react";
import { apiBaseUrl } from "@/lib/config";

interface TableInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  totalRecords?: number;
}

interface InspectResponse {
  status: string;
  table_name: string;
  total_records: number;
  limit: number;
  columns: string[];
  rows: Record<string, any>[];
}

export function TableInspectorModal({
  isOpen,
  onClose,
  tableName,
  totalRecords = 0,
}: TableInspectorModalProps) {
  const [data, setData] = useState<InspectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const fetchTableData = async () => {
    if (!tableName) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBaseUrl}/health/db/inspect/${tableName}?limit=25`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu bảng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tableName) {
      void fetchTableData();
      setQuery("");
    }
  }, [isOpen, tableName]);

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!query.trim()) return data.rows;
    const lower = query.toLowerCase();
    return data.rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? "").toLowerCase().includes(lower))
    );
  }, [data, query]);

  if (!isOpen) return null;

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName}_inspect_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (!data?.rows?.length || !data.columns?.length) return;
    const header = data.columns.join(",");
    const rows = data.rows.map((row) =>
      data.columns
        .map((col) => {
          const val = String(row[col] ?? "").replaceAll('"', '""');
          return `"${val}"`;
        })
        .join(",")
    );
    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName}_inspect_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          className="brse-card my-auto w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl border border-[var(--brse-hairline-border)] p-5 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--brse-hairline-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/15 text-cyan border border-cyan/30">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Bảng CSDL: {tableName}</h2>
                <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-cyan">
                  {totalRecords} bản ghi
                </span>
              </div>
              <p className="text-xs text-textMuted">Thanh tra cấu trúc và 25 bản ghi mới nhất từ PostgreSQL</p>
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

        {/* Toolbar */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textMuted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Lọc nhanh trong các bản ghi..."
              className="field-control w-full py-1.5 pl-8 pr-3 text-xs placeholder:text-textMuted/70"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportJson}
              disabled={!data?.rows?.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-surface/50 px-2.5 py-1.5 text-xs font-semibold text-textMuted hover:text-ink disabled:opacity-50 transition"
              title="Xuất JSON"
            >
              <Download className="h-3 w-3" />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!data?.rows?.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brse-panel-border)] bg-surface/50 px-2.5 py-1.5 text-xs font-semibold text-textMuted hover:text-ink disabled:opacity-50 transition"
              title="Xuất CSV"
            >
              <FileSpreadsheet className="h-3 w-3 text-matcha" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() => void fetchTableData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="mt-3.5 flex-1 overflow-auto rounded-xl border border-[var(--brse-hairline-border)] bg-background/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-textMuted">
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-xs">Đang truy vấn bảng {tableName}...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-vermilion">
              <p className="font-bold">Lỗi truy vấn:</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => void fetchTableData()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs text-ink hover:bg-surface/80"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : !data?.rows?.length ? (
            <div className="py-16 text-center text-xs text-textMuted italic">
              Bảng này hiện chưa có bản ghi nào (0 rows).
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--brse-hairline-border)] bg-surface/70 sticky top-0 z-10">
                  {data.columns.map((col) => (
                    <th key={col} className="px-3 py-2 font-mono font-bold text-textMuted uppercase text-[10px] tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brse-hairline-border)] font-mono text-[11px]">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                    {data.columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-ink whitespace-nowrap max-w-[280px] truncate" title={String(row[col] ?? "")}>
                        {row[col] === null || row[col] === undefined ? (
                          <span className="text-textMuted/40 italic">null</span>
                        ) : typeof row[col] === "boolean" ? (
                          <span className={row[col] ? "text-matcha font-bold" : "text-vermilion font-bold"}>
                            {String(row[col])}
                          </span>
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-xs text-textMuted pt-2 border-t border-[var(--brse-hairline-border)]">
          <span>
            Hiển thị {filteredRows.length}/{data?.rows?.length ?? 0} bản ghi (tổng {totalRecords})
          </span>
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
