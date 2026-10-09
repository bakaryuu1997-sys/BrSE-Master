"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

function ErrorBoundaryFallback({
  error,
  errorInfo,
  handleReset,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  handleReset: () => void;
}) {
  const { t } = useUiLanguage();

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center relative">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-rose-500/5 blur-[80px]" />
      </div>

      {/* Icon */}
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
        <AlertTriangle className="h-10 w-10 text-rose-400" />
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-rose-500/10 to-transparent" />
      </div>

      {/* Text */}
      <h2 className="text-2xl font-semibold text-slate-100">{t("error.title")}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
        {t("error.body")}
      </p>

      {/* Error details (dev mode) */}
      {process.env.NODE_ENV === "development" && error && (
        <details className="mt-4 w-full max-w-lg rounded-lg border border-rose-500/20 bg-rose-950/30 text-left z-10">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-rose-400">
            <Bug className="h-4 w-4" />
            {t("error.detailDev")}
          </summary>
          <div className="border-t border-rose-500/20 px-4 py-3">
            <p className="font-mono text-xs text-rose-300 break-all">
              {error.toString()}
            </p>
            {errorInfo && (
              <pre className="mt-2 max-h-40 overflow-auto font-mono text-xs text-slate-500">
                {errorInfo.componentStack}
              </pre>
            )}
          </div>
        </details>
      )}

      {/* Actions */}
      <div className="mt-8 flex gap-3 z-10">
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 hover:border-slate-600"
        >
          <RefreshCw className="h-4 w-4" />
          {t("error.retry")}
        </button>
        <a
          href="/app"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-500"
        >
          <Home className="h-4 w-4" />
          {t("error.goHome")}
        </a>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    this.props.onError?.(error, info);
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          handleReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight hook-friendly wrapper — use around sections within a page.
 */
export function SectionErrorBoundary({
  children,
  label = "section",
}: {
  children: ReactNode;
  label?: string;
}) {
  const { t } = useUiLanguage();

  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t("error.cannotRender")} {label}. {t("error.reloadHint")}
          </span>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
