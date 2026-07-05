import React, { useState, useEffect } from "react";
import { resolveLatLng } from "../../utils/mapHelpers";
import { MAP_CONFIG } from "../../lib/constants";
import { MapTarget } from "./types";

interface UseMapGeolocationProps {
  destination: string;
  tripLat?: number;
  tripLng?: number;
  currentUserId?: string;
  lang: "en" | "zh";
  setCustomHotspots: React.Dispatch<React.SetStateAction<MapTarget[]>>;
  handleSelectObject: (spot: MapTarget) => void;
  mapRef: React.MutableRefObject<any>;
}

export function useMapGeolocation({
  destination,
  tripLat,
  tripLng,
  currentUserId,
  lang,
  setCustomHotspots,
  handleSelectObject,
  mapRef,
}: UseMapGeolocationProps) {
  const [currentGeoLocation, setCurrentGeoLocation] = useState<{ lat: number; lng: number }>(() => {
    if (
      tripLat !== undefined &&
      tripLat !== null &&
      tripLng !== undefined &&
      tripLng !== null &&
      !isNaN(Number(tripLat)) &&
      !isNaN(Number(tripLng))
    ) {
      return { lat: Number(tripLat), lng: Number(tripLng) };
    }
    return resolveLatLng(destination, destination, 34, 65);
  });
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSimulatedMoving, setIsSimulatedMoving] = useState<boolean>(false); // Walking loop simulation is closed by default

  // Automated simulated walking movement loop updates
  useEffect(() => {
    if (!isSimulatedMoving || !currentGeoLocation) return;

    let angle = Math.random() * 2 * Math.PI;
    const interval = setInterval(() => {
      const stepSize = MAP_CONFIG.WALK_STEP_SIZE; // smooth increment step
      angle += (Math.random() - 0.5) * MAP_CONFIG.WALK_ANGLE_DRIFT; // random OdyShareing course drift

      setCurrentGeoLocation((prev) => {
        if (!prev) return prev;
        const nextLat = prev.lat + Math.sin(angle) * stepSize;
        const nextLng = prev.lng + Math.cos(angle) * stepSize;
        return { lat: nextLat, lng: nextLng };
      });
    }, MAP_CONFIG.WALK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isSimulatedMoving]);

  // Actual Browser GPS watcher
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentGeoLocation(coords);
        setGeoError(null);
      },
      (err) => {
        console.warn("watchPosition telemetry warning:", err);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Debounce and report our live location telemetry to the server
  useEffect(() => {
    if (!currentGeoLocation) return;

    const targetUserId = currentUserId || localStorage.getItem("loggedInUserId");
    if (!targetUserId) return;

    const timer = setTimeout(() => {
      fetch("/api/trip/update-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": targetUserId,
        },
        body: JSON.stringify({
          lat: currentGeoLocation.lat,
          lng: currentGeoLocation.lng,
        }),
      }).catch((err) => {
        console.warn("Telemetry reporting error:", err);
      });
    }, MAP_CONFIG.LOCATION_REPORT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [currentGeoLocation, currentUserId]);

  // Request actual Geolocation using navigator.geolocation
  const requestUserLocation = () => {
    setIsLocating(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError(
        lang === "zh"
          ? "流覽器不支援 GPS 定位服務。"
          : "Geolocation is not supported by your browser."
      );
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentGeoLocation(coords);
        setIsLocating(false);

        if (mapRef.current) {
          mapRef.current.setView([coords.lat, coords.lng], 14, { animate: true });
        }

        // Drop user position custom spot
        const userSpot: MapTarget = {
          name: lang === "zh" ? "實時定位 (My Location)" : "My GPS Location",
          x: 50,
          y: 50,
          lat: coords.lat,
          lng: coords.lng,
          type: "sight",
          traffic: "smooth",
          isCustom: true,
        };
        setCustomHotspots((prev) => [userSpot, ...prev]);
        handleSelectObject(userSpot);
      },
      (error) => {
        console.warn("Geolocation failure:", error);
        let errMsg =
          lang === "zh"
            ? "無法取得您的位置。請確認已開啟定位權限。"
            : "Unable to retrieve position. Check location permission.";
        if (
          window.location.protocol !== "https:" &&
          window.location.hostname !== "localhost"
        ) {
          errMsg =
            lang === "zh"
              ? "安全限制：手機瀏覽器要求必須在加密安全連線 (HTTPS) 協定下，才允許呼叫 GPS 定位服務！請使用 HTTPS 連線。"
              : "HTTPS Required: Mobile browsers strictly require HTTPS secure protocols to summon live GPS geolocation.";
        }
        setGeoError(errMsg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return {
    currentGeoLocation,
    setCurrentGeoLocation,
    geoError,
    setGeoError,
    isLocating,
    isSimulatedMoving,
    setIsSimulatedMoving,
    requestUserLocation,
  };
}
