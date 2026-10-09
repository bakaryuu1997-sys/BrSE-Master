export const queryKeys = {
  health: {
    all: ["health"] as const,
    deep: () => [...queryKeys.health.all, "deep"] as const,
  },
  commandCenter: {
    all: ["commandCenter"] as const,
    summary: () => [...queryKeys.commandCenter.all, "summary"] as const,
    meetingTodoDrafts: () => [...queryKeys.commandCenter.all, "meetingTodoDrafts"] as const,
  },
  todos: {
    all: ["todos"] as const,
    lists: () => [...queryKeys.todos.all, "list"] as const,
    list: (params?: any) => [...queryKeys.todos.lists(), params] as const,
  },
  operations: {
    all: ["operations"] as const,
    lists: () => [...queryKeys.operations.all, "list"] as const,
    list: (params?: any) => [...queryKeys.operations.lists(), params] as const,
    decisionLogs: () => [...queryKeys.operations.all, "decisionLogs"] as const,
  },
  reports: {
    all: ["reports"] as const,
    lists: () => [...queryKeys.reports.all, "list"] as const,
    list: (params?: any) => [...queryKeys.reports.lists(), params] as const,
  },
  glossary: {
    all: ["glossary"] as const,
    lists: () => [...queryKeys.glossary.all, "list"] as const,
    list: (params?: any) => [...queryKeys.glossary.lists(), params] as const,
  },
  meetings: {
    all: ["meetings"] as const,
    lists: () => [...queryKeys.meetings.all, "list"] as const,
    list: (params?: any) => [...queryKeys.meetings.lists(), params] as const,
  },
  clientState: {
    all: ["clientState"] as const,
    entry: (key: string) => [...queryKeys.clientState.all, key] as const,
  },
} as const;
