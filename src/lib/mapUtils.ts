import { CITY_COORDS } from "./constants/cityCoords.js";

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
 * Specific hot locations matching
 */
export function lookupHotLocation(name: string): { lat: number; lng: number } | null {
  const n = (name || "").toLowerCase();

  // Tokyo
  if (n.includes("gyoen") || n.includes("御苑")) return { lat: 35.6852, lng: 139.7101 };
  if (n.includes("crossing") || n.includes("澀谷") || n.includes("shibuya")) return { lat: 35.6580, lng: 139.7016 };
  if (n.includes("tsukiji") || n.includes("築地")) return { lat: 35.6658, lng: 139.7701 };
  if (n.includes("sensoji") || n.includes("淺草") || n.includes("asakusa")) return { lat: 35.7148, lng: 139.7967 };
  if (n.includes("akihabara") || n.includes("秋葉")) return { lat: 35.6997, lng: 139.7715 };
  if (n.includes("tower") || n.includes("東京鐵塔")) return { lat: 35.6586, lng: 139.7454 };
  if (n.includes("disney") || n.includes("迪士尼")) return { lat: 35.6329, lng: 139.8804 };
  if (n.includes("shinjuku") || n.includes("新宿")) return { lat: 35.6909, lng: 139.7003 };

  // Hong Kong
  if (n.includes("victoria") || n.includes("peak") || n.includes("太平山")) return { lat: 22.2759, lng: 114.1455 };
  if (n.includes("tsim sha tsui") || n.includes("tst") || n.includes("尖沙咀")) return { lat: 22.2988, lng: 114.1722 };
  if (n.includes("ocean park") || n.includes("海洋公園")) return { lat: 22.2475, lng: 114.1744 };
  if (n.includes("disneyland") || n.includes("迪士尼")) return { lat: 22.3130, lng: 114.0413 };
  if (n.includes("lan kwai fong") || n.includes("蘭桂坊")) return { lat: 22.2808, lng: 114.1557 };

  // Paris
  if (n.includes("eiffel") || n.includes("鐵塔")) return { lat: 48.8584, lng: 2.2945 };
  if (n.includes("louvre") || n.includes("羅浮宮")) return { lat: 48.8606, lng: 2.3376 };
  if (n.includes("arc") || n.includes("凱旋門")) return { lat: 48.8738, lng: 2.2950 };

  // London
  if (n.includes("ben") || n.includes("笨鐘")) return { lat: 51.5007, lng: -0.1246 };
  if (n.includes("eye") || n.includes("眼")) return { lat: 51.5033, lng: -0.1195 };

  return null;
}
