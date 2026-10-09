"use strict";

import { THEME } from "../../shared/theme.js";

export function showToast(msg) {
  const t = document.createElement('div');
  t.innerText = msg;
  Object.assign(t.style, {
    position: 'fixed',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: THEME.primary,
    color: THEME.bgCanvas,
    padding: '10px 20px',
    borderRadius: '20px',
    zIndex: 'var(--brse-z-index)',
    fontWeight: 'bold',
    fontSize: '13px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
    fontFamily: 'sans-serif'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
