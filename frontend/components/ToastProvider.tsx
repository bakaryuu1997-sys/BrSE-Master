"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration: number;
}

interface ToastContextType {
  notify: (message: string, type?: ToastType, action?: ToastAction, duration?: number) => void;
  notifyWithUndo: (message: string, onUndo: () => void, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: ToastType = "success", action?: ToastAction, duration: number = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, action, duration }]);
    
    // Auto remove after specified duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const notifyWithUndo = useCallback((message: string, onUndo: () => void, duration: number = 5000) => {
    notify(message, "info", { label: "Hoàn tác (Undo)", onClick: onUndo }, duration);
  }, [notify]);

  return (
    <ToastContext.Provider value={{ notify, notifyWithUndo }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[350] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "relative flex items-center gap-3 min-w-[320px] max-w-md p-3.5 pr-2.5 rounded-xl border shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-full pointer-events-auto overflow-hidden",
              toast.type === "success" ? "bg-slate-900/95 border-emerald-500/30 text-emerald-300" :
              toast.type === "error" ? "bg-slate-900/95 border-rose-500/30 text-rose-300" :
              toast.type === "warning" ? "bg-slate-900/95 border-amber-500/30 text-amber-300" :
              "bg-slate-900/95 border-cyan-500/30 text-cyan-300"
            )}
          >
            {/* Progress Countdown Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden bg-white/[0.08]">
              <div
                className={cn(
                  "h-full animate-toast-progress origin-left",
                  toast.type === "success" ? "bg-emerald-400" :
                  toast.type === "error" ? "bg-rose-400" :
                  toast.type === "warning" ? "bg-amber-400" :
                  "bg-cyan-400"
                )}
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            </div>

            {toast.type === "success" && <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />}
            {toast.type === "error" && <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-400" />}
            {toast.type === "info" && <Info className="h-4.5 w-4.5 shrink-0 text-cyan-400" />}
            {toast.type === "warning" && <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-400" />}
            
            <p className="flex-1 text-xs font-bold text-textPrimary leading-snug">{toast.message}</p>
            
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="shrink-0 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-1 text-xs font-black text-cyan-300 transition-all hover:bg-cyan-500/25 active:scale-95 shadow-sm"
              >
                {toast.action.label}
              </button>
            )}

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 rounded-lg text-textMuted hover:bg-white/10 hover:text-textPrimary transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useNotify() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useNotify must be used within a ToastProvider");
  }
  return context;
}
