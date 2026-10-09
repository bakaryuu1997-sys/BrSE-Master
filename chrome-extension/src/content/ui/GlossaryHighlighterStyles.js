"use strict";

export const GLOSSARY_HIGHLIGHTER_STYLE = `
    .tooltip-card {
      background: rgba(29, 30, 34, 0.98);
      border: 1px solid rgba(255, 138, 125, 0.6);
      border-radius: 12px;
      color: var(--brse-text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 138, 125, 0.2);
      padding: 14px;
      backdrop-filter: blur(14px);
      user-select: text !important;
      -webkit-user-select: text !important;
    }
    .learn-btn {
      background: rgba(255, 138, 125, 0.1);
      border: 1px solid rgba(255, 138, 125, 0.3);
      color: var(--brse-secondary);
      cursor: pointer;
      font-size: 11px;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .learn-btn:hover {
      background: rgba(255, 93, 108, 0.2);
      border-color: rgba(255, 93, 108, 0.5);
      color: var(--brse-error);
    }
    .edit-now-btn {
      background: rgba(255, 107, 94, 0.1) !important;
      border-color: rgba(255, 107, 94, 0.3) !important;
      color: var(--brse-primary) !important;
    }
    .edit-now-btn:hover {
      background: rgba(255, 107, 94, 0.2) !important;
      border-color: rgba(255, 107, 94, 0.5) !important;
      color: var(--brse-secondary) !important;
    }
    .term-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--brse-secondary);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .term-kana {
      font-size: 11px;
      color: var(--brse-text-dim);
      margin-top: 2px;
      font-weight: normal;
    }
    .term-translation {
      font-size: 13px;
      font-weight: bold;
      color: var(--brse-success);
      margin-top: 8px;
      border-left: 3px solid var(--brse-success);
      padding-left: 8px;
    }
    .term-note {
      font-size: 13.5px;
      color: #ededf0;
      margin-top: 10px;
      line-height: 1.55;
    }
    .term-example {
      background: rgba(255, 107, 94, 0.07);
      border: 1px solid rgba(255, 107, 94, 0.25);
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12.5px;
      color: #79dac8;
      margin-top: 12px;
      line-height: 1.5;
      font-style: italic;
      text-shadow: 0 0 3px rgba(121, 218, 200, 0.15);
    }
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 10px;
    }
    .tag {
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(110, 112, 121, 0.4);
      color: var(--brse-text-muted);
      border: 1px solid rgba(110, 112, 121, 0.6);
      text-transform: uppercase;
    }
    .tag-brse { background: rgba(255, 107, 94, 0.15); color: var(--brse-primary); border-color: rgba(255, 107, 94, 0.4); }
    .tag-pm { background: rgba(255, 138, 125, 0.15); color: var(--brse-secondary); border-color: rgba(255, 138, 125, 0.4); }
    .tag-qa { background: rgba(255, 93, 108, 0.15); color: var(--brse-error); border-color: rgba(255, 93, 108, 0.4); }
    .tag-dev { background: rgba(78, 201, 165, 0.15); color: var(--brse-success); border-color: rgba(78, 201, 165, 0.4); }
    .speaker-btn {
      background: none;
      border: none;
      color: var(--brse-secondary);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      margin-left: 6px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .speaker-btn:hover {
      background: rgba(255, 138, 125, 0.15);
      color: #fff;
    }
    .speaker-btn svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.5;
    }
    .brse-glossary-highlight {
      display: inline !important;
      white-space: nowrap !important;
      /* Modern, less-intrusive underline: dotted + offset reads cleaner than a
         hard border-bottom and no longer disturbs the host line box. Color comes
         from the shared token (tokens.css is injected on every page). */
      text-decoration: underline dotted color-mix(in srgb, var(--brse-secondary) 70%, transparent) !important;
      text-underline-offset: 2px !important;
      text-decoration-thickness: 1px !important;
      border-radius: 3px !important;
      cursor: help !important;
      transition: background-color 0.15s ease !important;
    }
    .brse-glossary-highlight:hover {
      background: color-mix(in srgb, var(--brse-secondary) 14%, transparent) !important;
    }`;
