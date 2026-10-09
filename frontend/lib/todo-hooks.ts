"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveBrseTodoStateToDb,
  setActiveBrseTodoProjectIdToDb,
  type BrseTodoProject,
  type BrseTodoState,
} from "@/lib/brseTodo";
import { queryKeys } from "@/lib/query-keys";

type SaveTodoProjectStateInput = {
  activeProjectId?: string;
  project: BrseTodoProject;
  state: BrseTodoState;
};

export function useSaveTodoProjectStateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activeProjectId, project, state }: SaveTodoProjectStateInput) => {
      await setActiveBrseTodoProjectIdToDb(activeProjectId || project.id);
      return saveBrseTodoStateToDb(project, state);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.todos.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.commandCenter.all });
    },
  });
}