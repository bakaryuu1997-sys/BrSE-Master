"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDecisionLogsServerFirst,
  getOperationRecords,
  saveDecisionLogServerFirst,
  saveOperationRecord,
  deleteDecisionLogServerFirst,
  deleteOperationRecord,
  type DecisionLogInput,
  type OperationRecordInput,
} from "@/lib/operations";
import { queryKeys } from "@/lib/query-keys";

export function useOperationsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.operations.lists(),
    queryFn: getOperationRecords,
    enabled,
    staleTime: 30_000,
  });
}

export function useOperationDecisionLogsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.operations.decisionLogs(),
    queryFn: getDecisionLogsServerFirst,
    enabled,
    staleTime: 30_000,
  });
}

export function useSaveOperationDecisionLogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, existingId }: { input: DecisionLogInput; existingId?: string }) =>
      saveDecisionLogServerFirst(input, existingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.operations.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.commandCenter.all });
    },
  });
}

export function useDeleteOperationDecisionLogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (decisionId: string) => deleteDecisionLogServerFirst(decisionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.operations.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.commandCenter.all });
    },
  });
}

export function useSaveOperationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, existingId }: { input: OperationRecordInput; existingId?: string }) =>
      saveOperationRecord(input, existingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.operations.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.commandCenter.all });
    },
  });
}

export function useDeleteOperationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => deleteOperationRecord(recordId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.operations.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.commandCenter.all });
    },
  });
}
