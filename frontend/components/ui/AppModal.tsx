"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AppModalTone = "primary" | "cyan" | "success" | "warning" | "danger";

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tone?: AppModalTone;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  closeDisabled?: boolean;
  className?: string;
  bodyClassName?: string;
};

const toneClass: Record<AppModalTone, string> = {
  primary: "border-primary/25",
  cyan: "border-cyan/25",
  success: "border-matcha/25",
  warning: "border-gold/25",
  danger: "border-vermilion/25",
};

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
};

export function AppModal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  tone = "primary",
  size = "md",
  closeDisabled = false,
  className,
  bodyClassName,
}: AppModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => dialogRef.current?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !closeDisabled) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDisabled, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/78 p-4 backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "brse-section max-h-[calc(100dvh-2rem)] w-full overflow-hidden rounded-2xl shadow-[0_28px_100px_rgba(0,0,0,0.55)] outline-none",
          "flex flex-col",
          toneClass[tone],
          sizeClass[size],
          className
        )}
      >
        <header className="flex items-start gap-3 border-b border-[var(--brse-panel-border)] p-5">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 text-primary shadow-glow-sm">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-display font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-5 text-textMuted">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={closeDisabled} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className={cn("min-h-0 max-h-[calc(100dvh-13rem)] overflow-y-auto p-5", bodyClassName)}>{children}</div>
        {footer ? <footer className="flex justify-end gap-3 border-t border-[var(--brse-panel-border)] p-5">{footer}</footer> : null}
      </section>
    </div>,
    document.body
  );
}
