"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, ListTree, Loader2, Users } from "lucide-react";
import { getMeetingMemo, getExportUrl, saveMeetingMemo, type MeetingAnalysis } from "@/lib/meetings";
import { getMemoLanguageWarning, formatMemoLanguageWarning, type MeetingLanguage } from "@/lib/meetingUIUtils";
import { UniversalNoteView } from "@/components/notes/UniversalNoteView";
import { useUiLanguage } from "@/components/LanguageProvider";
import { getWsBaseUrl } from "@/lib/config";
import { AppModal } from "@/components/ui/AppModal";
import { MobileReadMode } from "@/components/MobileReadMode";

interface MeetingMemoModalProps {
  jobId: string;
  title: string;
  onClose: () => void;
  /** The meeting's requested summary language, used to flag a mistranslated memo. */
  memoLanguage?: string;
}

export function MeetingMemoModal({ jobId, title, onClose, memoLanguage }: MeetingMemoModalProps) {
  const { language, t } = useUiLanguage();
  const [content, setContent] = useState("");
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    async function loadMemo() {
      try {
        const data = await getMeetingMemo(jobId);
        setContent(data.content);
        setAnalysis(data.analysis ?? null);
      } catch (error) {
        setContent(t("memo.loadError"));
      } finally {
        setIsLoading(false);
      }
    }
    loadMemo();

    const wsUrl = `${getWsBaseUrl()}/meetings/ws/memo/${jobId}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      let data: { type?: string; content?: string };
      try {
        data = JSON.parse(event.data);
      } catch {
        return; // Ignore malformed/non-JSON frames instead of throwing in the handler.
      }
      if (data.type === "update" && typeof data.content === "string") setContent(data.content);
    };
    setSocket(ws);
    return () => ws.close();
  }, [jobId, t]);

  const handleSave = async (newContent: string) => {
    await saveMeetingMemo(jobId, newContent);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "edit", content: newContent }));
    }
  };

  const memoLanguageWarning = !isLoading && content ? getMemoLanguageWarning(memoLanguage, content) : null;

  const sidePanel = (
    <div className="p-4 space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Speaker Highlights</h3>
        </div>
        <div className="space-y-3">
          {analysis?.speakers?.map((s) => (
            <div key={s.label} className="p-2 rounded bg-white/5 border border-[var(--brse-panel-border)]">
              <p className="text-[11px] font-bold text-ink">{s.label}</p>
              <p className="text-[10px] text-textMuted line-clamp-2">{s.highlights[0]}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <ListTree className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">AI Chapters</h3>
        </div>
        <div className="space-y-2">
          {(analysis?.decisions ?? []).slice(0, 5).map((d, i) => (
             <p key={i} className="text-[10px] p-2 bg-primary/5 rounded border border-primary/10 text-textMuted">
               <span className="text-primary font-bold mr-1">Decision:</span> {d}
             </p>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <AppModal
      open
      onClose={onClose}
      title="Meeting Memo"
      description={title}
      icon={<ClipboardCheck className="h-5 w-5" />}
      size="2xl"
      tone="cyan"
      className="h-full max-h-[90vh]"
      bodyClassName="relative flex min-h-0 flex-1 p-0 max-h-none"
    >
        {isLoading ? (
           <div className="flex-1 flex items-center justify-center bg-surface">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : (
          <>
            {memoLanguageWarning ? (
              <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-rose-300/30 bg-rose-300/15 px-3 py-1 text-[11px] font-medium text-rose-200 shadow-lg backdrop-blur">
                {formatMemoLanguageWarning(memoLanguageWarning, language as MeetingLanguage)}
              </div>
            ) : null}
            <UniversalNoteView
              title={title}
              content={content}
              metadata={{ analysis }}
              onSave={handleSave}
              sidePanel={sidePanel}
              onExport={(format) => window.open(getExportUrl(jobId, format))}
              className="shadow-2xl"
            />
            <MobileReadMode content={content} title={title} />
          </>
        )}
    </AppModal>
  );
}
