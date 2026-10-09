"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiLanguage } from "@/components/LanguageProvider";
import { AppModal } from "@/components/ui/AppModal";
import { Button } from "@/components/ui/button";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useUiLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver({ resolve });
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    resolver?.resolve(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolver?.resolve(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <AppModal
          open
          onClose={handleCancel}
          title={options.title || t("confirm.title")}
          icon={
            options.type === "danger" || options.type === "warning"
              ? <AlertTriangle className="h-5 w-5" />
              : <Info className="h-5 w-5" />
          }
          tone={options.type === "danger" ? "danger" : options.type === "warning" ? "warning" : "primary"}
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={handleCancel}>
                {options.cancelText || t("confirm.cancel")}
              </Button>
              <Button
                onClick={handleConfirm}
                className={cn(options.type === "danger" && "bg-rose-500 hover:bg-rose-600")}
              >
                {options.confirmText || t("confirm.confirm")}
              </Button>
            </>
          }
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-textMuted">
            {options.message}
          </p>
        </AppModal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
