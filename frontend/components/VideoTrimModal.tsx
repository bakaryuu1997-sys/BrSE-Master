"use client";

import { useMemo, useState } from "react";
import { Scissors, Clock, Loader2, Play, StepBack, StepForward } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { trimMeeting, MeetingRecord, getMeetingMediaUrl } from "@/lib/meetings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/components/ui/AppModal";

interface VideoTrimModalProps {
  meeting: MeetingRecord;
  onClose: () => void;
  onFinished: () => void;
}

export function VideoTrimModal({ meeting, onClose, onFinished }: VideoTrimModalProps) {
  const { t } = useUiLanguage();
  const [startTime, setStartTime] = useState("0");
  const [endTime, setEndTime] = useState("60");
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);

  const start = Number.parseFloat(startTime) || 0;
  const end = Number.parseFloat(endTime) || 0;
  const safeDuration = duration || Math.max(end, 60);
  const selectionLeft = Math.max(0, Math.min(100, (start / safeDuration) * 100));
  const selectionWidth = Math.max(2, Math.min(100 - selectionLeft, ((end - start) / safeDuration) * 100));
  const chapterMarks = useMemo(() => {
    const count = safeDuration > 3600 ? 8 : safeDuration > 900 ? 6 : 4;
    return Array.from({ length: count }, (_, index) => Math.round((safeDuration / count) * index));
  }, [safeDuration]);

  function formatTime(totalSeconds: number) {
    const rounded = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(rounded / 3600);
    const mins = Math.floor((rounded % 3600) / 60);
    const secs = rounded % 60;
    if (hours) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function moveSelection(delta: number) {
    const length = Math.max(1, end - start);
    const nextStart = Math.max(0, Math.min(safeDuration - length, start + delta));
    setStartTime(String(Math.round(nextStart)));
    setEndTime(String(Math.round(nextStart + length)));
  }

  function setQuickRange(nextStart: number, length: number) {
    const safeStart = Math.max(0, Math.min(safeDuration, nextStart));
    const safeEnd = Math.max(safeStart + 1, Math.min(safeDuration, safeStart + length));
    setStartTime(String(Math.round(safeStart)));
    setEndTime(String(Math.round(safeEnd)));
  }

  const handleTrim = async () => {
    const start = parseFloat(startTime);
    const end = parseFloat(endTime);

    if (isNaN(start) || isNaN(end) || start >= end) {
      alert(t("trim.invalidTime"));
      return;
    }

    setIsLoading(true);
    try {
      await trimMeeting(meeting.id, start, end);
      alert(t("trim.started"));
      onFinished();
    } catch (error) {
      console.error("Trim error:", error);
      alert(t("trim.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppModal
      open
      onClose={onClose}
      title={t("trim.title")}
      description={meeting.title}
      icon={<Scissors className="h-5 w-5" />}
      size="xl"
      tone="primary"
      closeDisabled={isLoading}
      className="h-full max-h-[760px]"
      bodyClassName="min-h-0 flex-1 p-0 max-h-none"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>{t("modals.cancel")}</Button>
          <Button onClick={handleTrim} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {t("trim.startTrim")}
          </Button>
        </>
      }
    >
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
          <video
            src={getMeetingMediaUrl(meeting.id)}
            controls
            className="aspect-video w-full rounded-xl border border-[var(--brse-panel-border)] bg-black"
            onLoadedMetadata={(event) => {
              const mediaDuration = event.currentTarget.duration;
              if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
                setDuration(mediaDuration);
                setEndTime((current) => current === "60" ? String(Math.round(Math.min(mediaDuration, 60))) : current);
              }
            }}
          />

          <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-textMuted">Timeline trim</p>
              <p className="text-xs font-semibold text-primary">
                {formatTime(start)} - {formatTime(end)} / {formatTime(safeDuration)}
              </p>
            </div>
            <div className="relative h-12 rounded-lg border border-[var(--brse-panel-border)] bg-surface/80">
              <div
                className="absolute inset-y-0 rounded-md border border-primary/50 bg-primary/20"
                style={{ left: `${selectionLeft}%`, width: `${selectionWidth}%` }}
              />
              {chapterMarks.map((mark) => (
                <button
                  key={mark}
                  type="button"
                  className="absolute top-0 h-full w-px bg-border hover:bg-primary"
                  style={{ left: `${Math.min(100, (mark / safeDuration) * 100)}%` }}
                  onClick={() => setQuickRange(mark, Math.min(300, safeDuration - mark))}
                  title={t("trim.selectFrom").replace("{time}", formatTime(mark))}
                />
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                type="range"
                min={0}
                max={Math.max(1, Math.floor(safeDuration))}
                value={Math.min(start, safeDuration)}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setStartTime(String(next));
                  if (next >= end) setEndTime(String(Math.min(safeDuration, next + 1)));
                }}
                disabled={isLoading}
              />
              <input
                type="range"
                min={0}
                max={Math.max(1, Math.floor(safeDuration))}
                value={Math.min(end, safeDuration)}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setEndTime(String(next));
                  if (next <= start) setStartTime(String(Math.max(0, next - 1)));
                }}
                disabled={isLoading}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => moveSelection(-30)}>
                <StepBack className="h-3.5 w-3.5" />
                -30s
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => moveSelection(30)}>
                <StepForward className="h-3.5 w-3.5" />
                +30s
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setQuickRange(start, 60)}>{t("trim.range1m")}</Button>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setQuickRange(start, 300)}>{t("trim.range5m")}</Button>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setQuickRange(start, 900)}>{t("trim.range15m")}</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-textMuted uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {t("trim.startSec")}
              </label>
              <Input 
                type="number" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="0"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-textMuted uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {t("trim.endSec")}
              </label>
              <Input 
                type="number" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="60"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-4 text-xs text-textMuted leading-relaxed">
            <p className="font-semibold text-primary mb-1 uppercase tracking-tighter">{t("trim.noteTitle")}</p>
            {t("trim.noteBody").replace("{start}", String(startTime)).replace("{end}", String(endTime))}
          </div>
        </div>
    </AppModal>
  );
}
