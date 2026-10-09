import { type KeigoResult, HISTORY_FILTERS } from "./useKeigoState";
import { ScoreBar } from "./HelperComponents";
import { formatAppDateTime } from "@/lib/dateUtils";
import { Clock, Search, Trash2 } from "lucide-react";

interface KeigoHistoryPanelProps {
  t: any;
  language: string;
  historyLoading: boolean;
  historyQuery: string;
  setHistoryQuery: (val: string) => void;
  historyFilter: string;
  setHistoryFilter: (val: any) => void;
  filteredHistory: KeigoResult[];
  expandedHistory: number | null;
  setExpandedHistory: (id: number | null) => void;
  handleDelete: (id: number) => void;
  setInputText: (text: string) => void;
  setResult: (res: KeigoResult) => void;
  setActiveMode: (mode: "keigo" | "compose" | "requirement") => void;
}

export function KeigoHistoryPanel({
  t,
  language,
  historyLoading,
  historyQuery,
  setHistoryQuery,
  historyFilter,
  setHistoryFilter,
  filteredHistory,
  expandedHistory,
  setExpandedHistory,
  handleDelete,
  setInputText,
  setResult,
  setActiveMode,
}: KeigoHistoryPanelProps) {
  return (
    <div className="rounded-xl border border-[var(--brse-panel-border)] bg-surface overflow-hidden">
      <div className="border-b border-[var(--brse-panel-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-ink">{t("keigo.drawerTitle")} ({filteredHistory.length})</h3>
        </div>
      </div>

      <div className="p-3 space-y-3 border-b border-[var(--brse-panel-border)]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textMuted" />
          <input
            value={historyQuery}
            onChange={(e) => setHistoryQuery(e.target.value)}
            placeholder={t("keigo.searchHistory")}
            className="h-8 w-full rounded-lg border border-[var(--brse-panel-border)] bg-background px-8 text-xs text-ink outline-none focus:border-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1">
          {HISTORY_FILTERS.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setHistoryFilter(mode.id)}
              className={[
                "rounded px-2 py-1 text-[10px] font-semibold transition",
                historyFilter === mode.id ? "bg-primary/20 text-primary" : "text-textMuted hover:bg-white/5",
              ].join(" ")}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {historyLoading ? (
        <div className="flex items-center justify-center py-10">
          <span className="text-xs text-textMuted">{t("keigo.loadingHistory")}</span>
        </div>
      ) : filteredHistory.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-textMuted">{t("keigo.noRecordsFound")}</p>
      ) : (
        <ul className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {filteredHistory.map((item) => {
            if (!item.id) return null;
            const isExpanded = expandedHistory === item.id;
            return (
              <li key={item.id} className="p-3 hover:bg-surfaceHover transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => {
                      setInputText(item.original_text || "");
                      setResult(item);
                      setActiveMode("keigo");
                      setExpandedHistory(isExpanded ? null : item.id ?? null);
                    }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-xs font-semibold text-ink truncate leading-5">
                      {item.original_text || t("dashboard.untitledProject")}
                    </p>
                    <p className="text-[10px] text-textMuted mt-0.5">
                      {item.created_at ? formatAppDateTime(item.created_at, language as any) : "-"} · {item.level}
                    </p>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={["rounded px-1.5 py-0.5 text-[10px] font-black", item.score >= 80 ? "bg-emerald-500/10 text-emerald-400" : item.score >= 60 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"].join(" ")}>
                      {item.score}
                    </span>
                    <button
                      onClick={() => handleDelete(item.id!)}
                      className="rounded p-1 text-textMuted hover:text-red-400 hover:bg-red-400/5 transition-colors"
                      title={t("settings.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 border-t border-[var(--brse-panel-border)] pt-2 space-y-2 text-[11px]">
                    <ScoreBar score={item.score} />
                    <p className="text-xs text-textMuted leading-relaxed bg-white/[0.01] p-2 rounded-lg">
                      💡 {item.summary_vi}
                    </p>
                    {item.improved && (
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-primary font-bold">{t("keigo.polishedByAi")}:</span>
                        <pre className="whitespace-pre-wrap text-[10px] text-textPrimary leading-5 font-sans bg-white/[0.02] p-2 rounded">
                          {item.improved}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
