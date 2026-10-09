"use client";

import { useState, useEffect } from "react";
import { BookOpen, ZoomIn, ZoomOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiLanguage } from "@/components/LanguageProvider";

interface MobileReadModeProps {
  content: string; // The HTML or text content to display
  title: string;
}

export function MobileReadMode({ content, title }: MobileReadModeProps) {
  const { t } = useUiLanguage();
  const [isActive, setIsActive] = useState(false);
  const [fontSize, setFontSize] = useState(18); // default 18px for cozy reading
  const [theme, setTheme] = useState<"dark" | "sepia" | "gray">("dark");

  // Prevent background scroll when active
  useEffect(() => {
    if (isActive) {
      document.body.classList.add("mobile-read-mode-active");
    } else {
      document.body.classList.remove("mobile-read-mode-active");
    }
    return () => {
      document.body.classList.remove("mobile-read-mode-active");
    };
  }, [isActive]);

  const handleZoomIn = () => setFontSize((prev) => Math.min(prev + 2, 28));
  const handleZoomOut = () => setFontSize((prev) => Math.max(prev - 2, 14));

  return (
    <>
      {/* Floating Read Mode Trigger Button - Only visible on mobile/tablet (< 1024px) */}
      <button
        type="button"
        onClick={() => setIsActive(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/20 text-primary shadow-[0_8px_32px_rgba(255,107,94,0.3)] backdrop-blur-md transition hover:scale-105 active:scale-95 lg:hidden"
        title={t("readmode.enable")}
      >
        <BookOpen className="h-5 w-5" />
      </button>

      {/* Read Mode Overlay Panel */}
      {isActive && (
        <div
          className={cn(
            "fixed inset-0 z-[1000] flex flex-col overflow-y-auto p-4 transition-all duration-300 font-sans",
            theme === "dark" && "bg-slate-950 text-slate-100",
            theme === "sepia" && "bg-[#faf4ec] text-[#433422]",
            theme === "gray" && "bg-[#1e2022] text-[#e0e0e0]"
          )}
        >
          {/* Header toolbar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{t("readmode.active")}</span>
              <h2 className="truncate text-base font-black leading-snug">{title}</h2>
            </div>
            <button
              onClick={() => setIsActive(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-inherit transition active:scale-95"
              aria-label={t("readmode.exit")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Reading Canvas */}
          <div className="flex-1 mx-auto max-w-2xl w-full py-4 pb-24">
            <article
              className="prose prose-invert leading-relaxed break-words"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: "1.75",
                color: theme === "sepia" ? "#433422" : undefined,
              }}
            >
              <div
                className={cn(
                  "whitespace-pre-wrap font-sans",
                  theme === "sepia" ? "text-[#433422]" : "text-inherit"
                )}
              >
                {content}
              </div>
            </article>
          </div>

          {/* Persistent Bottom Controls Panel */}
          <div
            className={cn(
              "fixed bottom-4 left-4 right-4 z-[1010] mx-auto max-w-md rounded-2xl border p-3 flex items-center justify-between shadow-2xl backdrop-blur-xl",
              theme === "dark" && "bg-slate-900/90 border-slate-800 text-slate-100",
              theme === "sepia" && "bg-[#f4ebe1]/95 border-[#dcd1c4] text-[#433422]",
              theme === "gray" && "bg-[#2a2c2e]/95 border-[#3e4042] text-[#e0e0e0]"
            )}
          >
            {/* Typography Size Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2 rounded-lg hover:bg-white/10 active:scale-95"
                title={t("readmode.zoomOut")}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold w-8 text-center">{fontSize}px</span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2 rounded-lg hover:bg-white/10 active:scale-95"
                title={t("readmode.zoomIn")}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Reading Theme Palette */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "h-7 px-3 text-xs font-black uppercase rounded-lg border transition",
                  theme === "dark" ? "bg-white text-slate-950 border-white" : "bg-transparent border-slate-700 text-slate-400"
                )}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("sepia")}
                className={cn(
                  "h-7 px-3 text-xs font-black uppercase rounded-lg border transition",
                  theme === "sepia" ? "bg-[#433422] text-[#faf4ec] border-[#433422]" : "bg-transparent border-[#dcd1c4] text-[#8e7a63]"
                )}
              >
                Sepia
              </button>
              <button
                type="button"
                onClick={() => setTheme("gray")}
                className={cn(
                  "h-7 px-3 text-xs font-black uppercase rounded-lg border transition",
                  theme === "gray" ? "bg-white/20 text-white border-white/30" : "bg-transparent border-[#3e4042] text-[#8a8d90]"
                )}
              >
                Gray
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS injection for active read mode layout lock */}
      <style>{`
        body.mobile-read-mode-active {
          overflow: hidden !important;
          touch-action: none;
        }
      `}</style>
    </>
  );
}
