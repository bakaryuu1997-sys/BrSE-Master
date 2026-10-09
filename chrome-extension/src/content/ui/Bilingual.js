"use strict";

import { escapeHtml } from "../../shared/sanitizer.js";

export function insertBilingualTranslation(parentEl, translationText) {
  if (!parentEl) return;
  
  // Prevent duplicate translations
  if (parentEl.querySelector('.brse-bilingual-trans') || parentEl.querySelector('.brse-immersive-bilingual-trans')) return;
  
  const bilingualNode = document.createElement('span');
  bilingualNode.className = 'brse-immersive-bilingual-trans brse-bilingual-trans';
  
  Object.assign(bilingualNode.style, {
    color: '#4ec9a5', // Soft Matcha Green
    fontSize: '0.88em',
    lineHeight: '1.45',
    fontStyle: 'italic',
    opacity: '0.85',
    display: 'block',
    marginTop: '4px',
    marginBottom: '2px',
    boxSizing: 'border-box',
    animation: 'brseSlideDown 0.25s ease-out',
    fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif"
  });
  
  if (!document.getElementById('brse-bilingual-style')) {
    const style = document.createElement('style');
    style.id = 'brse-bilingual-style';
    style.textContent = `
      @keyframes brseSlideDown {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 0.85; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  bilingualNode.innerHTML = `<span style="font-weight:700; color:#4ec9a5; font-style:normal; margin-right:4px;">💡</span> ${escapeHtml(translationText)}`;
  
  parentEl.appendChild(bilingualNode);
}
