import { describe, expect, it } from "vitest";
import { buildRequiredPlaceholders, renderTemplate, type EmailTemplate } from "@/lib/emailTemplates";

const template: EmailTemplate = {
  id: "t",
  slug: "t",
  category: "qna",
  title_vi: "",
  title_ja: "",
  subject_template: "【確認】{{topic}}について",
  body_template: "お世話になっております。{{brse_name}}です。\n\n・{{question_2}}",
  variables: [
    { key: "brse_name", label: "Tên BrSE", required: true, default: "" },
    { key: "topic", label: "Chủ đề", required: true, default: "" },
    { key: "question_2", label: "Câu hỏi 2", required: false, default: "" },
  ],
  keigo_level: "formal",
};

describe("renderTemplate required placeholders", () => {
  it("keeps the legacy behaviour (empty) without placeholders", () => {
    expect(renderTemplate(template.body_template, {}).trim()).toBe("お世話になっております。です。");
  });

  it("shows a marker for empty required variables and nothing for optional ones", () => {
    const placeholders = buildRequiredPlaceholders(template);
    const body = renderTemplate(template.body_template, {}, placeholders);
    expect(body).toContain("お世話になっております。【Tên BrSE】です。");
    expect(body).not.toContain("【Câu hỏi 2】");
    expect(renderTemplate(template.subject_template, {}, placeholders)).toBe("【確認】【Chủ đề】について");
  });

  it("uses the real value once filled", () => {
    const placeholders = buildRequiredPlaceholders(template);
    expect(renderTemplate(template.body_template, { brse_name: "Bakaryuu" }, placeholders)).toContain("Bakaryuuです。");
  });
});
