import type { MeetingActionSignal } from "@/lib/meetings";
import type { OperationRecord } from "@/lib/operations";
import type { BrseTodoPriority } from "@/lib/brseTodo";

export const brseTodoPhaseOrder = [
  "1. Kick-off & Requirement",
  "2. Communication Setup",
  "3. Requirement Analysis",
  "4. Tracking & Reporting",
  "5. Q&A & Change",
  "6. Testing & UAT",
  "7. Closure & Knowledge",
] as const;

export function phaseRank(phase: string) {
  const index = brseTodoPhaseOrder.indexOf(phase as (typeof brseTodoPhaseOrder)[number]);
  return index >= 0 ? index : brseTodoPhaseOrder.length;
}

export function priorityRank(priority: BrseTodoPriority) {
  return priority === "P0" ? 0 : priority === "P1" ? 1 : 2;
}

export function phaseForOperation(type: OperationRecord["type"]) {
  if (type === "bug") return "6. Testing & UAT";
  return "5. Q&A & Change";
}

export function priorityForOperation(priority: string): BrseTodoPriority {
  const normalized = priority.toLowerCase();
  if (normalized.includes("urgent") || normalized.includes("high") || priority.includes("致命") || priority.includes("重大")) return "P0";
  if (normalized.includes("medium") || priority.includes("大")) return "P1";
  return "P2";
}

export function todoSlugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function priorityForMeetingAction(action: MeetingActionSignal): BrseTodoPriority {
  const normalized = `${action.task} ${action.status ?? ""}`.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  if (action.deadline && action.deadline <= today) return "P0";
  if (/(urgent|block|critical|緊急|至急|重要|blocker)/i.test(normalized)) return "P0";
  if (action.deadline) return "P1";
  return "P2";
}

export function isMeetingActionDone(action: MeetingActionSignal) {
  return /(done|completed|closed|完了|済み)/i.test(action.status ?? "");
}
