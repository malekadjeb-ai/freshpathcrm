import { NextResponse } from "next/server";

type CachePreset = "static" | "dashboard" | "list" | "realtime" | "none";

const CACHE_PRESETS: Record<CachePreset, string> = {
  static: "public, max-age=3600",
  dashboard: "private, max-age=60, stale-while-revalidate=300",
  list: "private, max-age=30, stale-while-revalidate=120",
  realtime: "private, no-cache",
  none: "no-store",
};

export function withCacheHeaders<T>(data: T, preset: CachePreset, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": CACHE_PRESETS[preset] },
  });
}

export function setCacheHeaders(response: NextResponse, preset: CachePreset): NextResponse {
  response.headers.set("Cache-Control", CACHE_PRESETS[preset]);
  return response;
}

export function setCacheDashboard(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", CACHE_PRESETS.dashboard);
  return res;
}

export function setCacheList(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", CACHE_PRESETS.list);
  return res;
}

export function setCacheStatic(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", CACHE_PRESETS.static);
  return res;
}

export function setCacheNone(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", CACHE_PRESETS.none);
  return res;
}
