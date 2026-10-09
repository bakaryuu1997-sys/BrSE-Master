"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getActiveProject, ACTIVE_PROJECT_CHANGED_EVENT, type ProjectSetting } from "@/lib/projectSettings";
import { buildProjectAiContext } from "@/lib/projectAiContext";
import { apiBaseUrl } from "@/lib/config";
import { useNotify } from "@/components/ToastProvider";
import { useUiLanguage } from "@/components/LanguageProvider";
import { SLIDE_STUDIO_IMPORT_KEY, type SlideStudioImportPayload } from "@/lib/slideStudio";
import { Loader2, Copy, Download, Sparkles, AlertCircle, Info, FileText, Check, ChevronRight } from "lucide-react";

const labels = {
  vi: {
    title: "AI Slide Outline Generator",
    desc: "Trích xuất dàn ý slide từ biên bản cuộc họp hoặc transcript, tối ưu hóa theo văn cảnh dự án.",
    inputPlaceholder: "Dán văn bản thô, biên bản cuộc họp hoặc transcript ở đây để tạo dàn ý slide...",
    maxSlides: "Số lượng slide tối đa",
    tone: "Giọng văn",
    toneExecutive: "executive (Lãnh đạo)",
    toneJapanese: "japanese-client (Khách hàng Nhật)",
    generateBtn: "Tạo dàn ý Slide",
    generating: "Đang tạo dàn ý...",
    emptyStateTitle: "Chưa có dàn ý slide nào",
    emptyStateDesc: "Hãy nhập nội dung ở cột trái và nhấn nút Tạo dàn ý Slide để bắt đầu.",
    copyBtn: "Sao chép",
    downloadBtn: "Tải xuống (.md)",
    keigoBtn: "Tối ưu hóa kính ngữ (Keigo)",
    optimizing: "Đang tối ưu...",
    copySuccess: "Sao chép thành công",
    downloadFileName: "slide_outline.md",
    guidelinesTitle: "Hướng dẫn xuất bản Slide nhanh chóng",
    guidelinesStep1: "Tạo dàn ý: Nhập thông tin và tùy chọn, nhấn 'Tạo dàn ý Slide' để AI tạo cấu trúc Markdown.",
    guidelinesStep2: "Tối ưu: Nếu trình bày cho khách Nhật, nhấn 'Tối ưu hóa kính ngữ (Keigo)' để tự động chuyển đổi từ ngữ chuẩn thương mại Nhật.",
    guidelinesStep3: "Copy & Tạo slide: Copy dàn ý này và dán vào các công cụ Slide AI (như Gamma.app, SlidesGPT, ChatGPT, Tome.app) với câu lệnh: 'Tạo slide PowerPoint từ dàn ý Markdown sau đây:'",
    guidelinesStep4: "Hoàn thiện: Tải file PPTX từ công cụ Slide AI về, tinh chỉnh layout và hoàn tất slide.",
    inputConfig: "Nhập liệu & Cấu hình",
    sourceData: "Dữ liệu nguồn",
    defaultDeckTitle: "Dàn ý Slide",
    errEmptyInput: "Vui lòng nhập nội dung đầu vào",
    successGenerate: "Tạo dàn ý thành công!",
    errNoOutline: "Chưa có dàn ý để tối ưu hóa",
    successOptimize: "Tối ưu hóa kính ngữ thành công!",
  },
  en: {
    title: "AI Slide Outline Generator",
    desc: "Extract slide outlines from meeting notes or transcripts, optimized for project contexts.",
    inputPlaceholder: "Paste raw text, meeting notes, or transcript here to generate slide outline...",
    maxSlides: "Max Slides",
    tone: "Tone",
    toneExecutive: "executive (Leadership)",
    toneJapanese: "japanese-client (Japanese Customer)",
    generateBtn: "Generate Slide Outline",
    generating: "Generating outline...",
    emptyStateTitle: "No Outline Yet",
    emptyStateDesc: "Enter content on the left column and click Generate Slide Outline to start.",
    copyBtn: "Copy",
    downloadBtn: "Download (.md)",
    keigoBtn: "Optimize Honorifics (Keigo)",
    optimizing: "Optimizing...",
    copySuccess: "Copied successfully",
    downloadFileName: "slide_outline.md",
    guidelinesTitle: "Quick Slide Publishing Guidelines",
    guidelinesStep1: "Generate: Enter info and click 'Generate Slide Outline' to create a Markdown structure.",
    guidelinesStep2: "Optimize: If presenting to Japanese clients, click 'Optimize Keigo' to auto-format commercial honorifics.",
    guidelinesStep3: "Copy & Render: Copy the outline and paste it into Slide AI tools (like Gamma.app, SlidesGPT, ChatGPT, Tome.app) with prompt: 'Create a PowerPoint presentation from this Markdown outline:'",
    guidelinesStep4: "Complete: Download the PPTX file, adjust layouts, and finalize your presentation.",
    inputConfig: "Input & Configuration",
    sourceData: "Source Data",
    defaultDeckTitle: "Slide Outline",
    errEmptyInput: "Input content is empty",
    successGenerate: "Outline generated successfully!",
    errNoOutline: "No outline available to optimize",
    successOptimize: "Keigo optimization successful!",
  },
  ja: {
    title: "AIスライド構成案ジェネレーター",
    desc: "会議の議事録や文字起こしからスライド構成案を抽出。プロジェクト文脈に合わせて最適化します。",
    inputPlaceholder: "生テキスト、議事録、またはトランスクリプトをここに貼り付けてスライド構成を生成...",
    maxSlides: "最大スライド数",
    tone: "トーン",
    toneExecutive: "executive (リーダーシップ向け)",
    toneJapanese: "japanese-client (日本顧客向け)",
    generateBtn: "構成案を作成",
    generating: "生成中...",
    emptyStateTitle: "構成案がありません",
    emptyStateDesc: "左カラムに内容を入力し、「構成案を作成」ボタンをクリックして開始してください。",
    copyBtn: "コピー",
    downloadBtn: "ダウンロード (.md)",
    keigoBtn: "敬語最適化 (Keigo)",
    optimizing: "最適化中...",
    copySuccess: "コピーしました",
    downloadFileName: "slide_outline.md",
    guidelinesTitle: "スライド作成クイックガイド",
    guidelinesStep1: "生成: 情報を入力し、「構成案を作成」をクリックしてMarkdown構造を生成します。",
    guidelinesStep2: "最適化: 日本の顧客向けに発表する場合、「敬語最適化」をクリックしてビジネス敬語表現に自動変換します。",
    guidelinesStep3: "コピーと出力: 構成案をコピーし、スライド生成AI（Gamma.app、SlidesGPT、ChatGPTなど）に「以下のMarkdown構成からPowerPointスライドを作成してください」と入力します。",
    guidelinesStep4: "完了: 生成されたPPTXファイルをダウンロードし、レイアウトを最終微調整して完成させます。",
    inputConfig: "入力と設定",
    sourceData: "ソースデータ",
    defaultDeckTitle: "スライド構成案",
    errEmptyInput: "入力内容が空です",
    successGenerate: "構成案を作成しました！",
    errNoOutline: "最適化する構成案がありません",
    successOptimize: "敬語の最適化に成功しました！",
  }
};

export default function SlideStudioPage() {
  const { language } = useUiLanguage();
  const { notify } = useNotify();

  // Selected language labels
  const t = labels[language === "ja" || language === "en" ? language : "vi"];

  const [activeProject, setActiveProject] = useState<ProjectSetting | null>(null);
  const [inputText, setInputText] = useState("");
  const [maxSlides, setMaxSlides] = useState(8);
  const [tone, setTone] = useState("executive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [summary, setSummary] = useState("");

  // Keep track of active project and changes
  useEffect(() => {
    setActiveProject(getActiveProject());
    const handleProjectChange = () => {
      setActiveProject(getActiveProject());
    };
    window.addEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
    return () => {
      window.removeEventListener(ACTIVE_PROJECT_CHANGED_EVENT, handleProjectChange);
    };
  }, []);

  // Consume a one-shot handoff from the meeting-minutes page ("Open in Slide
  // Outline"): it stores a generated outline in localStorage, navigates here,
  // and we pre-fill the output then clear the key so a refresh starts clean.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SLIDE_STUDIO_IMPORT_KEY);
      if (!raw) return;
      window.localStorage.removeItem(SLIDE_STUDIO_IMPORT_KEY);
      const payload = JSON.parse(raw) as SlideStudioImportPayload;
      if (payload?.markdown) {
        setGeneratedOutline(payload.markdown);
        setDeckTitle(payload.deckTitle || "");
      }
    } catch {
      // Ignore a malformed handoff payload.
    }
  }, []);

  // Call API for slide outline generation
  const handleGenerateOutline = async () => {
    if (!inputText.trim()) {
      notify(t.errEmptyInput, "info");
      return;
    }

    setIsGenerating(true);
    setGeneratedOutline("");
    setDeckTitle("");
    setSummary("");

    try {
      const projectContext = buildProjectAiContext(activeProject);
      const res = await fetch(`${apiBaseUrl}/ai/slides/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: inputText,
          max_slides: maxSlides,
          project_id: activeProject?.id || null,
          project_context: projectContext,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "API Error");
      }

      const data = await res.json();
      setGeneratedOutline(data.markdown || "");
      setDeckTitle(data.deck_title || "");
      setSummary(data.summary || "");
      notify(t.successGenerate, "success");
    } catch (err: any) {
      console.error("Error generating slide outline:", err);
      notify(err.message || "Failed to generate outline", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Call API to rewrite / optimize Keigo (japanese-client tone)
  const handleOptimizeKeigo = async () => {
    if (!generatedOutline.trim()) {
      notify(t.errNoOutline, "info");
      return;
    }

    setIsRewriting(true);

    try {
      const projectContext = buildProjectAiContext(activeProject);
      const res = await fetch(`${apiBaseUrl}/ai/slides/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: generatedOutline,
          tone: "japanese-client",
          project_id: activeProject?.id || null,
          project_context: projectContext,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "API Error");
      }

      const data = await res.json();
      setGeneratedOutline(data.markdown || "");
      if (data.summary) {
        setSummary(data.summary);
      }
      notify(t.successOptimize, "success");
    } catch (err: any) {
      console.error("Error optimizing Keigo:", err);
      notify(err.message || "Failed to optimize Keigo", "error");
    } finally {
      setIsRewriting(false);
    }
  };

  // Copy to Clipboard
  const handleCopyToClipboard = () => {
    if (!generatedOutline) return;
    navigator.clipboard.writeText(generatedOutline)
      .then(() => {
        notify(t.copySuccess, "success");
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        notify("Failed to copy to clipboard", "error");
      });
  };

  // Download Outline file
  const handleDownloadFile = () => {
    if (!generatedOutline) return;
    const blob = new Blob([generatedOutline], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = t.downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="brse-page max-w-7xl mx-auto px-4 py-8 space-y-8 text-[var(--ink)]">
      {/* Page Header */}
      <PageHeader
        title={t.title}
        description={t.desc}
        icon={Sparkles}
        badge={activeProject?.name ? `Project: ${activeProject.name}` : "Workspace"}
      />

      {/* Main Content Area: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Input & Config) */}
        <section className="lg:col-span-5 space-y-6">
          <div className="brse-card p-6 border border-[var(--brse-panel-border)] bg-background/70 rounded-2xl shadow-xl space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-teal-400">
              <FileText className="h-5 w-5" />
              {t.inputConfig}
            </h2>

            {/* Input Textarea */}
            <div className="space-y-2">
              <label htmlFor="raw-input" className="text-xs font-semibold uppercase tracking-wider text-textMuted/80">
                {t.sourceData}
              </label>
              <textarea
                id="raw-input"
                className="field-control w-full min-h-[300px] text-sm p-4 leading-relaxed focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder={t.inputPlaceholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>

            {/* Option Panel */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Max Slides Select */}
              <div className="space-y-1.5">
                <label htmlFor="max-slides-select" className="text-xs font-semibold text-textMuted/70">
                  {t.maxSlides}
                </label>
                <select
                  id="max-slides-select"
                  className="field-control w-full text-sm px-3 py-2 bg-surface border border-[var(--brse-control-border)] rounded-lg text-[var(--ink)] focus:outline-none cursor-pointer"
                  value={maxSlides}
                  onChange={(e) => setMaxSlides(Number(e.target.value))}
                >
                  {Array.from({ length: 11 }, (_, i) => i + 5).map((num) => (
                    <option key={num} value={num}>
                      {num} {language === "vi" ? "slide" : language === "ja" ? "枚" : "slides"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tone Select */}
              <div className="space-y-1.5">
                <label htmlFor="tone-select" className="text-xs font-semibold text-textMuted/70">
                  {t.tone}
                </label>
                <select
                  id="tone-select"
                  className="field-control w-full text-sm px-3 py-2 bg-surface border border-[var(--brse-control-border)] rounded-lg text-[var(--ink)] focus:outline-none cursor-pointer"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  <option value="executive">{t.toneExecutive}</option>
                  <option value="japanese-client">{t.toneJapanese}</option>
                </select>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleGenerateOutline}
              disabled={isGenerating || isRewriting}
              className="brse-button-primary w-full h-12 flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t.generating}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>{t.generateBtn}</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Column (Outline & Export) */}
        <section className="lg:col-span-7 space-y-6">
          <div className="brse-card p-6 border border-[var(--brse-panel-border)] bg-background/70 rounded-2xl shadow-xl space-y-4">
            {/* Header section of Right Column */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--brse-panel-border)] pb-4">
              <div>
                <h2 className="text-lg font-bold text-teal-400">
                  {deckTitle || t.defaultDeckTitle}
                </h2>
                {summary && (
                  <p className="text-xs text-textMuted italic mt-1 max-w-md">
                    {summary}
                  </p>
                )}
              </div>

              {/* Actions Header Row */}
              {generatedOutline && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface border border-[var(--brse-control-border)] hover:border-teal-500 rounded-lg transition-colors"
                    title={t.copyBtn}
                  >
                    <Copy className="h-3.5 w-3.5 text-teal-400" />
                    <span>{t.copyBtn}</span>
                  </button>

                  {/* Download Button */}
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-surface border border-[var(--brse-control-border)] hover:border-teal-500 rounded-lg transition-colors"
                    title={t.downloadBtn}
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{t.downloadBtn}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Markdown Output Display / Empty State */}
            {generatedOutline ? (
              <div className="space-y-4">
                <div className="relative group">
                  <pre className="font-mono text-sm leading-relaxed p-5 bg-background/90 border border-[var(--brse-panel-border)] rounded-xl max-h-[500px] overflow-y-auto whitespace-pre-wrap select-text text-textMuted custom-scrollbar">
                    {generatedOutline}
                  </pre>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={handleCopyToClipboard}
                      className="p-1.5 bg-surface/80 border border-surfaceHover/60 rounded-md hover:bg-surface"
                    >
                      <Copy className="h-4 w-4 text-teal-400" />
                    </button>
                  </div>
                </div>

                {/* Keigo Optimization Action */}
                <button
                  type="button"
                  onClick={handleOptimizeKeigo}
                  disabled={isRewriting || isGenerating}
                  className="w-full py-3 px-4 flex items-center justify-center gap-2 text-sm font-bold bg-gradient-to-r from-orange-900/40 to-surface border border-orange-500/30 hover:border-orange-500 rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-50 text-[var(--ink)]"
                >
                  {isRewriting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                      <span>{t.optimizing}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-orange-400" />
                      <span>{t.keigoBtn}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Empty State */
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-[var(--brse-panel-border)] rounded-xl bg-background/30">
                <div className="p-4 bg-surface border border-[var(--brse-control-border)] rounded-2xl">
                  <FileText className="h-8 w-8 text-textMuted/40" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-textMuted">{t.emptyStateTitle}</p>
                  <p className="text-xs text-textMuted/60 max-w-xs">{t.emptyStateDesc}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Guidelines Section at the bottom */}
      <section className="brse-card p-6 border border-[var(--brse-panel-border)] bg-background/40 rounded-2xl shadow-md space-y-4">
        <h3 className="text-md font-bold flex items-center gap-2 text-teal-400">
          <Info className="h-4 w-4" />
          {t.guidelinesTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="p-4 bg-background/60 border border-[var(--brse-panel-border)] rounded-xl space-y-2 flex flex-col justify-between">
            <span className="text-xs font-bold uppercase text-teal-500">Step 1</span>
            <p className="text-xs leading-relaxed text-textMuted/80">
              {t.guidelinesStep1}
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-background/60 border border-[var(--brse-panel-border)] rounded-xl space-y-2 flex flex-col justify-between">
            <span className="text-xs font-bold uppercase text-orange-500">Step 2</span>
            <p className="text-xs leading-relaxed text-textMuted/80">
              {t.guidelinesStep2}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-background/60 border border-[var(--brse-panel-border)] rounded-xl space-y-2 flex flex-col justify-between">
            <span className="text-xs font-bold uppercase text-emerald-500">Step 3</span>
            <p className="text-xs leading-relaxed text-textMuted/80">
              {t.guidelinesStep3}
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 bg-background/60 border border-[var(--brse-panel-border)] rounded-xl space-y-2 flex flex-col justify-between">
            <span className="text-xs font-bold uppercase text-amber-500">Step 4</span>
            <p className="text-xs leading-relaxed text-textMuted/80">
              {t.guidelinesStep4}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
