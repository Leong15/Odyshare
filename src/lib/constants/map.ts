import { CITY_COORDS } from "./cityCoords";

// 從 OfflineMapSimulator.tsx 提取
export const MAP_CONFIG = {
  WALK_STEP_SIZE: 0.00015,
  WALK_ANGLE_DRIFT: 0.4,
  WALK_INTERVAL_MS: 1500,
  LOCATION_REPORT_DEBOUNCE_MS: 1500,
  DEFAULT_CENTERS: {
    TOKYO: { lat: CITY_COORDS.tokyo.lat, lng: CITY_COORDS.tokyo.lng },
    HONG_KONG: { lat: CITY_COORDS.hong_kong.lat, lng: CITY_COORDS.hong_kong.lng },
    PARIS: { lat: CITY_COORDS.paris.lat, lng: CITY_COORDS.paris.lng },
    LONDON: { lat: CITY_COORDS.london.lat, lng: CITY_COORDS.london.lng },
    TAIPEI: { lat: CITY_COORDS.taipei.lat, lng: CITY_COORDS.taipei.lng },
    NEW_YORK: { lat: CITY_COORDS.new_york.lat, lng: CITY_COORDS.new_york.lng },
  }
} as const;

export const MAP_BOUNDS = {
  LON_MIN: -180.0,
  LON_MAX: 180.0,
  LAT_MAX: 92.0,
  LAT_MIN: -95.0,
} as const;
