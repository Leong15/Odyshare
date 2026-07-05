/**
 * Shared geocoding utility
 * Single source of truth for city coordinates — replaces duplicated
 * fallback tables in db.ts, routes/trip.ts, and OfflineMapSimulator.tsx
 */

import { lookupCityCoords } from "../../src/lib/mapUtils.js";
import { createLogger } from "./logger.js";

const logger = createLogger("Geocoding");

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

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

/**
 * Main entry point used by both db.ts and routes/trip.ts.
 * 1. Try static table (instant, no network)
 * 2. Try Nominatim with a 6-second timeout
 */
export async function resolveCoordinates(
  destination: string
): Promise<{ lat: number; lng: number } | null> {
  if (!destination || destination === "Unknown Destination") return null;

  const cacheKey = destination.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    logger.debug(`Geocoding cache hit for: ${destination}`);
    return geocodeCache.get(cacheKey)!;
  }

  const staticCoords = lookupCityCoords(destination);
  if (staticCoords) {
    logger.debug(`Geocoding static lookup hit for: ${destination}`);
    geocodeCache.set(cacheKey, staticCoords);
    return staticCoords;
  }

  logger.info(`Fetching coordinates from external geocoder for: ${destination}`);
  const result = await Promise.race([
    fetchFromNominatim(destination),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
  ]);

  geocodeCache.set(cacheKey, result);
  return result;
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
