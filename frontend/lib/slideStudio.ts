// Slide Studio was simplified to a lightweight "AI Slide Outline Generator"
// (app/app/slides/page.tsx): it generates a Markdown outline to copy/paste into
// external slide tools. The old in-app slide editor (themes, patterns, layouts,
// PPTX profiles, diagnostics) was removed. Only the few types still referenced by
// the meeting-minutes -> slides handoff remain here.

export type RewriteTone = "executive" | "japanese-client";

// Theme id kept only as a label for the minutes -> slides handoff metadata.
// The outline generator itself no longer renders themes.
export type SlideThemeId =
  | "executive"
  | "sakura"
  | "midnight"
  | "minimal"
  | "ember"
  | "jade"
  | "board-jp"
  | "mono-exec"
  | "incident-command"
  | "navy-gold"
  | "platinum"
  | "forest-board"
  | "copper-brief"
  | "atlas-glass"
  | "zen-stone"
  | "horizon-blue"
  | "whitepaper"
  | "teal-board";

// Payload written by the meeting-minutes page and consumed once by the slides
// outline generator to pre-fill its output.
export type SlideStudioImportPayload = {
  source: "meeting-minutes";
  deckTitle: string;
  markdown: string;
  themeId?: SlideThemeId;
  importedAt: string;
};

export const SLIDE_STUDIO_IMPORT_KEY = "brse.slide-studio.import.v1";
