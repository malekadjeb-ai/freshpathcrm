// ─── DOM REFS ────────────────────────────────────────────────────
const enabledToggle = document.getElementById("enabledToggle");
const crmUrlInput = document.getElementById("crmUrl");
const apiKeyInput = document.getElementById("apiKey");
const testBtn = document.getElementById("testBtn");
const saveBtn = document.getElementById("saveBtn");
const flushBtn = document.getElementById("flushBtn");
const scanBtn = document.getElementById("scanBtn");
const connectionStatus = document.getElementById("connectionStatus");
const statSynced = document.getElementById("statSynced");
const statQueued = document.getElementById("statQueued");
const statFailed = document.getElementById("statFailed");
const lastSync = document.getElementById("lastSync");
const openCrm = document.getElementById("openCrm");

// ─── LOAD SAVED STATE ───────────────────────────────────────────

chrome.storage.local.get(
  { enabled: true, crmUrl: "http://localhost:3000", apiKey: "", syncStats: {} },
  (result) => {
    enabledToggle.checked = result.enabled;
    crmUrlInput.value = result.crmUrl;
    apiKeyInput.value = result.apiKey;
    openCrm.href = result.crmUrl + "/dashboard";

    updateStats(result.syncStats);
    testConnection(result.crmUrl);
  }
);

// ─── STATS ───────────────────────────────────────────────────────

function updateStats(stats) {
  if (!stats) return;
  statSynced.textContent = stats.synced || 0;
  statQueued.textContent = stats.queued || 0;
  statFailed.textContent = stats.failed || 0;

  if (stats.lastSync) {
    const ago = timeAgo(new Date(stats.lastSync));
    lastSync.textContent = `Last sync: ${ago}`;
  } else {
    lastSync.textContent = "Never synced";
  }
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ─── CONNECTION TEST ─────────────────────────────────────────────

async function testConnection(url) {
  connectionStatus.className = "status disconnected";
  connectionStatus.innerHTML = '<div class="status-dot"></div><span>Testing...</span>';

  chrome.runtime.sendMessage(
    { type: "TEST_CONNECTION", crmUrl: url || crmUrlInput.value },
    (result) => {
      if (result?.success) {
        connectionStatus.className = "status connected";
        connectionStatus.innerHTML = `<div class="status-dot"></div><span>Connected to CRM</span>`;
      } else {
        connectionStatus.className = "status disconnected";
        connectionStatus.innerHTML = `<div class="status-dot"></div><span>${result?.message || "Cannot reach CRM"}</span>`;
      }
    }
  );
}

// ─── EVENT HANDLERS ──────────────────────────────────────────────

enabledToggle.addEventListener("change", () => {
  const enabled = enabledToggle.checked;
  chrome.storage.local.set({ enabled });

  // Notify content script
  chrome.tabs.query({ url: "https://voice.google.com/*" }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_ENABLED", enabled });
    }
  });
});

saveBtn.addEventListener("click", () => {
  const crmUrl = crmUrlInput.value.replace(/\/+$/, ""); // Remove trailing slash
  const apiKey = apiKeyInput.value;
  chrome.storage.local.set({ crmUrl, apiKey });
  openCrm.href = crmUrl + "/dashboard";

  saveBtn.textContent = "Saved!";
  saveBtn.style.background = "#10b981";
  saveBtn.style.color = "white";
  setTimeout(() => {
    saveBtn.textContent = "Save Settings";
    saveBtn.style.background = "";
    saveBtn.style.color = "";
  }, 1500);
});

testBtn.addEventListener("click", () => {
  testConnection(crmUrlInput.value.replace(/\/+$/, ""));
});

flushBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "FORCE_FLUSH" }, () => {
    flushBtn.textContent = "Flushing...";
    setTimeout(() => {
      flushBtn.textContent = "Flush Queue Now";
      // Refresh stats
      chrome.runtime.sendMessage({ type: "GET_STATS" }, updateStats);
    }, 2000);
  });
});

scanBtn.addEventListener("click", () => {
  chrome.tabs.query({ url: "https://voice.google.com/*" }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: "FORCE_SCAN" });
    }
  });
  scanBtn.textContent = "Scanning...";
  setTimeout(() => {
    scanBtn.textContent = "Force Scan Page";
  }, 1500);
});

openCrm.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: openCrm.href });
});

// Refresh stats periodically while popup is open
setInterval(() => {
  chrome.runtime.sendMessage({ type: "GET_STATS" }, updateStats);
}, 5000);
