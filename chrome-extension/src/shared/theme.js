"use strict";

/**
 * BrSE OS — single source of truth for the extension's premium design tokens
 * ("Graphite & Coral" palette — matches the frontend app redesign).
 *
 * Two consumers:
 *  1. Components that inject inline styles into the HOST page (e.g. Jira/Gmail
 *     buttons via Object.assign(el.style, ...)) — they import the JS values
 *     because CSS custom properties from tokens.css do not reach arbitrary
 *     host pages.
 *  2. Shadow-DOM components (QuickBox, QuickNote, React shadow roots) — they
 *     inject THEME_SHADOW_CSS so their styles can use var(--brse-*).
 *
 * Keep values in sync with public/shared/tokens.css and sidepanel/style.css.
 */

export const THEME = {
  // Surfaces (neutral graphite canvas with layered elevation)
  bgCanvas: "#121316",
  bgPanel: "#161719",
  surface: "#1d1e22",
  surface2: "#232529",

  // Accents (coral primary, amber + teal secondaries)
  primary: "#ff6b5e",
  primaryBright: "#ff8266",
  primaryStrong: "#e85a4d",
  secondary: "#ff8a7d",
  accent: "#ffb454",
  accentCyan: "#4ec9a5",

  // Semantic
  success: "#4ec9a5",
  warning: "#ffb454",
  error: "#ff5d6c",

  // Text
  text: "#ededf0",
  textStrong: "#f3f3f5",
  textMuted: "#a2a3aa",
  textDim: "#6e7079",

  // Lines
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 107, 94, 0.35)",

  // Radius
  radiusSm: "8px",
  radiusMd: "10px",
  radiusLg: "16px",
  radiusXl: "22px",

  // Elevation
  shadowSm: "0 1px 2px rgba(0, 0, 0, 0.30)",
  shadowMd: "0 6px 18px rgba(0, 0, 0, 0.40)",
  shadowLg: "0 16px 40px rgba(0, 0, 0, 0.50)",
  glowPrimary: "0 0 0 1px rgba(255, 107, 94, 0.20), 0 6px 22px rgba(255, 107, 94, 0.28)",

  // Typography
  fontMain: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

  // Motion
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  transitionFast: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
  easeSpring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/**
 * CSS custom-property declarations, shared by both document scope (tokens.css)
 * and shadow scope (injected). Returns just the body of a rule block.
 */
export function themeCssVars() {
  return `
    --brse-bg-canvas: ${THEME.bgCanvas};
    --brse-bg-panel: ${THEME.bgPanel};
    --brse-surface: ${THEME.surface};
    --brse-surface-2: ${THEME.surface2};
    --brse-primary: ${THEME.primary};
    --brse-primary-bright: ${THEME.primaryBright};
    --brse-primary-strong: ${THEME.primaryStrong};
    --brse-secondary: ${THEME.secondary};
    --brse-accent: ${THEME.accent};
    --brse-accent-cyan: ${THEME.accentCyan};
    --brse-success: ${THEME.success};
    --brse-warning: ${THEME.warning};
    --brse-error: ${THEME.error};
    --brse-text: ${THEME.text};
    --brse-text-strong: ${THEME.textStrong};
    --brse-text-muted: ${THEME.textMuted};
    --brse-text-dim: ${THEME.textDim};
    --brse-border: ${THEME.border};
    --brse-border-strong: ${THEME.borderStrong};
    --brse-radius-sm: ${THEME.radiusSm};
    --brse-radius-md: ${THEME.radiusMd};
    --brse-radius-lg: ${THEME.radiusLg};
    --brse-radius-xl: ${THEME.radiusXl};
    --brse-shadow-sm: ${THEME.shadowSm};
    --brse-shadow-md: ${THEME.shadowMd};
    --brse-shadow-lg: ${THEME.shadowLg};
    --brse-glow-primary: ${THEME.glowPrimary};
    --brse-transition: ${THEME.transition};
    --brse-transition-fast: ${THEME.transitionFast};
    --brse-ease-spring: ${THEME.easeSpring};
  `;
}

/** Tokens scoped to :host for shadow-DOM components. */
export const THEME_SHADOW_CSS = `:host { ${themeCssVars()} }`;

/**
 * Inject the shared design tokens into a shadow root so its styles can use
 * var(--brse-*). Safe to call once per shadow root.
 */
export function injectThemeTokens(shadowRoot) {
  if (!shadowRoot || shadowRoot.querySelector?.("style[data-brse-tokens]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-brse-tokens", "");
  style.textContent = THEME_SHADOW_CSS;
  shadowRoot.prepend(style);
}
