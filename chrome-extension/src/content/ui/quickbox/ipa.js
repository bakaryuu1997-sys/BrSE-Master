"use strict";

import { escapeHtml } from "../../../shared/sanitizer.js";

export function renderIpaElements(shadow, word, ipa, safeSendMessage, MESSAGE_TYPES) {
  const container = shadow.getElementById('brse-qb-ipa-container');
  if (!container) return;
  
  let html = "";
  if (ipa.ukIpa || ipa.ukAudio) {
    html += `
      <span class="ipa-item" id="brse-spk-uk" title="Phát âm UK (Anh-Anh)">
        <span class="spk-icon">🔊</span>
        <span class="ipa-text">${escapeHtml(ipa.ukIpa || '/.../')}</span>
        <span class="dialect-badge uk">UK</span>
      </span>
    `;
  }
  if (ipa.usIpa || ipa.usAudio) {
    html += `
      <span class="ipa-item" id="brse-spk-us" title="Phát âm US (Anh-Mỹ)">
        <span class="spk-icon">🔊</span>
        <span class="ipa-text">${escapeHtml(ipa.usIpa || '/.../')}</span>
        <span class="dialect-badge us">US</span>
      </span>
    `;
  }
  
  if (!html) {
    html = `<span class="ipa-item" style="opacity: 0.6; pointer-events: none;">🔊 Không tìm thấy phiên âm</span>`;
  }
  
  container.innerHTML = html;
  
  const btnUk = shadow.getElementById('brse-spk-uk');
  if (btnUk) {
    btnUk.onclick = (e) => {
      e.stopPropagation();
      playPronunciation(word, ipa.ukAudio, 'uk', safeSendMessage, MESSAGE_TYPES);
    };
  }
  
  const btnUs = shadow.getElementById('brse-spk-us');
  if (btnUs) {
    btnUs.onclick = (e) => {
      e.stopPropagation();
      playPronunciation(word, ipa.usAudio, 'us', safeSendMessage, MESSAGE_TYPES);
    };
  }
}

export function playPronunciation(word, audioUrl, dialect, safeSendMessage, MESSAGE_TYPES) {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      safeSendMessage({ type: MESSAGE_TYPES.BRSE_SPEAK, text: word, lang: dialect === 'uk' ? 'en-GB' : 'en-US' });
    });
  } else {
    safeSendMessage({ type: MESSAGE_TYPES.BRSE_SPEAK, text: word, lang: dialect === 'uk' ? 'en-GB' : 'en-US' });
  }
}
