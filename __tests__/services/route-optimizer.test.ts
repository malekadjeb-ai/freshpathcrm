/**
 * Route optimizer unit tests
 * haversineDistance, estimateTravelTime, and optimizeRoute are all pure functions.
 */
import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  estimateTravelTime,
  optimizeRoute,
} from "@/lib/services/route-optimizer";

// ---------------------------------------------------------------------------
// Test data: real Houston-area coordinates
// ---------------------------------------------------------------------------

const RICHMOND: { lat: number; lng: number } = { lat: 29.5819, lng: -95.7594 };
const KATY: { lat: number; lng: number } = { lat: 29.7858, lng: -95.8244 };
const SUGAR_LAND: { lat: number; lng: number } = { lat: 29.6196, lng: -95.6349 };
const FULSHEAR: { lat: number; lng: number } = { lat: 29.6938, lng: -95.8896 };
const HOUSTON: { lat: number; lng: number } = { lat: 29.7604, lng: -95.3698 };

function makeStop(id: string, loc: { lat: number; lng: number }, durationMin = 90) {
  return {
    id,
    customerName: `Customer ${id}`,
    address: `${id} Main St`,
    city: "TX",
    lat: loc.lat,
    lng: loc.lng,
    scheduledAt: "2026-04-01T09:00:00Z",
    services: ["Full Detail"],
    estimatedDuration: durationMin,
    status: "Scheduled",
  };
}

// ---------------------------------------------------------------------------
// haversineDistance
// ---------------------------------------------------------------------------

describe("haversineDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(29.58, -95.76, 29.58, -95.76)).toBe(0);
  });

  it("Richmond to Katy is roughly 14-18 miles", () => {
    const dist = haversineDistance(RICHMOND.lat, RICHMOND.lng, KATY.lat, KATY.lng);
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(25);
  });

  it("Richmond to Houston is further than Richmond to Katy", () => {
    const toKaty = haversineDistance(RICHMOND.lat, RICHMOND.lng, KATY.lat, KATY.lng);
    const toHouston = haversineDistance(RICHMOND.lat, RICHMOND.lng, HOUSTON.lat, HOUSTON.lng);
    expect(toHouston).toBeGreaterThan(toKaty);
  });

  it("distance is symmetric (A→B equals B→A)", () => {
    const ab = haversineDistance(RICHMOND.lat, RICHMOND.lng, SUGAR_LAND.lat, SUGAR_LAND.lng);
    const ba = haversineDistance(SUGAR_LAND.lat, SUGAR_LAND.lng, RICHMOND.lat, RICHMOND.lng);
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });

  it("returns a positive number for different locations", () => {
    const dist = haversineDistance(KATY.lat, KATY.lng, SUGAR_LAND.lat, SUGAR_LAND.lng);
    expect(dist).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// estimateTravelTime
// ---------------------------------------------------------------------------

describe("estimateTravelTime", () => {
  it("0 miles = 0 minutes", () => {
    expect(estimateTravelTime(0)).toBe(0);
  });

  it("30 miles at 30 mph = 60 minutes", () => {
    expect(estimateTravelTime(30)).toBe(60);
  });

  it("15 miles at 30 mph = 30 minutes", () => {
    expect(estimateTravelTime(15)).toBe(30);
  });

  it("1 mile = 2 minutes (rounded)", () => {
    expect(estimateTravelTime(1)).toBe(2);
  });

  it("returns an integer (rounded)", () => {
    const result = estimateTravelTime(7.5);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("longer distance = more time", () => {
    expect(estimateTravelTime(20)).toBeGreaterThan(estimateTravelTime(10));
  });
});

// ---------------------------------------------------------------------------
// optimizeRoute: edge cases
// ---------------------------------------------------------------------------

describe("optimizeRoute: empty stops", () => {
  it("returns empty result for empty stops array", () => {
    const result = optimizeRoute([], RICHMOND);
    expect(result.stops).toHaveLength(0);
    expect(result.totalDistanceMiles).toBe(0);
    expect(result.totalTravelMinutes).toBe(0);
    expect(result.totalDurationMinutes).toBe(0);
  });
});

describe("optimizeRoute: single stop", () => {
  it("returns that stop with stopNumber 1", () => {
    const stop = makeStop("s1", KATY);
    const result = optimizeRoute([stop], RICHMOND);
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0].stopNumber).toBe(1);
  });

  it("calculates distance from start to the single stop", () => {
    const stop = makeStop("s1", KATY);
    const result = optimizeRoute([stop], RICHMOND);
    const expectedDist = haversineDistance(RICHMOND.lat, RICHMOND.lng, KATY.lat, KATY.lng);
    expect(result.totalDistanceMiles).toBeCloseTo(Math.round(expectedDist * 10) / 10, 0);
  });

  it("total duration includes travel + service time", () => {
    const stop = makeStop("s1", KATY, 90);
    const result = optimizeRoute([stop], RICHMOND);
    const expectedTravel = estimateTravelTime(result.totalDistanceMiles);
    expect(result.totalDurationMinutes).toBeGreaterThanOrEqual(90);
    expect(result.totalDurationMinutes).toBe(expectedTravel + 90);
  });
});

describe("optimizeRoute: two stops", () => {
  it("returns both stops", () => {
    const stops = [makeStop("A", KATY), makeStop("B", SUGAR_LAND)];
    const result = optimizeRoute(stops, RICHMOND);
    expect(result.stops).toHaveLength(2);
  });

  it("stop numbers are sequential 1..2", () => {
    const stops = [makeStop("A", KATY), makeStop("B", SUGAR_LAND)];
    const result = optimizeRoute(stops, RICHMOND);
    expect(result.stops[0].stopNumber).toBe(1);
    expect(result.stops[1].stopNumber).toBe(2);
  });

  it("nearest stop from start is visited first", () => {
    // SUGAR_LAND is closer to RICHMOND than KATY
    const sugarStop = makeStop("sugar", SUGAR_LAND);
    const katyStop = makeStop("katy", KATY);
    const result = optimizeRoute([katyStop, sugarStop], RICHMOND);
    expect(result.stops[0].id).toBe("sugar");
    expect(result.stops[1].id).toBe("katy");
  });

  it("total distance is positive and non-zero", () => {
    const stops = [makeStop("A", KATY), makeStop("B", SUGAR_LAND)];
    const result = optimizeRoute(stops, RICHMOND);
    expect(result.totalDistanceMiles).toBeGreaterThan(0);
  });
});

describe("optimizeRoute: five or more stops", () => {
  const stops = [
    makeStop("houston", HOUSTON, 60),
    makeStop("katy", KATY, 90),
    makeStop("sugar", SUGAR_LAND, 75),
    makeStop("fulshear", FULSHEAR, 90),
    makeStop("richmond2", { lat: 29.57, lng: -95.77 }, 60),
  ];

  it("returns all five stops", () => {
    const result = optimizeRoute(stops, RICHMOND);
    expect(result.stops).toHaveLength(5);
  });

  it("stop numbers run 1–5 in order", () => {
    const result = optimizeRoute(stops, RICHMOND);
    result.stops.forEach((s, i) => expect(s.stopNumber).toBe(i + 1));
  });

  it("each stop has a non-negative travelTimeMinutes", () => {
    const result = optimizeRoute(stops, RICHMOND);
    result.stops.forEach((s) => expect(s.travelTimeMinutes).toBeGreaterThanOrEqual(0));
  });

  it("total travel is sum of per-stop travel times", () => {
    const result = optimizeRoute(stops, RICHMOND);
    const sumTravel = result.stops.reduce((acc, s) => acc + s.travelTimeMinutes, 0);
    expect(result.totalTravelMinutes).toBe(sumTravel);
  });

  it("total duration includes all service times", () => {
    const result = optimizeRoute(stops, RICHMOND);
    const totalService = stops.reduce((acc, s) => acc + s.estimatedDuration, 0);
    expect(result.totalDurationMinutes).toBeGreaterThanOrEqual(totalService);
  });

  it("all original stop IDs are present in the result", () => {
    const result = optimizeRoute(stops, RICHMOND);
    const ids = new Set(result.stops.map((s) => s.id));
    stops.forEach((s) => expect(ids.has(s.id)).toBe(true));
  });
});

describe("optimizeRoute: same location twice", () => {
  it("handles two stops at identical coordinates", () => {
    const s1 = makeStop("dup1", KATY);
    const s2 = makeStop("dup2", KATY); // same coords, different id
    const result = optimizeRoute([s1, s2], RICHMOND);
    expect(result.stops).toHaveLength(2);
    const ids = result.stops.map((s) => s.id);
    expect(ids).toContain("dup1");
    expect(ids).toContain("dup2");
  });
});
