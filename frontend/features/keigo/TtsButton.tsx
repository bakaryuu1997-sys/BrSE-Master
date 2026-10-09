"use client";

import { Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface TtsButtonProps {
  text: string;
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  className?: string;
}

export function TtsButton({ text, speak, stop, isSpeaking, className }: TtsButtonProps) {
  const handleClick = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isSpeaking ? "Stop" : "Listen (ja-JP)"}
      className={cn(
        "inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-all duration-300",
        isSpeaking
          ? "border-cyan/50 bg-cyan/15 text-cyan shadow-[0_0_10px_rgba(255,180,84,0.35)] animate-pulse"
          : "border-[var(--brse-panel-border)] bg-white/[0.03] text-textMuted hover:text-cyan hover:border-cyan/30 hover:bg-cyan/5",
        className
      )}
    >
      {isSpeaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}
