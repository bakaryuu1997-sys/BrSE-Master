"use strict";

export const FLOATING_TRIGGER_STYLE = `
    .btn-container {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--brse-surface);
      border: 2px solid var(--brse-primary);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 107, 94, 0.25);
      cursor: grab;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s, border-color 0.4s, opacity 0.4s;
      overflow: hidden;
      box-sizing: border-box;
      opacity: 1;
    }
    
    .btn-container:hover {
      transform: scale(1.1) !important;
      border-color: var(--brse-secondary);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(255, 138, 125, 0.45);
      opacity: 1 !important;
    }
    
    .btn-container:active {
      cursor: grabbing;
      transform: scale(0.95) !important;
    }
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      pointer-events: none;
    }

    .popover-menu {
      position: absolute;
      bottom: 52px;
      background: rgba(29, 30, 34, 0.82);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 107, 94, 0.3);
      border-radius: 10px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.55), 0 0 15px rgba(255, 107, 94, 0.1);
      padding: 6px;
      display: none;
      flex-direction: column;
      gap: 4px;
      width: 190px;
      pointer-events: auto;
      animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    }
    .popover-menu.show {
      display: flex;
    }
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .menu-item {
      padding: 8px 12px;
      border-radius: 6px;
      color: var(--brse-text-muted);
      font-size: 11.5px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      font-weight: 600;
      box-sizing: border-box;
    }
    .menu-item:hover {
      background: rgba(255, 107, 94, 0.15);
      color: #fff;
      transform: translateX(2px);
    }
    .menu-item svg {
      width: 14px;
      height: 14px;
      stroke: currentColor;
      fill: none;
      flex-shrink: 0;
    }`;
