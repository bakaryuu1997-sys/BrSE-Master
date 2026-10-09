import {
  getReleaseGate,
  getReleaseGateProgress,
  type DecisionLogEntry,
  type OperationDependencyLink,
  type OperationRecord,
  type OperationTestMatrixItem,
  type ReleaseGateChecklist,
} from "@/lib/operations";

export function buildOperationsReleaseModel({
  records,
  currentProjectName,
  decisionLogs,
  releaseGate,
  dependencyLinks,
  testMatrixItems,
}: {
  records: OperationRecord[];
  currentProjectName: string;
  decisionLogs: DecisionLogEntry[];
  releaseGate: ReleaseGateChecklist;
  dependencyLinks: OperationDependencyLink[];
  testMatrixItems: OperationTestMatrixItem[];
}) {
  const projectRecords = records.filter((record) => (record.projectName || currentProjectName) === currentProjectName);
  const projectDecisionLogs = decisionLogs.filter((item) => (item.projectName || currentProjectName) === currentProjectName);
  const projectReleaseGate = releaseGate.projectName === currentProjectName ? releaseGate : getReleaseGate(currentProjectName);
  const releaseGateProgress = getReleaseGateProgress(projectReleaseGate);
  const projectOpenQna = projectRecords.filter((record) => record.type === "qna" && !["Answered", "Closed"].includes(record.status)).length;
  const projectCriticalBugs = projectRecords.filter(
    (record) => record.type === "bug" && !["Fixed", "Verified", "Closed"].includes(record.status) && ["重大", "致命的", "High", "Urgent"].includes(record.priority),
  ).length;
  const projectPendingCr = projectRecords.filter((record) => record.type === "cr" && !["Approved", "Rejected", "Implemented", "Closed"].includes(record.status)).length;
  const recordById = new Map(records.map((record) => [record.id, record]));
  const projectRecordIds = new Set(projectRecords.map((record) => record.id));
  const projectDependencyLinks = dependencyLinks.filter(
    (link) =>
      (link.projectName || currentProjectName) === currentProjectName ||
      projectRecordIds.has(link.sourceId) ||
      projectRecordIds.has(link.targetId),
  );
  const dependencyRows = projectDependencyLinks
    .map((link) => ({
      link,
      source: recordById.get(link.sourceId) ?? null,
      target: recordById.get(link.targetId) ?? null,
    }))
    .filter((row) => row.source || row.target);
  const projectTestMatrixItems = testMatrixItems.filter((item) => (item.projectName || currentProjectName) === currentProjectName);
  const testMatrixStats = {
    total: projectTestMatrixItems.length,
    passed: projectTestMatrixItems.filter((item) => item.uatStatus === "Passed").length,
    failed: projectTestMatrixItems.filter((item) => item.uatStatus === "Failed").length,
    blocked: projectTestMatrixItems.filter((item) => item.uatStatus === "Blocked").length,
  };
  const testMatrixPercent = testMatrixStats.total ? Math.round((testMatrixStats.passed / testMatrixStats.total) * 100) : 0;

  return {
    projectRecords,
    projectDecisionLogs,
    projectReleaseGate,
    releaseGateProgress,
    projectOpenQna,
    projectCriticalBugs,
    projectPendingCr,
    recordById,
    projectDependencyLinks,
    dependencyRows,
    projectTestMatrixItems,
    testMatrixStats,
    testMatrixPercent,
  };
}
