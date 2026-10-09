"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUiLanguage } from "@/components/LanguageProvider";
import {
  useDeleteOperationDecisionLogMutation,
  useOperationsQuery,
  useOperationDecisionLogsQuery,
  useSaveOperationDecisionLogMutation,
  useSaveOperationMutation,
  useDeleteOperationMutation,
} from "@/lib/operations-hooks";
import {
  deleteOperationDependencyLinkServerFirst,
  deleteOperationTestMatrixItemServerFirst,
  getOperationDependencyLinks,
  getOperationDependencyLinksServerFirst,
  getOperationTestMatrixItems,
  getOperationTestMatrixItemsServerFirst,
  getReleaseGate,
  getReleaseGateServerFirst,
  getSlaEscalations,
  importOperationsCsv,
  isOverdue,
  saveOperationDependencyLinkServerFirst,
  saveReleaseGateServerFirst,
  saveOperationTestMatrixItemServerFirst,
  type DecisionLogEntry,
  type DecisionLogInput,
  type OperationDependencyInput,
  type OperationDependencyLink,
  type OperationRecord,
  type OperationRecordInput,
  type OperationType,
  type OperationTestMatrixInput,
  type ReleaseGateChecklist,
  exportOperationsCsvJP,
  type OperationExportRow,
} from "@/lib/operations";
import {
  configs,
  daysSince,
  emptyDecisionForm,
  emptyDependencyForm,
  emptyForm,
  emptyTestMatrixForm,
  todayIso,
  buildOperationsBriefingItems,
  buildOperationsEmailPreviewState,
  buildOperationsReleaseModel,
  toOperationInput,
} from "@/features/operations";
import {
  findBrseTodoLinksByOperation,
  readActiveBrseTodoProjectId,
  readAllBrseTodoLinks,
  readBrseTodoProjects,
  upsertOperationTodo,
  type BrseTodoOperationLink,
  type BrseTodoProject,
} from "@/lib/brseTodo";
import { getActiveProject } from "@/lib/projectSettings";

const EMPTY_OPERATION_RECORDS: OperationRecord[] = [];
const EMPTY_DECISION_LOGS: DecisionLogEntry[] = [];

export type OperationsStatus = { text: string; kind: "success" | "error" | "info" };

export function useOperationsState() {
  const { t } = useUiLanguage();
  const { data: recordsData, isLoading: isQueryLoading } = useOperationsQuery();
  const records = recordsData ?? EMPTY_OPERATION_RECORDS;
  const { data: decisionLogsData, isLoading: isDecisionLogsLoading } = useOperationDecisionLogsQuery();
  const decisionLogs = decisionLogsData ?? EMPTY_DECISION_LOGS;
  const saveOperationMutation = useSaveOperationMutation();
  const deleteOperationMutation = useDeleteOperationMutation();
  const saveDecisionLogMutation = useSaveOperationDecisionLogMutation();
  const deleteDecisionLogMutation = useDeleteOperationDecisionLogMutation();
  const [activeType, setActiveType] = useState<OperationType>("qna");
  const [form, setForm] = useState<OperationRecordInput>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [isRecordEditorOpen, setIsRecordEditorOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatusState] = useState<OperationsStatus | null>(null);
  // Wrapper keeps every existing setStatus("...") call working while adding a
  // severity. Empty text clears the banner; failures pass kind "error".
  const setStatus = useCallback(
    (text: string, kind: OperationsStatus["kind"] = "success") =>
      setStatusState(text ? { text, kind } : null),
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [todoProjects, setTodoProjects] = useState<BrseTodoProject[]>([]);
  const [operationTodoLinks, setOperationTodoLinks] = useState<BrseTodoOperationLink[]>([]);
  const [decisionForm, setDecisionForm] = useState<DecisionLogInput>(emptyDecisionForm);
  const [editingDecisionId, setEditingDecisionId] = useState("");
  const [releaseGate, setReleaseGate] = useState<ReleaseGateChecklist>(() => getReleaseGate("default"));
  const [dependencyLinks, setDependencyLinks] = useState(() => getOperationDependencyLinks());
  const [dependencyForm, setDependencyForm] = useState<OperationDependencyInput>(emptyDependencyForm);
  const [editingDependencyId, setEditingDependencyId] = useState("");
  const [compactMode, setCompactMode] = useState(true);
  const [testMatrixItems, setTestMatrixItems] = useState(() => getOperationTestMatrixItems());
  const [testMatrixForm, setTestMatrixForm] = useState<OperationTestMatrixInput>(emptyTestMatrixForm);
  const [editingTestMatrixId, setEditingTestMatrixId] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<"work" | "release">("work");
  
  // Bulk Selection
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  // Guards the one-time server fetch of dependency/test-matrix data so it does not
  // re-run on every `records` change (refresh() re-fetches after mutations).
  const didInitRef = useRef(false);

  // Auto-dismiss the status banner so it doesn't linger forever.
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatusState(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = records;
        const params = new URLSearchParams(window.location.search);
        const typeParam = params.get("type");
        const idParam = params.get("id");
        const shouldCreate = params.get("new") === "1";
        if (typeParam === "qna" || typeParam === "bug" || typeParam === "cr") {
          setActiveType(typeParam);
          if (shouldCreate) {
            const project = getActiveProject();
            setEditingId("");
            setSelectedId("");
            setSelectedRecords(new Set());
            setForm({
              ...emptyForm,
              type: typeParam,
              status: configs[typeParam].statuses[0],
              projectName: project?.name ?? "",
              owner: project?.brse_name ?? "",
              customerOwner: project?.customer_name ?? ""
            });
            setIsRecordEditorOpen(true);
          }
        }
        if (!shouldCreate && idParam && data.some((record) => record.id === idParam)) {
          setSelectedId(idParam);
        }
      } catch (err) {
        setStatus(t("operations.connectionError"), "error");
      } finally {
        setIsLoading(false);
      }
      
      const project = getActiveProject();
      setForm((current) => ({
        ...current,
        projectName: project?.name ?? "",
        owner: project?.brse_name ?? "",
        customerOwner: project?.customer_name ?? ""
      }));
      setTodoProjects(readBrseTodoProjects().filter((project) => !project.archivedAt));
      setOperationTodoLinks(readAllBrseTodoLinks());
      if (!didInitRef.current) {
        didInitRef.current = true;
        setDependencyLinks(await getOperationDependencyLinksServerFirst());
        setTestMatrixItems(await getOperationTestMatrixItemsServerFirst());
      }
    }
    load();
  }, [records, t, setStatus]);

  const config = configs[activeType];
  const typeTitle = activeType === "qna" ? t("operations.qnaTitle") : activeType === "bug" ? t("operations.bugTitle") : t("operations.crTitle");
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const sameType = record.type === activeType;
      const searchable = [record.title, record.status, record.priority, record.owner, record.customerOwner, record.projectName, record.fieldA, record.fieldB, record.fieldC, record.fieldD, record.fieldE]
        .join(" ")
        .toLowerCase();
      return sameType && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeType, query, records]);

  const selectedRecord = records.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? null;
  const currentProjectName = selectedRecord?.projectName || getActiveProject()?.name || form.projectName || "General";
  const selectedTodoLinks = selectedRecord ? findBrseTodoLinksByOperation(selectedRecord.id) : [];
  const qnaOverdue = records.filter((record) => isOverdue(record, todayIso())).length;
  const openCount = records.filter((record) => !["Closed", "Done", "Rejected"].includes(record.status)).length;
  const linkedOperationIds = new Set(operationTodoLinks.map((link) => link.item.operationId));
  const qnaAging = records
    .filter((record) => record.type === "qna" && !["Answered", "Closed"].includes(record.status))
    .map((record) => ({
      record,
      age: daysSince(record.createdAt || record.updatedAt || todayIso()),
      overdue: Boolean(isOverdue(record, todayIso())),
    }))
    .sort((first, second) => Number(second.overdue) - Number(first.overdue) || second.age - first.age)
    .slice(0, 5);

  const {
    projectRecords,
    projectDecisionLogs,
    projectReleaseGate,
    releaseGateProgress,
    projectOpenQna,
    projectCriticalBugs,
    projectPendingCr,
    recordById,
    dependencyRows,
    projectTestMatrixItems,
    testMatrixStats,
    testMatrixPercent,
  } = buildOperationsReleaseModel({
    records,
    currentProjectName,
    decisionLogs,
    releaseGate,
    dependencyLinks,
    testMatrixItems,
  });

  const slaEscalations = getSlaEscalations(projectRecords).slice(0, 6);
  const operationsBriefingItems = buildOperationsBriefingItems({ slaEscalations, projectRecords });

  const { isBatchMode, emailPreview, emailSubject } = buildOperationsEmailPreviewState({
    records,
    selectedRecord,
    selectedRecordIds: selectedRecords,
    projectName: getActiveProject()?.name,
  });

  async function refresh(nextSelectedId?: string) {
    if (nextSelectedId) setSelectedId(nextSelectedId);
    setOperationTodoLinks(readAllBrseTodoLinks());
    setDependencyLinks(await getOperationDependencyLinksServerFirst());
    setTestMatrixItems(await getOperationTestMatrixItemsServerFirst());
  }

  function switchType(type: OperationType) {
    const project = getActiveProject();
    setActiveType(type);
    setEditingId("");
    setSelectedRecords(new Set());
    setForm({
      ...emptyForm,
      type,
      status: configs[type].statuses[0],
      projectName: project?.name ?? "",
      owner: project?.brse_name ?? "",
      customerOwner: project?.customer_name ?? ""
    });
    setStatus("");
  }

  function startCreate() {
    switchType(activeType);
    setIsRecordEditorOpen(true);
  }

  function updateField<K extends keyof OperationRecordInput>(key: K, value: OperationRecordInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus("");
  }

  function startEdit(record: OperationRecord) {
    setActiveType(record.type);
    setEditingId(record.id);
    setSelectedId(record.id);
    setSelectedRecords(new Set());
    setForm({
      type: record.type,
      title: record.title,
      status: record.status,
      priority: record.priority,
      owner: record.owner,
      dueDate: record.dueDate,
      customerOwner: record.customerOwner,
      projectName: record.projectName,
      fieldA: record.fieldA,
      fieldB: record.fieldB,
      fieldC: record.fieldC,
      fieldD: record.fieldD,
      fieldE: record.fieldE
    });
    setStatus(t("operations.editingItem"));
    setIsRecordEditorOpen(true);
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    try {
      const saved = await saveOperationMutation.mutateAsync({ input: form, existingId: editingId || undefined });
      await refresh(saved?.id);
      setEditingId(saved?.id ?? "");
      setStatus(editingId ? t("operations.itemUpdated") : t("operations.itemCreated"));
      setIsRecordEditorOpen(false);
    } catch {
      setStatus("Lưu record Operations thất bại.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function removeRecord(recordId: string) {
    setIsLoading(true);
    try {
      await deleteOperationMutation.mutateAsync(recordId);
      await refresh();
      if (editingId === recordId) setEditingId("");
      if (selectedId === recordId) setSelectedId("");
      
      const newSelected = new Set(selectedRecords);
      newSelected.delete(recordId);
      setSelectedRecords(newSelected);
      
      setStatus(t("operations.itemDeleted"));
    } catch {
      setStatus("Xóa record Operations thất bại.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyEmail() {
    if (!emailPreview) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailPreview}`);
      setStatus(t("operations.emailCopied"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Không copy được email.", "error");
    }
  }

  function startDecisionCreate() {
    setEditingDecisionId("");
    setDecisionForm({
      ...emptyDecisionForm,
      title: selectedRecord?.title || "",
      owner: selectedRecord?.owner || getActiveProject()?.brse_name || "",
      relatedRecordId: selectedRecord?.id || "",
      projectName: currentProjectName,
      decisionDate: todayIso(),
      impact: selectedRecord?.fieldD || selectedRecord?.fieldB || ""
    });
  }

  function startDecisionEdit(decisionId: string) {
    const target = decisionLogs.find((item) => item.id === decisionId);
    if (!target) return;
    setEditingDecisionId(target.id);
    setDecisionForm({
      title: target.title,
      decision: target.decision,
      owner: target.owner,
      decisionDate: target.decisionDate,
      impact: target.impact,
      evidenceUrl: target.evidenceUrl,
      relatedRecordId: target.relatedRecordId,
      projectName: target.projectName
    });
    setStatus(t("operations.editingDecision"));
  }

  async function submitDecisionLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
    const saved = await saveDecisionLogMutation.mutateAsync({
      input: {
        ...decisionForm,
        title: decisionForm.title.trim() || selectedRecord?.title || "Decision log",
        projectName: decisionForm.projectName || currentProjectName
      },
      existingId: editingDecisionId || undefined,
    });
    setEditingDecisionId(saved.id);
    setDecisionForm({
      title: saved.title,
      decision: saved.decision,
      owner: saved.owner,
      decisionDate: saved.decisionDate,
      impact: saved.impact,
      evidenceUrl: saved.evidenceUrl,
      relatedRecordId: saved.relatedRecordId,
      projectName: saved.projectName
    });
    setStatus(editingDecisionId ? t("operations.decisionUpdated") : t("operations.decisionSaved"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Lưu decision log thất bại.", "error");
    }
  }

  async function removeDecision(decisionId: string) {
    try {
      await deleteDecisionLogMutation.mutateAsync(decisionId);
      if (editingDecisionId === decisionId) {
        setEditingDecisionId("");
        setDecisionForm(emptyDecisionForm);
      }
      setStatus(t("operations.decisionDeleted"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Xóa decision log thất bại.", "error");
    }
  }

  function updateDecisionField<K extends keyof DecisionLogInput>(key: K, value: DecisionLogInput[K]) {
    setDecisionForm((current) => ({ ...current, [key]: value }));
  }

  async function updateReleaseGateField<K extends keyof ReleaseGateChecklist>(key: K, value: ReleaseGateChecklist[K]) {
    try {
      const next = await saveReleaseGateServerFirst({
        ...projectReleaseGate,
        projectName: currentProjectName,
        [key]: value
      });
      setReleaseGate(next);
      setStatus(t("operations.releaseGateUpdated"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Cập nhật release gate thất bại.", "error");
    }
  }

  async function syncReleaseGateSnapshot() {
    try {
      const next = await saveReleaseGateServerFirst({
        ...projectReleaseGate,
        projectName: currentProjectName,
        qnaClosed: projectOpenQna === 0,
        criticalBugClosed: projectCriticalBugs === 0,
        crReviewed: projectPendingCr === 0
      });
      setReleaseGate(next);
      setStatus(t("operations.releaseGateSynced"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Đồng bộ release gate thất bại.", "error");
    }
  }

  function startDependencyCreate() {
    setEditingDependencyId("");
    setDependencyForm({
      ...emptyDependencyForm,
      projectName: currentProjectName,
      sourceId: selectedRecord?.id || projectRecords[0]?.id || "",
      targetId: projectRecords.find((record: OperationRecord) => record.id !== selectedRecord?.id)?.id || "",
      relation: "blocks"
    });
  }

  function updateDependencyField<K extends keyof OperationDependencyInput>(key: K, value: OperationDependencyInput[K]) {
    setDependencyForm((current) => ({ ...current, [key]: value }));
  }

  async function submitDependency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dependencyForm.sourceId || !dependencyForm.targetId || dependencyForm.sourceId === dependencyForm.targetId) {
      setStatus(t("operations.dependencyError"), "error");
      return;
    }
    try {
    const saved = await saveOperationDependencyLinkServerFirst(
      {
        ...dependencyForm,
        projectName: dependencyForm.projectName || currentProjectName
      },
      editingDependencyId || undefined
    );
    setDependencyLinks(await getOperationDependencyLinksServerFirst());
    setEditingDependencyId(saved.id);
    setDependencyForm({
      projectName: saved.projectName,
      sourceId: saved.sourceId,
      targetId: saved.targetId,
      relation: saved.relation,
      note: saved.note
    });
    setStatus(editingDependencyId ? t("operations.dependencyUpdated") : t("operations.dependencySaved"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Lưu dependency thất bại.", "error");
    }
  }

  function startDependencyEdit(link: OperationDependencyLink) {
    setEditingDependencyId(link.id);
    setDependencyForm({
      projectName: link.projectName,
      sourceId: link.sourceId,
      targetId: link.targetId,
      relation: link.relation,
      note: link.note
    });
    setStatus(t("operations.editingDependency"));
  }

  async function removeDependency(linkId: string) {
    try {
      await deleteOperationDependencyLinkServerFirst(linkId);
      setDependencyLinks(await getOperationDependencyLinksServerFirst());
      if (editingDependencyId === linkId) {
        setEditingDependencyId("");
        setDependencyForm(emptyDependencyForm);
      }
      setStatus(t("operations.dependencyDeleted"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Xóa dependency thất bại.", "error");
    }
  }

  function startTestMatrixCreate() {
    setEditingTestMatrixId("");
    setTestMatrixForm({
      ...emptyTestMatrixForm,
      projectName: currentProjectName,
      operationId: selectedRecord?.id || "",
      requirement: selectedRecord?.title || "",
      owner: selectedRecord?.owner || getActiveProject()?.brse_name || "",
      lastRunDate: todayIso()
    });
  }

  function updateTestMatrixField<K extends keyof OperationTestMatrixInput>(key: K, value: OperationTestMatrixInput[K]) {
    setTestMatrixForm((current) => ({ ...current, [key]: value }));
  }

  async function submitTestMatrix(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
    const saved = await saveOperationTestMatrixItemServerFirst(
      {
        ...testMatrixForm,
        projectName: testMatrixForm.projectName || currentProjectName
      },
      editingTestMatrixId || undefined
    );
    setTestMatrixItems(await getOperationTestMatrixItemsServerFirst());
    setEditingTestMatrixId(saved.id);
    setTestMatrixForm({
      projectName: saved.projectName,
      requirement: saved.requirement,
      operationId: saved.operationId,
      testCase: saved.testCase,
      expectedResult: saved.expectedResult,
      owner: saved.owner,
      uatStatus: saved.uatStatus,
      evidenceUrl: saved.evidenceUrl,
      lastRunDate: saved.lastRunDate,
      note: saved.note
    });
    setStatus(editingTestMatrixId ? t("operations.testUpdated") : t("operations.testSaved"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Lưu test item thất bại.", "error");
    }
  }

  function startTestMatrixEdit(itemId: string) {
    const target = testMatrixItems.find((item) => item.id === itemId);
    if (!target) return;
    setEditingTestMatrixId(target.id);
    setTestMatrixForm({
      projectName: target.projectName,
      requirement: target.requirement,
      operationId: target.operationId,
      testCase: target.testCase,
      expectedResult: target.expectedResult,
      owner: target.owner,
      uatStatus: target.uatStatus,
      evidenceUrl: target.evidenceUrl,
      lastRunDate: target.lastRunDate,
      note: target.note
    });
    setStatus(t("operations.editingTest"));
  }

  async function removeTestMatrixItem(itemId: string) {
    try {
      await deleteOperationTestMatrixItemServerFirst(itemId);
      setTestMatrixItems(await getOperationTestMatrixItemsServerFirst());
      if (editingTestMatrixId === itemId) {
        setEditingTestMatrixId("");
        setTestMatrixForm(emptyTestMatrixForm);
      }
      setStatus(t("operations.testDeleted"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Xóa test item thất bại.", "error");
    }
  }

  async function applySlaEscalation(record: OperationRecord, reason: string, suggestedAction: string) {
    const stamp = `[SLA escalation ${todayIso()}] ${reason} ${suggestedAction}`;
    try {
    const saved = await saveOperationMutation.mutateAsync({
      input: {
        type: record.type,
        title: record.title,
        status: record.status === "Draft" ? "Sent" : record.status,
        priority: "Urgent",
        owner: record.owner,
        dueDate: record.dueDate || todayIso(),
        customerOwner: record.customerOwner,
        projectName: record.projectName,
        fieldA: record.fieldA,
        fieldB: record.fieldB,
        fieldC: record.fieldC,
        fieldD: record.fieldD,
        fieldE: record.fieldE ? `${record.fieldE}\n${stamp}` : stamp
      },
      existingId: record.id
    });
    await refresh(saved?.id || record.id);
    setActiveType("qna");
    setStatus(t("operations.escalationApplied"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Áp dụng SLA escalation thất bại.", "error");
    }
  }

  function syncSelectedOperationToTodo() {
    if (!selectedRecord) return;
    const activeTodoProjectId = readActiveBrseTodoProjectId();
    const fallbackProjectId = todoProjects[0]?.id || activeTodoProjectId || "personal";
    upsertOperationTodo(fallbackProjectId, selectedRecord);
    setTodoProjects(readBrseTodoProjects().filter((project) => !project.archivedAt));
    setOperationTodoLinks(readAllBrseTodoLinks());
    setStatus(t("operations.syncTodoSuccess"));
  }

  function openGmail() {
    if (!emailPreview) return;
    const project = getActiveProject();
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: project?.customer_email ?? "",
      su: emailSubject,
      body: emailPreview
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener,noreferrer");
    setStatus(t("operations.gmailOpened"));
  }

  useEffect(() => {
    let cancelled = false;
    async function loadReleaseGate() {
      const next = await getReleaseGateServerFirst(currentProjectName);
      if (!cancelled) setReleaseGate(next);
    }
    loadReleaseGate();
    return () => {
      cancelled = true;
    };
  }, [currentProjectName]);

  async function handleImportCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsLoading(true);
      await importOperationsCsv(file);
      await refresh();
      setStatus("Đã import CSV xong.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import CSV thất bại.", "error");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  }

  function handleExportCsv() {
    const toExport: OperationExportRow[] = filteredRecords.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      status: r.status,
      priority: r.priority,
      owner: r.owner,
      dueDate: r.dueDate,
      customerOwner: r.customerOwner,
      projectName: r.projectName,
      fieldA: r.fieldA,
      fieldB: r.fieldB,
      fieldC: r.fieldC,
      fieldD: r.fieldD,
      fieldE: r.fieldE,
    }));
    exportOperationsCsvJP(toExport, activeType);
    setStatus(`Đã export ${toExport.length} mục ra CSV.`);
  }

  function toggleRecordSelection(id: string) {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
  }

  async function bulkMarkSelectedQnaAnswered() {
    const targets = records.filter((record) => selectedRecords.has(record.id) && record.type === "qna");
    if (!targets.length) return;
    try {
    setStatus(`Đang lưu ${targets.length} Q&A...`, "info");
    await Promise.all(targets.map((record) => saveOperationMutation.mutateAsync({
      input: toOperationInput(record, { status: "Answered" }),
      existingId: record.id
    })));
    setSelectedRecords(new Set());
    await refresh(selectedId);
    setStatus(`Đã mark Answered ${targets.length} Q&A.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Mark Answered thất bại.", "error");
    }
  }

  return {
    records,
    activeType,
    setActiveType,
    form,
    editingId,
    isRecordEditorOpen,
    setIsRecordEditorOpen,
    query,
    setQuery,
    selectedId,
    setSelectedId,
    status,
    setStatus,
    isLoading: isLoading || isQueryLoading || isDecisionLogsLoading,
    todoProjects,
    operationTodoLinks,
    decisionLogs,
    decisionForm,
    editingDecisionId,
    setEditingDecisionId,
    setDecisionForm,
    releaseGate,
    dependencyLinks,
    dependencyForm,
    editingDependencyId,
    setEditingDependencyId,
    setDependencyForm,
    compactMode,
    setCompactMode,
    testMatrixItems,
    testMatrixForm,
    editingTestMatrixId,
    setEditingTestMatrixId,
    setTestMatrixForm,
    workspaceTab,
    setWorkspaceTab,
    selectedRecords,
    setSelectedRecords,

    config,
    typeTitle,
    filteredRecords,
    selectedRecord,
    currentProjectName,
    selectedTodoLinks,
    qnaOverdue,
    openCount,
    linkedOperationIds,
    qnaAging,
    
    projectRecords,
    projectDecisionLogs,
    projectReleaseGate,
    releaseGateProgress,
    projectOpenQna,
    projectCriticalBugs,
    projectPendingCr,
    recordById,
    dependencyRows,
    projectTestMatrixItems,
    testMatrixStats,
    testMatrixPercent,
    
    slaEscalations,
    operationsBriefingItems,
    
    isBatchMode,
    emailPreview,
    emailSubject,

    refresh,
    switchType,
    startCreate,
    updateField,
    startEdit,
    submitRecord,
    removeRecord,
    copyEmail,
    startDecisionCreate,
    startDecisionEdit,
    submitDecisionLog,
    removeDecision,
    updateDecisionField,
    updateReleaseGateField,
    syncReleaseGateSnapshot,
    startDependencyCreate,
    updateDependencyField,
    submitDependency,
    startDependencyEdit,
    removeDependency,
    startTestMatrixCreate,
    updateTestMatrixField,
    submitTestMatrix,
    startTestMatrixEdit,
    removeTestMatrixItem,
    applySlaEscalation,
    syncSelectedOperationToTodo,
    openGmail,
    handleImportCsv,
    handleExportCsv,
    toggleRecordSelection,
    bulkMarkSelectedQnaAnswered,
  };
}
