"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { 
  BookOpenText, 
  Eye, 
  EyeOff, 
  StickyNote, 
  Maximize2, 
  Move, 
  BookMarked, 
  Star, 
  Edit3, 
  Trash2,
  Download,
  Loader2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNotify } from "@/components/ToastProvider";
import { useUiLanguage } from "@/components/LanguageProvider";

export interface NoteMetadata {
  tags?: string;
  pinned?: boolean;
  meeting_date?: string;
  location?: string;
  attendees?: any[];
  analysis?: any;
  [key: string]: any;
}

interface UniversalNoteViewProps {
  title: string;
  content: string;
  updatedAt?: string;
  metadata?: NoteMetadata;
  isLoading?: boolean;
  onSave: (newContent: string) => Promise<void>;
  onDelete?: () => void;
  onPromoteToKB?: () => void;
  onTogglePin?: () => void;
  onExport?: (format: "md" | "pdf" | "docx") => void;
  onFullscreen?: () => void;
  onSticky?: () => void;
  className?: string;
  sidePanel?: React.ReactNode;
}

export function UniversalNoteView({
  title,
  content,
  updatedAt,
  metadata,
  isLoading,
  onSave,
  onDelete,
  onPromoteToKB,
  onTogglePin,
  onExport,
  onFullscreen,
  onSticky,
  className,
  sidePanel
}: UniversalNoteViewProps) {
  const { notify } = useNotify();
  const { t, language } = useUiLanguage();
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSavingInternal] = useState(false);

  // Sync state when content prop changes
  React.useEffect(() => {
    setEditContent(content);
  }, [content]);

  async function handleSave() {
    setIsSavingInternal(true);
    try {
      await onSave(editContent);
      notify(t("notes.saveSuccess"), "success");
    } catch (error) {
      notify(t("notes.saveError"), "error");
    } finally {
      setIsSavingInternal(false);
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-surface rounded-xl border border-[var(--brse-panel-border)]", className)}>
      {/* Header */}
      <div className="border-b border-[var(--brse-panel-border)] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {metadata?.pinned ? <Star className="h-4 w-4 fill-primary text-primary" /> : null}
              <h2 className="truncate text-xl font-semibold text-ink">{title}</h2>
            </div>
            {updatedAt && (
              <p className="mt-1 text-xs text-textMuted flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t("notes.updatedAt")}: {new Date(updatedAt).toLocaleString(language === "ja" ? "ja-JP" : language === "en" ? "en-US" : "vi-VN")} · {content.split(/\s+/).filter(Boolean).length} {t("notes.words")}
              </p>
            )}
            {metadata?.tags && <p className="mt-2 text-xs font-semibold text-primary">{metadata.tags}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {onFullscreen && (
              <Button variant="ghost" size="sm" onClick={onFullscreen} className="h-9 gap-2">
                <Maximize2 className="h-3.5 w-3.5" />
                {t("notes.fullscreen")}
              </Button>
            )}
            {onSticky && (
              <Button variant="ghost" size="sm" onClick={onSticky} className="h-9 gap-2 text-orange-400">
                <Move className="h-3.5 w-3.5" />
                Sticky
              </Button>
            )}
            {onPromoteToKB && (
              <Button variant="ghost" size="sm" onClick={onPromoteToKB} className="h-9 gap-2 text-emerald-400">
                <BookMarked className="h-3.5 w-3.5" />
                {t("notes.saveKnowledge")}
              </Button>
            )}
            {onTogglePin && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onTogglePin} 
                className={cn("h-9 gap-2", metadata?.pinned ? "text-primary" : "text-textMuted")}
              >
                <Star className={cn("h-3.5 w-3.5", metadata?.pinned && "fill-primary")} />
                {metadata?.pinned ? t("notes.pinned") : t("notes.pin")}
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="h-9 gap-2 text-rose-400">
                <Trash2 className="h-3.5 w-3.5" />
                {t("notes.delete")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Editor/Viewer Toolbar */}
      <div className="px-5 py-3 border-b border-[var(--brse-panel-border)] flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <BookOpenText className="h-4 w-4 text-primary" />
          <span>{isPreviewMode ? t("notes.viewMode") : t("notes.editMode")}</span>
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <div className="flex items-center border rounded-lg border-[var(--brse-panel-border)] overflow-hidden mr-2">
               <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px]" onClick={() => onExport("md")}>MD</Button>
               <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px]" onClick={() => onExport("pdf")}>PDF</Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="h-8 gap-2 border-primary/20 text-primary hover:bg-primary/10"
          >
            {isPreviewMode ? <Edit3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {isPreviewMode ? t("notes.edit") : t("notes.preview")}
          </Button>
          {!isPreviewMode && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || content === editContent}
              className="h-8 gap-2"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StickyNote className="h-3.5 w-3.5" />}
              {t("notes.saveChanges")}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-row">
        <div className="flex-1 flex flex-col overflow-hidden">
          {isPreviewMode ? (
            <div className="flex-1 overflow-y-auto px-8 py-6 prose prose-invert prose-p:text-ink prose-headings:text-ink max-w-none">
              <ReactMarkdown>{editContent || t("notes.noContent")}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 resize-none bg-background/50 px-8 py-6 text-[17px] leading-8 text-ink outline-none transition-all focus:bg-background/80"
              placeholder={t("notes.placeholder")}
            />
          )}
        </div>

        {sidePanel && (
          <aside className="w-80 border-l border-[var(--brse-panel-border)] bg-background/20 overflow-y-auto hidden xl:block">
            {sidePanel}
          </aside>
        )}
      </div>

      {/* Bottom Status */}
      <div className="px-5 py-2 border-t border-[var(--brse-panel-border)] bg-white/[0.01]">
         <p className="text-[10px] text-textMuted italic">
           {t("notes.autosaveHint")}
         </p>
      </div>
    </div>
  );
}
