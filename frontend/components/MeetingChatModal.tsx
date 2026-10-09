"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, MessageSquare } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { chatWithMeeting } from "@/lib/meetings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/components/ui/AppModal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MeetingChatModalProps {
  jobId: string;
  title: string;
  onClose: () => void;
}

export function MeetingChatModal({ jobId, title, onClose }: MeetingChatModalProps) {
  const { t } = useUiLanguage();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t("chat.welcome").replace("{title}", title) }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await chatWithMeeting(userMessage, jobId);
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: t("chat.error") }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppModal
      open
      onClose={onClose}
      title={t("chat.title")}
      description={title}
      icon={<MessageSquare className="h-5 w-5" />}
      size="lg"
      tone="primary"
      className="h-full max-h-[85vh]"
      bodyClassName="flex min-h-0 flex-1 flex-col bg-background/30 p-0 max-h-none"
      footer={
        <div className="w-full">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.placeholder")}
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={!input.trim() || isLoading} className="gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{t("aichat.send")}</span>
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-textMuted">
            Context-aware AI via shared BrSE 9Router runtime
          </p>
        </div>
      }
    >
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                msg.role === "user" ? "border-primary/30 bg-primary/10 text-primary" : "border-[var(--brse-panel-border)] bg-surface text-textMuted"
              }`}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                msg.role === "user" ? "bg-primary text-white" : "bg-surface border border-[var(--brse-panel-border)] text-ink"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--brse-panel-border)] bg-surface text-textMuted">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-surface border border-[var(--brse-panel-border)] text-textMuted text-sm italic">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("chat.asking").replace("{seconds}", String(elapsedSeconds))}
              </div>
            </div>
          )}
        </div>
    </AppModal>
  );
}
