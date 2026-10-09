"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { apiBaseUrl } from "@/lib/config";
import { useUiLanguage } from "@/components/LanguageProvider";

type AiStatus = {
  provider: string;
  base_url: string;
  model: string;
  configured: boolean;
  runtime_checked?: boolean;
  runtime_reachable?: boolean | null;
  runtime_status_code?: number | null;
  runtime_error?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function AiChatWidget() {
  const { t } = useUiLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: t("aichat.welcome")
      }
    ]);
  }, [t]);

  useEffect(() => {
    if (!isOpen) return;
    fetch(`${apiBaseUrl}/ai/status?check_runtime=true`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setStatus(data))
      .catch(() => setStatus(null));
  }, [isOpen]);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "AI request failed.");
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply || t("aichat.noReply") }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aichat.connectError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {isOpen ? (
        <section className="mb-3 flex h-[min(620px,calc(100vh-120px))] w-[min(420px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-primary/25 bg-surface/95 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <header className="flex items-start justify-between gap-3 border-b border-[var(--brse-panel-border)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-ink">AI Chat Test</h2>
                <p className="mt-1 text-xs leading-5 text-textMuted">
                  {status ? `${status.provider} · ${status.model}` : t("aichat.readingStatus")}
                </p>
                {status ? <p className="text-[11px] text-textMuted">{status.base_url}</p> : null}
                {status?.runtime_checked ? (
                  <p className={`mt-1 text-[11px] font-semibold ${status.runtime_reachable ? "text-green-400" : "text-vermilion"}`}>
                    {status.runtime_reachable
                      ? `${t("aichat.runtimeOnline")}${status.runtime_status_code ? ` · HTTP ${status.runtime_status_code}` : ""}`
                      : t("aichat.runtimeOffline")}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-[var(--brse-panel-border)] bg-background/70 p-2 text-textMuted transition hover:border-primary/35 hover:text-ink"
              aria-label="Close AI chat"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div ref={panelRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-xl border p-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-8 border-primary/25 bg-primary/10 text-ink"
                    : "mr-8 border-[var(--brse-panel-border)] bg-background/70 text-textMuted"
                }`}
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {message.role === "user" ? t("aichat.user") : t("aichat.assistant")}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            {isLoading ? (
              <div className="mr-8 flex items-center gap-2 rounded-xl border border-[var(--brse-panel-border)] bg-background/70 p-3 text-sm text-textMuted">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                <span>
                  {t("aichat.calling9router")} {elapsedSeconds}s
                  <span className="block text-[11px] leading-4 text-textMuted">
                    {t("aichat.localRouteDelay")}
                  </span>
                </span>
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-vermilion/30 bg-vermilion/10 p-3 text-sm leading-6 text-vermilion">
                <p>{error}</p>
                {!status?.runtime_reachable ? (
                  <p className="mt-2 text-xs text-textMuted">
                    {t("aichat.local9routerCheck")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <form onSubmit={sendMessage} className="border-t border-[var(--brse-panel-border)] p-4">
            <label className="sr-only" htmlFor="ai-chat-input">AI chat message</label>
            <div className="flex gap-2">
              <input
                id="ai-chat-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("aichat.placeholder")}
                className="min-h-11 flex-1 rounded-xl border border-[var(--brse-panel-border)] bg-background/80 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-textMuted focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t("aichat.send")}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-textMuted">
              {t("aichat.warning")}
            </p>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/35 bg-primary text-white shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition hover:-translate-y-0.5 hover:bg-primaryHover"
        aria-label="Open AI chat test"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}
