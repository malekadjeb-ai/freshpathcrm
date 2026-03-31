import { describe, it, expect } from "vitest";
import { withCacheHeaders } from "@/lib/cache-headers";

describe("withCacheHeaders", () => {
  it("sets dashboard cache headers", () => {
    const response = withCacheHeaders({ data: "test" }, "dashboard");
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60, stale-while-revalidate=300");
  });

  it("sets static cache headers", () => {
    const response = withCacheHeaders({ data: "test" }, "static");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("sets list cache headers", () => {
    const response = withCacheHeaders({ data: "test" }, "list");
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=30, stale-while-revalidate=120");
  });

  it("sets realtime cache headers", () => {
    const response = withCacheHeaders({ data: "test" }, "realtime");
    expect(response.headers.get("Cache-Control")).toBe("private, no-cache");
  });

  it("returns correct JSON body", async () => {
    const response = withCacheHeaders({ hello: "world" }, "list");
    const body = await response.json();
    expect(body).toEqual({ hello: "world" });
  });

  it("allows custom status code", () => {
    const response = withCacheHeaders({ created: true }, "list", 201);
    expect(response.status).toBe(201);
  });
});
