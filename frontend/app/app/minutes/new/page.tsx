"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Download, Plus, Printer, RotateCcw, Save, Trash2, Sparkles, Bot, Loader2, Clock, MapPin, Users, Calendar, ListTodo, Info, ChevronRight, CheckCircle2, FileText, Check, HelpCircle, Mail } from "lucide-react";
import { useUiLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { AppModal } from "@/components/ui/AppModal";
import { Button } from "@/components/ui/button";
import { UniversalNoteView } from "@/components/notes/UniversalNoteView";
import { 
  useMeetingMinutesState, 
  createAgendaItem, 
  createActionItem, 
  getTodayDate,
  type AgendaItem, 
  type ActionItem 
} from "@/hooks/useMeetingMinutesState";

export default function NewMeetingMinutesPage() {
  const { t } = useUiLanguage();
  const {
    form,
    agendaItems,
    setAgendaItems,
    actionItems,
    setActionItems,
    createdDate,
    isDraftReady,
    draftStatus,
    setDraftStatus,
    isAiModalOpen,
    setIsAiModalOpen,
    transcript,
    setTranscript,
    isGeneratingAi,
    isGeneratingSlideDeck,
    isSavingMinutes,
    slideAssistMode,
    setSlideAssistMode,
    meetingPickList,
    loadingMeetingPickList,
    savedMinutesList,
    activeMinutesId,
    loadedMinutesBody,
    setLoadedMinutesBody,
    activeProject,
    activeFormTab,
    setActiveFormTab,
    displayedMinutes,
    loadMinutesRecord,
    updateForm,
    updateAgenda,
    updateAction,
    saveMinutesToDb,
    openAiSummarizedSlides,
    loadTranscriptFromMeeting,
    generateMinutesFromTranscript,
    convertActionToTodo,
    convertActionToQna,
    copyActionEmailDraft,
    hasUnsavedChanges,
  } = useMeetingMinutesState();

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <main className="brse-page">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--brse-panel-border)] pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-matcha to-cyan bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-matcha" />
            {t("minutes.workspaceTitle")}
          </h1>
          <p className="text-xs text-textMuted mt-1">{t("minutes.workspaceDesc")}</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={() => setIsAiModalOpen(true)} variant="outline" className="gap-2 border-cyan/30 text-cyan hover:bg-cyan/10">
             <Bot className="h-4 w-4" /> {t("minutes.aiExtract")}
           </Button>
           <Button onClick={() => saveMinutesToDb()} disabled={isSavingMinutes} className="bg-matcha text-slate-950 hover:bg-matcha/80">
             {isSavingMinutes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("minutes.saveDbBtn")}
           </Button>
        </div>
      </header>

      {draftStatus && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <span>{draftStatus}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT COLUMN: Premium Editor Workspace */}
        <section className="space-y-6">
          {/* Tab Selector for Form */}
          <div className="flex border-b border-[var(--brse-panel-border)] gap-1 pb-px flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFormTab("info")}
              className={cn(
                "border-b-2 px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5",
                activeFormTab === "info"
                  ? "border-matcha text-matcha"
                  : "border-transparent text-textMuted hover:text-textPrimary"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              {t("minutes.tabInfo")}
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab("agenda")}
              className={cn(
                "border-b-2 px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5",
                activeFormTab === "agenda"
                  ? "border-matcha text-matcha"
                  : "border-transparent text-textMuted hover:text-textPrimary"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              {t("minutes.tabAgenda")} ({agendaItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab("action")}
              className={cn(
                "border-b-2 px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5",
                activeFormTab === "action"
                  ? "border-matcha text-matcha"
                  : "border-transparent text-textMuted hover:text-textPrimary"
              )}
            >
              <ListTodo className="h-3.5 w-3.5" />
              {t("minutes.tabAction")} ({actionItems.length})
            </button>
          </div>

          {/* TAB 1: BASIC INFO & ATTENDEES */}
          {activeFormTab === "info" && (
            <div className="brse-section p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-matcha" />
                <h3 className="text-sm font-black text-textPrimary">{t("minutes.infoTitle")}</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1">
                  <span className="text-[11px] font-bold text-textMuted">{t("minutes.projectNameLabel")}</span>
                  <input
                    value={form.projectName}
                    onChange={e => updateForm("projectName", e.target.value)}
                    placeholder={t("minutes.projectNamePlaceholder")}
                    className="field-control px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-1">
                  <span className="text-[11px] font-bold text-textMuted">{t("minutes.creatorLabel")}</span>
                  <input
                    value={form.creator}
                    onChange={e => updateForm("creator", e.target.value)}
                    placeholder={t("minutes.creatorPlaceholder")}
                    className="field-control px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-1">
                  <span className="text-[11px] font-bold text-textMuted">{t("minutes.dateLabel")}</span>
                  <input
                    type="date"
                    value={form.meetingDate}
                    onChange={e => updateForm("meetingDate", e.target.value)}
                    className="field-control px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-1">
                  <span className="text-[11px] font-bold text-textMuted">{t("minutes.startTimeLabel")}</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => updateForm("startTime", e.target.value)}
                    className="field-control px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-1">
                  <span className="text-[11px] font-bold text-textMuted">{t("minutes.endTimeLabel")}</span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => updateForm("endTime", e.target.value)}
                    className="field-control px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <span className="text-[11px] font-bold text-textMuted">{t("minutes.locationLabel")}</span>
                <input
                  value={form.location}
                  onChange={e => updateForm("location", e.target.value)}
                  placeholder={t("minutes.locationPlaceholder")}
                  className="field-control px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1">
                  <span className="text-[11px] font-bold text-textMuted">{t("minutes.customerAttendeesLabel")}</span>
                  <textarea
                    value={form.customerAttendees}
                    onChange={e => updateForm("customerAttendees", e.target.value)}
                    rows={6}
                    placeholder={t("minutes.customerAttendeesPlaceholder")}
                    className="field-control px-3 py-2 text-xs font-sans resize-y"
                  />
                </div>
                <div className="grid gap-1">
                  <span className="text-[11px] font-bold text-textMuted">{t("minutes.vnAttendeesLabel")}</span>
                  <textarea
                    value={form.vnAttendees}
                    onChange={e => updateForm("vnAttendees", e.target.value)}
                    rows={6}
                    placeholder={t("minutes.vnAttendeesPlaceholder")}
                    className="field-control px-3 py-2 text-xs font-sans resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AGENDA & DISCUSSIONS */}
          {activeFormTab === "agenda" && (
            <div className="brse-section p-5 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-matcha" />
                  <h3 className="text-sm font-black text-textPrimary">{t("minutes.agendaTitle")}</h3>
                </div>
                <Button
                  size="sm"
                  type="button"
                  onClick={() => setAgendaItems([...agendaItems, createAgendaItem()])}
                  variant="outline"
                  className="border-matcha/40 text-matcha hover:bg-matcha/10 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("minutes.addAgenda")}
                </Button>
              </div>

              <div className="space-y-4">
                {agendaItems.map((item: AgendaItem, i: number) => (
                  <div key={item.id} className="p-4 bg-white/5 rounded-xl border border-[var(--brse-panel-border)] space-y-3 relative group">
                    <button
                      type="button"
                      onClick={() => {
                        if (agendaItems.length === 1) return;
                        setAgendaItems(agendaItems.filter((x: AgendaItem) => x.id !== item.id));
                      }}
                      className="absolute right-3 top-3 opacity-30 hover:opacity-100 text-vermilion transition"
                      title={t("minutes.deleteAgenda")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-matcha">{t("minutes.agendaTitleLabel").replace("{index}", String(i + 1))}</span>
                      <input
                        value={item.title}
                        onChange={e => updateAgenda(item.id, "title", e.target.value)}
                        placeholder={t("minutes.agendaTitlePlaceholder")}
                        className="w-full bg-transparent font-bold text-sm text-textPrimary outline-none border-b border-[var(--brse-panel-border)] pb-1 focus:border-matcha"
                      />
                    </div>

                    <div className="grid gap-1">
                      <span className="text-[10px] font-bold text-textMuted">{t("minutes.discussionLabel")}</span>
                      <textarea
                        value={item.discussion}
                        onChange={e => updateAgenda(item.id, "discussion", e.target.value)}
                        rows={6}
                        placeholder={t("minutes.discussionPlaceholder")}
                        className="field-control w-full px-3 py-2 text-xs resize-y"
                      />
                    </div>

                    <div className="grid gap-1">
                      <span className="text-[10px] font-bold text-textMuted">{t("minutes.decisionLabel")}</span>
                      <input
                        value={item.decision}
                        onChange={e => updateAgenda(item.id, "decision", e.target.value)}
                        placeholder={t("minutes.decisionPlaceholder")}
                        className="field-control w-full px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ACTION ITEMS */}
          {activeFormTab === "action" && (
            <div className="brse-section p-5 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-matcha" />
                  <h3 className="text-sm font-black text-textPrimary">{t("minutes.actionTitle")}</h3>
                </div>
                <Button
                  size="sm"
                  type="button"
                  onClick={() => setActionItems([...actionItems, createActionItem()])}
                  variant="outline"
                  className="border-matcha/40 text-matcha hover:bg-matcha/10 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("minutes.addAction")}
                </Button>
              </div>

              <div className="space-y-4">
                {actionItems.map((item: ActionItem, i: number) => (
                  <div key={item.id} className="p-4 bg-white/5 rounded-xl border border-[var(--brse-panel-border)] space-y-3 relative group">
                    <button
                      type="button"
                      onClick={() => {
                        if (actionItems.length === 1) return;
                        setActionItems(actionItems.filter((x: ActionItem) => x.id !== item.id));
                      }}
                      className="absolute right-3 top-3 opacity-30 hover:opacity-100 text-vermilion transition"
                      title={t("minutes.deleteAction")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-matcha">{t("minutes.actionItemLabel").replace("{index}", String(i + 1))}</span>
                      <input
                        value={item.content}
                        onChange={e => updateAction(item.id, "content", e.target.value)}
                        placeholder={t("minutes.actionPlaceholder")}
                        className="w-full bg-transparent font-bold text-sm text-textPrimary outline-none border-b border-[var(--brse-panel-border)] pb-1 focus:border-matcha"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="grid gap-1">
                        <span className="text-[10px] font-bold text-textMuted">{t("minutes.ownerLabel")}</span>
                        <input
                          value={item.owner}
                          onChange={e => updateAction(item.id, "owner", e.target.value)}
                          placeholder={t("minutes.ownerPlaceholder")}
                          className="field-control px-3 py-2 text-xs"
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-[10px] font-bold text-textMuted">{t("minutes.deadlineLabel")}</span>
                        <input
                          value={item.deadline}
                          onChange={e => updateAction(item.id, "deadline", e.target.value)}
                          placeholder={t("minutes.deadlinePlaceholder")}
                          className="field-control px-3 py-2 text-xs"
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-[10px] font-bold text-textMuted">{t("minutes.statusLabel")}</span>
                        <select
                          value={item.status}
                          onChange={e => updateAction(item.id, "status", e.target.value)}
                          className="field-control px-3 py-2 text-xs cursor-pointer"
                        >
                          <option value="未着手" className="bg-slate-900 text-textPrimary">{t("minutes.statusNotStarted")}</option>
                          <option value="進行中" className="bg-slate-900 text-textPrimary">{t("minutes.statusInProgress")}</option>
                          <option value="完了" className="bg-slate-900 text-textPrimary">{t("minutes.statusCompleted")}</option>
                          <option value="保留" className="bg-slate-900 text-textPrimary">{t("minutes.statusPending")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--brse-panel-border)]/40 pt-2.5">
                      <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
                        1-Click Action Triaging:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => convertActionToTodo(item, i)}
                          className="text-[10px] h-7 bg-cyan/10 border border-cyan/25 text-cyan hover:bg-cyan/20 gap-1 font-bold"
                          title="Tạo task trực tiếp trong BrSE Todo"
                        >
                          <Check className="h-3 w-3" /> {t("minutes.convertToTodo")}
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => convertActionToQna(item)}
                          className="text-[10px] h-7 bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/20 gap-1 font-bold"
                          title="Chuyển thành câu hỏi Q&A gửi khách hàng Nhật"
                        >
                          <HelpCircle className="h-3 w-3" /> Tạo Q&A
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => copyActionEmailDraft(item)}
                          className="text-[10px] h-7 bg-purple-500/10 border border-purple-500/25 text-purple-300 hover:bg-purple-500/20 gap-1 font-bold"
                          title="Copy bản nháp Email Keigo cho việc này"
                        >
                          <Mail className="h-3 w-3" /> Copy Email Keigo
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEXT MEETING & AGENDA */}
          <div className="brse-section p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-matcha" />
              <h3 className="text-sm font-black text-textPrimary">{t("minutes.nextMeetingTitle")}</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <span className="text-[11px] font-bold text-textMuted">{t("minutes.nextMeetingLabel")}</span>
                <input
                  value={form.nextMeeting}
                  onChange={e => updateForm("nextMeeting", e.target.value)}
                  placeholder={t("minutes.nextMeetingPlaceholder")}
                  className="field-control px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-1">
                <span className="text-[11px] font-bold text-textMuted">{t("minutes.nextAgendaLabel")}</span>
                <input
                  value={form.nextAgenda}
                  onChange={e => updateForm("nextAgenda", e.target.value)}
                  placeholder={t("minutes.nextAgendaPlaceholder")}
                  className="field-control px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Universal Note Preview & Slide Export */}
        <section className="space-y-6 flex flex-col h-full">
          <div className="mb-3 flex justify-between items-center bg-white/5 border border-[var(--brse-panel-border)] p-3 rounded-xl">
            <span className="text-xs text-textMuted font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan animate-pulse" />
              Slide Studio Assistant
            </span>
            <Button
              size="sm"
              onClick={openAiSummarizedSlides}
              disabled={isGeneratingSlideDeck}
              className="bg-cyan text-slate-950 hover:bg-cyan/80 gap-1.5 text-xs font-black"
            >
              {isGeneratingSlideDeck ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t("minutes.generateSlides")}
            </Button>
          </div>
          <div className="flex-1">
            <UniversalNoteView
              title={`${form.projectName || "Meeting"} - ${form.meetingDate}`}
              content={displayedMinutes}
              onSave={async (body: string) => setLoadedMinutesBody(body)}
            />
          </div>

          {/* History / Pick list of saved minutes */}
          <div className="brse-section p-5">
            <h3 className="text-sm font-black text-textPrimary mb-3 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-matcha" />
              {t("minutes.historyTitle")}
            </h3>
            <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
              {savedMinutesList.length === 0 ? (
                <p className="text-xs text-textMuted py-4 text-center">{t("minutes.historyEmpty")}</p>
              ) : (
                savedMinutesList.map((row: any) => (
                  <div
                    key={row.id}
                    onClick={() => loadMinutesRecord(row.id)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl border border-[var(--brse-panel-border)] bg-slate-900/40 hover:bg-slate-900/70 hover:border-matcha/40 cursor-pointer transition",
                      activeMinutesId === row.id && "border-matcha bg-matcha/5 text-matcha"
                    )}
                  >
                    <span className="text-xs font-semibold text-textPrimary truncate flex-1 pr-2">{row.title}</span>
                    <span className="text-[10px] text-textMuted shrink-0 font-mono">{row.meeting_date}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* AI EXTRACT MODAL */}
      {isAiModalOpen && (
        <AppModal
          open={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          title={t("minutes.aiModalTitle2")}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-textMuted leading-relaxed">
              {t("minutes.aiModalDesc2")}
            </p>

            <div className="space-y-3">
              <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider block">{t("minutes.aiModalRecentTitle")}</span>
              <div className="max-h-[160px] overflow-y-auto border border-[var(--brse-panel-border)] bg-slate-950/45 rounded-xl p-2 space-y-1.5">
                {loadingMeetingPickList ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan" />
                  </div>
                ) : meetingPickList.length === 0 ? (
                  <p className="text-xs text-textMuted py-4 text-center">{t("minutes.aiModalNoTranscripts")}</p>
                ) : (
                  meetingPickList.map((m: any) => (
                    <div
                      key={m.id}
                      onClick={() => loadTranscriptFromMeeting(m)}
                      className="p-2.5 rounded-lg border border-[var(--brse-panel-border)] hover:bg-slate-900/60 hover:border-cyan/40 cursor-pointer text-xs transition"
                    >
                      <div className="flex justify-between font-bold text-textPrimary mb-1">
                        <span>{m.title}</span>
                        <span className="text-[10px] font-mono text-textMuted">{m.meeting_date}</span>
                      </div>
                      <p className="text-[10px] text-textMuted truncate">Thiết bị: {m.device_id} | File: {m.filename}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-1">
              <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider block">{t("minutes.aiModalOrPasteTitle")}</span>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={8}
                placeholder={t("minutes.aiModalPastePlaceholder2")}
                className="field-control w-full p-3 text-xs leading-5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAiModalOpen(false)}
              >
                {t("minutes.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={generateMinutesFromTranscript}
                disabled={isGeneratingAi || !transcript.trim()}
                className="bg-cyan text-slate-950 hover:bg-cyan/80 gap-1.5 text-xs font-black"
              >
                {isGeneratingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {t("minutes.aiExtractBtn")}
              </Button>
            </div>
          </div>
        </AppModal>
      )}
    </main>
  );
}
