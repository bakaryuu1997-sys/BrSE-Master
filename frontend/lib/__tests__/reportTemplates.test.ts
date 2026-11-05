import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAILY_TEMPLATES,
  DEFAULT_WEEKLY_TEMPLATES,
  renderReportTemplate,
} from "@/lib/reportTemplates";

describe("reportTemplates", () => {
  it("renders Vietnamese daily report with standard accents", () => {
    const rendered = renderReportTemplate(DEFAULT_DAILY_TEMPLATES.vi, {
      reportDate: "2026-11-01",
      projectName: "Sensei Hub",
      owner: "Bakaryuu",
      progressPercent: "80%",
      tasksDone: "- Hoàn thành API\n- Viết test",
      tasksInProgress: "- Refactor UI",
      tasksTomorrow: "- Deploy staging",
      blockers: "Không có",
      customerMemory: "",
    });

    expect(rendered).toContain("【Báo cáo ngày】 2026-11-01");
    expect(rendered).toContain("Dự án: Sensei Hub");
    expect(rendered).toContain("Người phụ trách: Bakaryuu");
    expect(rendered).toContain("Đã hoàn thành hôm nay:");
    expect(rendered).toContain("Đang thực hiện:");
    expect(rendered).toContain("Kế hoạch ngày mai:");
    expect(rendered).toContain("Vấn đề / Cần xác nhận:");
  });

  it("renders weekly report correctly", () => {
    const rendered = renderReportTemplate(DEFAULT_WEEKLY_TEMPLATES.vi, {
      start: "2026-10-26",
      end: "2026-11-01",
      count: "5",
      tasksDone: "- Hoàn thành sprint",
      blockers: "Không có blocker",
    });

    expect(rendered).toContain("【Báo cáo tuần】 2026-10-26 đến 2026-11-01");
    expect(rendered).toContain("Số lượng daily report đã tổng hợp: 5");
    expect(rendered).toContain("Việc đã hoàn thành:");
  });
});
