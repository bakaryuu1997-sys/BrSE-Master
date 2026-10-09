"use strict";

export const QUICK_BOX_STYLE = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .spin {
      animation: spin 0.8s linear infinite !important;
      display: inline-block !important;
    }

    .sync-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      color: var(--brse-success);
      background: rgba(78, 201, 165, 0.15);
      border: 1px solid rgba(78, 201, 165, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: inherit;
      user-select: none;
      box-sizing: border-box;
      margin-right: 8px;
      height: 24px;
    }
    .sync-badge:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(78, 201, 165, 0.2);
    }

    .card {
      /* Tokenized + modernized frame (single palette via theme.js shadow tokens).
         color-mix keeps the exact glass alpha while deriving the hue from tokens. */
      background: color-mix(in srgb, var(--brse-surface) 85%, transparent);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid var(--brse-border-strong);
      border-radius: var(--brse-radius-lg);
      color: var(--brse-text);
      font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
      box-shadow: var(--brse-shadow);
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      transition: border-color 0.3s;
    }
    .card:hover {
      border-color: rgba(255, 138, 125, 0.4); 
    }
    
    #brse-dict-retry-btn:hover {
      background: rgba(255, 107, 94, 0.2) !important;
      border-color: var(--brse-primary) !important;
      color: #fff !important;
    }
    #brse-dict-ai-fallback-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 5px 14px rgba(255, 138, 125, 0.35) !important;
    }
    .proposed-term-card:hover {
      border-color: rgba(255, 107, 94, 0.4) !important;
      transform: translateY(-1px);
    }
    .quick-add-to-glossary-btn-pro:hover {
      background: rgba(78, 201, 165, 0.25) !important;
      border-color: var(--brse-success) !important;
      color: #fff !important;
    }
    .add-to-glossary-btn-pro:hover {
      background: rgba(255, 107, 94, 0.25) !important;
      border-color: var(--brse-primary) !important;
      color: #fff !important;
    }
    
    /* Custom Thin Scrollbar */
    .content::-webkit-scrollbar,
    .chat-history::-webkit-scrollbar,
    .accordion-content::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .content::-webkit-scrollbar-track,
    .chat-history::-webkit-scrollbar-track,
    .accordion-content::-webkit-scrollbar-track {
      background: transparent;
    }
    .content::-webkit-scrollbar-thumb,
    .chat-history::-webkit-scrollbar-thumb,
    .accordion-content::-webkit-scrollbar-thumb {
      background: rgba(255, 107, 94, 0.2);
      border-radius: 10px;
      transition: background 0.2s;
    }
    .content::-webkit-scrollbar-thumb:hover,
    .chat-history::-webkit-scrollbar-thumb:hover,
    .accordion-content::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 138, 125, 0.4);
    }
    
    /* Tabs Header */
    .tabs-header { 
      background: rgba(35, 37, 41, 0.6); 
      padding: 0 12px; 
      display: flex; 
      align-items: center; 
      border-bottom: 1px solid rgba(255,255,255,0.06); 
      user-select: none; 
      height: 42px; 
      flex-shrink: 0;
    }
    .tab-item { 
      color: var(--brse-text-dim); 
      font-size: 13.5px; 
      font-weight: 600; 
      padding: 0 16px; 
      height: 100%; 
      display: flex; 
      align-items: center; 
      cursor: pointer; 
      position: relative; 
      transition: color 0.2s; 
    }
    .tab-item:hover { color: var(--brse-text); }
    .tab-item.active { color: var(--brse-primary); }
    .tab-item.active::after { 
      content: ''; 
      position: absolute; 
      bottom: 0; 
      left: 8px; 
      right: 8px;
      height: 3px; 
      background: linear-gradient(90deg, var(--brse-primary), var(--brse-secondary)); 
      border-radius: 3px 3px 0 0; 
    }
    
    .drag-spacer { flex: 1; height: 100%; cursor: move; }
    .header-icon { 
      color: var(--brse-text-dim); 
      cursor: pointer; 
      font-size: 14px; 
      margin-left: 12px; 
      transition: color 0.2s, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1); 
      display: flex; 
      align-items: center; 
      justify-content: center; 
    }
    .header-icon:hover { color: var(--brse-primary); transform: scale(1.15); }
    .close-icon:hover { color: var(--brse-error) !important; }
    
    /* Tab Contents */
    .content { 
      padding: 12px 14px; 
      overflow-y: auto; 
      line-height: 1.6; 
      font-size: 14px; 
      display: none; 
      box-sizing: border-box; 
      flex: 1;
      min-height: 0;
    }
    .content.active { display: flex; flex-direction: column; }
    
    /* Word Title */
    .word-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .word-title { margin: 0; font-size: 16px; color: #fff; font-weight: 800; word-break: break-all; }
    
    /* IPA Row */
    .ipa-row { display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
    .ipa-item { 
      display: inline-flex; 
      align-items: center; 
      background: rgba(255, 107, 94, 0.06); 
      border: 1px solid rgba(255, 107, 94, 0.15); 
      padding: 3px 8px; 
      border-radius: 6px; 
      font-size: 12px; 
      cursor: pointer; 
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); 
      color: var(--brse-text-muted); 
    }
    .ipa-item:hover { 
      background: rgba(255, 107, 94, 0.12); 
      border-color: var(--brse-primary); 
      color: #fff; 
      transform: translateY(-1px);
    }
    .spk-icon { font-size: 11px; margin-right: 4px; color: var(--brse-success); }
    .dialect-badge { 
      font-size: 9px; 
      font-weight: bold; 
      border-radius: 2px; 
      padding: 0.5px 3px; 
      margin-left: 4px; 
    }
    .dialect-badge.uk { background: rgba(255, 138, 125, 0.2); color: var(--brse-secondary); border: 1px solid rgba(255, 138, 125, 0.4); }
    .dialect-badge.us { background: rgba(255, 180, 84, 0.2); color: var(--brse-accent); border: 1px solid rgba(255, 180, 84, 0.4); }
    
    /* JP Reading */
    .jp-reading-row { 
      display: inline-flex; 
      align-items: center; 
      background: rgba(255, 138, 125, 0.06); 
      border: 1px solid rgba(255, 138, 125, 0.15); 
      padding: 3px 8px; 
      border-radius: 6px; 
      font-size: 12px; 
      margin-bottom: 6px; 
      cursor: pointer; 
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); 
    }
    .jp-reading-row:hover { 
      background: rgba(255, 138, 125, 0.12); 
      border-color: var(--brse-secondary); 
      transform: translateY(-1px);
    }
    .jp-reading-badge { 
      font-size: 9px; 
      font-weight: bold; 
      color: var(--brse-secondary); 
      text-transform: uppercase; 
      margin-right: 5px; 
    }
    .jp-reading-text { color: #fff; font-weight: 600; }
    .spk-icon-ja { margin-left: 5px; color: var(--brse-accent); font-size: 11px; }
    
    /* Copy & Action Buttons */
    .copy-btn { 
      padding: 3px 8px; 
      background: rgba(255, 255, 255, 0.04); 
      color: var(--brse-text-dim); 
      cursor: pointer; 
      border-radius: 6px; 
      font-size: 12px; 
      transition: 0.2s; 
      display: inline-flex; 
      align-items: center; 
      border: 1px solid rgba(255, 255, 255, 0.06); 
    }
    .copy-btn:hover { 
      background: rgba(255, 107, 94, 0.1); 
      color: var(--brse-primary); 
      border-color: rgba(255, 107, 94, 0.25); 
    }
    
    /* Dictionary and Synonyms Accordion */
    .accordion { 
      margin-top: 6px; 
      border: 1px solid rgba(255,255,255,0.06); 
      border-radius: 6px; 
      overflow: hidden; 
      background: rgba(0,0,0,0.12); 
    }
    .accordion-header { 
      background: rgba(35, 37, 41, 0.4); 
      padding: 6px 10px; 
      font-size: 12px; 
      font-weight: 700; 
      color: var(--brse-primary); 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      cursor: pointer; 
      transition: background 0.2s; 
      user-select: none;
    }
    .accordion-header:hover { background: rgba(35, 37, 41, 0.7); }
    .accordion-icon { font-size: 10px; transition: transform 0.2s; color: var(--brse-text-dim); }
    .accordion-icon.open { transform: rotate(180deg); color: var(--brse-primary); }
    .accordion-content { 
      padding: 8px 10px; 
      border-top: 1px solid rgba(255,255,255,0.06); 
      max-height: 120px; 
      overflow-y: auto; 
    }
    .accordion-content.collapsed { display: none; }
    
    .dict-item { margin-bottom: 8px; }
    .dict-item:last-child { margin-bottom: 0; }
    .dict-type-badge { 
      color: var(--brse-accent); 
      font-weight: 800; 
      font-size: 9.5px; 
      text-transform: uppercase; 
      border: 1px solid rgba(255, 180, 84,0.4); 
      background: rgba(255, 180, 84,0.08); 
      border-radius: 2px; 
      padding: 0.5px 4px; 
      margin-right: 8px; 
      display: inline-block; 
    }
    .dict-terms { color: var(--brse-text); font-weight: 600; }
    
    .def-item { margin-bottom: 8px; font-size: 12px; }
    .def-item:last-child { margin-bottom: 0; }
    .def-desc { color: var(--brse-primary); font-style: italic; margin-bottom: 3px; }
    .def-ex { color: var(--brse-success); padding-left: 8px; border-left: 2px solid rgba(78, 201, 165,0.3); font-style: normal; margin-top: 3px; }
    
    /* AI Chat */
    .chat-history { 
      display: flex; 
      flex-direction: column; 
      gap: 12px; 
      overflow-y: auto; 
      padding: 10px 0; 
      flex: 1;
      min-height: 0;
    }
    .chat-bubble { 
      padding: 10px 14px; 
      border-radius: 10px; 
      font-size: 14px; 
      line-height: 1.6; 
      max-width: 88%; 
      word-break: break-word; 
      box-sizing: border-box; 
      position: relative;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    .chat-bubble.user { 
      align-self: flex-end; 
      background: #232529; 
      color: var(--brse-text); 
      border: 1px solid rgba(255, 107, 94, 0.2); 
      border-bottom-right-radius: 1px; 
    }
    .chat-bubble.ai { 
      align-self: flex-start; 
      background: rgba(255, 107, 94, 0.05); 
      color: var(--brse-text); 
      border: 1px solid rgba(255, 107, 94, 0.2); 
      border-bottom-left-radius: 1px; 
    }
    .chat-bubble.ai code { 
      background: rgba(255,255,255,0.06); 
      padding: 2px 5px; 
      border-radius: 4px; 
      font-family: 'Inter', monospace; 
      color: var(--brse-secondary); 
      font-size: 13px; 
    }
    
    .bubble-delete-btn {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 18px;
      height: 18px;
      display: none;
      align-items: center;
      justify-content: center;
      background: var(--brse-error);
      color: #fff;
      border-radius: 50%;
      font-size: 10px;
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      box-shadow: 0 2px 6px rgba(255, 85, 85, 0.4);
      z-index: 5;
    }
    .chat-bubble:hover .bubble-delete-btn {
      display: flex;
    }
    .bubble-delete-btn:hover {
      transform: scale(1.1);
      background: var(--brse-error);
    }
    .bubble-time {
      display: block;
      margin-top: 6px;
      color: rgba(162, 163, 170, 0.7);
      font-size: 10.5px;
      line-height: 1.2;
      font-weight: 700;
      text-align: right;
      user-select: none;
    }
    .chat-bubble.ai .bubble-time {
      text-align: left;
    }
    
    .typing-indicator { display: flex; gap: 4px; align-items: center; height: 10px; padding: 2px; }
    .typing-dot { width: 5px; height: 5px; background: var(--brse-primary); border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
    
    /* Bottom Chat Input (Premium Floating Pill Design) */
    .chat-input-container { 
      background: rgba(22, 22, 30, 0.6); 
      padding: 6px 8px; 
      border: 1px solid rgba(255, 107, 94, 0.2);
      border-radius: 24px;
      display: flex; 
      gap: 8px; 
      align-items: center; 
      flex-shrink: 0; 
      margin: 8px 12px 12px 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .chat-input { 
      flex: 1; 
      background: transparent; 
      border: none; 
      color: var(--brse-text); 
      padding: 6px 12px; 
      font-size: 13.5px; 
      outline: none; 
      box-sizing: border-box; 
    }
    .chat-send-btn { 
      background: linear-gradient(135deg, var(--brse-primary), var(--brse-secondary)); 
      color: #121316; 
      border: none; 
      border-radius: 50%; 
      width: 32px; 
      height: 32px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      cursor: pointer; 
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); 
      flex-shrink: 0; 
    }
    .chat-send-btn:hover { 
      transform: scale(1.08) translateY(-1px); 
      box-shadow: 0 3px 12px rgba(255, 107, 94, 0.4);
    }
    .chat-send-btn:active { 
      transform: scale(0.95); 
    }
    .local-ai-btn {
      background: none;
      border: none;
      color: var(--brse-text-dim);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 50%;
      transition: all 0.25s ease;
      width: 30px;
      height: 30px;
      flex-shrink: 0;
    }
    .local-ai-btn.active {
      color: var(--brse-success);
      background: rgba(78, 201, 165, 0.15);
      box-shadow: 0 0 10px rgba(78, 201, 165, 0.35);
      border: 1px solid rgba(78, 201, 165, 0.4);
    }
    .local-ai-btn.unsupported {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .local-ai-btn svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
    }
    .brse-word { cursor: pointer; border-radius: 2px; padding: 0 1px; }
    .brse-word:hover { background: #3d59a1; color: #fff; }
    
    /* Sider/Monica style Quick actions bar */
    .quick-actions-bar {
      display: flex;
      gap: 6px;
      padding: 6px 0;
      overflow-x: auto;
      flex-shrink: 0;
      scrollbar-width: none;
    }
    .quick-actions-bar::-webkit-scrollbar {
      display: none;
    }
    .pill-btn {
      background: rgba(255, 107, 94, 0.05);
      border: 1px solid rgba(255, 107, 94, 0.2);
      color: var(--brse-primary);
      border-radius: 14px;
      padding: 5px 12px;
      font-size: 11px;
      font-weight: 600;
      font-family: 'Outfit', sans-serif;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .pill-btn:hover {
      background: rgba(255, 138, 125, 0.12);
      border-color: var(--brse-secondary);
      color: #fff;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(255, 138, 125, 0.15);
    }
    .pill-btn:active {
      transform: translateY(0);
    }
    
    /* Persona Dropdown */
    .persona-select {
      background: var(--brse-surface);
      border: 1px solid rgba(255, 107, 94, 0.3);
      color: var(--brse-primary);
      font-size: 13.5px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      transition: all 0.2s;
      margin-right: 4px;
      height: 32px;
    }
    .persona-select:hover {
      border-color: var(--brse-secondary);
      color: var(--brse-secondary);
    }
    .persona-select option {
      background: var(--brse-surface);
      color: var(--brse-text);
    }
    
    /* Model Dropdown */
    .model-select {
      background: var(--brse-surface);
      border: 1px solid rgba(255, 138, 125, 0.4);
      color: var(--brse-secondary);
      font-size: 13.5px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      transition: all 0.2s;
      margin-right: 4px;
      height: 32px;
      max-width: 140px;
    }
    .model-select:hover {
      border-color: var(--brse-primary);
      color: var(--brse-primary);
    }
    .model-select option {
      background: var(--brse-surface);
      color: var(--brse-text);
    }
    
    /* Sleek Bubble Action links (Monica/Sider style) */
    .bubble-actions-bar {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.06);
      padding-top: 6px;
      justify-content: flex-end;
    }
    .action-btn-link {
      color: var(--brse-primary);
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 600;
      transition: color 0.15s, text-shadow 0.15s;
      user-select: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .action-btn-link:hover {
      color: var(--brse-secondary);
      text-shadow: 0 0 4px rgba(255, 138, 125, 0.4);
    }

    /* Absolute 8-Way Resize Handles (siblings of .card) */
    .resize-handle {
      position: absolute;
      background: transparent;
      z-index: 10000;
      pointer-events: auto; /* CRITICAL: Override parent pointer-events: none */
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .resize-left {
      left: -4px;
      top: 4px;
      width: 8px;
      height: calc(100% - 8px);
      cursor: w-resize;
    }
    .resize-left:hover {
      background: rgba(255, 107, 94, 0.08);
      border-left: 2px dashed rgba(255, 107, 94, 0.6);
    }
    .resize-right {
      right: -4px;
      top: 4px;
      width: 8px;
      height: calc(100% - 8px);
      cursor: e-resize;
    }
    .resize-right:hover {
      background: rgba(255, 107, 94, 0.08);
      border-right: 2px dashed rgba(255, 107, 94, 0.6);
    }
    .resize-top {
      left: 4px;
      top: -4px;
      width: calc(100% - 8px);
      height: 8px;
      cursor: n-resize;
    }
    .resize-top:hover {
      background: rgba(255, 107, 94, 0.08);
      border-top: 2px dashed rgba(255, 107, 94, 0.6);
    }
    .resize-bottom {
      left: 4px;
      bottom: -4px;
      width: calc(100% - 8px);
      height: 8px;
      cursor: s-resize;
    }
    .resize-bottom:hover {
      background: rgba(255, 107, 94, 0.08);
      border-bottom: 2px dashed rgba(255, 107, 94, 0.6);
    }
    .resize-top-left {
      left: -6px;
      top: -6px;
      width: 12px;
      height: 12px;
      cursor: nw-resize;
    }
    .resize-top-left:hover {
      background: rgba(255, 138, 125, 0.2);
      border-left: 2px solid var(--brse-secondary);
      border-top: 2px solid var(--brse-secondary);
    }
    .resize-top-right {
      right: -6px;
      top: -6px;
      width: 12px;
      height: 12px;
      cursor: ne-resize;
    }
    .resize-top-right:hover {
      background: rgba(255, 138, 125, 0.2);
      border-right: 2px solid var(--brse-secondary);
      border-top: 2px solid var(--brse-secondary);
    }
    .resize-bottom-left {
      left: -6px;
      bottom: -6px;
      width: 12px;
      height: 12px;
      cursor: sw-resize;
    }
    .resize-bottom-left:hover {
      background: rgba(255, 138, 125, 0.2);
      border-left: 2px solid var(--brse-secondary);
      border-bottom: 2px solid var(--brse-secondary);
    }
    .resize-bottom-right {
      right: -6px;
      bottom: -6px;
      width: 12px;
      height: 12px;
      cursor: se-resize;
    }
    .resize-bottom-right:hover {
      background: rgba(255, 138, 125, 0.2);
      border-right: 2px solid var(--brse-secondary);
      border-bottom: 2px solid var(--brse-secondary);
    }

    /* Slide-up Glossary Form Tokyo Night overlay */
    .glossary-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(29, 30, 34, 0.98);
      z-index: 100;
      display: flex;
      flex-direction: column;
      padding: 12px 14px;
      box-sizing: border-box;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateY(100%);
    }
    .glossary-overlay.active {
      transform: translateY(0);
    }
    .glossary-form-group {
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
    }
    .glossary-form-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--brse-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .glossary-form-input, .glossary-form-select, .glossary-form-textarea {
      background: #1d1e22;
      border: 1px solid rgba(255, 107, 94, 0.2);
      border-radius: 4px;
      color: var(--brse-text);
      padding: 6px 8px;
      font-size: 13px;
      outline: none;
      transition: all 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    .glossary-form-input:focus, .glossary-form-select:focus, .glossary-form-textarea:focus {
      border-color: var(--brse-secondary);
      box-shadow: 0 0 6px rgba(255, 138, 125, 0.3);
    }
    .glossary-form-textarea {
      resize: vertical;
      min-height: 48px;
      font-family: inherit;
    }
    .role-tags-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .role-tag-checkbox {
      display: none;
    }
    .role-tag-label {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(110, 112, 121, 0.4);
      color: var(--brse-text-muted);
      border: 1px solid rgba(110, 112, 121, 0.6);
      cursor: pointer;
      user-select: none;
      transition: all 0.2s;
    }
    .role-tag-checkbox:checked + .role-tag-label {
      background: rgba(255, 138, 125, 0.2);
      color: var(--brse-secondary);
      border-color: var(--brse-secondary);
      box-shadow: 0 0 8px rgba(255, 138, 125, 0.3);
    }
    .glossary-submit-btn {
      background: var(--brse-success);
      color: var(--brse-surface);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .glossary-submit-btn:hover {
      background: var(--brse-accent-cyan);
      box-shadow: 0 0 10px rgba(78, 201, 165, 0.4);
    }
    .glossary-cancel-btn {
      background: rgba(255, 255, 255, 0.08);
      color: var(--brse-text-muted);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .glossary-cancel-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }`;
