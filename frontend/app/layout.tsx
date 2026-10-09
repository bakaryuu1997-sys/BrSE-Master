import type { Metadata } from "next";
import "./globals.css";
import { AiChatWidget } from "@/components/AiChatWidget";
import { LanguageProvider, LocalizedText } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { GlobalCommandPalette } from "@/components/GlobalCommandPalette";
import { NineRouterStatus } from "@/components/NineRouterStatus";
import { RouteScrollReset } from "@/components/RouteScrollReset";
import { Sidebar } from "@/components/Sidebar";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { GlobalHealthDot } from "@/components/GlobalHealthDot";

import { ConfirmProvider } from "@/components/ConfirmProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryProvider } from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: {
    default: "BrSE OS - Bridge Software Engineer Assistant",
    template: "%s | BrSE OS",
  },
  description:
    "BrSE OS: local-first AI cockpit for Bridge Software Engineer work, including Meeting Notes, Operations, Knowledge Base, and Keigo support.",
  keywords: ["BrSE", "bridge software engineer", "meeting notes", "keigo", "japanese business"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="obsidian" suppressHydrationWarning>
      <body className="relative min-h-screen bg-background font-sans text-ink antialiased">
        <LanguageProvider>
          <QueryProvider>
            <ToastProvider>
              <ConfirmProvider>
                <RouteScrollReset />
                <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                  <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-fuchsia/10 blur-3xl" />
                  <div className="absolute right-[-5rem] top-12 h-[28rem] w-[28rem] rounded-full bg-cyan/10 blur-3xl" />
                  <div className="absolute bottom-[-8rem] left-[28%] h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl" />
                </div>

                <div className="app-shell-grid">
                  <aside className="tech-sidebar hidden flex-col lg:flex">
                    <div className="relative flex h-20 items-center gap-3 px-6">
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/35 via-fuchsia/30 to-transparent" />
                      <div className="absolute bottom-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-cyan/15 via-fuchsia/15 to-transparent blur-[1.5px]" />
                      <div className="brse-brand-mark h-10 w-10 shrink-0 rounded-xl font-display text-sm font-black">
                        Br
                      </div>
                      <div className="min-w-0">
                        <p className="brse-sidebar-title truncate font-display text-[15px] font-black leading-tight tracking-tight">
                          <LocalizedText k="layout.appName" />
                        </p>
                        <p className="brse-sidebar-subtitle text-[9px] font-bold uppercase">
                          <LocalizedText k="layout.subtitle" />
                        </p>
                      </div>
                    </div>

                    <nav className="custom-scrollbar flex-1 overflow-y-auto p-4">
                      <Sidebar />
                    </nav>

                    <div className="relative p-4">
                      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/35 via-fuchsia/30 to-transparent" />
                      <div className="absolute left-10 right-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan/15 via-fuchsia/15 to-transparent blur-[1.5px]" />
                      <NineRouterStatus />
                    </div>
                  </aside>

                  <div className="app-shell-main">
                    <header className="sticky top-0 z-40 border-b border-[var(--brse-panel-border)] bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="brse-brand-mark h-9 w-9 rounded-lg font-display text-xs font-black">
                            Br
                          </div>
                          <p className="font-display text-lg font-bold text-textPrimary">
                            <LocalizedText k="layout.appName" />
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <GlobalHealthDot />
                          <LanguageSwitcher />
                        </div>
                      </div>
                      <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                        <Sidebar mode="mobile" />
                      </nav>
                    </header>

                    <div className="fixed right-6 top-6 z-50 hidden items-center gap-3 lg:flex">
                      <div className="glass-panel flex items-center gap-2 rounded-full px-3 py-2">
                        <GlobalHealthDot />
                        <LanguageSwitcher />
                      </div>
                    </div>

                    <main className="flex-1" data-route-scroll-root>
                      <ErrorBoundary>{children}</ErrorBoundary>
                    </main>
                  </div>
                </div>
              </ConfirmProvider>
            </ToastProvider>
            <div className="slide-studio-shell-chat">
              <AiChatWidget />
            </div>
            <GlobalCommandPalette />
            <ServiceWorkerRegister />
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
