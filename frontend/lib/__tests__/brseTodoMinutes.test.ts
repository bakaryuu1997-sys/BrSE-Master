import { describe, expect, it } from "vitest";
import { buildTodoItemFromMinutesAction } from "@/lib/brseTodo";

describe("meeting minutes to Todo helpers", () => {
  it("preserves source minutes link and project id evidence", () => {
    const item = buildTodoItemFromMinutesAction(
      {
        id: "minutes-1",
        title: "UAT Minutes",
        projectId: "project-1",
        createdAt: "2026-05-24T00:00:00.000Z",
      },
      {
        task: "Confirm UAT evidence before release gate",
        owner: "BrSE",
        deadline: "2035-05-30",
        status: "Open",
      },
      0,
    );

    expect(item.evidenceUrl).toBe("/app/minutes/new?minutesId=minutes-1");
    expect(item.detail).toContain("Project ID: project-1");
    expect(item.detail).toContain("Source: /app/minutes/new?minutesId=minutes-1");
    expect(item.priority).toBe("P1");
  });
});
