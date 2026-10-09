import type { MeetingRecord } from "@/lib/meetings";
import { MEETING_PIPELINE_STAGES, getPipelineStageIndex } from "@/lib/meetingUIUtils";

/**
 * Compact horizontal pipeline status: Upload → Transcribe → Summarize →
 * Analyze → Done. Done stages are green, the active stage is highlighted, and a
 * failed job marks the active stage red.
 */
export function MeetingPipelineStepper({ item }: { item: MeetingRecord }) {
  const active = getPipelineStageIndex(item);
  const failed = item.status === "failed";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] leading-4">
      {MEETING_PIPELINE_STAGES.map((stage, index) => {
        const done = index < active;
        const current = index === active;
        const className = failed && current
          ? "border-rose-400/40 bg-rose-400/10 text-rose-200"
          : current
            ? "border-teal-400/40 bg-teal-400/15 text-teal-200"
            : done
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-[var(--brse-panel-border)] bg-background/40 text-textMuted";
        return (
          <div key={stage} className="flex items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 ${className}`}>{stage}</span>
            {index < MEETING_PIPELINE_STAGES.length - 1 ? (
              <span className="text-textMuted">→</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
