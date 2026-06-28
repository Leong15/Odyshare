// 從 OfflineMapSimulator.tsx 提取
export const MAP_CONFIG = {
  WALK_STEP_SIZE: 0.00015,
  WALK_ANGLE_DRIFT: 0.4,
  WALK_INTERVAL_MS: 1500,
  LOCATION_REPORT_DEBOUNCE_MS: 1500,
  DEFAULT_CENTERS: {
    TOKYO: { lat: 35.6762, lng: 139.6503 },
    HONG_KONG: { lat: 22.3193, lng: 114.1694 },
    PARIS: { lat: 48.8566, lng: 2.3522 },
    LONDON: { lat: 51.5074, lng: -0.1278 },
    TAIPEI: { lat: 25.0330, lng: 121.5654 },
    NEW_YORK: { lat: 40.7128, lng: -74.0060 },
  }
} as const;

export const MAP_BOUNDS = {
  LON_MIN: -180.0,
  LON_MAX: 180.0,
  LAT_MAX: 92.0,
  LAT_MIN: -95.0,
} as const;
