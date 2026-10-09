"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveMeetingTodoDraft,
  getCommandCenter,
  getMeetingTodoDrafts,
  rejectMeetingTodoDraft,
  syncMeetingActionsToTodo,
} from "@/lib/commandCenter";
import { queryKeys } from "@/lib/query-keys";

function useInvalidateCommandCenter() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.commandCenter.all });
}

export function useCommandCenterQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.commandCenter.summary(),
    queryFn: getCommandCenter,
    enabled,
  });
}

export function useMeetingTodoDraftsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.commandCenter.meetingTodoDrafts(),
    queryFn: getMeetingTodoDrafts,
    enabled,
  });
}

export function useSyncMeetingActionsToTodoMutation() {
  const invalidateCommandCenter = useInvalidateCommandCenter();
  return useMutation({
    mutationFn: syncMeetingActionsToTodo,
    onSuccess: invalidateCommandCenter,
  });
}

export function useApproveMeetingTodoDraftMutation() {
  const invalidateCommandCenter = useInvalidateCommandCenter();
  return useMutation({
    mutationFn: approveMeetingTodoDraft,
    onSuccess: invalidateCommandCenter,
  });
}

export function useRejectMeetingTodoDraftMutation() {
  const invalidateCommandCenter = useInvalidateCommandCenter();
  return useMutation({
    mutationFn: rejectMeetingTodoDraft,
    onSuccess: invalidateCommandCenter,
  });
}