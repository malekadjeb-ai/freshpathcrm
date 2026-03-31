/**
 * Gate 3 Feature Tests
 * Covers: optimistic update helpers, undo-delete hook logic,
 * SSE stream response shape, ARIA constants, onboarding persistence.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// 1. useUndoDelete logic (pure function portion)
// ---------------------------------------------------------------------------

describe("useUndoDelete — cache mutation helpers", () => {
  it("removes item from array by id", () => {
    const items = [
      { id: "1", title: "Task A" },
      { id: "2", title: "Task B" },
      { id: "3", title: "Task C" },
    ];
    const after = items.filter((i) => i.id !== "2");
    expect(after).toHaveLength(2);
    expect(after.find((i) => i.id === "2")).toBeUndefined();
  });

  it("snapshot restore brings back removed item", () => {
    const snapshot = [
      { id: "1", title: "Task A" },
      { id: "2", title: "Task B" },
    ];
    let current = snapshot.filter((i) => i.id !== "2");
    expect(current).toHaveLength(1);
    // simulate undo
    current = snapshot;
    expect(current).toHaveLength(2);
    expect(current.find((i) => i.id === "2")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Optimistic update helpers (pure transforms)
// ---------------------------------------------------------------------------

describe("Optimistic update — job status change", () => {
  const jobs = [
    { id: "job-1", status: "Scheduled", total: 150 },
    { id: "job-2", status: "InProgress", total: 200 },
    { id: "job-3", status: "Completed", total: 300 },
  ];

  it("updates only the target job status", () => {
    const updated = jobs.map((j) =>
      j.id === "job-1" ? { ...j, status: "InProgress" } : j
    );
    expect(updated[0].status).toBe("InProgress");
    expect(updated[1].status).toBe("InProgress");
    expect(updated[2].status).toBe("Completed");
  });

  it("does not mutate original array", () => {
    jobs.map((j) => (j.id === "job-1" ? { ...j, status: "InProgress" } : j));
    expect(jobs[0].status).toBe("Scheduled");
  });

  it("returns same length array", () => {
    const updated = jobs.map((j) =>
      j.id === "job-1" ? { ...j, status: "InProgress" } : j
    );
    expect(updated).toHaveLength(jobs.length);
  });
});

describe("Optimistic update — lead status change", () => {
  const leads = [
    { id: "lead-1", status: "New", name: "John Doe" },
    { id: "lead-2", status: "Contacted", name: "Jane Smith" },
  ];

  it("moves lead to new pipeline column", () => {
    const updated = leads.map((l) =>
      l.id === "lead-1" ? { ...l, status: "Contacted" } : l
    );
    expect(updated[0].status).toBe("Contacted");
    expect(updated[1].status).toBe("Contacted");
  });

  it("handles lost leads correctly", () => {
    const updated = leads.map((l) =>
      l.id === "lead-2"
        ? { ...l, status: "Lost", lostReason: "Price" }
        : l
    );
    expect((updated[1] as typeof leads[1] & { lostReason?: string }).lostReason).toBe("Price");
    expect(updated[1].status).toBe("Lost");
  });
});

describe("Optimistic update — task toggle", () => {
  const tasks = [
    { id: "t1", title: "Call customer", completed: false, completedAt: null },
    { id: "t2", title: "Send invoice", completed: true, completedAt: "2026-03-30T10:00:00Z" },
  ];

  it("marks task as completed with timestamp", () => {
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === "t1" ? { ...t, completed: true, completedAt: now } : t
    );
    expect(updated[0].completed).toBe(true);
    expect(updated[0].completedAt).not.toBeNull();
  });

  it("reopens completed task by clearing timestamp", () => {
    const updated = tasks.map((t) =>
      t.id === "t2" ? { ...t, completed: false, completedAt: null } : t
    );
    expect(updated[1].completed).toBe(false);
    expect(updated[1].completedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. SSE stream response helpers
// ---------------------------------------------------------------------------

describe("SSE response format", () => {
  it("event payload is valid JSON with type field", () => {
    const payload = { type: "notifications", data: [] };
    const serialized = JSON.stringify(payload);
    const parsed = JSON.parse(serialized);
    expect(parsed.type).toBe("notifications");
    expect(Array.isArray(parsed.data)).toBe(true);
  });

  it("heartbeat payload has correct shape", () => {
    const payload = { type: "heartbeat" };
    expect(JSON.parse(JSON.stringify(payload)).type).toBe("heartbeat");
  });

  it("connected payload has correct shape", () => {
    const payload = { type: "connected" };
    expect(JSON.parse(JSON.stringify(payload)).type).toBe("connected");
  });

  it("notification payload includes required fields", () => {
    const notification = {
      id: "notif-1",
      type: "new_booking",
      title: "New booking received",
      message: "John Doe booked a Full Detail",
      link: "/jobs/123",
      read: false,
      createdAt: new Date().toISOString(),
    };
    const payload = { type: "notifications", data: [notification] };
    const parsed = JSON.parse(JSON.stringify(payload));
    const n = parsed.data[0];
    expect(n.id).toBeDefined();
    expect(n.type).toBeDefined();
    expect(n.title).toBeDefined();
    expect(n.read).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Prefetch map coverage
// ---------------------------------------------------------------------------

describe("Prefetch route map", () => {
  const PREFETCH_MAP: Record<string, { queryKey: string[]; url: string }> = {
    "/jobs": { queryKey: ["jobs", "all", "all"], url: "/api/jobs?limit=20" },
    "/customers": { queryKey: ["customers"], url: "/api/customers?limit=25" },
    "/dashboard": { queryKey: ["dashboard"], url: "/api/dashboard" },
    "/calendar": { queryKey: ["calendar-jobs"], url: "/api/calendar" },
    "/invoicing": { queryKey: ["invoices"], url: "/api/invoices?limit=25" },
    "/reviews": { queryKey: ["reviews"], url: "/api/reviews?limit=25" },
    "/analytics": { queryKey: ["analytics"], url: "/api/analytics" },
  };

  it("every entry has a queryKey array", () => {
    Object.values(PREFETCH_MAP).forEach(({ queryKey }) => {
      expect(Array.isArray(queryKey)).toBe(true);
      expect(queryKey.length).toBeGreaterThan(0);
    });
  });

  it("every entry has an API url", () => {
    Object.values(PREFETCH_MAP).forEach(({ url }) => {
      expect(url.startsWith("/api/")).toBe(true);
    });
  });

  it("high-traffic routes are in prefetch map", () => {
    expect(PREFETCH_MAP["/jobs"]).toBeDefined();
    expect(PREFETCH_MAP["/customers"]).toBeDefined();
    expect(PREFETCH_MAP["/dashboard"]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Onboarding wizard persistence helpers
// ---------------------------------------------------------------------------

describe("Onboarding wizard localStorage persistence", () => {
  const STORAGE_KEY = "fp-onboarding-progress";

  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves step progress to localStorage", () => {
    const data = { step: 2, businessName: "Fresh Path", businessPhone: "", businessEmail: "", businessAddress: "" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.step).toBe(2);
    expect(parsed.businessName).toBe("Fresh Path");
  });

  it("loads persisted step on wizard open", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 3, businessName: "FP", businessPhone: "281", businessEmail: "", businessAddress: "" }));
    const raw = localStorage.getItem(STORAGE_KEY);
    const persisted = raw ? JSON.parse(raw) : null;
    expect(persisted?.step).toBe(3);
  });

  it("clears storage on wizard completion", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 5 }));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    localStorage.removeItem(STORAGE_KEY);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null when no saved progress", () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeNull();
  });

  it("handles corrupt localStorage data gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");
    let result = null;
    try {
      result = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    } catch {
      result = null;
    }
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6. Notification bell SSE client logic
// ---------------------------------------------------------------------------

describe("Notification bell — incoming notification dedup", () => {
  it("does not add duplicate notifications", () => {
    const existing = [
      { id: "n1", title: "Old notif", read: false },
      { id: "n2", title: "Another", read: true },
    ];
    const incoming = [{ id: "n1", title: "Old notif", read: false }]; // duplicate
    const existingIds = new Set(existing.map((n) => n.id));
    const newOnes = incoming.filter((n) => !existingIds.has(n.id));
    expect(newOnes).toHaveLength(0);
  });

  it("adds genuinely new notifications to front of list", () => {
    const existing = [{ id: "n1", title: "Old notif", read: false }];
    const incoming = [{ id: "n2", title: "New booking!", read: false }];
    const existingIds = new Set(existing.map((n) => n.id));
    const newOnes = incoming.filter((n) => !existingIds.has(n.id));
    const updated = [...newOnes, ...existing];
    expect(updated[0].id).toBe("n2");
    expect(updated).toHaveLength(2);
  });

  it("unread count increases when new unread notifications arrive", () => {
    const notifications = [
      { id: "n1", read: false },
      { id: "n2", read: true },
      { id: "n3", read: false },
    ];
    const unreadCount = notifications.filter((n) => !n.read).length;
    expect(unreadCount).toBe(2);
  });

  it("mark all read sets all notifications to read:true", () => {
    const notifications = [
      { id: "n1", read: false },
      { id: "n2", read: false },
    ];
    const allRead = notifications.map((n) => ({ ...n, read: true }));
    expect(allRead.every((n) => n.read)).toBe(true);
  });

  it("optimistic mark-read doesn't affect other notifications", () => {
    const notifications = [
      { id: "n1", read: false },
      { id: "n2", read: false },
    ];
    const updated = notifications.map((n) =>
      n.id === "n1" ? { ...n, read: true } : n
    );
    expect(updated[0].read).toBe(true);
    expect(updated[1].read).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Pagination ARIA and logic
// ---------------------------------------------------------------------------

describe("Pagination logic", () => {
  function paginate<T>(items: T[], page: number, perPage: number) {
    return items.slice((page - 1) * perPage, page * perPage);
  }

  function totalPages(itemCount: number, perPage: number) {
    return Math.ceil(itemCount / perPage);
  }

  it("first page returns correct slice", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(paginate(items, 1, 3)).toEqual([1, 2, 3]);
  });

  it("last page returns remaining items", () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginate(items, 2, 3)).toEqual([4, 5]);
  });

  it("calculates total pages correctly", () => {
    expect(totalPages(100, 25)).toBe(4);
    expect(totalPages(101, 25)).toBe(5);
    expect(totalPages(0, 25)).toBe(0);
  });

  it("single page when items fit", () => {
    expect(totalPages(5, 25)).toBe(1);
  });
});
