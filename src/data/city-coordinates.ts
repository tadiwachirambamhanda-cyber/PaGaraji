/**
 * Approximate coordinates for the cities in `components/location-sheet.tsx`'s
 * ZIMBABWE_CITIES list. Listings and requests only ever store a city name, not
 * precise coordinates, so the map places a pin at its city's point — jittered a
 * little (`jitteredCityCoordinate`) so several listings in the same city don't
 * stack into one dot. City-level accuracy, not street-level.
 */
export const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  Harare: { latitude: -17.8292, longitude: 31.0522 },
  Bulawayo: { latitude: -20.15, longitude: 28.5833 },
  Mutare: { latitude: -18.9707, longitude: 32.6709 },
  Gweru: { latitude: -19.45, longitude: 29.8167 },
  Kwekwe: { latitude: -18.9281, longitude: 29.8149 },
  Masvingo: { latitude: -20.0637, longitude: 30.8277 },
};

const DEFAULT_CITY = 'Harare';

/** The best-guess city name out of a free-text location string like "Avondale, Harare". */
function matchCity(location: string): string {
  const lower = location.toLowerCase();
  const found = Object.keys(CITY_COORDINATES).find((city) => lower.includes(city.toLowerCase()));
  return found ?? DEFAULT_CITY;
}

/**
 * A stable, deterministic offset from a city's center so the same listing always
 * lands in the same spot (no jitter-on-every-render), but different listings in
 * the same city don't overlap. `seed` is usually the listing/request id.
 */
export function jitteredCityCoordinate(location: string, seed: string): { latitude: number; longitude: number } {
  const city = matchCity(location);
  const base = CITY_COORDINATES[city];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  // Roughly a 0-1.2km spread, plenty to separate pins without leaving the city.
  const angle = (hash % 360) * (Math.PI / 180);
  const radius = ((hash >> 8) % 100) / 100000; // ~0-0.011 degrees
  return {
    latitude: base.latitude + Math.cos(angle) * radius,
    longitude: base.longitude + Math.sin(angle) * radius,
  };
}

/**
 * The best coordinate to plot a pin at: a real one if the item has it (a listing's
 * city, or a request's dropped pin), otherwise the city-jitter fallback. `null`
 * when there's genuinely nothing to plot — a request with neither a pin nor a
 * city (requests don't collect one unless a pin's dropped) — so callers can
 * leave it off the map instead of guessing a location nobody gave.
 */
export function coordinateFor(item: {
  id: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}): { latitude: number; longitude: number } | null {
  if (item.latitude !== undefined && item.longitude !== undefined) {
    return { latitude: item.latitude, longitude: item.longitude };
  }
  return item.location ? jitteredCityCoordinate(item.location, item.id) : null;
}
