"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getReportRecords,
  saveReportRecord,
  deleteReportRecord,
  type ReportRecord,
  type ReportRecordInput,
} from "@/lib/reports";
import { queryKeys } from "@/lib/query-keys";

export function useReportsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.lists(),
    queryFn: getReportRecords,
    enabled,
    staleTime: 30_000,
  });
}

export function useSaveReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ record, existingId }: { record: ReportRecordInput; existingId?: string }) =>
      saveReportRecord(record, existingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useDeleteReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReportRecord(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}
