import { CITY_COORDS } from "../lib/constants";

export function resolveLatLng(
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

  const d = (dest || "Tokyo").toLowerCase();
  const n = (name || "").toLowerCase();

  // 1. Establish center coordinates based on destination
  let center = CITY_COORDS.tokyo; // Tokyo default
  const searchKey = d.trim();
  let found = false;

  // First exact key check
  if (CITY_COORDS[searchKey]) {
    center = CITY_COORDS[searchKey];
    found = true;
  } else {
    // Check aliases
    for (const key of Object.keys(CITY_COORDS)) {
      const city = CITY_COORDS[key];
      if (
        key === searchKey ||
        (city.aliases && city.aliases.some(alias => alias.toLowerCase() === searchKey))
      ) {
        center = city;
        found = true;
        break;
      }
    }
  }

  // If still not found, do a fuzzy partial match
  if (!found) {
    for (const key of Object.keys(CITY_COORDS)) {
      const city = CITY_COORDS[key];
      if (
        searchKey.includes(key) ||
        key.includes(searchKey) ||
        (city.aliases && city.aliases.some(alias => {
          const lowerAlias = alias.toLowerCase();
          return searchKey.includes(lowerAlias) || lowerAlias.includes(searchKey);
        }))
      ) {
        center = city;
        break;
      }
    }
  }

  // 2. Specific matching of hot locations
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

  // 3. Fallback: map the custom coordinate space [x, y] onto offset relative to center
  const latOffset = (50 - y) * 0.0015;
  const lngOffset = (x - 50) * 0.0018;
  return {
    lat: center.lat + latOffset,
    lng: center.lng + lngOffset
  };
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
