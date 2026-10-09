export type TemplateVariable = {
  key: string;
  label: string;
  required: boolean;
  default: string;
  input_type?: "text" | "textarea";
};

export type EmailTemplate = {
  id: string;
  slug: string;
  category: string;
  title_vi: string;
  title_ja: string;
  subject_template: string;
  body_template: string;
  variables: TemplateVariable[];
  keigo_level: string;
};

export type TemplateValues = Record<string, string>;

export function getDefaultValues(template: EmailTemplate): TemplateValues {
  return Object.fromEntries(template.variables.map((variable) => [variable.key, variable.default ?? ""]));
}

function formatBulletValue(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n・");
}

function stripEmptyBulletLines(text: string) {
  return text
    .split("\n")
    .filter((line) => !/^\s*[・\-*]\s*$/.test(line))
    .join("\n");
}

export function renderTemplate(templateText: string, values: TemplateValues): string {
  const rendered = templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string, offset: number) => {
    const value = values[key]?.trim();
    if (!value) return "";

    const lineStart = templateText.lastIndexOf("\n", offset - 1) + 1;
    const currentLinePrefix = templateText.slice(lineStart, offset);
    if (currentLinePrefix.trimEnd().endsWith("・")) {
      return formatBulletValue(value);
    }

    return value.replace(/\r\n/g, "\n");
  });

  return stripEmptyBulletLines(rendered)
    .replace(/[^\S\r\n]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export function getMissingRequiredVariables(template: EmailTemplate, values: TemplateValues): string[] {
  return template.variables
    .filter((variable) => variable.required && !values[variable.key]?.trim())
    .map((variable) => variable.label);
}

export function isTextareaVariable(variable: TemplateVariable): boolean {
  if (variable.input_type === "textarea") return true;
  return /(content|summary|detail|reason|note|question|answer|issue|impact|scope|step|result|plan|agenda|attendees|items|focus|situation|response|cause|prevention|handover)/i.test(
    variable.key
  );
}

export function getTextareaRows(variable: TemplateVariable): number {
  if (/incident|summary|detail|question|answer|items|handover|agenda|attendees|scope|result|plan|focus/i.test(variable.key)) {
    return 6;
  }
  return 4;
}

type HelperLanguage = "vi" | "en" | "ja";

export function getVariablePlaceholder(variable: TemplateVariable, language: HelperLanguage = "vi"): string {
  if (variable.default) return variable.default;
  if (isTextareaVariable(variable)) {
    if (language === "en") return "You can enter multiple lines. Keep one point per line for cleaner preview/copy.";
    if (language === "ja") return "複数行入力できます。Preview/copy を読みやすくするため、1行に1項目を入力してください。";
    return "Có thể nhập nhiều dòng. Mỗi ý nên để một dòng để preview/copy dễ đọc.";
  }
  return variable.key;
}

export function getEditorHelpText(variable: TemplateVariable, language: HelperLanguage = "vi"): string {
  if (!isTextareaVariable(variable)) return "";
  if (language === "en") return "Press Enter for a new line. Bullet-like lines are preserved in the final preview/copy.";
  if (language === "ja") return "Enter で改行できます。Bullet 行は preview/copy 時も保持されます。";
  return "Enter để xuống dòng. Nếu đang ở dòng bullet, mỗi dòng sẽ được giữ thành một bullet khi preview/copy.";
}

export function getDraftStats(body: string): { lines: number; chars: number } {
  return {
    lines: body ? body.split(/\r?\n/).length : 0,
    chars: body.length
  };
}

export function getVariableProgress(template: EmailTemplate, values: TemplateValues): { filled: number; total: number } {
  const total = template.variables.length;
  return {
    total,
    filled: template.variables.filter((variable) => values[variable.key]?.trim()).length
  };
}

export function getTemplateCompleteness(template: EmailTemplate, values: TemplateValues): number {
  const progress = getVariableProgress(template, values);
  if (progress.total === 0) return 100;
  return Math.round((progress.filled / progress.total) * 100);
}

export function appendSnippet(currentBody: string, snippet: string): string {
  const separator = currentBody.trim() ? "\n\n" : "";
  return `${currentBody.trimEnd()}${separator}${snippet}`;
}

export function buildStructuredEmailSnippet() {
  return ["【背景】", "・", "", "【確認事項】", "・", "", "【希望回答期限】", "・"].join("\n");
}

export function buildDecisionEmailSnippet() {
  return ["【決定事項】", "・", "", "【対応方針】", "・", "", "【次のアクション】", "・"].join("\n");
}

export function buildRiskEmailSnippet() {
  return ["【懸念事項】", "・", "", "【影響範囲】", "・", "", "【対応案】", "・"].join("\n");
}

export function buildCustomerToneSnippet(memory: {
  customerStyle?: string;
  reportRule?: string;
  timezoneRule?: string;
  communicationNotes?: string;
}) {
  return [
    "【顧客別コミュニケーション注意点】",
    memory.customerStyle ? `・文体/トーン: ${memory.customerStyle}` : "",
    memory.reportRule ? `・報告ルール: ${memory.reportRule}` : "",
    memory.timezoneRule ? `・Timezone: ${memory.timezoneRule}` : "",
    memory.communicationNotes ? `・補足: ${memory.communicationNotes}` : "",
  ].filter(Boolean).join("\n");
}

export function getCopyPayload(subject: string, body: string): string {
  return `件名：${subject}\n\n${body}`;
}

export function getTemplateSearchText(template: EmailTemplate): string {
  return [
    template.title_vi,
    template.title_ja,
    template.category,
    template.subject_template,
    template.keigo_level,
    template.variables.map((variable) => variable.label).join(" ")
  ]
    .join(" ")
    .toLowerCase();
}
