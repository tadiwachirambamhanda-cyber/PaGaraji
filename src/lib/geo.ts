/** Great-circle distance between two points, in kilometers. */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** "850 m" under a km, "1.2 km" above it, "42 km" once it's not worth a decimal. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/**
 * A rough, honestly-labeled drive-time estimate — city-driving speed, not routed
 * (no directions API), so it's a ballpark for "roughly how long a drive this is",
 * not a promise. Good enough to say "~8 min away" instead of just a distance.
 */
export function estimateDriveMinutes(km: number): number {
  const AVERAGE_CITY_KMH = 28;
  return Math.max(1, Math.round((km / AVERAGE_CITY_KMH) * 60));
}
