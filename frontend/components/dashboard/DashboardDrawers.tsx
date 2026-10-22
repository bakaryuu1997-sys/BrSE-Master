"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Drawer, DrawerItem, DrawerSection, DrawerEmptyState } from "@/components/Drawer";
import type { BrseTodoItem } from "@/lib/brseTodo";
import type { CommandCenterData, MeetingTodoDraft } from "@/lib/commandCenter";
import type { OperationRecord } from "@/lib/operations";
import type { TranslationKey } from "@/lib/uiLanguage";

type TodoCommandSummary = {
  deadlineRisk: BrseTodoItem[];
  nextFocus: BrseTodoItem[];
};

interface DashboardDrawersProps {
  drawerOpen: "" | "todo" | "qna" | "cr" | "meetings";
  onClose: () => void;
  todoCommand: TodoCommandSummary;
  waitingQna: OperationRecord[];
  pendingCr: OperationRecord[];
  commandCenter: CommandCenterData | null;
  todayIso: string;
  t: (key: TranslationKey) => string;
  updatingTodoId: string;
  updatingOperationId: string;
  updatingMeetingDraftId: string;
  onMarkTodoDone: (item: BrseTodoItem) => void;
  onMarkQnaReplied: (record: OperationRecord) => void;
  onCopyCrFollowUp: (record: OperationRecord) => void;
  onApproveMeetingDraft: (id: string) => void;
  onRejectMeetingDraft: (id: string) => void;
  onConvertToQna?: (draft: MeetingTodoDraft) => void;
  onCopyProactiveHorenso: () => void;
  todoActionHref: (item: Pick<BrseTodoItem, "id" | "phase">) => string;
  qnaReminderCandidates: OperationRecord[];
}

export function DashboardDrawers({
  drawerOpen,
  onClose,
  todoCommand,
  waitingQna,
  pendingCr,
  commandCenter,
  todayIso,
  t,
  updatingTodoId,
  updatingOperationId,
  updatingMeetingDraftId,
  onMarkTodoDone,
  onMarkQnaReplied,
  onCopyCrFollowUp,
  onApproveMeetingDraft,
  onRejectMeetingDraft,
  onConvertToQna,
  onCopyProactiveHorenso,
  todoActionHref,
  qnaReminderCandidates
}: DashboardDrawersProps) {
  return (
    <>
      <Drawer
        open={drawerOpen === "todo"}
        onClose={onClose}
        title={t("dashboard.drawerTodoRisk")}
        subtitle={`${todoCommand.deadlineRisk.length} ${t("dashboard.drawerDeadlineRisks")}`}
        width="md"
        headerActions={
          <Link href="/app/brse-todo" onClick={onClose} className="brse-button px-3 py-1.5 text-xs">
            {t("dashboard.openTodo")}
          </Link>
        }
      >
        {todoCommand.deadlineRisk.length > 0 ? (
          <DrawerSection label={t("dashboard.deadlineRisk")}> 
            {todoCommand.deadlineRisk.map((item) => (
              <DrawerItem
                key={item.id}
                title={item.title}
                subtitle={item.deadline ? `${t("dashboard.deadline")}: ${item.deadline}` : `${t("dashboard.phase")}: ${item.phase}`}
                badge={t("dashboard.risk")}
                badgeVariant="danger"
                action={
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => onMarkTodoDone(item)} disabled={updatingTodoId === item.id} className="brse-button brse-button-primary px-2.5 py-1 text-[10px] disabled:cursor-wait disabled:opacity-60">
                      {updatingTodoId === item.id ? t("dashboard.saving") : t("dashboard.done")}
                    </button>
                    <Link href={todoActionHref(item)} onClick={onClose} className="brse-button px-2.5 py-1 text-center text-[10px]">
                      {t("dashboard.open")}
                    </Link>
                  </div>
                }
              />
            ))}
          </DrawerSection>
        ) : (
          <DrawerEmptyState message={t("dashboard.noOverdueTodoRisk")} />
        )}

        {todoCommand.nextFocus.length > 0 && (
          <DrawerSection label={t("dashboard.nextFocus")}>
            {todoCommand.nextFocus.map((item) => (
              <DrawerItem
                key={item.id}
                title={item.title}
                subtitle={`${item.phase} / ${item.priority}`}
                badge={item.priority}
                badgeVariant={item.priority === "P0" ? "danger" : item.priority === "P1" ? "warning" : "default"}
                action={
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => onMarkTodoDone(item)} disabled={updatingTodoId === item.id} className="brse-button brse-button-primary px-2.5 py-1 text-[10px] disabled:cursor-wait disabled:opacity-60">
                      {updatingTodoId === item.id ? t("dashboard.saving") : t("dashboard.done")}
                    </button>
                    <Link href={todoActionHref(item)} onClick={onClose} className="brse-button px-2.5 py-1 text-center text-[10px]">
                      {t("dashboard.open")}
                    </Link>
                  </div>
                }
              />
            ))}
          </DrawerSection>
        )}
      </Drawer>

      <Drawer
        open={drawerOpen === "qna"}
        onClose={onClose}
        title={t("dashboard.qnaWaiting")}
        subtitle={`${waitingQna.length} ${t("dashboard.qnaRecordsWaiting")}`}
        width="md"
        headerActions={
          <Link href="/app/operations?type=qna" onClick={onClose} className="brse-button px-3 py-1.5 text-xs">
            {t("dashboard.openOperations")}
          </Link>
        }
      >
        {waitingQna.length > 0 ? (
          <DrawerSection label={`${t("dashboard.waitingQna")} (${waitingQna.length})`}>
            {waitingQna.slice(0, 10).map((record) => (
              <DrawerItem
                key={record.id}
                title={record.title}
                subtitle={`${t("dashboard.owner")}: ${record.owner || "-"} / ${t("dashboard.status")}: ${record.status}${record.dueDate ? ` / ${t("dashboard.due")}: ${record.dueDate}` : ""}`}
                badge={record.dueDate && record.dueDate < todayIso ? t("dashboard.overdue") : t("dashboard.waiting")}
                badgeVariant={record.dueDate && record.dueDate < todayIso ? "danger" : "warning"}
                action={
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => onMarkQnaReplied(record)} disabled={updatingOperationId === record.id} className="brse-button brse-button-primary px-2.5 py-1 text-[10px] disabled:cursor-wait disabled:opacity-60">
                      {updatingOperationId === record.id ? t("dashboard.saving") : t("dashboard.replied")}
                    </button>
                    <Link href={`/app/operations?type=qna&id=${encodeURIComponent(record.id)}`} onClick={onClose} className="brse-button px-2.5 py-1 text-center text-[10px]">
                      {t("dashboard.open")}
                    </Link>
                  </div>
                }
              />
            ))}
          </DrawerSection>
        ) : (
          <DrawerEmptyState message={t("dashboard.noQnaWaiting")} />
        )}

        {qnaReminderCandidates.length > 0 && (
          <button onClick={async () => { await onCopyProactiveHorenso(); onClose(); }} className="brse-button brse-button-primary mt-4 flex w-full items-center justify-center px-4 py-3 text-sm">
            {t("dashboard.copyReminderDraft")} ({qnaReminderCandidates.length})
          </button>
        )}
      </Drawer>

      <Drawer
        open={drawerOpen === "cr"}
        onClose={onClose}
        title={t("dashboard.crPending")}
        subtitle={`${pendingCr.length} ${t("dashboard.crRecordsNeedReview")}`}
        width="md"
        headerActions={
          <Link href="/app/operations?type=cr" onClick={onClose} className="brse-button px-3 py-1.5 text-xs">
            {t("dashboard.openOperations")}
          </Link>
        }
      >
        {pendingCr.length > 0 ? (
          <DrawerSection label={`${t("dashboard.pendingCr")} (${pendingCr.length})`}>
            {pendingCr.slice(0, 10).map((record) => (
              <DrawerItem
                key={record.id}
                title={record.title}
                subtitle={`${t("dashboard.status")}: ${record.status} / ${t("dashboard.priority")}: ${record.priority || "-"}${record.dueDate ? ` / ${t("dashboard.due")}: ${record.dueDate}` : ""}`}
                badge={record.priority === "High" ? t("dashboard.high") : record.status}
                badgeVariant={record.priority === "High" ? "danger" : "primary"}
                action={
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => onCopyCrFollowUp(record)} className="brse-button brse-button-primary px-2.5 py-1 text-[10px]">
                      {t("dashboard.draft")}
                    </button>
                    <Link href={`/app/operations?type=cr&id=${encodeURIComponent(record.id)}`} onClick={onClose} className="brse-button px-2.5 py-1 text-center text-[10px]">
                      {t("dashboard.open")}
                    </Link>
                  </div>
                }
              />
            ))}
          </DrawerSection>
        ) : (
          <DrawerEmptyState message={t("dashboard.noPendingCr")} />
        )}
      </Drawer>

      <Drawer
        open={drawerOpen === "meetings"}
        onClose={onClose}
        title={t("dashboard.meetingActions")}
        subtitle={`${commandCenter?.metrics.unsynced_meeting_actions || 0} ${t("dashboard.draftsWaitingReview")}`}
        width="md"
        headerActions={
          <Link href="/app/meeting-note" onClick={onClose} className="brse-button px-3 py-1.5 text-xs">
            {t("dashboard.openMeetingNote")}
          </Link>
        }
      >
        {commandCenter?.unsynced_meeting_actions.length ? (
          <DrawerSection label={t("dashboard.todoDraftReviewQueue")}>
            {commandCenter.unsynced_meeting_actions.map((draft) => (
              <DrawerItem
                key={draft.id}
                title={draft.task}
                subtitle={`${draft.meeting_title}${draft.owner ? ` / ${draft.owner}` : ""}${draft.deadline ? ` / ${t("dashboard.due")}: ${draft.deadline}` : ""}`}
                badge={draft.priority}
                badgeVariant={draft.priority === "P0" ? "danger" : draft.priority === "P1" ? "warning" : "default"}
                action={
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => onApproveMeetingDraft(draft.id)}
                      disabled={updatingMeetingDraftId === draft.id}
                      className="brse-button brse-button-primary px-2.5 py-1 text-[10px] disabled:cursor-wait disabled:opacity-60"
                      title="Duyệt vào Todo"
                    >
                      {updatingMeetingDraftId === draft.id ? t("dashboard.saving") : t("dashboard.approve")}
                    </button>
                    {onConvertToQna && (
                      <button
                        type="button"
                        onClick={() => onConvertToQna(draft)}
                        disabled={updatingMeetingDraftId === draft.id}
                        className="brse-button bg-amber-500/10 border border-amber-500/25 text-amber-300 hover:bg-amber-500/20 px-2.5 py-1 text-[10px] disabled:cursor-wait disabled:opacity-60 font-bold"
                        title="Chuyển thành câu hỏi Q&A khách hàng"
                      >
                        + Q&A
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRejectMeetingDraft(draft.id)}
                      disabled={updatingMeetingDraftId === draft.id}
                      className="brse-button px-2.5 py-1 text-[10px] disabled:cursor-wait disabled:opacity-60"
                    >
                      {t("dashboard.reject")}
                    </button>
                  </div>
                }
              />
            ))}
          </DrawerSection>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <p className="font-bold text-textPrimary">{t("dashboard.noMeetingTodoDrafts")}</p>
              <p className="mt-1 text-sm text-textMuted">{t("dashboard.meetingTodoDraftHint")}</p>
            </div>
            <Link href="/app/meeting-note" onClick={onClose} className="brse-button brse-button-primary px-6 py-3 text-sm">
              {t("dashboard.openMeetingNoteAi")}
            </Link>
          </div>
        )}
      </Drawer>
    </>
  );
}
