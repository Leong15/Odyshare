import { useState } from "react";
import { resolveLatLng } from "../../utils/mapHelpers";

// Polyline decoder to convert Google Maps Encoded Polyline algorithm format to latlng arrays
const decodePolyline = (encoded: string): [number, number][] => {
  const points: [number, number][] = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
};

interface UseMapRoutingProps {
  currentGeoLocation: { lat: number; lng: number } | null;
  activeItem: any | null;
  destination: string;
  lang: "en" | "zh";
}

export function useMapRouting({
  currentGeoLocation,
  activeItem,
  destination,
  lang,
}: UseMapRoutingProps) {
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeMeta, setRouteMeta] = useState<{
    distanceMsg: string;
    durationMsg: string;
    mode: "WALKING" | "DRIVE" | null;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const clearRouteState = () => {
    setRoutePoints([]);
    setRouteMeta(null);
    setRouteError(null);
  };

  const fetchGoogleRoute = async (mode: "WALKING" | "DRIVE") => {
    if (!currentGeoLocation || !activeItem) return;

    // Toggle off if clicking the already active route mode
    if (routeMeta?.mode === mode) {
      clearRouteState();
      return;
    }

    setRouteLoading(true);
    setRouteError(null);
    setRoutePoints([]);
    setRouteMeta(null);

    // Resolve lat/lng for activeItem
    const activeCoords = activeItem.coordinates
      ? resolveLatLng(
          activeItem.locationName || activeItem.title,
          destination,
          activeItem.coordinates.x,
          activeItem.coordinates.y,
          activeItem.lat,
          activeItem.lng
        )
      : null;

    if (!activeCoords) {
      setRouteError(
        lang === "zh" ? "無法解析目的地座標。" : "Unable to resolve target coordinates."
      );
      setRouteLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/trip/google-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: currentGeoLocation,
          destination: activeCoords,
          travelMode: mode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg =
          typeof data.error === "object" && data.error !== null
            ? data.error.message ||
              data.error.code ||
              (lang === "zh" ? "獲取路線規劃失敗" : "Failed to retrieve route.")
            : data.error ||
              (lang === "zh" ? "獲取路線規劃失敗" : "Failed to retrieve route.");
        throw new Error(errMsg);
      }

      const jsonRes = await res.json();
      const backendData = jsonRes.success && jsonRes.data ? jsonRes.data : jsonRes;
      if (backendData.routes && backendData.routes[0]) {
        const route = backendData.routes[0];
        const encoded = route.polyline?.encodedPolyline;
        if (encoded) {
          const decoded = decodePolyline(encoded);
          setRoutePoints(decoded);

          const distKm = (route.distanceMeters / 1000).toFixed(2);
          const durationSec = parseInt(route.duration.replace("s", ""), 10);
          const durationMin = Math.round(durationSec / 60);

          setRouteMeta({
            distanceMsg: lang === "zh" ? `${distKm} 公里` : `${distKm} km`,
            durationMsg: lang === "zh" ? `${durationMin} 分鐘` : `${durationMin} mins`,
            mode: mode,
          });
        } else {
          throw new Error(
            lang === "zh" ? "無效的二進位路徑資料。" : "No polyline data found in the response."
          );
        }
      } else {
        throw new Error(
          lang === "zh"
            ? "本區域兩起終點間暫無可用路線規劃。"
            : "No routes found between these locations."
        );
      }
    } catch (err: any) {
      console.error("fetchGoogleRoute error:", err);
      setRouteError(err.message || "Route calculation failed");
    } finally {
      setRouteLoading(false);
    }
  };

  const getPublicTransitUrl = () => {
    if (!currentGeoLocation || !activeItem) return "";
    const activeCoords = activeItem.coordinates
      ? resolveLatLng(
          activeItem.locationName || activeItem.title,
          destination,
          activeItem.coordinates.x,
          activeItem.coordinates.y,
          activeItem.lat,
          activeItem.lng
        )
      : null;
    if (!activeCoords) return "";
    return `https://www.google.com/maps/dir/?api=1&origin=${currentGeoLocation.lat},${currentGeoLocation.lng}&destination=${activeCoords.lat},${activeCoords.lng}&travelmode=transit`;
  };

  return {
    routePoints,
    setRoutePoints,
    routeMeta,
    setRouteMeta,
    routeLoading,
    routeError,
    fetchGoogleRoute,
    clearRouteState,
    getPublicTransitUrl,
  };
}
