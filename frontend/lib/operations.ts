import { apiBaseUrl } from "@/lib/config";
import { downloadCsv, parseCsv } from "@/lib/csv";

export type OperationType = "qna" | "bug" | "cr";

export type OperationRecord = {
  id: string;
  type: OperationType;
  title: string;
  status: string;
  priority: string;
  owner: string;
  dueDate: string;
  customerOwner: string;
  projectName: string;
  fieldA: string;
  fieldB: string;
  fieldC: string;
  fieldD: string;
  fieldE: string;
  createdAt: string;
  updatedAt: string;
};

export type OperationRecordInput = Omit<OperationRecord, "id" | "createdAt" | "updatedAt">;

export type DecisionLogEntry = {
  id: string;
  title: string;
  decision: string;
  owner: string;
  decisionDate: string;
  impact: string;
  evidenceUrl: string;
  relatedRecordId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
};

export type DecisionLogInput = Omit<DecisionLogEntry, "id" | "createdAt" | "updatedAt">;

export type ReleaseGateChecklist = {
  projectName: string;
  releaseDate: string;
  uatStart: string;
  uatEnd: string;
  qnaClosed: boolean;
  criticalBugClosed: boolean;
  crReviewed: boolean;
  uatPassed: boolean;
  evidenceReady: boolean;
  customerApproved: boolean;
  deployNoteReady: boolean;
  note: string;
  updatedAt: string;
};

export type OperationDependencyRelation = "blocks" | "depends_on" | "duplicates" | "related";

export type OperationDependencyLink = {
  id: string;
  projectName: string;
  sourceId: string;
  targetId: string;
  relation: OperationDependencyRelation;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type OperationDependencyInput = Omit<OperationDependencyLink, "id" | "createdAt" | "updatedAt">;

export type TestMatrixStatus = "Not Started" | "In Progress" | "Passed" | "Failed" | "Blocked";

export type OperationTestMatrixItem = {
  id: string;
  projectName: string;
  requirement: string;
  operationId: string;
  testCase: string;
  expectedResult: string;
  owner: string;
  uatStatus: TestMatrixStatus;
  evidenceUrl: string;
  lastRunDate: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type OperationTestMatrixInput = Omit<OperationTestMatrixItem, "id" | "createdAt" | "updatedAt">;

export type SlaEscalation = {
  record: OperationRecord;
  ageDays: number;
  daysUntilDue: number | null;
  level: "watch" | "warning" | "critical";
  reason: string;
  suggestedAction: string;
};

const API_BASE = `${apiBaseUrl}/operations`;
const DECISION_LOG_KEY = "brse.operations.decisionLog.v1";
const RELEASE_GATE_KEY = "brse.operations.releaseGate.v1";
const DEPENDENCY_LINK_KEY = "brse.operations.dependencyLinks.v1";
const TEST_MATRIX_KEY = "brse.operations.testMatrix.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createLocalId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function getOperationRecords(): Promise<OperationRecord[]> {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Failed to fetch operations");
    const raw = await res.json();
    return Array.isArray(raw) ? raw.map(mapToCamel) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function saveOperationRecord(input: OperationRecordInput, existingId?: string): Promise<OperationRecord | null> {
  const normalized: OperationRecordInput = {
    ...input,
    title: input.title.trim() || "Untitled item",
    owner: input.owner.trim(),
    customerOwner: input.customerOwner.trim(),
    projectName: input.projectName.trim(),
    fieldA: input.fieldA.trim(),
    fieldB: input.fieldB.trim(),
    fieldC: input.fieldC.trim(),
    fieldD: input.fieldD.trim(),
    fieldE: input.fieldE.trim()
  };

  try {
    const method = existingId ? "PUT" : "POST";
    const url = existingId ? `${API_BASE}/${existingId}` : API_BASE;
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapToSnake(normalized))
    });
    
    if (!res.ok) throw new Error("Failed to save operation record");
    return mapToCamel(await res.json());
  } catch (error) {
    console.error(error);
    return null;
  }
}

function mapToCamel(raw: any): OperationRecord {
  return {
    id: raw.id ?? "",
    type: raw.type ?? "qna",
    title: raw.title ?? "",
    status: raw.status ?? "",
    priority: raw.priority ?? "",
    owner: raw.owner ?? "",
    dueDate: raw.dueDate ?? raw.due_date ?? "",
    customerOwner: raw.customerOwner ?? raw.customer_owner ?? "",
    projectName: raw.projectName ?? raw.project_name ?? "",
    fieldA: raw.fieldA ?? raw.field_a ?? "",
    fieldB: raw.fieldB ?? raw.field_b ?? "",
    fieldC: raw.fieldC ?? raw.field_c ?? "",
    fieldD: raw.fieldD ?? raw.field_d ?? "",
    fieldE: raw.fieldE ?? raw.field_e ?? "",
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? ""
  };
}

function mapToSnake(input: OperationRecordInput) {
  return {
    type: input.type,
    title: input.title,
    status: input.status,
    priority: input.priority,
    owner: input.owner,
    due_date: input.dueDate,
    customer_owner: input.customerOwner,
    project_name: input.projectName,
    field_a: input.fieldA,
    field_b: input.fieldB,
    field_c: input.fieldC,
    field_d: input.fieldD,
    field_e: input.fieldE
  };
}

export async function deleteOperationRecord(recordId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${recordId}`, {
      method: "DELETE"
    });
    return res.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function getDecisionLogs(): DecisionLogEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(DECISION_LOG_KEY);
    const parsed = raw ? (JSON.parse(raw) as DecisionLogEntry[]) : [];
    return Array.isArray(parsed)
      ? parsed
          .map((item) => ({
            ...item,
            projectName: item.projectName ?? "",
            relatedRecordId: item.relatedRecordId ?? "",
            evidenceUrl: item.evidenceUrl ?? "",
            impact: item.impact ?? "",
            owner: item.owner ?? "",
            decisionDate: item.decisionDate ?? "",
            decision: item.decision ?? "",
            title: item.title ?? ""
          }))
          .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
      : [];
  } catch {
    return [];
  }
}

export function saveDecisionLog(input: DecisionLogInput, existingId?: string): DecisionLogEntry {
  const current = getDecisionLogs();
  const now = new Date().toISOString();
  const existing = existingId ? current.find((item) => item.id === existingId) : null;
  const nextItem: DecisionLogEntry = {
    id: existing?.id ?? createLocalId("decision"),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...input
  };
  const next = existing ? current.map((item) => (item.id === existing.id ? nextItem : item)) : [nextItem, ...current];
  if (canUseStorage()) {
    window.localStorage.setItem(DECISION_LOG_KEY, JSON.stringify(next));
  }
  return nextItem;
}

export function deleteDecisionLog(decisionId: string) {
  if (!canUseStorage()) return;
  const next = getDecisionLogs().filter((item) => item.id !== decisionId);
  window.localStorage.setItem(DECISION_LOG_KEY, JSON.stringify(next));
}

function mapDecisionLog(raw: any): DecisionLogEntry {
  return {
    id: raw.id ?? "",
    title: raw.title ?? "",
    decision: raw.decision ?? "",
    owner: raw.owner ?? "",
    decisionDate: raw.decisionDate ?? raw.decision_date ?? "",
    impact: raw.impact ?? "",
    evidenceUrl: raw.evidenceUrl ?? raw.evidence_url ?? "",
    relatedRecordId: raw.relatedRecordId ?? raw.related_record_id ?? "",
    projectName: raw.projectName ?? raw.project_name ?? "",
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? ""
  };
}

function mapDecisionLogToSnake(input: DecisionLogInput) {
  return {
    title: input.title,
    decision: input.decision,
    owner: input.owner,
    decision_date: input.decisionDate,
    impact: input.impact,
    evidence_url: input.evidenceUrl,
    related_record_id: input.relatedRecordId,
    project_name: input.projectName,
  };
}

export async function getDecisionLogsServerFirst(): Promise<DecisionLogEntry[]> {
  try {
    const raw = await requestJson<any[]>(`${API_BASE}/decision-logs`);
    return Array.isArray(raw) ? raw.map(mapDecisionLog) : [];
  } catch (error) {
    console.warn("Falling back to local decision logs", error);
    return getDecisionLogs();
  }
}

export async function saveDecisionLogServerFirst(input: DecisionLogInput, existingId?: string): Promise<DecisionLogEntry> {
  const normalized: DecisionLogInput = {
    ...input,
    title: input.title.trim() || "Decision log",
    decision: input.decision.trim(),
    owner: input.owner.trim(),
    evidenceUrl: input.evidenceUrl.trim(),
    impact: input.impact.trim(),
    projectName: input.projectName.trim(),
  };
  try {
    const raw = await requestJson<any>(
      existingId ? `${API_BASE}/decision-logs/${existingId}` : `${API_BASE}/decision-logs`,
      {
        method: existingId ? "PUT" : "POST",
        body: JSON.stringify(mapDecisionLogToSnake(normalized)),
      }
    );
    return mapDecisionLog(raw);
  } catch (error) {
    console.warn("Falling back to local decision log save", error);
    return saveDecisionLog(normalized, existingId);
  }
}

export async function deleteDecisionLogServerFirst(decisionId: string): Promise<void> {
  try {
    await requestJson(`${API_BASE}/decision-logs/${decisionId}`, { method: "DELETE" });
  } catch (error) {
    console.warn("Falling back to local decision log delete", error);
  }
  deleteDecisionLog(decisionId);
}

export function getOperationDependencyLinks(): OperationDependencyLink[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(DEPENDENCY_LINK_KEY);
    const parsed = raw ? (JSON.parse(raw) as OperationDependencyLink[]) : [];
    return Array.isArray(parsed)
      ? parsed
          .map((item) => ({
            ...item,
            projectName: item.projectName ?? "",
            sourceId: item.sourceId ?? "",
            targetId: item.targetId ?? "",
            relation: item.relation ?? "related",
            note: item.note ?? "",
            createdAt: item.createdAt ?? "",
            updatedAt: item.updatedAt ?? ""
          }))
          .filter((item) => item.sourceId && item.targetId)
          .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
      : [];
  } catch {
    return [];
  }
}

export function saveOperationDependencyLink(input: OperationDependencyInput, existingId?: string): OperationDependencyLink {
  const current = getOperationDependencyLinks();
  const now = new Date().toISOString();
  const existing = existingId ? current.find((item) => item.id === existingId) : null;
  const nextItem: OperationDependencyLink = {
    id: existing?.id ?? createLocalId("dependency"),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    projectName: input.projectName.trim(),
    sourceId: input.sourceId,
    targetId: input.targetId,
    relation: input.relation,
    note: input.note.trim()
  };
  const next = existing ? current.map((item) => (item.id === existing.id ? nextItem : item)) : [nextItem, ...current];
  if (canUseStorage()) {
    window.localStorage.setItem(DEPENDENCY_LINK_KEY, JSON.stringify(next));
  }
  return nextItem;
}

export function deleteOperationDependencyLink(linkId: string) {
  if (!canUseStorage()) return;
  const next = getOperationDependencyLinks().filter((item) => item.id !== linkId);
  window.localStorage.setItem(DEPENDENCY_LINK_KEY, JSON.stringify(next));
}

function mapDependencyLink(raw: any): OperationDependencyLink {
  return {
    id: raw.id ?? "",
    projectName: raw.projectName ?? raw.project_name ?? "",
    sourceId: raw.sourceId ?? raw.source_id ?? "",
    targetId: raw.targetId ?? raw.target_id ?? "",
    relation: raw.relation ?? "related",
    note: raw.note ?? "",
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? ""
  };
}

function mapDependencyLinkToSnake(input: OperationDependencyInput) {
  return {
    project_name: input.projectName,
    source_id: input.sourceId,
    target_id: input.targetId,
    relation: input.relation,
    note: input.note,
  };
}

export async function getOperationDependencyLinksServerFirst(): Promise<OperationDependencyLink[]> {
  try {
    const raw = await requestJson<any[]>(`${API_BASE}/dependency-links`);
    return Array.isArray(raw) ? raw.map(mapDependencyLink) : [];
  } catch (error) {
    console.warn("Falling back to local dependency links", error);
    return getOperationDependencyLinks();
  }
}

export async function saveOperationDependencyLinkServerFirst(input: OperationDependencyInput, existingId?: string): Promise<OperationDependencyLink> {
  const normalized: OperationDependencyInput = {
    projectName: input.projectName.trim(),
    sourceId: input.sourceId,
    targetId: input.targetId,
    relation: input.relation,
    note: input.note.trim(),
  };
  try {
    const raw = await requestJson<any>(
      existingId ? `${API_BASE}/dependency-links/${existingId}` : `${API_BASE}/dependency-links`,
      {
        method: existingId ? "PUT" : "POST",
        body: JSON.stringify(mapDependencyLinkToSnake(normalized)),
      }
    );
    return mapDependencyLink(raw);
  } catch (error) {
    console.warn("Falling back to local dependency link save", error);
    return saveOperationDependencyLink(normalized, existingId);
  }
}

export async function deleteOperationDependencyLinkServerFirst(linkId: string): Promise<void> {
  try {
    await requestJson(`${API_BASE}/dependency-links/${linkId}`, { method: "DELETE" });
  } catch (error) {
    console.warn("Falling back to local dependency link delete", error);
  }
  deleteOperationDependencyLink(linkId);
}

export function getOperationTestMatrixItems(): OperationTestMatrixItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(TEST_MATRIX_KEY);
    const parsed = raw ? (JSON.parse(raw) as OperationTestMatrixItem[]) : [];
    return Array.isArray(parsed)
      ? parsed
          .map((item) => ({
            ...item,
            projectName: item.projectName ?? "",
            requirement: item.requirement ?? "",
            operationId: item.operationId ?? "",
            testCase: item.testCase ?? "",
            expectedResult: item.expectedResult ?? "",
            owner: item.owner ?? "",
            uatStatus: item.uatStatus ?? "Not Started",
            evidenceUrl: item.evidenceUrl ?? "",
            lastRunDate: item.lastRunDate ?? "",
            note: item.note ?? "",
            createdAt: item.createdAt ?? "",
            updatedAt: item.updatedAt ?? ""
          }))
          .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
      : [];
  } catch {
    return [];
  }
}

export function saveOperationTestMatrixItem(input: OperationTestMatrixInput, existingId?: string): OperationTestMatrixItem {
  const current = getOperationTestMatrixItems();
  const now = new Date().toISOString();
  const existing = existingId ? current.find((item) => item.id === existingId) : null;
  const nextItem: OperationTestMatrixItem = {
    id: existing?.id ?? createLocalId("test"),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    projectName: input.projectName.trim(),
    requirement: input.requirement.trim() || "Untitled requirement",
    operationId: input.operationId,
    testCase: input.testCase.trim(),
    expectedResult: input.expectedResult.trim(),
    owner: input.owner.trim(),
    uatStatus: input.uatStatus,
    evidenceUrl: input.evidenceUrl.trim(),
    lastRunDate: input.lastRunDate,
    note: input.note.trim()
  };
  const next = existing ? current.map((item) => (item.id === existing.id ? nextItem : item)) : [nextItem, ...current];
  if (canUseStorage()) {
    window.localStorage.setItem(TEST_MATRIX_KEY, JSON.stringify(next));
  }
  return nextItem;
}

export function deleteOperationTestMatrixItem(itemId: string) {
  if (!canUseStorage()) return;
  const next = getOperationTestMatrixItems().filter((item) => item.id !== itemId);
  window.localStorage.setItem(TEST_MATRIX_KEY, JSON.stringify(next));
}

function mapTestMatrixItem(raw: any): OperationTestMatrixItem {
  return {
    id: raw.id ?? "",
    projectName: raw.projectName ?? raw.project_name ?? "",
    requirement: raw.requirement ?? "",
    operationId: raw.operationId ?? raw.operation_id ?? "",
    testCase: raw.testCase ?? raw.test_case ?? "",
    expectedResult: raw.expectedResult ?? raw.expected_result ?? "",
    owner: raw.owner ?? "",
    uatStatus: raw.uatStatus ?? raw.uat_status ?? "Not Started",
    evidenceUrl: raw.evidenceUrl ?? raw.evidence_url ?? "",
    lastRunDate: raw.lastRunDate ?? raw.last_run_date ?? "",
    note: raw.note ?? "",
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? ""
  };
}

function mapTestMatrixItemToSnake(input: OperationTestMatrixInput) {
  return {
    project_name: input.projectName,
    requirement: input.requirement,
    operation_id: input.operationId,
    test_case: input.testCase,
    expected_result: input.expectedResult,
    owner: input.owner,
    uat_status: input.uatStatus,
    evidence_url: input.evidenceUrl,
    last_run_date: input.lastRunDate,
    note: input.note,
  };
}

export async function getOperationTestMatrixItemsServerFirst(): Promise<OperationTestMatrixItem[]> {
  try {
    const raw = await requestJson<any[]>(`${API_BASE}/test-matrix`);
    return Array.isArray(raw) ? raw.map(mapTestMatrixItem) : [];
  } catch (error) {
    console.warn("Falling back to local test matrix", error);
    return getOperationTestMatrixItems();
  }
}

export async function saveOperationTestMatrixItemServerFirst(input: OperationTestMatrixInput, existingId?: string): Promise<OperationTestMatrixItem> {
  const normalized: OperationTestMatrixInput = {
    projectName: input.projectName.trim(),
    requirement: input.requirement.trim() || "Untitled requirement",
    operationId: input.operationId,
    testCase: input.testCase.trim(),
    expectedResult: input.expectedResult.trim(),
    owner: input.owner.trim(),
    uatStatus: input.uatStatus,
    evidenceUrl: input.evidenceUrl.trim(),
    lastRunDate: input.lastRunDate,
    note: input.note.trim(),
  };
  try {
    const raw = await requestJson<any>(
      existingId ? `${API_BASE}/test-matrix/${existingId}` : `${API_BASE}/test-matrix`,
      {
        method: existingId ? "PUT" : "POST",
        body: JSON.stringify(mapTestMatrixItemToSnake(normalized)),
      }
    );
    return mapTestMatrixItem(raw);
  } catch (error) {
    console.warn("Falling back to local test matrix save", error);
    return saveOperationTestMatrixItem(normalized, existingId);
  }
}

export async function deleteOperationTestMatrixItemServerFirst(itemId: string): Promise<void> {
  try {
    await requestJson(`${API_BASE}/test-matrix/${itemId}`, { method: "DELETE" });
  } catch (error) {
    console.warn("Falling back to local test matrix delete", error);
  }
  deleteOperationTestMatrixItem(itemId);
}

export function getReleaseGate(projectName: string): ReleaseGateChecklist {
  const empty: ReleaseGateChecklist = {
    projectName,
    releaseDate: "",
    uatStart: "",
    uatEnd: "",
    qnaClosed: false,
    criticalBugClosed: false,
    crReviewed: false,
    uatPassed: false,
    evidenceReady: false,
    customerApproved: false,
    deployNoteReady: false,
    note: "",
    updatedAt: ""
  };
  if (!canUseStorage()) return empty;
  try {
    const raw = window.localStorage.getItem(RELEASE_GATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ReleaseGateChecklist>) : {};
    return parsed[projectName] ? { ...empty, ...parsed[projectName], projectName } : empty;
  } catch {
    return empty;
  }
}

export function saveReleaseGate(input: ReleaseGateChecklist) {
  if (!canUseStorage()) return input;
  let current: Record<string, ReleaseGateChecklist> = {};
  try {
    const raw = window.localStorage.getItem(RELEASE_GATE_KEY);
    current = raw ? (JSON.parse(raw) as Record<string, ReleaseGateChecklist>) : {};
  } catch {
    current = {};
  }
  const next = {
    ...current,
    [input.projectName || "default"]: {
      ...input,
      updatedAt: new Date().toISOString()
    }
  };
  window.localStorage.setItem(RELEASE_GATE_KEY, JSON.stringify(next));
  return next[input.projectName || "default"];
}

function mapReleaseGate(raw: any, projectName: string): ReleaseGateChecklist {
  return {
    projectName: raw.projectName ?? raw.project_name ?? projectName,
    releaseDate: raw.releaseDate ?? raw.release_date ?? "",
    uatStart: raw.uatStart ?? raw.uat_start ?? "",
    uatEnd: raw.uatEnd ?? raw.uat_end ?? "",
    qnaClosed: Boolean(raw.qnaClosed ?? raw.qna_closed),
    criticalBugClosed: Boolean(raw.criticalBugClosed ?? raw.critical_bug_closed),
    crReviewed: Boolean(raw.crReviewed ?? raw.cr_reviewed),
    uatPassed: Boolean(raw.uatPassed ?? raw.uat_passed),
    evidenceReady: Boolean(raw.evidenceReady ?? raw.evidence_ready),
    customerApproved: Boolean(raw.customerApproved ?? raw.customer_approved),
    deployNoteReady: Boolean(raw.deployNoteReady ?? raw.deploy_note_ready),
    note: raw.note ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? ""
  };
}

function mapReleaseGateToSnake(input: ReleaseGateChecklist) {
  return {
    project_name: input.projectName,
    release_date: input.releaseDate,
    uat_start: input.uatStart,
    uat_end: input.uatEnd,
    qna_closed: input.qnaClosed,
    critical_bug_closed: input.criticalBugClosed,
    cr_reviewed: input.crReviewed,
    uat_passed: input.uatPassed,
    evidence_ready: input.evidenceReady,
    customer_approved: input.customerApproved,
    deploy_note_ready: input.deployNoteReady,
    note: input.note,
  };
}

export async function getReleaseGateServerFirst(projectName: string): Promise<ReleaseGateChecklist> {
  try {
    const raw = await requestJson<any>(`${API_BASE}/release-gates/${encodeURIComponent(projectName || "default")}`);
    return mapReleaseGate(raw, projectName);
  } catch (error) {
    console.warn("Falling back to local release gate", error);
    return getReleaseGate(projectName);
  }
}

export async function saveReleaseGateServerFirst(input: ReleaseGateChecklist): Promise<ReleaseGateChecklist> {
  try {
    const raw = await requestJson<any>(`${API_BASE}/release-gates/${encodeURIComponent(input.projectName || "default")}`, {
      method: "PUT",
      body: JSON.stringify(mapReleaseGateToSnake(input)),
    });
    return mapReleaseGate(raw, input.projectName);
  } catch (error) {
    console.warn("Falling back to local release gate save", error);
    return saveReleaseGate(input);
  }
}

export function getReleaseGateProgress(gate: ReleaseGateChecklist) {
  const checks = [
    gate.qnaClosed,
    gate.criticalBugClosed,
    gate.crReviewed,
    gate.uatPassed,
    gate.evidenceReady,
    gate.customerApproved,
    gate.deployNoteReady
  ];
  const done = checks.filter(Boolean).length;
  return {
    done,
    total: checks.length,
    percent: checks.length ? Math.round((done / checks.length) * 100) : 0
  };
}

export function isOverdue(record: OperationRecord, todayIso: string) {
  return record.type === "qna" && record.dueDate && record.dueDate < todayIso && !["Answered", "Closed"].includes(record.status);
}

export function isDueToday(record: OperationRecord, todayIso: string) {
  return record.type === "qna" && record.dueDate === todayIso && !["Answered", "Closed"].includes(record.status);
}

export function getSlaEscalations(records: OperationRecord[], today = new Date()): SlaEscalation[] {
  const todayKey = today.toISOString().slice(0, 10);
  const todayStart = new Date(`${todayKey}T00:00:00`).getTime();

  return records
    .filter((record) => record.type === "qna" && !["Answered", "Closed"].includes(record.status))
    .map((record) => {
      const createdKey = (record.createdAt || record.updatedAt || todayKey).slice(0, 10);
      const createdAt = new Date(`${createdKey}T00:00:00`).getTime();
      const ageDays = Math.max(0, Math.floor((todayStart - createdAt) / 86400000));
      const daysUntilDue = record.dueDate
        ? Math.ceil((new Date(`${record.dueDate}T00:00:00`).getTime() - todayStart) / 86400000)
        : null;
      const priority = record.priority.toLowerCase();
      let level: SlaEscalation["level"] = "watch";
      let reason = "Q&A đang mở, cần theo dõi trước khi chạm SLA.";
      let suggestedAction = "Theo dõi trong daily và chuẩn bị reminder nếu chưa có phản hồi.";

      if (daysUntilDue !== null && daysUntilDue < 0) {
        level = "critical";
        reason = `Quá hạn ${Math.abs(daysUntilDue)} ngày.`;
        suggestedAction = "Escalate ngay cho owner/khách, cập nhật priority và gửi reminder.";
      } else if (daysUntilDue !== null && daysUntilDue <= 1) {
        level = "warning";
        reason = daysUntilDue === 0 ? "Hạn phản hồi là hôm nay." : "Còn 1 ngày tới hạn phản hồi.";
        suggestedAction = "Gửi reminder trước giờ daily hoặc trước cuối ngày.";
      } else if (ageDays >= 5 || (priority.includes("urgent") && ageDays >= 2) || (priority.includes("high") && ageDays >= 3)) {
        level = "warning";
        reason = `Đã chờ ${ageDays} ngày${record.dueDate ? "" : " và chưa có hạn rõ ràng"}.`;
        suggestedAction = "Đặt deadline rõ, gom context và nhắc người giữ câu trả lời.";
      }

      return {
        record,
        ageDays,
        daysUntilDue,
        level,
        reason,
        suggestedAction
      };
    })
    .filter((item) => item.level !== "watch" || item.ageDays >= 3 || item.daysUntilDue !== null)
    .sort((first, second) => {
      const levelRank = { critical: 3, warning: 2, watch: 1 };
      return levelRank[second.level] - levelRank[first.level] || second.ageDays - first.ageDays;
    });
}

export function exportOperationsCsv(records: OperationRecord[]) {
  downloadCsv("brse-operations.csv", records);
}

const HEADER_MAPPING: Record<string, string> = {
  "ID": "id",
  "種別": "type",
  "タイトル": "title",
  "バグ概要": "title",
  "変更内容": "title",
  "ステータス": "status",
  "優先度": "priority",
  "重要度": "priority",
  "担当者": "owner",
  "期限": "dueDate",
  "希望回答期限": "dueDate",
  "顧客担当": "customerOwner",
  "プロジェクト": "projectName",
  "確認事項": "fieldA",
  "発生環境": "fieldA",
  "背景・理由": "fieldA",
  "背景": "fieldB",
  "再現手順": "fieldB",
  "影響範囲": "fieldB",
  "回答": "fieldC",
  "期待結果": "fieldC",
  "工数・スケジュール影響": "fieldC",
  "決定事項": "fieldD",
  "実際結果": "fieldD",
  "承認・決定": "fieldD",
  "備考": "fieldE",
  "影響範囲・暫定対応": "fieldE",
  "変更履歴": "fieldE"
};

const MAX_CSV_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_CSV_IMPORT_ROWS = 500;
const ALLOWED_CSV_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "text/csv",
  "application/vnd.ms-excel",
]);

export async function importOperationsCsv(file: File): Promise<OperationRecord[]> {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Excel .xlsx import is disabled because the previous frontend parser had an unresolved security advisory. Export the workbook as .csv and import that file.");
  }
  if (!ALLOWED_CSV_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported CSV file type. Please import a standard .csv file.");
  }
  if (file.size > MAX_CSV_IMPORT_BYTES) {
    throw new Error("CSV file is too large. Please import a file under 2MB.");
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length > MAX_CSV_IMPORT_ROWS) {
    throw new Error(`CSV import is limited to ${MAX_CSV_IMPORT_ROWS} rows.`);
  }

  const importedRecords: OperationRecord[] = [];
        
  for (const rawItem of rows) {
    const item: any = {};
    Object.entries(rawItem).forEach(([key, value]) => {
      const mappedKey = HEADER_MAPPING[key] || key;
      item[mappedKey] = value;
    });

    let type: OperationType = "qna";
    const rawType = String(item.type || "").toLowerCase();
    if (rawType.includes("bug") || rawType.includes("不具合")) type = "bug";
    else if (rawType.includes("cr") || rawType.includes("変更")) type = "cr";
    else type = "qna";

    const input: OperationRecordInput = {
      type,
      title: item.title || "Imported Item",
      status: item.status || "Draft",
      priority: item.priority || "Medium",
      owner: item.owner || "",
      dueDate: item.dueDate || "",
      customerOwner: item.customerOwner || "",
      projectName: item.projectName || "",
      fieldA: String(item.fieldA || item.field_a || ""),
      fieldB: String(item.fieldB || item.field_b || ""),
      fieldC: String(item.fieldC || item.field_c || ""),
      fieldD: String(item.fieldD || item.field_d || ""),
      fieldE: String(item.fieldE || item.field_e || "")
    };
          
    const saved = await saveOperationRecord(input);
    if (saved) importedRecords.push(saved);
  }
  return importedRecords;
}

export function exportOperationsJson(records: OperationRecord[]) {
  return JSON.stringify(records, null, 2);
}

export function buildOperationEmail(record: OperationRecord) {
  if (record.type === "qna") {
    return `お疲れ様です。\n${record.projectName || "〇〇プロジェクト"}を担当しております。\n\n以下の確認事項について、ご回答いただけますでしょうか。\n\n【確認事項】\n${record.fieldA || record.title}\n\n【背景】\n${record.fieldB || "実装方針を確定するため、確認が必要です。"}\n\n【希望回答期限】\n${record.dueDate || "ご都合の良いタイミング"}\n\nお忙しいところ恐れ入りますが、よろしくお願いいたします。`;
  }

  if (record.type === "bug") {
    return `お疲れ様です。\n不具合について以下の通りご報告いたします。\n\n【概要】\n${record.title}\n\n【発生環境】\n${record.fieldA || "未入力"}\n\n【再現手順】\n${record.fieldB || "未入力"}\n\n【期待結果】\n${record.fieldC || "未入力"}\n\n【実際結果】\n${record.fieldD || "未入力"}\n\n【影響範囲・暫定対応】\n${record.fieldE || "調査中です。"}\n\nご確認のほど、よろしくお願いいたします。`;
  }

  return `お疲れ様です。\n変更依頼について以下の通り整理いたしました。\n\n【変更内容】\n${record.title}\n\n【背景・理由】\n${record.fieldA || "未入力"}\n\n【影響範囲】\n${record.fieldB || "調査中"}\n\n【工数・スケジュール影響】\n${record.fieldC || "調査中"}\n\n【確認事項・判断待ち】\n${record.fieldD || "ご承認可否をご確認ください。"}\n\n上記内容で進めてよろしいでしょうか。\nよろしくお願いいたします。`;
}

export function buildBatchQnaEmail(records: OperationRecord[], projectName?: string) {
  const intro = `お疲れ様です。\n${projectName || "〇〇プロジェクト"}を担当しております。\n\n以下の${records.length}点の確認事項について、ご回答いただけますでしょうか。\n\n`;
  
  const body = records.map((record, index) => {
    return `■ ${index + 1}. ${record.title}
【確認事項】
${record.fieldA || "未入力"}

【背景】
${record.fieldB || "実装方針を確定するため、確認が必要です。"}

【希望回答期限】
${record.dueDate || "ご都合の良いタイミング"}
`;
  }).join("\n");

  const outro = `\nお忙しいところ恐れ入りますが、よろしくお願いいたします。`;
  
  return intro + body + outro;
}

// -------------------------------------------------------
// F5 — Excel Data Engine (Export JP Format)
// -------------------------------------------------------
export type OperationExportRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  priority: string;
  owner: string;
  dueDate: string;
  customerOwner: string;
  projectName: string;
  fieldA: string;
  fieldB: string;
  fieldC: string;
  fieldD: string;
  fieldE: string;
};

const QNA_HEADERS: Record<string, string> = {
  id: "ID",
  type: "種別",
  title: "タイトル",
  status: "ステータス",
  priority: "優先度",
  owner: "担当者",
  dueDate: "期限",
  customerOwner: "顧客担当",
  projectName: "プロジェクト",
  fieldA: "確認事項",
  fieldB: "背景",
  fieldC: "回答",
  fieldD: "決定事項",
  fieldE: "備考",
};

const BUG_HEADERS: Record<string, string> = {
  id: "ID",
  type: "種別",
  title: "バグ概要",
  status: "ステータス",
  priority: "重要度",
  owner: "担当者",
  dueDate: "期限",
  customerOwner: "顧客担当",
  projectName: "プロジェクト",
  fieldA: "発生環境",
  fieldB: "再現手順",
  fieldC: "期待結果",
  fieldD: "実際結果",
  fieldE: "影響範囲",
};

const CR_HEADERS: Record<string, string> = {
  id: "ID",
  type: "種別",
  title: "変更内容",
  status: "ステータス",
  priority: "優先度",
  owner: "担当者",
  dueDate: "期限",
  customerOwner: "顧客担当",
  projectName: "プロジェクト",
  fieldA: "背景・理由",
  fieldB: "影響範囲",
  fieldC: "工数・スケジュール影響",
  fieldD: "承認・決定",
  fieldE: "変更履歴",
};

export function exportOperationsCsvJP(
  records: OperationExportRow[],
  opType: "qna" | "bug" | "cr"
) {
  const headerMap =
    opType === "qna" ? QNA_HEADERS : opType === "bug" ? BUG_HEADERS : CR_HEADERS;

  const rows = records.map((r) => {
    const row: Record<string, string> = {};
    Object.keys(headerMap).forEach((k) => {
      row[headerMap[k]] = (r as any)[k] ?? "";
    });
    return row;
  });

  const sheetName =
    opType === "qna" ? "Q&Aリスト" : opType === "bug" ? "不具合リスト" : "変更依頼リスト";
  const fileName =
    opType === "qna"
      ? "brse-qna-list.csv"
      : opType === "bug"
      ? "brse-bug-list.csv"
      : "brse-cr-list.csv";

  void sheetName;
  downloadCsv(fileName, rows);
}

export function downloadImportTemplate(opType: "qna" | "bug" | "cr") {
  const headerMap =
    opType === "qna" ? QNA_HEADERS : opType === "bug" ? BUG_HEADERS : CR_HEADERS;
  
  const emptyRow: Record<string, string> = {};
  Object.values(headerMap).forEach(v => {
    emptyRow[v] = "";
  });

  downloadCsv(`template-${opType}.csv`, [emptyRow]);
}
