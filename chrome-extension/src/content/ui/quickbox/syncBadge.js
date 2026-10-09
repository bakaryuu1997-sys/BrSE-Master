"use strict";

import { MESSAGE_TYPES } from "../../../shared/messageTypes.js";

export function bindQuickBoxSyncBadge(shadow, { safeSendMessage, showToast }) {
  const syncBadge = shadow.getElementById("brse-sync-badge");
  if (!syncBadge || typeof chrome === "undefined" || !chrome.storage?.local) {
    return;
  }

  const updateSyncBadge = () => {
    chrome.storage.local.get(["brse_outbox_queue"], (res) => {
      const queue = Array.isArray(res.brse_outbox_queue) ? res.brse_outbox_queue : [];
      applyBadgeState(syncBadge, queue.length === 0 ? "synced" : "pending", queue.length);
    });
  };

  updateSyncBadge();

  const onStorageChanged = (changes, areaName) => {
    if (areaName === "local" && changes.brse_outbox_queue) {
      updateSyncBadge();
    }
  };

  chrome.storage.onChanged?.addListener?.(onStorageChanged);

  syncBadge.onclick = (event) => {
    event.stopPropagation();
    applyBadgeState(syncBadge, "syncing");

    safeSendMessage({ type: MESSAGE_TYPES.BRSE_RETRY_SYNC }).then((response) => {
      if (response?.ok) {
        if (response.successCount > 0) {
          showToast(`Đã đồng bộ thành công ${response.successCount} thuật ngữ offline.`);
        } else if (response.remaining > 0) {
          showToast(`Đồng bộ chưa xong. Còn lại ${response.remaining} thuật ngữ offline.`);
        } else {
          showToast("Hàng đợi rỗng hoặc đã đồng bộ.");
        }
      } else {
        showToast(`Đồng bộ thất bại: ${response?.error || "Lỗi kết nối"}`);
      }
      updateSyncBadge();
    });
  };

  return () => {
    chrome.storage.onChanged?.removeListener?.(onStorageChanged);
  };
}

function applyBadgeState(syncBadge, state, pendingCount = 0) {
  const iconEl = syncBadge.querySelector(".sync-icon");
  const textEl = syncBadge.querySelector(".sync-text");

  if (state !== "syncing" && iconEl) iconEl.classList.remove("spin");

  if (state === "synced") {
    setBadgeStyle(syncBadge, "var(--brse-success)", "rgba(78, 201, 165, 0.15)", "rgba(78, 201, 165, 0.3)");
    if (iconEl) iconEl.innerText = "☁️";
    if (textEl) textEl.innerText = "Đã đồng bộ";
    return;
  }

  if (state === "syncing") {
    setBadgeStyle(syncBadge, "var(--brse-primary)", "rgba(255, 107, 94, 0.15)", "rgba(255, 107, 94, 0.3)");
    if (iconEl) iconEl.classList.add("spin");
    if (textEl) textEl.innerText = "Đang đồng bộ...";
    return;
  }

  setBadgeStyle(syncBadge, "var(--brse-accent)", "rgba(255, 180, 84, 0.15)", "rgba(255, 180, 84, 0.3)");
  if (iconEl) iconEl.innerText = "☁️";
  if (textEl) textEl.innerText = `${pendingCount} chờ`;
}

function setBadgeStyle(syncBadge, color, background, borderColor) {
  syncBadge.style.color = color;
  syncBadge.style.background = background;
  syncBadge.style.borderColor = borderColor;
}
