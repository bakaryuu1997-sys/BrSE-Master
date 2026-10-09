"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Loader2, Printer } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { getMeetingMemo } from "@/lib/meetings";

function MeetingNotePrintContent() {
  const searchParams = useSearchParams();
  const { language } = useUiLanguage();
  const jobId = searchParams.get("jobId") ?? "";
  const title = searchParams.get("title") ?? "Meeting Note";
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const uiText = useMemo(() => {
    if (language === "ja") {
      return {
        loading: "印刷用メモを準備中...",
        error: "印刷用メモを読み込めませんでした。",
        print: "印刷",
        hint: "ブラウザの印刷ダイアログから PDF 保存できます。",
      };
    }
    if (language === "en") {
      return {
        loading: "Preparing print-friendly memo...",
        error: "Could not load the memo for printing.",
        print: "Print",
        hint: "Use the browser print dialog to save as PDF.",
      };
    }
    return {
      loading: "Đang chuẩn bị bản in memo...",
      error: "Không tải được memo để in.",
      print: "In",
      hint: "Dùng hộp thoại in của trình duyệt để lưu ra PDF.",
    };
  }, [language]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!jobId) {
        setError(uiText.error);
        setIsLoading(false);
        return;
      }
      try {
        const data = await getMeetingMemo(jobId);
        if (!isMounted) return;
        setContent(data.content);
        setTimeout(() => window.print(), 300);
      } catch {
        if (isMounted) setError(uiText.error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [jobId, uiText.error]);

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{uiText.hint}</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <Printer className="h-4 w-4" />
            {uiText.print}
          </button>
        </header>

        {isLoading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">{uiText.loading}</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : (
          <div id="minutes-print-area">
            <article className="prose max-w-none prose-slate prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </main>
  );
}

export default function MeetingNotePrintPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white px-6 py-8 text-slate-900">
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </main>
      }
    >
      <MeetingNotePrintContent />
    </Suspense>
  );
}
