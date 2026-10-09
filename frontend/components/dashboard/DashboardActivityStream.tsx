"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { type GeneratedEmailHistoryItem } from "@/lib/emailHistory";

interface DashboardActivityStreamProps {
  history: GeneratedEmailHistoryItem[];
  t: (key: any) => string;
}

export function DashboardActivityStream({ history, t }: DashboardActivityStreamProps) {
  if (history.length === 0) return null;

  return (
    <section className="brse-section p-5">
      <h3 className="mb-5 text-xs font-black uppercase tracking-[0.3em] text-textPrimary">{t("dashboard.dataStream")}</h3>
      <div className="flex flex-col gap-4">
        {history.map((item) => (
          <Link key={item.id} href="/app/history" className="group flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border border-[var(--brse-panel-border)] bg-white/5 transition-all group-hover:border-primary/35 group-hover:bg-primary/20">
              <FileText className="h-5 w-5 text-textMuted/60 transition-colors group-hover:text-primary" />
            </div>
            <div className="min-w-0 flex-1 border-b border-[var(--brse-panel-border)] pb-4 group-last:border-0 group-last:pb-0">
              <p className="truncate text-sm font-black tracking-tight text-textPrimary transition-colors group-hover:text-primary">{item.templateTitle}</p>
              <p className="mt-1 truncate text-[11px] font-medium leading-relaxed text-textMuted/70">{item.subject}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
