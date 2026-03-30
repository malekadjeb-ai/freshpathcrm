interface LatLng {
  lat: number;
  lng: number;
}

interface JobStop {
  id: string;
  customerName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  scheduledAt: string;
  services: string[];
  estimatedDuration: number;
  status: string;
}

interface OptimizedRoute {
  stops: (JobStop & { stopNumber: number; travelTimeMinutes: number; distanceMiles: number })[];
  totalDistanceMiles: number;
  totalTravelMinutes: number;
  totalDurationMinutes: number;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateTravelTime(distanceMiles: number): number {
  // Assume 30 mph average in suburban areas
  return Math.round((distanceMiles / 30) * 60);
}

export function optimizeRoute(
  stops: JobStop[],
  startLocation: LatLng
): OptimizedRoute {
  if (stops.length === 0) {
    return { stops: [], totalDistanceMiles: 0, totalTravelMinutes: 0, totalDurationMinutes: 0 };
  }

  // Nearest-neighbor algorithm
  const visited = new Set<string>();
  const ordered: JobStop[] = [];
  let currentLat = startLocation.lat;
  let currentLng = startLocation.lng;

  while (visited.size < stops.length) {
    let nearest: JobStop | null = null;
    let nearestDist = Infinity;

    for (const stop of stops) {
      if (visited.has(stop.id)) continue;
      const dist = haversineDistance(currentLat, currentLng, stop.lat, stop.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = stop;
      }
    }

    if (nearest) {
      visited.add(nearest.id);
      ordered.push(nearest);
      currentLat = nearest.lat;
      currentLng = nearest.lng;
    }
  }

  // Calculate travel times between stops
  let totalDistance = 0;
  let totalTravel = 0;
  let totalDuration = 0;
  let prevLat = startLocation.lat;
  let prevLng = startLocation.lng;

  const optimizedStops = ordered.map((stop, i) => {
    const dist = haversineDistance(prevLat, prevLng, stop.lat, stop.lng);
    const travel = estimateTravelTime(dist);

    totalDistance += dist;
    totalTravel += travel;
    totalDuration += travel + stop.estimatedDuration;

    prevLat = stop.lat;
    prevLng = stop.lng;

    return {
      ...stop,
      stopNumber: i + 1,
      travelTimeMinutes: travel,
      distanceMiles: Math.round(dist * 10) / 10,
    };
  });

  return {
    stops: optimizedStops,
    totalDistanceMiles: Math.round(totalDistance * 10) / 10,
    totalTravelMinutes: totalTravel,
    totalDurationMinutes: totalDuration,
  };
}
