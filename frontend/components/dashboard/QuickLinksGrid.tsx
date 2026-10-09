"use client";

import Link from "next/link";
import { LocalizedText } from "@/components/LanguageProvider";
import { type LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/lib/uiLanguage";

interface QuickLink {
  href: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
}

interface QuickLinksGridProps {
  links: QuickLink[];
}

export function QuickLinksGrid({ links }: QuickLinksGridProps) {
  return (
    <section className="grid grid-cols-2 gap-6 md:grid-cols-3">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="brse-card flex flex-col items-center justify-center p-8 text-center hover:bg-primary/5 group transition-all duration-300 cursor-pointer">
          <div className="mb-6 rounded-[1.5rem] border border-[var(--brse-panel-border)] bg-surface p-5 shadow-glow-sm transition-all duration-500 group-hover:scale-110 group-hover:border-primary/35 group-hover:text-primary">
            <link.icon className="h-8 w-8" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-textPrimary group-hover:text-primary transition-colors">
            <LocalizedText k={link.labelKey} />
          </p>
        </Link>
      ))}
    </section>
  );
}
