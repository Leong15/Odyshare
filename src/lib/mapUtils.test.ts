import { describe, it, expect } from "vitest";
import {
  latLngToCanvasXY,
  canvasXYToLatLng,
  lookupCityCoords,
  isSameCoordinate,
  calculateHaversineDistance,
} from "./mapUtils";

describe("mapUtils Coordinate and Geo helpers", () => {
  it("should convert lat/lng to canvas coordinates and back approximately", () => {
    const centerLat = 35.6762;
    const centerLng = 139.6503;
    
    const { x, y } = latLngToCanvasXY(35.68, 139.66, centerLat, centerLng);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);

    const back = canvasXYToLatLng(x, y, centerLat, centerLng);
    expect(back.lat).toBeCloseTo(35.68, 2);
    expect(back.lng).toBeCloseTo(139.66, 2);
  });

  it("should look up static coordinates for cities correctly", () => {
    const tokyo = lookupCityCoords("tokyo");
    expect(tokyo).not.toBeNull();
    expect(tokyo!.lat).toBeCloseTo(35.6762, 4);

    const nonexistent = lookupCityCoords("fakecity12345");
    expect(nonexistent).toBeNull();
  });

  it("should match coordinates correctly within tolerance", () => {
    const c1 = { lat: 25.0330, lng: 121.5654 };
    const c2 = { lat: 25.03301, lng: 121.56541 };
    const c3 = { lat: 25.0400, lng: 121.5700 };

    expect(isSameCoordinate(c1, c2, 0.0002)).toBe(true);
    expect(isSameCoordinate(c1, c3)).toBe(false);
  });

  it("should calculate Haversine distance between Tokyo and Taipei correctly", () => {
    // Tokyo (35.6762, 139.6503) to Taipei (25.0330, 121.5654)
    const dist = calculateHaversineDistance(35.6762, 139.6503, 25.0330, 121.5654);
    // Real distance is ~2100 km
    expect(dist).toBeGreaterThan(2000);
    expect(dist).toBeLessThan(2200);
  });
});
