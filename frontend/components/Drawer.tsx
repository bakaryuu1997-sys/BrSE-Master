"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { ModalPortal } from "@/components/ui/ModalPortal";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
  headerActions?: ReactNode;
};

const widthClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

/**
 * Premium glassmorphic slide-over Drawer component.
 * Slides in from the right, closes on backdrop click or Escape key.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "md",
  headerActions,
}: DrawerProps) {
  const { t } = useUiLanguage();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  // Portal to <body>: an ancestor with backdrop-filter/transform would otherwise become the
  // containing block of `fixed`, making the drawer taller than the viewport (no scrolling).
  return (
    <ModalPortal isOpen={open}>
    <div
      className="fixed inset-0 z-[200] flex h-[100dvh] justify-end"
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden",
          "border-l border-[var(--brse-panel-border)] bg-background/90 backdrop-blur-2xl",
          "shadow-[-24px_0_80px_rgba(0,0,0,0.5)]",
          "animate-[slideInFromRight_0.25s_cubic-bezier(0.32,0.72,0,1)_both]",
          widthClass[width]
        )}
      >
        {/* Decorative glow at top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/20 to-transparent blur-[2px]"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--brse-panel-border)] px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-base font-black tracking-tight text-textPrimary">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-textMuted">{subtitle}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--brse-panel-border)] text-textMuted transition hover:border-[var(--brse-panel-border)] hover:bg-white/[0.04] hover:text-textPrimary active:scale-95"
              aria-label={t("drawer.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-5">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
    </ModalPortal>
  );
}

// ── Convenience sub-components ────────────────────────────────────────────────

type DrawerItemProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "danger" | "warning" | "primary" | "success" | "default";
  onClick?: () => void;
  action?: ReactNode;
  href?: string;
};

const badgeVariantClasses = {
  danger:  "bg-rose-500/15 text-rose-400 border-rose-500/30",
  warning: "bg-amber-400/15 text-amber-400 border-amber-400/30",
  primary: "bg-primary/15 text-primary border-primary/30",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  default: "bg-white/[0.06] text-textMuted border-[var(--brse-panel-border)]",
};

/**
 * A single list item inside a Drawer — styled consistently.
 */
export function DrawerItem({
  title,
  subtitle,
  badge,
  badgeVariant = "default",
  onClick,
  action,
  href,
}: DrawerItemProps) {
  const className = cn(
    "group flex items-start gap-3 rounded-xl border border-[var(--brse-panel-border)] bg-surface/30 p-3 transition-all duration-200",
    (href || onClick) && "cursor-pointer hover:border-primary/20 hover:bg-surface/50"
  );
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-textPrimary line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {title}
        </p>
        {subtitle && (
          <p className="mt-1 text-[11px] text-textMuted">{subtitle}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
              badgeVariantClasses[badgeVariant]
            )}
          >
            {badge}
          </span>
        )}
        {action}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} onClick={onClick}>
      {content}
    </div>
  );
}

/**
 * Section separator inside a Drawer.
 */
export function DrawerSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-textMuted/60">
        {label}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function DrawerEmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-[var(--brse-panel-border)] bg-surface/20 py-10 text-center">
      <p className="text-sm text-textMuted">{message}</p>
    </div>
  );
}
