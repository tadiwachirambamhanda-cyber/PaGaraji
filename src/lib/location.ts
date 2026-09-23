import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type Coordinate = { latitude: number; longitude: number };

// Harare — a sane center if location is denied, unavailable, or on web (no GPS).
const FALLBACK: Coordinate = { latitude: -17.8292, longitude: 31.0522 };

/**
 * The device's current position, asked for once on mount. Never blocks or nags:
 * denied, errored, or on web (no browser geolocation prompt shown), this just
 * quietly falls back to Harare's coordinates so the map always has something
 * sane to center on.
 */
export function useDeviceLocation(): { coordinate: Coordinate; granted: boolean; loading: boolean } {
  const [coordinate, setCoordinate] = useState<Coordinate>(FALLBACK);
  const [granted, setGranted] = useState(false);
  const [loading, setLoading] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setCoordinate({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setGranted(true);
      } catch {
        // Denied, timed out, or location services off — the Harare fallback stands.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { coordinate, granted, loading };
}
