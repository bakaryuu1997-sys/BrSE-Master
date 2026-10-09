"use strict";

const OUTBOX_STORAGE_KEY = "brse_outbox_queue";

/**
 * Gets all items in the outbox queue
 * @returns {Promise<Array>}
 */
export function getOutboxQueue() {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([OUTBOX_STORAGE_KEY], (res) => {
        resolve(res[OUTBOX_STORAGE_KEY] || []);
      });
    } else {
      resolve([]);
    }
  });
}

/**
 * Saves the outbox queue
 * @param {Array} queue 
 * @returns {Promise<void>}
 */
function saveOutboxQueue(queue) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [OUTBOX_STORAGE_KEY]: queue }, () => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Queues a sync payload for offline storage.
 * Performs deduplication and caps the queue size to 50 records.
 * @param {object} payload 
 * @returns {Promise<void>}
 */
export async function queueOfflineSync(payload) {
  const queue = await getOutboxQueue();
  
  // Deduplication: Check if there is an item with the exact same originalText and url
  const duplicateIndex = queue.findIndex(
    item => item.originalText === payload.originalText && item.url === payload.url
  );

  if (duplicateIndex !== -1) {
    console.log("[Outbox] Duplicate found. Updating timestamp for existing item.");
    queue[duplicateIndex].timestamp = Date.now();
    queue[duplicateIndex].status = "pending";
    await saveOutboxQueue(queue);
    return;
  }

  const newItem = {
    ...payload,
    timestamp: Date.now(),
    retries: 0,
    status: "pending"
  };

  // Size cap: Max 50 items. Shift oldest if full.
  if (queue.length >= 50) {
    console.warn("[Outbox] Storage cap (50 records) reached. Shifting oldest pending item.");
    queue.shift();
  }

  queue.push(newItem);
  await saveOutboxQueue(queue);
  console.log("[Outbox] Queued offline sync record:", newItem);
}

/**
 * Retries syncing all pending outbox items in parallel.
 * Avoids Head-of-Line blocking completely using Promise.allSettled.
 * @param {function} syncFn - Async function(originalText, translation, url, projectId)
 * @returns {Promise<{successCount: number, failCount: number}>}
 */
export async function retryOfflineSync(syncFn) {
  const queue = await getOutboxQueue();
  if (queue.length === 0) return { successCount: 0, failCount: 0 };

  console.log(`[Outbox] Retrying ${queue.length} pending items in parallel...`);
  
  const syncPromises = queue.map(async (item) => {
    try {
      await syncFn(item.originalText, item.translation, item.url, item.projectId);
      return { success: true, item };
    } catch (err) {
      return { success: false, item, error: err.message };
    }
  });

  const results = await Promise.allSettled(syncPromises);

  const remaining = [];
  let successCount = 0;
  let failCount = 0;

  for (const res of results) {
    if (res.status === "fulfilled") {
      const val = res.value;
      if (val.success) {
        successCount++;
        console.log("[Outbox] Successfully synced pending item:", val.item.originalText.slice(0, 30));
      } else {
        failCount++;
        const item = val.item;
        item.retries++;
        item.error = val.error;
        remaining.push(item);
        console.warn("[Outbox] Sync retry failed for:", item.originalText.slice(0, 30), val.error);
      }
    } else {
      failCount++;
      console.error("[Outbox] Promise rejected completely during sync retry:", res.reason);
    }
  }

  await saveOutboxQueue(remaining);
  return { successCount, failCount };
}
