"use strict";

export const QUICK_NOTE_STYLE = `
  :host { all: initial; }
  .panel {
    height: 100%;
    display: grid;
    grid-template-columns: 240px 180px 1fr;
    pointer-events: auto;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid rgba(255, 107, 94, 0.28);
    background: #111827;
    box-shadow: 0 20px 60px rgba(0,0,0,0.55);
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #ededf0;
    transition: grid-template-columns 0.2s ease;
  }
  /* Collapsible side panels — collapse to a slim rail with a re-open button,
     so Quick Memo grows while the user keeps a left-side toggle. */
  .panel.assistant-collapsed { grid-template-columns: 40px 180px 1fr; }
  .panel.mid-collapsed { grid-template-columns: 240px 40px 1fr; }
  .panel.assistant-collapsed.mid-collapsed { grid-template-columns: 40px 40px 1fr; }
  .panel.assistant-collapsed .assistant > .header,
  .panel.assistant-collapsed .assistant > .chat-log,
  .panel.assistant-collapsed .assistant > .chat-form { display: none; }
  .panel.assistant-collapsed .assistant > .rail-expand { display: flex; }
  .panel.mid-collapsed .mid-list > .mid-header,
  .panel.mid-collapsed .mid-list > .mid-container { display: none; }
  .panel.mid-collapsed .mid-list > .rail-expand { display: flex; }
  .qn-toggle.qn-toggle-off { opacity: 0.4; }

  /* Collapse (◀) button inside each left panel header */
  .qn-collapse {
    padding: 2px 7px;
    font-size: 12px;
    line-height: 1;
    background: rgba(15, 23, 42, 0.55);
    border: 1px solid rgba(255, 107, 94, 0.25);
    color: #ededf0;
  }
  .qn-collapse:hover { color: #fff; border-color: rgba(255, 107, 94, 0.65); }

  /* Slim rail shown when a panel is collapsed */
  .rail-expand {
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    width: 100%;
    height: 100%;
    padding: 12px 0;
    border: 0;
    border-right: 1px solid rgba(255, 107, 94, 0.2);
    background: linear-gradient(180deg, rgba(20, 184, 166, 0.16), rgba(255, 107, 94, 0.10));
    color: #ededf0;
    cursor: pointer;
    font-size: 17px;
    border-radius: 0;
  }
  .rail-expand:hover { color: #fff; background: rgba(255, 107, 94, 0.2); }
  .rail-expand span {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.5px;
    opacity: 0.85;
  }
  .assistant, .mid-list, .notes {
    min-width: 0;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .assistant {
    border-right: 1px solid rgba(255, 107, 94, 0.2);
    background: rgba(15, 23, 42, 0.96);
  }
  .mid-list {
    background: #1e293b;
    border-right: 1px solid rgba(255, 107, 94, 0.2);
    color: #f8fafc;
  }
  .notes { background: #f8fafc; color: #0f172a; }
  .header {
    cursor: move;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    background: linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(255, 107, 94, 0.12));
    border-bottom: 1px solid rgba(255, 107, 94, 0.22);
    font-size: 13px;
    font-weight: 800;
  }
  .note-header {
    color: #0f172a;
    background: #fff7cc;
    border-bottom: 1px solid #facc15;
  }
  .actions, .note-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  button {
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: rgba(15, 23, 42, 0.72);
    color: #ededf0;
    border-radius: 8px;
    padding: 6px 9px;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  button:hover { border-color: rgba(255, 107, 94, 0.65); color: #fff; }
  .notes button {
    color: #334155;
    background: #fff;
  }
  .meta {
    padding: 8px 14px;
    color: #64748b;
    font-size: 11px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .note-tabs {
    padding: 8px;
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
    overflow-x: auto;
  }
  .note-tab {
    flex: 0 0 auto;
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .note-tab.active {
    border-color: #f59e0b;
    color: #92400e;
    background: #fffbeb;
  }
  .note-title {
    border: 0;
    border-bottom: 1px solid #e2e8f0;
    outline: none;
    padding: 10px 14px;
    background: #ffffff !important;
    color: #0f172a !important;
    font: 700 14px/1.4 Inter, system-ui, sans-serif;
  }
  textarea {
    flex: 1;
    width: 100%;
    min-height: 0;
    resize: none;
    border: 0;
    outline: none;
    box-sizing: border-box;
    padding: 14px;
    background: #f8fafc;
    color: #0f172a;
    overflow-y: auto !important;
    font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  textarea::-webkit-scrollbar {
    width: 6px;
  }
  textarea::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  textarea::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #0f172a;
    border-top: 1px solid rgba(148, 163, 184, 0.14);
    color: #94a3b8;
    font-size: 11px;
  }
  .notes .footer {
    background: #fff;
    color: #64748b;
    border-top: 1px solid #e2e8f0;
  }
  .saved { color: #10b981; font-weight: 700; }
  .chat-log {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .bubble {
    border: 1px solid rgba(255, 107, 94, 0.2);
    border-radius: 10px;
    padding: 9px 10px;
    color: #cbd5e1;
    background: rgba(30, 41, 59, 0.7);
    font-size: 12.5px;
    line-height: 1.5;
    white-space: pre-wrap;
  }
  .bubble.user {
    align-self: flex-end;
    max-width: 90%;
    color: #ededf0;
    background: rgba(255, 107, 94, 0.18);
  }
  .chat-form {
    display: flex;
    gap: 8px;
    padding: 10px;
    border-top: 1px solid rgba(255, 107, 94, 0.2);
  }
  .chat-form input {
    flex: 1;
    min-width: 0;
    border: 1px solid rgba(255, 107, 94, 0.25);
    background: rgba(15, 23, 42, 0.9);
    color: #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    outline: none;
  }
  @media (max-width: 760px) {
    .panel { grid-template-columns: 1fr; }
    .assistant { min-height: 240px; border-right: 0; border-bottom: 1px solid rgba(255, 107, 94, 0.2); }
  }
  .resize-handle {
    position: absolute;
    z-index: 10000;
    pointer-events: auto;
  }
  .resize-left {
    top: 0;
    left: -4px;
    width: 8px;
    height: 100%;
    cursor: w-resize;
  }
  .resize-right {
    top: 0;
    right: -4px;
    width: 8px;
    height: 100%;
    cursor: e-resize;
  }
  .resize-top {
    top: -4px;
    left: 0;
    width: 100%;
    height: 8px;
    cursor: n-resize;
  }
  .resize-bottom {
    bottom: -4px;
    left: 0;
    width: 100%;
    height: 8px;
    cursor: s-resize;
  }
  .resize-top-left {
    top: -4px;
    left: -4px;
    width: 10px;
    height: 10px;
    cursor: nw-resize;
  }
  .resize-top-right {
    top: -4px;
    right: -4px;
    width: 10px;
    height: 10px;
    cursor: ne-resize;
  }
  .resize-bottom-left {
    bottom: -4px;
    left: -4px;
    width: 10px;
    height: 10px;
    cursor: sw-resize;
  }
  .resize-bottom-right {
    bottom: -4px;
    right: -4px;
    width: 10px;
    height: 10px;
    cursor: se-resize;
  }
  .notes.dark-theme {
    background: #0f172a !important;
    color: #f8fafc !important;
  }
  .notes.dark-theme .meta {
    color: #94a3b8 !important;
    border-bottom: 1px solid rgba(255, 107, 94, 0.15) !important;
  }
  .notes.dark-theme ::placeholder {
    color: #64748b !important;
    opacity: 1;
  }
  .notes ::placeholder {
    color: #94a3b8 !important;
    opacity: 1;
  }
  .notes.dark-theme .note-header {
    background: #1e293b !important;
    color: #f8fafc !important;
    border-bottom: 1px solid rgba(255, 107, 94, 0.28) !important;
  }
  .notes.dark-theme .note-title {
    background: #1e293b !important;
    color: #f8fafc !important;
    border-bottom: 1px solid rgba(255, 107, 94, 0.2) !important;
  }
  .notes.dark-theme textarea {
    background: #0f172a !important;
    color: #f8fafc !important;
  }
  .notes.dark-theme textarea::-webkit-scrollbar-track {
    background: #1e293b !important;
  }
  .notes.dark-theme textarea::-webkit-scrollbar-thumb {
    background: #3b4252 !important;
  }
  .notes.dark-theme textarea::-webkit-scrollbar-thumb:hover {
    background: #4c566a !important;
  }
  .notes.dark-theme .note-tabs {
    background: #111827 !important;
    border-bottom: 1px solid rgba(255, 107, 94, 0.15) !important;
  }
  .notes.dark-theme .note-tab {
    color: #94a3b8 !important;
    background: #1f2937 !important;
    border: 1px solid rgba(255, 107, 94, 0.15) !important;
  }
  .notes.dark-theme .note-tab.active {
    border-color: #ff6b5e !important;
    color: #ededf0 !important;
    background: #232529 !important;
  }
  .notes.dark-theme .footer {
    background: #0f172a !important;
    color: #94a3b8 !important;
    border-top: 1px solid rgba(255, 107, 94, 0.2) !important;
  }
  .notes.dark-theme button {
    color: #ededf0 !important;
    background: rgba(15, 23, 42, 0.72) !important;
    border: 1px solid rgba(148, 163, 184, 0.3) !important;
  }
  .notes.dark-theme button:hover {
    border-color: rgba(255, 107, 94, 0.65) !important;
    color: #ffffff !important;
  }
  .mid-header {
    padding: 12px 14px;
    background: rgba(30, 41, 59, 0.6);
    border-bottom: 1px solid rgba(255, 107, 94, 0.2);
    font-size: 13px;
    font-weight: 800;
    color: #ff6b5e;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .mid-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: #111827;
  }
  .mid-container::-webkit-scrollbar {
    width: 4px;
  }
  .mid-container::-webkit-scrollbar-thumb {
    background: rgba(255, 107, 94, 0.25);
    border-radius: 2px;
  }
  .mid-item {
    padding: 8px 10px;
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255, 107, 94, 0.1);
    border-radius: 8px;
    color: #94a3b8;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mid-item:hover {
    border-color: rgba(255, 107, 94, 0.4);
    color: #e2e8f0;
    background: rgba(30, 41, 59, 0.8);
  }
  .mid-item.active {
    border-color: #ff6b5e;
    color: #0f172a;
    background: #ff6b5e;
    box-shadow: 0 0 10px rgba(255, 107, 94, 0.35);
  }
  .image-container {
    display: none;
    padding: 10px;
    gap: 8px;
    flex-wrap: wrap;
    background: #f1f5f9;
    border-top: 1px solid #e2e8f0;
  }
  .notes.dark-theme .image-container {
    background: #1e293b;
    border-top: 1px solid rgba(255, 107, 94, 0.2);
  }
  .image-preview {
    position: relative;
    display: inline-flex;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 3px;
    background: #fff;
  }
  .notes.dark-theme .image-preview {
    border-color: rgba(255, 107, 94, 0.3);
    background: rgba(0,0,0,0.3);
  }
  .image-preview img {
    height: 50px;
    width: 75px;
    object-fit: cover;
    border-radius: 6px;
  }
  .image-preview .delete-img {
    position: absolute;
    top: -5px;
    right: -5px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff5d6c;
    color: #fff;
    border: none;
    font-size: 9px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    padding: 0;
  }
`;
