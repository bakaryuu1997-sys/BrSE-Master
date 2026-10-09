"use strict";

export function formatMessageTime(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function renderBubbleTimestampHtml(date = new Date()) {
  return `<span class="bubble-time">${formatMessageTime(date)}</span>`;
}

export function appendBubbleTimestamp(bubble, date = new Date()) {
  if (!bubble || bubble.querySelector?.(".bubble-time")) return;
  const timestamp = document.createElement("span");
  timestamp.className = "bubble-time";
  timestamp.textContent = formatMessageTime(date);
  bubble.appendChild(timestamp);
}
