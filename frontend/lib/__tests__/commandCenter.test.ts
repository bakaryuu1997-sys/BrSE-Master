import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveMeetingTodoDraft, getMeetingTodoDrafts, rejectMeetingTodoDraft } from "@/lib/commandCenter";

describe("command center meeting draft APIs", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ drafts: [{ id: "draft-1", task: "Review action" }], todo_item_id: "todo-1", project_id: "personal" }),
    }));
  });

  it("loads meeting Todo drafts from the review queue", async () => {
    const drafts = await getMeetingTodoDrafts();

    expect(drafts).toEqual([{ id: "draft-1", task: "Review action" }]);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/command-center/meeting-action-drafts"), { cache: "no-store" });
  });

  it("approves and rejects individual meeting Todo drafts", async () => {
    await expect(approveMeetingTodoDraft("draft/1")).resolves.toMatchObject({ todo_item_id: "todo-1" });
    await rejectMeetingTodoDraft("draft/1");

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/command-center/meeting-action-drafts/draft%2F1/approve"),
      { method: "POST" },
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/command-center/meeting-action-drafts/draft%2F1/reject"),
      { method: "POST" },
    );
  });
});
