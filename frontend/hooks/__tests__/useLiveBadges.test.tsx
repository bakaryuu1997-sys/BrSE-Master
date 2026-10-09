import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const { mockTodo, mockOps, mockMeetings, mockFetchSchedules, mockGetSchedules } = vi.hoisted(() => ({
  mockTodo: vi.fn(),
  mockOps: vi.fn(),
  mockMeetings: vi.fn(),
  mockFetchSchedules: vi.fn(),
  mockGetSchedules: vi.fn(),
}));

vi.mock("@/lib/brseTodo", () => ({ getBrseTodoCommandSummary: mockTodo }));
vi.mock("@/lib/operations", () => ({ getOperationRecords: mockOps }));
vi.mock("@/lib/meetings", () => ({ getMeetingHistory: mockMeetings }));
vi.mock("@/lib/personalCalendar", () => ({
  fetchPersonalSchedules: mockFetchSchedules,
  getPersonalSchedules: mockGetSchedules,
}));

import { useLiveBadges } from "../useLiveBadges";

function todayIso() {
  const t = new Date();
  return `${t.getFullYear()}-${`${t.getMonth() + 1}`.padStart(2, "0")}-${`${t.getDate()}`.padStart(2, "0")}`;
}

describe("useLiveBadges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTodo.mockReturnValue({ deadlineRisk: [1, 2], nextFocus: [1] });
    mockGetSchedules.mockReturnValue([]);
    mockFetchSchedules.mockResolvedValue([{ date: todayIso() }, { date: "2000-01-01" }]);
    mockMeetings.mockResolvedValue([
      { status: "transcribing" },
      { status: "completed", memo_available: true },
      { status: "completed", memo_available: false },
      { status: "recording" },
      { status: "failed" },
    ]);
    mockOps.mockResolvedValue([
      { type: "qna", status: "Waiting Customer" },
      { type: "qna", status: "Answered" },
      { type: "cr", status: "Open" },
      { type: "cr", status: "Approved" },
      { type: "bug", status: "Open" },
      { type: "bug", status: "Closed" },
      { type: "cr", status: "Open", dueDate: "2000-01-01" },
    ]);
  });

  it("classifies operations, meetings and schedules into badge counts", async () => {
    const { result } = renderHook(() => useLiveBadges());

    await waitFor(() => expect(result.current.totalOperationsPending).toBeGreaterThan(0));

    expect(result.current.todoOverdue).toBe(2);
    expect(result.current.todoNextFocus).toBe(1);
    expect(result.current.qnaWaiting).toBe(1); // only "Waiting Customer"
    expect(result.current.pendingCr).toBe(2); // both "Open" CRs, not the Approved one
    expect(result.current.openBugs).toBe(1); // only the Open bug
    expect(result.current.overdueOps).toBe(1); // past dueDate + still-open status
    expect(result.current.totalOperationsPending).toBe(4); // qna + cr + bug
    expect(result.current.meetingProcessing).toBe(1); // transcribing (recording excluded)
    expect(result.current.meetingCompleted).toBe(1); // completed + memo_available
    expect(result.current.todaySchedules).toBe(1); // only today's schedule
  });

  it("falls back to zeros when the backend calls reject", async () => {
    mockTodo.mockReturnValue({ deadlineRisk: [], nextFocus: [] });
    mockOps.mockRejectedValue(new Error("backend down"));
    mockMeetings.mockRejectedValue(new Error("backend down"));
    mockFetchSchedules.mockRejectedValue(new Error("backend down"));
    mockGetSchedules.mockReturnValue([]);

    const { result } = renderHook(() => useLiveBadges());

    // Give the immediate load a tick to settle; everything should stay zero.
    await waitFor(() => expect(mockOps).toHaveBeenCalled());
    expect(result.current.qnaWaiting).toBe(0);
    expect(result.current.meetingProcessing).toBe(0);
    expect(result.current.totalOperationsPending).toBe(0);
  });
});
