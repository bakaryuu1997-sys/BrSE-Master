import type {
  DecisionLogInput,
  OperationDependencyInput,
  OperationRecordInput,
  OperationType,
  OperationTestMatrixInput,
  TestMatrixStatus,
} from "@/lib/operations";

export const configs: Record<
  OperationType,
  {
    title: string;
    subtitle: string;
    statuses: string[];
    priorities: string[];
    fields: Array<{ key: "fieldA" | "fieldB" | "fieldC" | "fieldD" | "fieldE"; label: string; placeholder: string }>;
  }
> = {
  qna: {
    title: "Q&A Management",
    subtitle: "Theo dõi câu hỏi, deadline, status và tạo email reminder hỏi khách.",
    statuses: ["Draft", "Sent", "Waiting Customer", "Answered", "Closed"],
    priorities: ["Low", "Medium", "High", "Urgent"],
    fields: [
      { key: "fieldA", label: "Câu hỏi / 確認事項", placeholder: "VD: Search condition X có cần include deleted data không?" },
      { key: "fieldB", label: "Background / 背景", placeholder: "Vì sao cần hỏi, impact nếu chưa rõ..." },
      { key: "fieldC", label: "Answer / 回答", placeholder: "Câu trả lời từ khách, nếu đã có." },
      { key: "fieldD", label: "Decision / 決定事項", placeholder: "Kết luận sau khi nhận answer." },
      { key: "fieldE", label: "Note", placeholder: "Memo nội bộ." },
    ],
  },
  bug: {
    title: "Bug Report Helper",
    subtitle: "Form chuẩn báo bug cho khách: severity, repro steps, expected/actual, impact.",
    statuses: ["Open", "In Fix", "Fixed", "Verified", "Closed"],
    priorities: ["小", "大", "重大", "致命的"],
    fields: [
      { key: "fieldA", label: "Environment / 発生環境", placeholder: "VD: Staging, Chrome, account test..." },
      { key: "fieldB", label: "Reproduction Steps / 再現手順", placeholder: "1. ...\n2. ...\n3. ..." },
      { key: "fieldC", label: "Expected Result / 期待結果", placeholder: "Kết quả đúng mong muốn." },
      { key: "fieldD", label: "Actual Result / 実際結果", placeholder: "Kết quả thực tế đang xảy ra." },
      { key: "fieldE", label: "Impact / Workaround", placeholder: "Ảnh hưởng, workaround, evidence link..." },
    ],
  },
  cr: {
    title: "Change Request",
    subtitle: "Ghi nhận thay đổi yêu cầu, impact, estimate và decision log.",
    statuses: ["Draft", "Sent", "Approved", "Rejected", "Implemented"],
    priorities: ["Low", "Medium", "High", "Urgent"],
    fields: [
      { key: "fieldA", label: "Reason / 背景・理由", placeholder: "Lý do thay đổi yêu cầu." },
      { key: "fieldB", label: "Impact Scope / 影響範囲", placeholder: "Màn hình/API/data/schedule bị ảnh hưởng." },
      { key: "fieldC", label: "Estimate / Schedule Impact", placeholder: "Ước lượng effort, deadline impact." },
      { key: "fieldD", label: "Decision / Approval", placeholder: "Approved/rejected/deferred, ai quyết định." },
      { key: "fieldE", label: "History Log", placeholder: "Timeline trao đổi/ghi chú." },
    ],
  },
};

export const emptyForm: OperationRecordInput = {
  type: "qna",
  title: "",
  status: "Draft",
  priority: "Medium",
  owner: "",
  dueDate: "",
  customerOwner: "",
  projectName: "",
  fieldA: "",
  fieldB: "",
  fieldC: "",
  fieldD: "",
  fieldE: "",
};

export const emptyDecisionForm: DecisionLogInput = {
  title: "",
  decision: "",
  owner: "",
  decisionDate: "",
  impact: "",
  evidenceUrl: "",
  relatedRecordId: "",
  projectName: "",
};

export const emptyDependencyForm: OperationDependencyInput = {
  projectName: "",
  sourceId: "",
  targetId: "",
  relation: "blocks",
  note: "",
};

export const emptyTestMatrixForm: OperationTestMatrixInput = {
  projectName: "",
  requirement: "",
  operationId: "",
  testCase: "",
  expectedResult: "",
  owner: "",
  uatStatus: "Not Started",
  evidenceUrl: "",
  lastRunDate: "",
  note: "",
};

export const dependencyLabels: Record<OperationDependencyInput["relation"], string> = {
  blocks: "Blocks",
  depends_on: "Depends on",
  duplicates: "Duplicates",
  related: "Related",
};

export const testStatuses: TestMatrixStatus[] = ["Not Started", "In Progress", "Passed", "Failed", "Blocked"];
