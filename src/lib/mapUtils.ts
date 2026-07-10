import { CITY_COORDS, HOT_SPOTS } from "./constants/cityCoords";

export function latLngToCanvasXY(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number
): { x: number; y: number } {
  return {
    x: Math.round(50 + (lng - centerLng) / 0.0018),
    y: Math.round(50 - (lat - centerLat) / 0.0015)
  };
}

export function canvasXYToLatLng(
  x: number,
  y: number,
  centerLat: number,
  centerLng: number
): { lat: number; lng: number } {
  return {
    lat: centerLat + (50 - y) * 0.0015,
    lng: centerLng + (x - 50) * 0.0018
  };
}

/**
 * Shared city coords lookup logic
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

  // 3. Partial key match or partial alias match
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
 * Specific hot locations matching using unified HOT_SPOTS
 */
export function lookupHotLocation(name: string): { lat: number; lng: number } | null {
  const n = (name || "").toLowerCase();

  for (const spot of HOT_SPOTS) {
    if (spot.keywords.some(kw => n.includes(kw))) {
      return { lat: spot.lat, lng: spot.lng };
    }
  }

  return null;
}

/**
 * Checks if two coordinates are close enough to be considered the same (e.g. for geo-matching/de-duplication)
 */
export function isSameCoordinate(
  c1?: { lat?: number; lng?: number } | null,
  c2?: { lat?: number; lng?: number } | null,
  tolerance: number = 0.0001
): boolean {
  if (!c1 || !c2) return false;
  if (c1.lat === undefined || c1.lng === undefined || c2.lat === undefined || c2.lng === undefined) return false;
  return Math.abs(c1.lat - c2.lat) < tolerance && Math.abs(c1.lng - c2.lng) < tolerance;
}

/**
 * Calculates distance (in kilometers) between two coordinates using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

