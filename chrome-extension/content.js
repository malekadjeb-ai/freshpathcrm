/**
 * Fresh Path CRM — Google Voice Content Script
 *
 * Monitors voice.google.com for call/text activity using two strategies:
 * 1. DOM observation — watches the call history list for new entries
 * 2. Network interception — captures internal API responses for call data
 *
 * Sends extracted records to background.js which relays to the CRM API.
 */

(() => {
  "use strict";

  // Track what we've already sent to avoid duplicates
  const sentRecords = new Set();
  let isEnabled = true;
  let pollInterval = null;
  let observer = null;

  // ─── CONFIG ────────────────────────────────────────────────────────
  const POLL_INTERVAL_MS = 5000; // Check for new entries every 5s
  const MAX_ENTRIES_PER_SCAN = 50;

  // ─── UTILITY ───────────────────────────────────────────────────────

  function normalizePhone(raw) {
    if (!raw) return "";
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : digits;
  }

  function generateRecordKey(record) {
    return `${record.phoneNumber}_${record.type}_${record.direction}_${record.timestamp}`;
  }

  // ─── DOM SELECTORS ─────────────────────────────────────────────────
  // Google Voice uses Material Design components. These selectors target
  // the call history list. They may need updating if Google changes the UI.

  const SELECTORS = {
    // Main call list container
    callList: [
      'gv-call-list',
      '[role="list"]',
      '.call-list',
      'md-list',
    ],
    // Individual call entry
    callEntry: [
      'gv-call-item',
      'gv-text-item',
      'gv-voicemail-item',
      '[role="listitem"]',
      '.call-item',
      'md-list-item',
    ],
    // Contact name within an entry
    contactName: [
      '.contact-name',
      '[data-caller-name]',
      'gv-annotation .name',
      '.caller-name',
      'h3',
      '.display-name',
    ],
    // Phone number
    phoneNumber: [
      '.phone-number',
      '[data-phone-number]',
      '.tel',
      'gv-annotation .number',
    ],
    // Timestamp
    timestamp: [
      '.timestamp',
      'gv-relative-time',
      'time',
      '[datetime]',
      '.call-time',
    ],
    // Duration
    duration: [
      '.duration',
      '.call-duration',
      'gv-call-duration',
    ],
    // Call type indicators (missed, voicemail, etc.)
    typeIndicator: [
      '.call-type',
      '.missed-icon',
      '[data-call-type]',
      'i.material-icons',
      'mat-icon',
    ],
    // Navigation tabs (Calls, Messages, Voicemail)
    navTab: [
      'gv-side-nav a',
      'nav a',
      '[role="tab"]',
      '.nav-item',
    ],
  };

  function querySelector(selectorList, parent = document) {
    for (const sel of selectorList) {
      const el = parent.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function querySelectorAll(selectorList, parent = document) {
    for (const sel of selectorList) {
      const els = parent.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    }
    return [];
  }

  // ─── DATA EXTRACTION ──────────────────────────────────────────────

  function extractTextContent(element, selectorList) {
    const el = querySelector(selectorList, element);
    return el ? el.textContent.trim() : "";
  }

  function extractTimestamp(element) {
    // Try datetime attribute first
    const timeEl = querySelector(SELECTORS.timestamp, element);
    if (timeEl) {
      const dt = timeEl.getAttribute("datetime");
      if (dt) return dt;
      // Try parsing the text content
      const text = timeEl.textContent.trim();
      const parsed = new Date(text);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return new Date().toISOString();
  }

  function detectCallType(element) {
    const text = element.textContent.toLowerCase();
    const html = element.innerHTML.toLowerCase();

    // Check for voicemail indicators
    if (text.includes("voicemail") || html.includes("voicemail")) {
      return { type: "voicemail", direction: "inbound" };
    }

    // Check for text/SMS
    if (text.includes("message") || text.includes("sms") || text.includes("text")) {
      return { type: "text", direction: "inbound" };
    }

    // Check for missed calls
    if (text.includes("missed") || html.includes("missed") ||
        element.querySelector('.missed, [data-missed], .red, .error')) {
      return { type: "call", direction: "missed" };
    }

    // Check direction
    const icons = querySelectorAll(SELECTORS.typeIndicator, element);
    for (const icon of icons) {
      const iconText = icon.textContent.toLowerCase();
      if (iconText.includes("call_made") || iconText.includes("outgoing") || iconText.includes("north_east")) {
        return { type: "call", direction: "outbound" };
      }
      if (iconText.includes("call_received") || iconText.includes("incoming") || iconText.includes("south_west")) {
        return { type: "call", direction: "inbound" };
      }
      if (iconText.includes("call_missed") || iconText.includes("phone_missed")) {
        return { type: "call", direction: "missed" };
      }
    }

    // Check CSS classes
    const classes = element.className.toLowerCase();
    if (classes.includes("outgoing") || classes.includes("placed")) {
      return { type: "call", direction: "outbound" };
    }
    if (classes.includes("missed")) {
      return { type: "call", direction: "missed" };
    }

    return { type: "call", direction: "inbound" };
  }

  function parseDuration(text) {
    if (!text) return null;
    // Match patterns like "5:23", "1:05:23", "5 min", "23 sec"
    const hmsMatch = text.match(/(\d+):(\d{2}):(\d{2})/);
    if (hmsMatch) {
      return parseInt(hmsMatch[1]) * 3600 + parseInt(hmsMatch[2]) * 60 + parseInt(hmsMatch[3]);
    }
    const msMatch = text.match(/(\d+):(\d{2})/);
    if (msMatch) {
      return parseInt(msMatch[1]) * 60 + parseInt(msMatch[2]);
    }
    const minMatch = text.match(/(\d+)\s*min/);
    if (minMatch) return parseInt(minMatch[1]) * 60;
    const secMatch = text.match(/(\d+)\s*sec/);
    if (secMatch) return parseInt(secMatch[1]);
    return null;
  }

  function extractRecord(element) {
    const name = extractTextContent(element, SELECTORS.contactName);
    let phone = extractTextContent(element, SELECTORS.phoneNumber);
    const timestamp = extractTimestamp(element);
    const durationText = extractTextContent(element, SELECTORS.duration);
    const { type, direction } = detectCallType(element);

    // If no explicit phone element, check if the name looks like a phone number
    if (!phone && /^[\d\s()+\-]+$/.test(name)) {
      phone = name;
    }

    // Extract message body for texts
    let messageBody = null;
    if (type === "text") {
      // Look for message preview text
      const preview = element.querySelector('.message-preview, .last-message, .snippet, p');
      if (preview) messageBody = preview.textContent.trim();
    }

    const record = {
      phoneNumber: normalizePhone(phone),
      contactName: /^[\d\s()+\-]+$/.test(name) ? undefined : name || undefined,
      type,
      direction,
      timestamp,
      duration: parseDuration(durationText),
      messageBody,
      source: "chrome_extension",
    };

    return record;
  }

  // ─── DOM SCANNING ──────────────────────────────────────────────────

  function scanCallList() {
    if (!isEnabled) return;

    const entries = querySelectorAll(SELECTORS.callEntry);
    if (entries.length === 0) return;

    const newRecords = [];

    for (const entry of entries.slice(0, MAX_ENTRIES_PER_SCAN)) {
      try {
        const record = extractRecord(entry);
        if (!record.phoneNumber && !record.contactName) continue;

        const key = generateRecordKey(record);
        if (sentRecords.has(key)) continue;

        sentRecords.add(key);
        newRecords.push(record);
      } catch (e) {
        console.debug("[FP-CRM] Error extracting record:", e);
      }
    }

    if (newRecords.length > 0) {
      chrome.runtime.sendMessage({
        type: "NEW_RECORDS",
        records: newRecords,
      });
      updateBadge(newRecords.length);
    }
  }

  // ─── NETWORK INTERCEPTION ─────────────────────────────────────────
  // Override fetch to intercept Google Voice internal API responses.
  // This is more reliable than DOM scraping as it captures the raw data.

  function setupNetworkInterception() {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);

      try {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

        // Intercept Google Voice API calls that return call/message data
        if (
          url.includes("voice.google.com") &&
          (url.includes("/api/") ||
            url.includes("ListActivities") ||
            url.includes("ListMessages") ||
            url.includes("ListCalls") ||
            url.includes("batchexecute"))
        ) {
          // Clone the response so we can read it without consuming
          const cloned = response.clone();
          cloned.text().then((text) => {
            try {
              parseNetworkResponse(text, url);
            } catch (e) {
              console.debug("[FP-CRM] Network parse error:", e);
            }
          });
        }
      } catch (e) {
        console.debug("[FP-CRM] Fetch intercept error:", e);
      }

      return response;
    };

    // Also override XMLHttpRequest for older-style requests
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this._fpUrl = url;
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      this.addEventListener("load", function () {
        try {
          const url = this._fpUrl || "";
          if (
            url.includes("voice.google.com") &&
            (url.includes("/api/") ||
              url.includes("ListActivities") ||
              url.includes("batchexecute"))
          ) {
            parseNetworkResponse(this.responseText, url);
          }
        } catch (e) {
          console.debug("[FP-CRM] XHR intercept error:", e);
        }
      });
      return originalSend.apply(this, arguments);
    };
  }

  function parseNetworkResponse(text, url) {
    if (!isEnabled || !text) return;

    // Google Voice API responses are often in a specific JSON format
    // or wrapped in )]}' prefix for XSS protection
    let data;
    try {
      const cleaned = text.replace(/^\)\]\}'/, "").trim();
      data = JSON.parse(cleaned);
    } catch {
      // Try extracting JSON from batchexecute format (array of arrays)
      try {
        const jsonMatches = text.match(/\[[\s\S]*\]/g);
        if (jsonMatches) {
          for (const match of jsonMatches) {
            try {
              data = JSON.parse(match);
              break;
            } catch { /* continue */ }
          }
        }
      } catch { return; }
    }

    if (!data) return;

    // Recursively search for phone number patterns in the response
    const records = extractRecordsFromApiData(data);
    if (records.length > 0) {
      const newRecords = records.filter((r) => {
        const key = generateRecordKey(r);
        if (sentRecords.has(key)) return false;
        sentRecords.add(key);
        return true;
      });

      if (newRecords.length > 0) {
        chrome.runtime.sendMessage({
          type: "NEW_RECORDS",
          records: newRecords,
        });
        updateBadge(newRecords.length);
      }
    }
  }

  function extractRecordsFromApiData(data, records = []) {
    if (!data || typeof data !== "object") return records;

    if (Array.isArray(data)) {
      // Look for arrays that look like call records:
      // Typically contain a phone number string, timestamp, and type indicators
      for (const item of data) {
        if (Array.isArray(item) && item.length >= 3) {
          const phoneCandidate = findPhoneInArray(item);
          const timestampCandidate = findTimestampInArray(item);

          if (phoneCandidate && timestampCandidate) {
            const record = {
              phoneNumber: normalizePhone(phoneCandidate),
              contactName: findNameInArray(item),
              type: inferTypeFromArray(item),
              direction: inferDirectionFromArray(item),
              timestamp: timestampCandidate,
              duration: findDurationInArray(item),
              messageBody: findMessageInArray(item),
              source: "chrome_extension",
            };
            records.push(record);
            continue; // Don't recurse into this item
          }
        }
        extractRecordsFromApiData(item, records);
      }
    } else {
      // Check object properties
      const hasPhone = data.phoneNumber || data.phone || data.e164 || data.formattedNumber;
      const hasTimestamp = data.timestamp || data.startTime || data.createdTime || data.date;

      if (hasPhone && hasTimestamp) {
        records.push({
          phoneNumber: normalizePhone(String(hasPhone)),
          contactName: data.contactName || data.name || data.displayName || undefined,
          type: data.type === 2 || data.type === "SMS" ? "text"
            : data.type === 4 || data.type === "VOICEMAIL" ? "voicemail"
            : "call",
          direction: data.direction === 2 || data.type === "OUTGOING" ? "outbound"
            : data.isMissed || data.type === "MISSED" ? "missed"
            : "inbound",
          timestamp: new Date(
            typeof hasTimestamp === "number"
              ? hasTimestamp > 1e12 ? hasTimestamp : hasTimestamp * 1000
              : hasTimestamp
          ).toISOString(),
          duration: data.duration || data.callDuration || null,
          messageBody: data.messageText || data.body || data.transcript || null,
          source: "chrome_extension",
        });
      } else {
        for (const key of Object.keys(data)) {
          extractRecordsFromApiData(data[key], records);
        }
      }
    }

    return records;
  }

  // Helper functions for array-based API data extraction
  function findPhoneInArray(arr) {
    for (const item of arr) {
      if (typeof item === "string") {
        const digits = item.replace(/\D/g, "");
        if (digits.length >= 10 && digits.length <= 15) return item;
        if (item.startsWith("+") && digits.length >= 10) return item;
      }
    }
    return null;
  }

  function findTimestampInArray(arr) {
    for (const item of arr) {
      if (typeof item === "number" && item > 1500000000 && item < 2000000000) {
        return new Date(item * 1000).toISOString();
      }
      if (typeof item === "number" && item > 1500000000000 && item < 2000000000000) {
        return new Date(item).toISOString();
      }
      if (typeof item === "string" && /^\d{4}-\d{2}-\d{2}/.test(item)) {
        const d = new Date(item);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }
    // Recurse into sub-arrays
    for (const item of arr) {
      if (Array.isArray(item)) {
        const found = findTimestampInArray(item);
        if (found) return found;
      }
    }
    return null;
  }

  function findNameInArray(arr) {
    for (const item of arr) {
      if (typeof item === "string" && item.length > 1 && item.length < 50) {
        if (!/^[\d\s()+\-]+$/.test(item) && !/^\d{4}-/.test(item)) {
          return item;
        }
      }
    }
    return undefined;
  }

  function findDurationInArray(arr) {
    for (const item of arr) {
      if (typeof item === "number" && item > 0 && item < 36000) return item;
    }
    return null;
  }

  function findMessageInArray(arr) {
    for (const item of arr) {
      if (typeof item === "string" && item.length > 10 && item.length < 5000) {
        if (!/^[\d\s()+\-]+$/.test(item) && !/^\d{4}-/.test(item) && !item.startsWith("+")) {
          return item;
        }
      }
    }
    return null;
  }

  function inferTypeFromArray(arr) {
    const str = JSON.stringify(arr).toLowerCase();
    if (str.includes("voicemail") || str.includes("vm")) return "voicemail";
    if (str.includes("sms") || str.includes("text") || str.includes("message")) return "text";
    return "call";
  }

  function inferDirectionFromArray(arr) {
    const str = JSON.stringify(arr).toLowerCase();
    if (str.includes("missed") || str.includes("miss")) return "missed";
    if (str.includes("outgoing") || str.includes("placed") || str.includes("outbound")) return "outbound";
    return "inbound";
  }

  // ─── MUTATION OBSERVER ─────────────────────────────────────────────

  function setupObserver() {
    if (observer) observer.disconnect();

    // Observe the entire body for changes, since Google Voice is a SPA
    observer = new MutationObserver((mutations) => {
      let hasNewItems = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this is a call/text entry or contains one
              const isEntry = SELECTORS.callEntry.some(
                (sel) => node.matches?.(sel) || node.querySelector?.(sel)
              );
              if (isEntry) {
                hasNewItems = true;
                break;
              }
            }
          }
        }
        if (hasNewItems) break;
      }

      if (hasNewItems) {
        // Debounce — wait 500ms after DOM settles before scanning
        clearTimeout(setupObserver._debounce);
        setupObserver._debounce = setTimeout(scanCallList, 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ─── BADGE / STATUS ────────────────────────────────────────────────

  function updateBadge(count) {
    chrome.runtime.sendMessage({
      type: "UPDATE_BADGE",
      count,
    });
  }

  // ─── FLOATING STATUS INDICATOR ─────────────────────────────────────

  function createStatusIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "fp-crm-indicator";
    indicator.innerHTML = `
      <div class="fp-crm-dot"></div>
      <span class="fp-crm-label">FP CRM</span>
      <span class="fp-crm-count">0</span>
    `;
    document.body.appendChild(indicator);

    indicator.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
    });

    return indicator;
  }

  // ─── INITIALIZATION ────────────────────────────────────────────────

  function init() {
    // Check if extension is enabled
    chrome.storage.local.get(["enabled", "crmUrl"], (result) => {
      isEnabled = result.enabled !== false; // Default to enabled
      if (!isEnabled) {
        return;
      }

      // Inject the network interceptor via a page script (runs in page context)
      injectPageScript();

      // Set up DOM observer
      setupObserver();

      // Start periodic scanning as backup
      pollInterval = setInterval(scanCallList, POLL_INTERVAL_MS);

      // Initial scan after page loads
      setTimeout(scanCallList, 2000);

      // Create status indicator
      createStatusIndicator();
    });

    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "TOGGLE_ENABLED") {
        isEnabled = message.enabled;
        if (!isEnabled) {
          clearInterval(pollInterval);
          observer?.disconnect();
          const indicator = document.getElementById("fp-crm-indicator");
          if (indicator) indicator.classList.add("fp-disabled");
        } else {
          setupObserver();
          pollInterval = setInterval(scanCallList, POLL_INTERVAL_MS);
          const indicator = document.getElementById("fp-crm-indicator");
          if (indicator) indicator.classList.remove("fp-disabled");
        }
      }
      if (message.type === "FORCE_SCAN") {
        scanCallList();
      }
    });
  }

  // Inject script into page context to intercept fetch/XHR
  function injectPageScript() {
    const script = document.createElement("script");
    script.textContent = `(${setupNetworkInterceptionPage.toString()})()`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  // This function runs in the PAGE context (not content script context)
  function setupNetworkInterceptionPage() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (url.includes("clients6.google.com") || url.includes("voice.google.com/u/")) {
          const cloned = response.clone();
          cloned.text().then((text) => {
            window.postMessage({ type: "FP_CRM_NETWORK", url, body: text.substring(0, 50000) }, "*");
          }).catch(() => {});
        }
      } catch {}
      return response;
    };

    const origXHROpen = XMLHttpRequest.prototype.open;
    const origXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._fpUrl = url;
      return origXHROpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      this.addEventListener("load", function () {
        try {
          const url = this._fpUrl || "";
          if (url.includes("clients6.google.com") || url.includes("voice.google.com/u/")) {
            window.postMessage({
              type: "FP_CRM_NETWORK",
              url,
              body: (this.responseText || "").substring(0, 50000),
            }, "*");
          }
        } catch {}
      });
      return origXHRSend.apply(this, arguments);
    };
  }

  // Listen for messages from the injected page script
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.type !== "FP_CRM_NETWORK") return;
    try {
      parseNetworkResponse(event.data.body, event.data.url);
    } catch (e) {
      console.debug("[FP-CRM] Page script message error:", e);
    }
  });

  // Wait for page to be ready, then initialize
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 1000);
  } else {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 1000));
  }
})();
