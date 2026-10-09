"use client";

import { useCallback, useMemo } from "react";
import type { BrseTodoItem } from "@/lib/brseTodo";
import type { OperationRecord } from "@/lib/operations";

const CLOSED_OPERATION_STATUSES = ["Closed", "Answered", "Approved", "Rejected", "Implemented"];
const CLOSED_CR_STATUSES = ["Approved", "Rejected", "Implemented", "Closed"];

export function useDashboardOperationsSummary(
  operations: OperationRecord[],
  todayIso: string,
  deadlineRisk: BrseTodoItem[]
) {
  const waitingQna = useMemo(
    () => operations.filter((record) => record.type === "qna" && ["Sent", "Waiting Customer", "Open"].includes(record.status)),
    [operations]
  );
  const pendingCr = useMemo(
    () => operations.filter((record) => record.type === "cr" && !CLOSED_CR_STATUSES.includes(record.status)),
    [operations]
  );
  const overdueOperations = useMemo(
    () =>
      operations.filter(
        (record) =>
          record.dueDate &&
          record.dueDate < todayIso &&
          !CLOSED_OPERATION_STATUSES.includes(record.status)
      ),
    [operations, todayIso]
  );
  const qnaReminderCandidates = useMemo(
    () => waitingQna.filter((record) => !record.dueDate || record.dueDate <= todayIso).slice(0, 5),
    [todayIso, waitingQna]
  );
  const getDayRisk = useCallback(
    (iso: string) => {
      if (overdueOperations.some((record) => record.dueDate === iso) || deadlineRisk.some((item) => item.deadline === iso)) return "danger";
      if (waitingQna.some((record) => record.dueDate === iso)) return "warning";
      return "normal";
    },
    [deadlineRisk, overdueOperations, waitingQna]
  );

  return {
    getDayRisk,
    overdueOperations,
    pendingCr,
    qnaReminderCandidates,
    waitingQna,
  };
}
