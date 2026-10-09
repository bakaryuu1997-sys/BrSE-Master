import type { ProjectSetting } from "@/lib/projectSettings";

export type ProjectExecutionWarning = {
  id: "project-health-red" | "project-phase-release";
  title: string;
  message: string;
  tone: "danger" | "warning";
};

const RELEASE_PHASE_PATTERN = /(release|uat|test|testing)/i;

export function isReleaseControlPhase(phase: string | undefined) {
  return RELEASE_PHASE_PATTERN.test(phase || "");
}

export function buildProjectExecutionWarnings(project: ProjectSetting | null): ProjectExecutionWarning[] {
  if (!project) return [];

  const warnings: ProjectExecutionWarning[] = [];
  if ((project.health_status || "").toLowerCase() === "red") {
    warnings.push({
      id: "project-health-red",
      title: "Project health is Red",
      message: "Ưu tiên Golden Action/Dashboard focus cho blocker, overdue task và customer follow-up trước các việc thường.",
      tone: "danger",
    });
  }

  if (isReleaseControlPhase(project.current_phase)) {
    warnings.push({
      id: "project-phase-release",
      title: `${project.current_phase || "Release/UAT"} phase control`,
      message: "Tăng nhắc nhở release gate, test matrix, rollback/evidence và report risk trước khi gửi khách.",
      tone: "warning",
    });
  }

  return warnings;
}
