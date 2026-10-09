"use client";

import React, { useRef } from "react";
import { Mic, Upload, FileText, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MeetingLanguage } from "@/lib/meetingUIUtils";

type MeetingTemplate = "meeting" | "minutes" | "action";

const meetingLanguages: Array<{ value: MeetingLanguage; label: string }> = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
  { value: "ja", label: "JA" },
];

const meetingTemplates: Array<{ value: MeetingTemplate; label: string }> = [
  { value: "meeting", label: "BrSE memo" },
  { value: "minutes", label: "Minutes" },
  { value: "action", label: "Action tracker" },
];

interface MeetingUploaderProps {
  t: any;
  meetingLanguage: MeetingLanguage;
  setMeetingLanguage: (lang: MeetingLanguage) => void;
  meetingTemplate: MeetingTemplate;
  setMeetingTemplate: (template: MeetingTemplate) => void;
  transcriptOnlyMode: boolean;
  setTranscriptOnlyMode: (enabled: boolean) => void;
  keepSourceMedia: boolean;
  setKeepSourceMedia: (enabled: boolean) => void;
  urlInput: string;
  setUrlInput: (val: string) => void;
  isProcessingUrl: boolean;
  handleUrlSubmit: (e: React.FormEvent) => void;
  isUploading: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  transcriptTitle: string;
  setTranscriptTitle: (val: string) => void;
  transcriptText: string;
  setTranscriptText: (val: string) => void;
  isProcessingTranscript: boolean;
  handleTranscriptSubmit: (e: React.FormEvent) => void;
  openRecorder: (mode?: any) => void;
  activeProjectName?: string;
  whisperModel: string;
  setWhisperModel: (model: string) => void;
}

export function MeetingUploader({
  t,
  meetingLanguage,
  setMeetingLanguage,
  meetingTemplate,
  setMeetingTemplate,
  transcriptOnlyMode,
  setTranscriptOnlyMode,
  keepSourceMedia,
  setKeepSourceMedia,
  urlInput,
  setUrlInput,
  isProcessingUrl,
  handleUrlSubmit,
  isUploading,
  handleFileUpload,
  transcriptTitle,
  setTranscriptTitle,
  transcriptText,
  setTranscriptText,
  isProcessingTranscript,
  handleTranscriptSubmit,
  openRecorder,
  activeProjectName,
  whisperModel,
  setWhisperModel
}: MeetingUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="brse-card brse-card-muted flex items-center gap-2 px-2 py-1.5">
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black uppercase text-primary">
            {activeProjectName || "Global"}
          </span>
          <select
            value={meetingLanguage}
            onChange={(event) => setMeetingLanguage(event.target.value as MeetingLanguage)}
            className="bg-transparent px-1 text-xs font-semibold text-ink outline-none"
            aria-label={t("meeting.language")}
          >
            {meetingLanguages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select
            value={meetingTemplate}
            onChange={(event) => setMeetingTemplate(event.target.value as MeetingTemplate)}
            className="bg-transparent px-1 text-xs font-semibold text-ink outline-none"
            aria-label={t("meeting.template")}
          >
            {meetingTemplates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select
            value={whisperModel}
            onChange={(event) => setWhisperModel(event.target.value)}
            className="bg-transparent px-1 text-xs font-semibold text-ink outline-none border-l border-primary/20 pl-2"
            aria-label="Speech Model"
          >
            <option value="small">Whisper Small</option>
            <option value="large-v3-turbo">Whisper Turbo</option>
          </select>
        </div>
        
        <Button type="button" variant="outline" className="gap-2" onClick={() => openRecorder("mixed")}>
          <Mic className="h-4 w-4" />
          {t("meeting.liveRecord")}
        </Button>
        
        <form onSubmit={handleUrlSubmit} className="flex items-center gap-2">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
            <input 
              type="text" 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t("meeting.urlPlaceholder")}
              className="field-control h-10 w-64 pl-9 pr-3 text-sm"
            />
          </div>
          <Button type="submit" disabled={!urlInput.trim() || isProcessingUrl} variant="outline">
            {isProcessingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : t("meeting.process")}
          </Button>
        </form>

        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-teal-300/20 bg-teal-300/10 px-3 py-2 text-xs font-semibold text-teal-100">
          <input
            type="checkbox"
            checked={transcriptOnlyMode}
            onChange={(event) => setTranscriptOnlyMode(event.target.checked)}
            className="h-4 w-4 accent-teal-300"
          />
          {t("meeting.transcriptOnly")}
        </label>

        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--brse-panel-border)] bg-surface/60 px-3 py-2 text-xs font-semibold text-ink">
          <input
            type="checkbox"
            checked={keepSourceMedia}
            onChange={(event) => setKeepSourceMedia(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {t("meeting.keepSourceMedia")}
        </label>

        <label className="cursor-pointer">
          <div className={cn(
            "flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary/90",
            isUploading && "pointer-events-none opacity-50"
          )}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? t("meeting.uploading") : t("meeting.uploadVideo")}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="audio/*,video/*" 
            multiple
            onChange={handleFileUpload} 
            disabled={isUploading} 
          />
        </label>
      </div>

      <section className="brse-section p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("meeting.quickTranscript")}</h2>
            <p className="mt-1 text-sm text-textMuted">
              {t("meeting.quickTranscriptBody")}
            </p>
          </div>
          <FileText className="hidden h-5 w-5 text-primary sm:block" />
        </div>
        <form onSubmit={handleTranscriptSubmit} className="grid gap-3">
          <input
            value={transcriptTitle}
            onChange={(event) => setTranscriptTitle(event.target.value)}
            placeholder={t("meeting.titlePlaceholder")}
            className="field-control px-3 text-sm"
          />
          <textarea
            value={transcriptText}
            onChange={(event) => setTranscriptText(event.target.value)}
            placeholder={t("meeting.transcriptPlaceholder")}
            className="field-control min-h-36 px-3 py-3 text-sm leading-6 placeholder:text-textMuted"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-textMuted">
              {t("meeting.transcriptLimit")}
            </p>
            <Button type="submit" disabled={!transcriptText.trim() || isProcessingTranscript} className="gap-2">
              {isProcessingTranscript ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {t("meeting.createMemo")}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
