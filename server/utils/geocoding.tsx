/**
 * Shared geocoding utility
 * Single source of truth for city coordinates — replaces duplicated
 * fallback tables in db.ts, routes/trip.ts, and OfflineMapSimulator.tsx
 */

import { CITY_COORDS } from "../../src/lib/constants/cityCoords.js";

/**
 * Look up coordinates from the static table using fuzzy matching.
 * Returns null if no match found.
 */
export function lookupCityCoords(destination: string): { lat: number; lng: number } | null {
  if (!destination) return null;
  const searchKey = destination.toLowerCase().trim();

  // 1. Exact key match first
  if (CITY_COORDS[searchKey]) {
    return { lat: CITY_COORDS[searchKey].lat, lng: CITY_COORDS[searchKey].lng };
  }

  // 2. Exact alias match
  for (const [key, city] of Object.entries(CITY_COORDS)) {
    if (city.aliases && city.aliases.some(alias => alias.toLowerCase() === searchKey)) {
      return { lat: city.lat, lng: city.lng };
    }
  }

  // 3. Partial key match or partial alias match (destination contains key/alias, or key/alias contains destination)
  for (const [key, city] of Object.entries(CITY_COORDS)) {
    if (searchKey.includes(key) || key.includes(searchKey)) {
      return { lat: city.lat, lng: city.lng };
    }
    if (city.aliases) {
      for (const alias of city.aliases) {
        const lowerAlias = alias.toLowerCase();
        if (searchKey.includes(lowerAlias) || lowerAlias.includes(searchKey)) {
          return { lat: city.lat, lng: city.lng };
        }
      }
    }
  }

  return null;
}

/**
 * Fetch coordinates from OpenStreetMap Nominatim (free, no API key needed).
 */
async function fetchFromNominatim(destination: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "OdyShare/1.0 (contact@odysync.app)" },
    });
    if (!res.ok) return null;
    const list: any[] = await res.json();
    if (list.length > 0) {
      return { lat: Number(list[0].lat), lng: Number(list[0].lon) };
    }
  } catch {
    // Network or parse error — fall through to null
  }
  return null;
}

/**
 * Main entry point used by both db.ts and routes/trip.ts.
 * 1. Try static table (instant, no network)
 * 2. Try Nominatim with a 6-second timeout
 */
export async function resolveCoordinates(
  destination: string
): Promise<{ lat: number; lng: number } | null> {
  if (!destination || destination === "Unknown Destination") return null;

  const cached = lookupCityCoords(destination);
  if (cached) return cached;

  return Promise.race([
    fetchFromNominatim(destination),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
  ]);
}

/**
 * Derive the "center" coords for a destination string — used by the map
 * components to set the default viewport.
 * Falls back to Tokyo if nothing is recognised.
 */
export function getDestinationCenter(destination: string): { lat: number; lng: number } {
  const found = lookupCityCoords(destination);
  return found ?? { lat: 35.6762, lng: 139.6503 }; // Tokyo default
}
