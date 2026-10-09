"use strict";

import { DEFAULT_API_BASE } from "../shared/api.js";
import { getStorageItems, STORAGE_KEYS } from "../shared/storage.js";

export function initSidepanelStatusPolling({
  backendSelector = "#backend-status",
  meetingSelector = "#meeting-quick-actions",
} = {}) {
  let backendTimer = null;
  let meetingTimer = null;

  // Pause the polling timers while the side panel is hidden (collapsed / window
  // minimized). Running fetch + active-tab queries every 2-5s in the background
  // wastes resources with no visible benefit; resume immediately on re-show.
  function start() {
    if (backendTimer === null) {
      checkBackendStatus(backendSelector);
      backendTimer = setInterval(() => checkBackendStatus(backendSelector), 5000);
    }
    if (meetingTimer === null) {
      detectMeeting(meetingSelector);
      meetingTimer = setInterval(() => detectMeeting(meetingSelector), 2000);
    }
  }

  function stop() {
    if (backendTimer !== null) { clearInterval(backendTimer); backendTimer = null; }
    if (meetingTimer !== null) { clearInterval(meetingTimer); meetingTimer = null; }
  }

  function handleVisibility() {
    if (document.visibilityState === "hidden") stop();
    else start();
  }

  document.addEventListener("visibilitychange", handleVisibility);
  if (document.visibilityState !== "hidden") start();

  return () => {
    document.removeEventListener("visibilitychange", handleVisibility);
    stop();
  };
}

export async function checkBackendStatus(selector = "#backend-status") {
  const dot = document.querySelector(selector);
  if (!dot) return;
  const stored = await getStorageItems([STORAGE_KEYS.API_BASE_URL]);
  const baseUrl = (stored[STORAGE_KEYS.API_BASE_URL] || DEFAULT_API_BASE).replace(/\/$/, "");

  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
    dot.className = res.ok ? "status-dot online" : "status-dot offline";
  } catch (e) {
    dot.className = "status-dot offline";
  }
}

export async function detectMeeting(selector = "#meeting-quick-actions") {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const meetingBar = document.querySelector(selector);
  if (!meetingBar) return;

  const meetingUrl = tab?.url || "";
  const isMeeting = meetingUrl.includes("meet.google.com")
    || meetingUrl.includes("zoom.us")
    || meetingUrl.includes("teams.microsoft.com");

  meetingBar.classList.toggle("hidden", !isMeeting);
}
