"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClientStateValue, saveClientStateValue } from "@/lib/clientState";
import { queryKeys } from "@/lib/query-keys";

export function useClientStateQuery(key: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.clientState.entry(key),
    queryFn: () => fetchClientStateValue(key),
    enabled: enabled && !!key,
    staleTime: 30_000, // Safe default staleTime matching other queries
  });
}

export function useSaveClientStateMutation(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: string) => saveClientStateValue(key, value),
    onSuccess: () => {
      // Automatic mutation invalidation pattern
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clientState.entry(key),
      });
    },
  });
}
