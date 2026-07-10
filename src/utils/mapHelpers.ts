import { CITY_COORDS } from "../lib/constants";
import { lookupCityCoords, lookupHotLocation, canvasXYToLatLng } from "../lib/mapUtils";

export function resolveLatLngLocal(
  name: string,
  dest: string,
  x: number = 50,
  y: number = 50,
  lat?: number,
  lng?: number
): { lat: number; lng: number } {
  // If lat/lng are provided as valid numbers, use them
  if (lat !== undefined && lng !== undefined && lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng)) && Number(lat) !== 0 && Number(lng) !== 0) {
    return { lat: Number(lat), lng: Number(lng) };
  }

  // 1. Specific matching of hot locations
  const hot = lookupHotLocation(name);
  if (hot) return hot;

  // 2. Establish center coordinates based on destination
  const center = lookupCityCoords(dest) || CITY_COORDS.tokyo;

  // 3. Fallback: map the custom coordinate space [x, y] onto offset relative to center
  return canvasXYToLatLng(x, y, center.lat, center.lng);
}

// Helper to assign a unique, high-contrast color for each itinerary day
export const getDayColor = (dayIndex: number): string => {
  const colors = [
    "#6366f1", // Day 1: Indigo
    "#f59e0b", // Day 2: Amber
    "#ec4899", // Day 3: Pink
    "#10b981", // Day 4: Emerald
    "#a855f7", // Day 5: Purple
    "#06b6d4", // Day 6: Cyan
    "#f97316", // Day 7: Orange
    "#14b8a6", // Day 8: Teal
  ];
  return colors[dayIndex % colors.length];
};
