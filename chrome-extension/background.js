/**
 * Fresh Path CRM — Background Service Worker
 *
 * Receives call/text records from content script and syncs to CRM API.
 * Handles batching, retries, and offline queueing.
 */

// ─── CONFIG DEFAULTS ─────────────────────────────────────────────
const DEFAULT_CRM_URL = "http://localhost:3000";
const BATCH_DELAY_MS = 2000; // Wait 2s to batch records before sending
const MAX_RETRY_ATTEMPTS = 3;
const QUEUE_FLUSH_INTERVAL_MS = 30000; // Flush queue every 30s

// ─── STATE ───────────────────────────────────────────────────────
let pendingRecords = [];
let batchTimeout = null;
let syncStats = { synced: 0, failed: 0, queued: 0, lastSync: null };

// ─── STORAGE HELPERS ─────────────────────────────────────────────

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      { crmUrl: DEFAULT_CRM_URL, apiKey: "", enabled: true },
      resolve
    );
  });
}

async function getQueue() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ recordQueue: [] }, (result) => {
      resolve(result.recordQueue);
    });
  });
}

async function setQueue(queue) {
  return chrome.storage.local.set({ recordQueue: queue });
}

async function updateStats(updates) {
  Object.assign(syncStats, updates);
  await chrome.storage.local.set({ syncStats });
}

// ─── SYNC TO CRM ────────────────────────────────────────────────

async function syncRecords(records) {
  const config = await getConfig();
  if (!config.enabled) return;

  const url = `${config.crmUrl}/api/extension/sync`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { "X-Extension-Key": config.apiKey } : {}),
      },
      body: JSON.stringify({ records }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    await updateStats({
      synced: syncStats.synced + (result.imported || records.length),
      lastSync: new Date().toISOString(),
    });

    // Show notification for missed calls
    const missedCalls = records.filter((r) => r.direction === "missed");
    if (missedCalls.length > 0) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Missed Call Detected",
        message: `${missedCalls.length} missed call(s) synced to CRM. Tasks created.`,
        priority: 2,
      });
    }

    return result;
  } catch (error) {
    console.warn("[FP-CRM] Sync failed, queueing:", error.message);

    // Queue for retry
    const queue = await getQueue();
    queue.push(
      ...records.map((r) => ({ ...r, _retries: 0, _queuedAt: Date.now() }))
    );
    await setQueue(queue);
    await updateStats({
      failed: syncStats.failed + records.length,
      queued: queue.length,
    });

    return null;
  }
}

// ─── BATCH HANDLER ───────────────────────────────────────────────

function queueForBatch(records) {
  pendingRecords.push(...records);

  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(async () => {
    const batch = [...pendingRecords];
    pendingRecords = [];
    batchTimeout = null;

    if (batch.length > 0) {
      await syncRecords(batch);
    }
  }, BATCH_DELAY_MS);
}

// ─── QUEUE FLUSHER ───────────────────────────────────────────────

async function flushQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return;

  const config = await getConfig();
  if (!config.enabled) return;

  // Take up to 50 records per flush
  const batch = queue.splice(0, 50);
  const remaining = queue;

  try {
    const url = `${config.crmUrl}/api/extension/sync`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { "X-Extension-Key": config.apiKey } : {}),
      },
      body: JSON.stringify({
        records: batch.map(({ _retries, _queuedAt, ...r }) => r),
      }),
    });

    if (response.ok) {
      await setQueue(remaining);
      const result = await response.json();
      await updateStats({
        synced: syncStats.synced + (result.imported || batch.length),
        queued: remaining.length,
        lastSync: new Date().toISOString(),
      });
    } else {
      // Put failed records back with incremented retry count
      const retried = batch
        .map((r) => ({ ...r, _retries: (r._retries || 0) + 1 }))
        .filter((r) => r._retries < MAX_RETRY_ATTEMPTS);

      await setQueue([...retried, ...remaining]);
      await updateStats({ queued: retried.length + remaining.length });
    }
  } catch (error) {
    console.warn("[FP-CRM] Queue flush failed:", error.message);
    // Put records back
    await setQueue([...batch, ...remaining]);
  }
}

// ─── MESSAGE HANDLER ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "NEW_RECORDS":
      queueForBatch(message.records);
      sendResponse({ ok: true });
      break;

    case "UPDATE_BADGE":
      chrome.action.setBadgeText({
        text: message.count > 0 ? String(message.count) : "",
      });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
      // Clear badge after 3 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 3000);
      sendResponse({ ok: true });
      break;

    case "GET_STATS":
      chrome.storage.local.get({ syncStats: syncStats }, (result) => {
        sendResponse(result.syncStats);
      });
      return true; // Keep channel open for async response

    case "FORCE_FLUSH":
      flushQueue().then(() => sendResponse({ ok: true }));
      return true;

    case "TEST_CONNECTION":
      testConnection(message.crmUrl).then((result) => sendResponse(result));
      return true;
  }
});

// ─── CONNECTION TEST ─────────────────────────────────────────────

async function testConnection(crmUrl) {
  try {
    const response = await fetch(`${crmUrl}/api/extension/ping`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, message: data.message || "Connected" };
    }
    return { success: false, message: `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ─── ALARMS ──────────────────────────────────────────────────────

// Set up periodic queue flushing
chrome.alarms.create("flushQueue", { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "flushQueue") {
    flushQueue();
  }
});

// ─── INSTALL HANDLER ─────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    crmUrl: DEFAULT_CRM_URL,
    apiKey: "",
    syncStats: { synced: 0, failed: 0, queued: 0, lastSync: null },
    recordQueue: [],
  });
});
