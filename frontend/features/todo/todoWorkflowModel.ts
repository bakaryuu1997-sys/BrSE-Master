export type Priority = "P0" | "P1" | "P2";
export type FilterMode = "all" | "todo" | "done" | "p0" | "deadline" | "focus";
export type PresetKey = "standard" | "web" | "mobile" | "migration" | "maintenance";

export type WorkflowItemTemplate = {
  id: string;
  phase: string;
  title: string;
  detail: string;
  priority: Priority;
  presets: PresetKey[];
};

export type WorkflowItem = WorkflowItemTemplate & {
  done: boolean;
  note: string;
  deadline: string;
  evidenceUrl: string;
  evidences?: Array<{ type: string; url: string; quote?: string }>;
  operationId: string;
  updatedAt?: string;
  source?: "workflow" | "operation" | "meeting";
  meetingId?: string;
  meetingTitle?: string;
  actionIndex?: number;
};

export type TodoProject = {
  id: string;
  name: string;
  createdAt: string;
  archivedAt?: string;
};

export const presetLabels: Record<PresetKey, string> = {
  standard: "Standard",
  web: "Web app",
  mobile: "Mobile app",
  migration: "Migration",
  maintenance: "Maintenance",
};

export const defaultPhase = "1. Kick-off & Requirement";

export const phaseOrder = [
  "1. Kick-off & Requirement",
  "2. Communication Setup",
  "3. Requirement Analysis",
  "4. Tracking & Reporting",
  "5. Q&A & Change",
  "6. Testing & UAT",
  "7. Closure & Knowledge",
];

export const workflowTemplate: WorkflowItemTemplate[] = [
  {
    id: "p1-read-input-docs",
    phase: "1. Kick-off & Requirement",
    title: "Đọc tài liệu đầu vào",
    detail: "RD, SRS, Proposal, Contract, tài liệu hệ thống cũ nếu có.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p1-create-qna-first",
    phase: "1. Kick-off & Requirement",
    title: "Lập Q&A ban đầu",
    detail: "Ghi ngay các điểm chưa rõ, không tự suy đoán yêu cầu.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p1-internal-kickoff",
    phase: "1. Kick-off & Requirement",
    title: "Kick-off nội bộ",
    detail: "Xác định RACI, vai trò BrSE/PM/Dev/Comtor, timezone JST/ICT.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p1-customer-kickoff",
    phase: "1. Kick-off & Requirement",
    title: "Kick-off với khách hàng Nhật",
    detail: "Xác nhận scope, timeline, Done definition, report method, contact channel, holiday, CR/incident process.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p1-input-checklist",
    phase: "1. Kick-off & Requirement",
    title: "Checklist tài liệu đầu vào",
    detail: "RD/SRS, wireframe, DB schema, API spec, UI kit, server env, credential, legacy docs.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration"],
  },
  {
    id: "p2-communication-channels",
    phase: "2. Communication Setup",
    title: "Thiết lập kênh giao tiếp",
    detail: "Slack/Chatwork, Zoom/Meet, Notion/Confluence, Git, Jira/Backlog/Redmine.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p2-task-workflow",
    phase: "2. Communication Setup",
    title: "Thống nhất workflow task",
    detail: "Backlog -> Todo -> In Progress -> Review BrSE -> Testing -> Done.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p2-working-agreement",
    phase: "2. Communication Setup",
    title: "Working Agreement",
    detail: "Daily, weekly review, sprint planning, SLA phản hồi, ngôn ngữ họp/tài liệu/commit.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p2-git-rules",
    phase: "2. Communication Setup",
    title: "Git repository & commit rules",
    detail: "Branch main/develop/feature/bugfix/hotfix và commit message chuẩn.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p3-read-requirements",
    phase: "3. Requirement Analysis",
    title: "Phân tích RD/SRS chi tiết",
    detail: "Đọc tổng quan, đọc từng màn hình, đánh dấu thuật ngữ, kiểm tra mâu thuẫn.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p3-qna-list",
    phase: "3. Requirement Analysis",
    title: "Q&A List chuẩn",
    detail: "Có màn hình, câu hỏi JP/VI, deadline, người trả lời, trạng thái, câu trả lời.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p3-basic-design",
    phase: "3. Requirement Analysis",
    title: "Basic Design",
    detail: "Screen flow, DB schema, API spec, UI components, business rules.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration"],
  },
  {
    id: "p3-wireframe-signoff",
    phase: "3. Requirement Analysis",
    title: "Wireframe / Mockup sign-off",
    detail: "Lo-fi -> hi-fi, khách xác nhận bằng văn bản trước khi code.",
    priority: "P1",
    presets: ["standard", "web", "mobile"],
  },
  {
    id: "p3-estimation",
    phase: "3. Requirement Analysis",
    title: "Ước lượng công sức",
    detail: "Story point/man-day, buffer 50%, man-month = man-day / 20.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p4-wbs",
    phase: "4. Tracking & Reporting",
    title: "Lập WBS",
    detail: "Epic -> Story -> Task, mỗi task level 3 tối đa 8 giờ.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p4-sprint-planning",
    phase: "4. Tracking & Reporting",
    title: "Sprint planning",
    detail: "Capacity, load 80%, danh sách story đã chọn.",
    priority: "P1",
    presets: ["standard", "web", "mobile"],
  },
  {
    id: "p4-daily-report",
    phase: "4. Tracking & Reporting",
    title: "Daily report gửi Nhật",
    detail: "Hoàn thành, đang làm, ngày mai, vấn đề/cần hỏi.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p4-weekly-report",
    phase: "4. Tracking & Reporting",
    title: "Weekly report",
    detail: "Kết quả tuần, kế hoạch tuần tới, rủi ro/vấn đề, ghi chú đặc biệt.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p4-risk-management",
    phase: "4. Tracking & Reporting",
    title: "Risk management",
    detail: "Theo dõi thay đổi yêu cầu, dev nghỉ, staging lỗi, khách trả lời Q&A chậm.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p5-qna-process",
    phase: "5. Q&A & Change",
    title: "Quy trình xử lý Q&A",
    detail: "Dev phát hiện -> BrSE ghi/dịch -> gửi batch -> cập nhật câu trả lời -> báo team.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p5-cr-process",
    phase: "5. Q&A & Change",
    title: "Change Request process",
    detail: "Không nhận miệng ngay, phân tích impact, CR document, PM review, sign-off bằng văn bản.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p5-cr-document",
    phase: "5. Q&A & Change",
    title: "CR document",
    detail: "Thông tin chung, nội dung thay đổi, impact, phương án, quyết định khách hàng.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p6-internal-testing",
    phase: "6. Testing & UAT",
    title: "Testing nội bộ",
    detail: "Unit, integration, system/QA, BrSE review, demo PM VN.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p6-test-case",
    phase: "6. Testing & UAT",
    title: "Test case",
    detail: "Happy path 100%, edge cases quan trọng, test case JP nếu khách review.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration"],
  },
  {
    id: "p6-bug-management",
    phase: "6. Testing & UAT",
    title: "Bug management",
    detail: "Blocker/Critical/Major/Minor, SLA, bug report đủ env/repro/expected/actual.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p6-uat-support",
    phase: "6. Testing & UAT",
    title: "UAT support",
    detail: "UAT script JP, test data, BrSE online, ghi feedback, phân loại fix ngay/backlog.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration"],
  },
  {
    id: "p7-handover-docs",
    phase: "7. Closure & Knowledge",
    title: "Bàn giao tài liệu",
    detail: "RD/SRS, BD/DD, API, DB, source README, deployment, operation manual, test case, bug/Q&A list, acceptance.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p7-retrospective",
    phase: "7. Closure & Knowledge",
    title: "Retrospective KPT",
    detail: "Keep, Problem, Try cho dự án tiếp theo.",
    priority: "P1",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
  {
    id: "p7-knowledge-base",
    phase: "7. Closure & Knowledge",
    title: "Lưu tri thức dự án",
    detail: "Customer glossary, quyết định thiết kế, bug lesson, template hiệu quả, phong cách khách.",
    priority: "P0",
    presets: ["standard", "web", "mobile", "migration", "maintenance"],
  },
];
