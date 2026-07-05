import React, { useState, useEffect, useRef } from "react";
import type L_TYPE from "leaflet";
import { resolveLatLng, getDayColor } from "../../utils/mapHelpers";
import { latLngToCanvasXY } from "../../lib/mapUtils";
import { MapTarget } from "./types";
import { Participant } from "../../types";

let L: typeof L_TYPE | null = null;



interface UseLeafletMapProps {
  viewMode: "simulator" | "leaflet";
  destination: string;
  tripLat?: number;
  tripLng?: number;
  allMapObjects: MapTarget[];
  activeItem: any | null;
  currentGeoLocation: { lat: number; lng: number } | null;
  otherParticipants: Participant[];
  routePoints: [number, number][];
  routeMeta: any;
  onSelectObject: (spot: MapTarget) => void;
  setCustomHotspots: React.Dispatch<React.SetStateAction<MapTarget[]>>;
  lang: "en" | "zh";
  mapRef?: React.MutableRefObject<any | null>;
}

export function useLeafletMap({
  viewMode,
  destination,
  tripLat,
  tripLng,
  allMapObjects,
  activeItem,
  currentGeoLocation,
  otherParticipants,
  routePoints,
  routeMeta,
  onSelectObject,
  setCustomHotspots,
  lang,
  mapRef: externalMapRef,
}: UseLeafletMapProps) {
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    if (viewMode !== "leaflet" || leafletLoaded) return;
    import("leaflet").then((leafletModule) => {
      L = leafletModule.default;
      setLeafletLoaded(true);
    });
  }, [viewMode, leafletLoaded]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const internalMapRef = useRef<any | null>(null);
  const mapRef = externalMapRef || internalMapRef;
  const markersGroupRef = useRef<any | null>(null);
  const markerCacheRef = useRef<Map<string, any>>(new Map());
  const polylineRef = useRef<any | null>(null);

  // Helper to convert real Lat/Lng standard coordinates to pseudo canvas X/Y
  const getSvgCoordsFromLatLng = (lat: number, lng: number): { x: number; y: number } => {
    let center = resolveLatLng("", destination, 50, 50);
    if (
      tripLat !== undefined &&
      tripLat !== null &&
      tripLng !== undefined &&
      tripLng !== null &&
      !isNaN(Number(tripLat)) &&
      !isNaN(Number(tripLng))
    ) {
      center = { lat: Number(tripLat), lng: Number(tripLng) };
    }

    const coords = latLngToCanvasXY(lat, lng, center.lat, center.lng);

    return {
      x: Math.round(Math.min(Math.max(5, coords.x), 95)),
      y: Math.round(Math.min(Math.max(5, coords.y), 95)),
    };
  };

  // Helper to resolve coordinates
  const getSpotCoords = (spot: any): { lat: number; lng: number } => {
    if (!spot) {
      return resolveLatLng("", destination || "", 50, 50);
    }

    const latNum = Number(spot.lat);
    const lngNum = Number(spot.lng);
    if (
      spot.lat !== undefined &&
      spot.lat !== null &&
      !isNaN(latNum) &&
      spot.lng !== undefined &&
      spot.lng !== null &&
      !isNaN(lngNum)
    ) {
      return { lat: latNum, lng: lngNum };
    }

    let x = 50;
    let y = 50;
    if (spot.coordinates && typeof spot.coordinates === "object") {
      const cx = Number(spot.coordinates.x);
      const cy = Number(spot.coordinates.y);
      if (!isNaN(cx)) x = cx;
      if (!isNaN(cy)) y = cy;
    } else {
      const sx = Number(spot.x);
      const sy = Number(spot.y);
      if (spot.x !== undefined && !isNaN(sx)) x = sx;
      if (spot.y !== undefined && !isNaN(sy)) y = sy;
    }

    const pinName = spot.locationName || spot.title || spot.name || "";
    const resolved = resolveLatLng(pinName, destination || "", x, y);

    if (isNaN(resolved.lat) || isNaN(resolved.lng)) {
      return resolveLatLng("", destination || "", 50, 50);
    }
    return resolved;
  };

  // Leaflet Map Initialization Effect
  useEffect(() => {
    if (viewMode !== "leaflet" || !mapContainerRef.current || !leafletLoaded || !L) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    if (!mapRef.current) {
      const centerLat =
        tripLat !== undefined && tripLat !== null && !isNaN(Number(tripLat))
          ? Number(tripLat)
          : resolveLatLng(destination, destination, 50, 50).lat;
      const centerLng =
        tripLng !== undefined && tripLng !== null && !isNaN(Number(tripLng))
          ? Number(tripLng)
          : resolveLatLng(destination, destination, 50, 50).lng;

      const mapInstance = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 12,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(mapInstance);

      const group = L.layerGroup().addTo(mapInstance);
      markersGroupRef.current = group;
      mapRef.current = mapInstance;

      // Drop pin on double-click or simple click
      mapInstance.on("click", (e: any) => {
        const latlng = e.latlng;
        const pseudoCoords = getSvgCoordsFromLatLng(latlng.lat, latlng.lng);

        setCustomHotspots((prev) => {
          const newName =
            lang === "zh"
              ? `自訂標定 #${prev.length + 1}`
              : `Dropped Pin #${prev.length + 1}`;

          const droppedTarget: MapTarget = {
            name: newName,
            x: pseudoCoords.x,
            y: pseudoCoords.y,
            lat: latlng.lat,
            lng: latlng.lng,
            type: "sight",
            traffic: "smooth",
            isCustom: true,
          };

          setTimeout(() => {
            onSelectObject(droppedTarget);
          }, 0);

          return [droppedTarget, ...prev];
        });
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [viewMode, destination, leafletLoaded]);

  // One-time pan to active landmark selection
  useEffect(() => {
    if (!activeItem) return;
    if (!mapRef.current) return;
    const pos = getSpotCoords(activeItem);
    mapRef.current.panTo([pos.lat, pos.lng], { animate: true });
  }, [
    activeItem?.id,
    activeItem?.title,
    activeItem?.coordinates?.x,
    activeItem?.coordinates?.y,
  ]);

  // One-time fitBounds to loaded route
  useEffect(() => {
    if (!mapRef.current || !routePoints || routePoints.length === 0 || !L) return;
    const routePolyline = L.polyline(routePoints);
    try {
      const bounds = routePolyline.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    } catch (err) {
      console.warn("Leaflet fitBounds error:", err);
    }
  }, [routePoints]);

  // Sync / Paint markers in Leaflet Group
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current || !L) return;

    const group = markersGroupRef.current;
    const activeKeys = new Set<string>();

    // 1. Paint current real GPS geolocation if available
    if (currentGeoLocation) {
      const key = "gps-user";
      activeKeys.add(key);

      const geoIcon = L.divIcon({
        className: "custom-leaflet-geo-pin",
        html: `
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse border border-blue-400">
              <div class="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-md"></div>
            </div>
            <div class="mt-0.5 px-2 py-0.5 rounded-md bg-blue-900 border border-blue-400 text-white text-[9.5px] font-black leading-none shadow-lg whitespace-nowrap">
              ${lang === "zh" ? "我的位置 (HTTPS)" : "My Location (HTTPS)"}
            </div>
          </div>
        `,
        iconSize: [32, 48],
        iconAnchor: [16, 24],
      });

      const existing = markerCacheRef.current.get(key);
      if (existing) {
        existing.setLatLng([currentGeoLocation.lat, currentGeoLocation.lng]);
        existing.setIcon(geoIcon);
      } else {
        const marker = L.marker([currentGeoLocation.lat, currentGeoLocation.lng], {
          icon: geoIcon,
        }).addTo(group);
        markerCacheRef.current.set(key, marker);
      }
    }

    // 2. Paint other active participants' live positions
    otherParticipants.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const key = `participant-${p.id}`;
      activeKeys.add(key);

      const pColor = p.avatarColor || "#10b981";
      const initials = (p.name || "").substring(0, 2).toUpperCase() || "?";

      const pIcon = L.divIcon({
        className: "custom-leaflet-participant-pin",
        html: `
          <div class="flex flex-col items-center select-none">
            <div class="relative flex items-center justify-center">
              <div class="w-8 h-8 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md transform hover:scale-110 active:scale-95 transition-all text-white text-[9.5px] font-black" style="background-color: ${pColor}">
                ${initials}
              </div>
              <div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-900 animate-ping"></div>
              <div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-900"></div>
            </div>
            <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-950 border border-white/10 text-white text-[8px] font-extrabold whitespace-nowrap leading-none shadow-sm">
              ${p.name}
            </div>
          </div>
        `,
        iconSize: [36, 52],
        iconAnchor: [18, 26],
      });

      const existing = markerCacheRef.current.get(key);
      if (existing) {
        existing.setLatLng([p.lat, p.lng]);
        existing.setIcon(pIcon);
      } else {
        const marker = L.marker([p.lat, p.lng], { icon: pIcon })
          .addTo(group)
          .bindPopup(
            `<strong>${p.name}</strong><br/>${
              lang === "zh" ? "成員即時位置" : "Participant Live Location"
            }`
          );
        markerCacheRef.current.set(key, marker);
      }
    });

    // 3. Paint other targets (spots/itinerary items)
    allMapObjects.forEach((spot) => {
      const key = `spot-${spot.id || spot.name}`;
      activeKeys.add(key);

      const pos = getSpotCoords(spot);
      const isSpotActive = activeItem?.locationName === spot.name;

      const markerColor = spot.isItinerary
        ? getDayColor(spot.dayIndex || 0)
        : spot.isCustom
        ? "#ec4899"
        : "#64748b";

      const badgeIcon = spot.isItinerary
        ? `D${(spot.dayIndex || 0) + 1}`
        : spot.type === "food"
        ? "🍴"
        : "📍";

      const pinIcon = L.divIcon({
        className: `custom-leaflet-pin-wrapper`,
        html: `
          <div class="flex flex-col items-center ${
            isSpotActive ? "scale-115 z-50" : "opacity-90"
          } transition-transform duration-200">
            <div class="w-7.5 h-7.5 rounded-full border-2 border-white flex items-center justify-center shadow-md text-white text-[9.5px] font-black font-mono leading-none" style="background-color: ${markerColor}; ${
          isSpotActive
            ? "box-shadow: 0 0 10px " + markerColor + "; border-color: #fbbf24;"
            : ""
        }">
              ${badgeIcon}
            </div>
            <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-white text-[9px] font-bold whitespace-nowrap leading-none shadow-sm ${
              isSpotActive
                ? "text-amber-300 border-amber-400 font-extrabold bg-slate-950 scale-105"
                : ""
            }">
              ${spot.name.split(" (")[0]}
            </div>
          </div>
        `,
        iconSize: [30, 46],
        iconAnchor: [15, 46],
      });

      const existing = markerCacheRef.current.get(key);
      if (existing) {
        existing.setLatLng([pos.lat, pos.lng]);
        existing.setIcon(pinIcon);
        existing.off("click");
        existing.on("click", () => {
          onSelectObject(spot);
        });
      } else {
        const marker = L.marker([pos.lat, pos.lng], { icon: pinIcon })
          .addTo(group)
          .on("click", () => {
            onSelectObject(spot);
          });
        markerCacheRef.current.set(key, marker);
      }
    });

    // Remove obsolete markers
    for (const [key, marker] of markerCacheRef.current.entries()) {
      if (!activeKeys.has(key)) {
        group.removeLayer(marker);
        markerCacheRef.current.delete(key);
      }
    }

    // 4. Draw Google Routes API polyline path
    if (polylineRef.current) {
      group.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    if (routePoints && routePoints.length > 0) {
      const pl = L.polyline(routePoints, {
        color: routeMeta?.mode === "WALKING" ? "#3b82f6" : "#10b981",
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
        dashArray: routeMeta?.mode === "WALKING" ? "5, 10" : undefined,
      }).addTo(group);
      polylineRef.current = pl;
    }
  }, [
    allMapObjects,
    activeItem,
    currentGeoLocation,
    viewMode,
    routePoints,
    routeMeta,
    otherParticipants,
  ]);

  return {
    mapContainerRef,
    mapRef,
    leafletLoaded,
  };
}
