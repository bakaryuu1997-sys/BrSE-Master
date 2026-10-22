"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextType {
  notify: (message: string, type?: ToastType, action?: ToastAction, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: ToastType = "success", action?: ToastAction, duration: number = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, action }]);
    
    // Auto remove after specified duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 min-w-[320px] max-w-md p-4 rounded-xl border shadow-2xl animate-in slide-in-from-right-full pointer-events-auto",
              toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              toast.type === "error" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
              "bg-primary/10 border-primary/20 text-primary"
            )}
          >
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 shrink-0" />}
            {toast.type === "info" && <Info className="h-5 w-5 shrink-0" />}
            
            <p className="flex-1 text-sm font-semibold leading-relaxed">{toast.message}</p>
            
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="shrink-0 rounded-lg border border-current/25 bg-current/10 px-2.5 py-1 text-xs font-black transition-all hover:bg-current/20 active:scale-95"
              >
                {toast.action.label}
              </button>
            )}

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
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
