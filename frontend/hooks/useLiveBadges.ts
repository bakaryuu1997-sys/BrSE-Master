"use client";

import { useEffect, useRef, useState } from "react";
import { getBrseTodoCommandSummary } from "@/lib/brseTodo";
import { getOperationRecords } from "@/lib/operations";
import { getMeetingHistory } from "@/lib/meetings";
import { fetchPersonalSchedules, getPersonalSchedules } from "@/lib/personalCalendar";

export type LiveBadgeData = {
  todoOverdue: number;
  todoNextFocus: number;
  qnaWaiting: number;
  pendingCr: number;
  openBugs: number;
  overdueOps: number;
  meetingProcessing: number;
  meetingCompleted: number;
  totalOperationsPending: number;
  todaySchedules: number;
};

const POLL_INTERVAL = 30_000; // 30 seconds

const EMPTY: LiveBadgeData = {
  todoOverdue: 0,
  todoNextFocus: 0,
  qnaWaiting: 0,
  pendingCr: 0,
  openBugs: 0,
  overdueOps: 0,
  meetingProcessing: 0,
  meetingCompleted: 0,
  totalOperationsPending: 0,
  todaySchedules: 0,
};

function todayLocalIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchLiveBadges(): Promise<LiveBadgeData> {
  const today = todayLocalIso();

  // BrSE Todo — sync from localStorage (fast, no network)
  const todoSummary = getBrseTodoCommandSummary();
  const todoOverdue = todoSummary.deadlineRisk.length;
  const todoNextFocus = todoSummary.nextFocus.length;

  // Operations — needs backend
  let qnaWaiting = 0;
  let pendingCr = 0;
  let openBugs = 0;
  let overdueOps = 0;
  let totalOperationsPending = 0;
  try {
    const ops = await getOperationRecords();
    qnaWaiting = ops.filter(
      (r) => r.type === "qna" && ["Sent", "Waiting Customer", "Open"].includes(r.status)
    ).length;
    pendingCr = ops.filter(
      (r) =>
        r.type === "cr" && !["Approved", "Rejected", "Implemented", "Closed"].includes(r.status)
    ).length;
    openBugs = ops.filter(
      (r) => r.type === "bug" && !["Closed", "Done", "Resolved"].includes(r.status)
    ).length;
    overdueOps = ops.filter(
      (r) =>
        r.dueDate &&
        r.dueDate < today &&
        !["Closed", "Done", "Resolved", "Approved", "Rejected", "Implemented", "Answered"].includes(
          r.status
        )
    ).length;
    totalOperationsPending = qnaWaiting + pendingCr + openBugs;
  } catch {
    // silently use 0 if backend is down
  }

  // Meetings — needs backend
  let meetingProcessing = 0;
  let meetingCompleted = 0;
  try {
    const meetings = await getMeetingHistory();
    meetingProcessing = meetings.filter(
      (m) =>
        !["completed", "failed", "cancelled"].includes(m.status) &&
        m.status !== "recording"
    ).length;
    meetingCompleted = meetings.filter(
      (m) => m.status === "completed" && m.memo_available
    ).length;
  } catch {
    // silently use 0
  }

  let todaySchedules = getPersonalSchedules().filter((schedule) => schedule.date === today).length;
  try {
    todaySchedules = (await fetchPersonalSchedules()).filter((schedule) => schedule.date === today).length;
  } catch {
    // local cache count above is good enough for sidebar context
  }

  return {
    todoOverdue,
    todoNextFocus,
    qnaWaiting,
    pendingCr,
    openBugs,
    overdueOps,
    meetingProcessing,
    meetingCompleted,
    totalOperationsPending,
    todaySchedules,
  };
}

/**
 * Returns live badge counts for sidebar + dashboard, polling every 30 seconds.
 * Safe to call in multiple components — each will get its own interval.
 */
export function useLiveBadges(): LiveBadgeData {
  const [badges, setBadges] = useState<LiveBadgeData>(EMPTY);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const load = () => {
      fetchLiveBadges()
        .then((data) => {
          if (mountedRef.current) setBadges(data);
        })
        .catch(() => {/* ignore */});
    };

    load(); // immediate
    const id = window.setInterval(load, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, []);

  return badges;
}
