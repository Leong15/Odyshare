/**
 * Shared geocoding utility
 * Single source of truth for city coordinates — replaces duplicated
 * fallback tables in db.ts, routes/trip.ts, and OfflineMapSimulator.tsx
 */

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  // Japan
  tokyo: { lat: 35.6762, lng: 139.6503 },
  東京: { lat: 35.6762, lng: 139.6503 },
  okinawa: { lat: 26.2124, lng: 127.6809 },
  沖繩: { lat: 26.2124, lng: 127.6809 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  京都: { lat: 35.0116, lng: 135.7681 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  大阪: { lat: 34.6937, lng: 135.5023 },
  hokkaido: { lat: 43.0621, lng: 141.3544 },
  北海道: { lat: 43.0621, lng: 141.3544 },
  sapporo: { lat: 43.0618, lng: 141.3545 },
  札幌: { lat: 43.0618, lng: 141.3545 },
  fukuoka: { lat: 33.5904, lng: 130.4017 },
  福岡: { lat: 33.5904, lng: 130.4017 },
  hiroshima: { lat: 34.3853, lng: 132.4553 },
  廣島: { lat: 34.3853, lng: 132.4553 },
  nara: { lat: 34.6851, lng: 135.8050 },
  奈良: { lat: 34.6851, lng: 135.8050 },
  hakone: { lat: 35.2322, lng: 139.1069 },
  箱根: { lat: 35.2322, lng: 139.1069 },
  yokohama: { lat: 35.4437, lng: 139.6380 },
  橫濱: { lat: 35.4437, lng: 139.6380 },
  kobe: { lat: 34.6901, lng: 135.1956 },
  神戶: { lat: 34.6901, lng: 135.1956 },

  // Taiwan
  taipei: { lat: 25.0330, lng: 121.5654 },
  台北: { lat: 25.0330, lng: 121.5654 },
  yilan: { lat: 24.7570, lng: 121.7530 },
  宜蘭: { lat: 24.7570, lng: 121.7530 },
  kaohsiung: { lat: 22.6273, lng: 120.3014 },
  高雄: { lat: 22.6273, lng: 120.3014 },
  taichung: { lat: 24.1477, lng: 120.6736 },
  台中: { lat: 24.1477, lng: 120.6736 },
  tainan: { lat: 22.9999, lng: 120.2269 },
  台南: { lat: 22.9999, lng: 120.2269 },
  hualien: { lat: 23.9871, lng: 121.6015 },
  花蓮: { lat: 23.9871, lng: 121.6015 },
  penghu: { lat: 23.5711, lng: 119.5793 },
  澎湖: { lat: 23.5711, lng: 119.5793 },

  // Hong Kong / Macau
  "hong kong": { lat: 22.3193, lng: 114.1694 },
  香港: { lat: 22.3193, lng: 114.1694 },
  macau: { lat: 22.1987, lng: 113.5439 },
  澳門: { lat: 22.1987, lng: 113.5439 },

  // Korea
  seoul: { lat: 37.5665, lng: 126.9780 },
  首爾: { lat: 37.5665, lng: 126.9780 },
  busan: { lat: 35.1796, lng: 129.0756 },
  釜山: { lat: 35.1796, lng: 129.0756 },
  jeju: { lat: 33.4890, lng: 126.4983 },
  濟州: { lat: 33.4890, lng: 126.4983 },

  // Southeast Asia
  bangkok: { lat: 13.7563, lng: 100.5018 },
  曼谷: { lat: 13.7563, lng: 100.5018 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  新加坡: { lat: 1.3521, lng: 103.8198 },
  bali: { lat: -8.3405, lng: 115.0920 },
  峇里島: { lat: -8.3405, lng: 115.0920 },
  "kuala lumpur": { lat: 3.1390, lng: 101.6869 },
  吉隆坡: { lat: 3.1390, lng: 101.6869 },
  phuket: { lat: 7.8804, lng: 98.3923 },
  普吉島: { lat: 7.8804, lng: 98.3923 },
  "chiang mai": { lat: 18.7883, lng: 98.9853 },
  清邁: { lat: 18.7883, lng: 98.9853 },
  hanoi: { lat: 21.0278, lng: 105.8342 },
  河內: { lat: 21.0278, lng: 105.8342 },
  "ho chi minh": { lat: 10.8231, lng: 106.6297 },
  胡志明: { lat: 10.8231, lng: 106.6297 },
  danang: { lat: 16.0544, lng: 108.2022 },
  峴港: { lat: 16.0544, lng: 108.2022 },

  // Europe
  paris: { lat: 48.8566, lng: 2.3522 },
  巴黎: { lat: 48.8566, lng: 2.3522 },
  london: { lat: 51.5074, lng: -0.1278 },
  倫敦: { lat: 51.5074, lng: -0.1278 },
  rome: { lat: 41.9028, lng: 12.4964 },
  羅馬: { lat: 41.9028, lng: 12.4964 },
  barcelona: { lat: 41.3851, lng: 2.1734 },
  巴塞隆納: { lat: 41.3851, lng: 2.1734 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  阿姆斯特丹: { lat: 52.3676, lng: 4.9041 },
  vienna: { lat: 48.2082, lng: 16.3738 },
  維也納: { lat: 48.2082, lng: 16.3738 },
  prague: { lat: 50.0755, lng: 14.4378 },
  布拉格: { lat: 50.0755, lng: 14.4378 },
  berlin: { lat: 52.5200, lng: 13.4050 },
  柏林: { lat: 52.5200, lng: 13.4050 },
  zurich: { lat: 47.3769, lng: 8.5417 },
  蘇黎世: { lat: 47.3769, lng: 8.5417 },
  milan: { lat: 45.4642, lng: 9.1900 },
  米蘭: { lat: 45.4642, lng: 9.1900 },
  venice: { lat: 45.4408, lng: 12.3155 },
  威尼斯: { lat: 45.4408, lng: 12.3155 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
  里斯本: { lat: 38.7223, lng: -9.1393 },
  reykjavik: { lat: 64.1265, lng: -21.8174 },
  雷克雅維克: { lat: 64.1265, lng: -21.8174 },
  iceland: { lat: 64.9631, lng: -19.0208 },
  冰島: { lat: 64.9631, lng: -19.0208 },
  copenhagen: { lat: 55.6761, lng: 12.5683 },
  哥本哈根: { lat: 55.6761, lng: 12.5683 },
  stockholm: { lat: 59.3293, lng: 18.0686 },
  斯德哥爾摩: { lat: 59.3293, lng: 18.0686 },

  // Americas
  "new york": { lat: 40.7128, lng: -74.0060 },
  紐約: { lat: 40.7128, lng: -74.0060 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  洛杉磯: { lat: 34.0522, lng: -118.2437 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  舊金山: { lat: 37.7749, lng: -122.4194 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  芝加哥: { lat: 41.8781, lng: -87.6298 },
  hawaii: { lat: 21.3069, lng: -157.8583 },
  夏威夷: { lat: 21.3069, lng: -157.8583 },
  vancouver: { lat: 49.2827, lng: -123.1207 },
  溫哥華: { lat: 49.2827, lng: -123.1207 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  多倫多: { lat: 43.6532, lng: -79.3832 },
  miami: { lat: 25.7617, lng: -80.1918 },
  邁阿密: { lat: 25.7617, lng: -80.1918 },

  // Oceania
  sydney: { lat: -33.8688, lng: 151.2093 },
  雪梨: { lat: -33.8688, lng: 151.2093 },
  悉尼: { lat: -33.8688, lng: 151.2093 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  墨爾本: { lat: -37.8136, lng: 144.9631 },
  "gold coast": { lat: -28.0167, lng: 153.4000 },
  黃金海岸: { lat: -28.0167, lng: 153.4000 },
};

/**
 * Look up coordinates from the static table using fuzzy matching.
 * Returns null if no match found.
 */
export function lookupCityCoords(destination: string): { lat: number; lng: number } | null {
  if (!destination) return null;
  const key = destination.toLowerCase().trim();

  // Exact match first
  if (CITY_COORDS[key]) return CITY_COORDS[key];

  // Partial match — destination contains keyword or keyword contains destination
  for (const [cityKey, coords] of Object.entries(CITY_COORDS)) {
    if (key.includes(cityKey) || cityKey.includes(key)) {
      return coords;
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