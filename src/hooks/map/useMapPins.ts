import React, { useState, useMemo } from "react";
import { resolveLatLngLocal } from "../../utils/mapHelpers";
import { MapTarget } from "./types";
import { ItineraryItem } from "../../types";

interface UseMapPinsProps {
  itineraries: ItineraryItem[];
  destination: string;
  lang: "en" | "zh";
  handleSelectObject: (spot: MapTarget) => void;
  initialSelectedDayFilter?: number;
}

export function useMapPins({
  itineraries = [],
  destination,
  lang,
  handleSelectObject,
  initialSelectedDayFilter = -1,
}: UseMapPinsProps) {
  const [customHotspots, setCustomHotspots] = useState<MapTarget[]>([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number>(initialSelectedDayFilter);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Combine dynamic local itinerary plans so they display on map!
  const itineraryPins = useMemo(() => {
    return (itineraries || []).map((item, index) => {
      return {
        name: item.title,
        // Distribute pseudo-coordinates around the quadrant nicely
        x: item.coordinates?.x || 18 + ((index * 19) % 65),
        y: item.coordinates?.y || 22 + ((index * 23) % 55),
        lat: item.lat,
        lng: item.lng,
        type:
          item.category === "hotel"
            ? "hotel"
            : item.category === "restaurant"
            ? "food"
            : "sight",
        traffic: (index % 3 === 0
          ? "congested"
          : index % 3 === 1
          ? "moderate"
          : "smooth") as any,
        isItinerary: true,
        originalItem: item,
        dayIndex: item.dayIndex || 0,
      };
    });
  }, [itineraries, destination]);

  // Master merged map objects
  const allMapObjects = useMemo(() => {
    const filteredPins =
      selectedDayFilter === -1
        ? itineraryPins
        : itineraryPins.filter((pin) => pin.dayIndex === selectedDayFilter);
    return [...filteredPins, ...customHotspots];
  }, [itineraryPins, customHotspots, selectedDayFilter]);

  // Filter map list based on search query
  const filteredObjects = useMemo(() => {
    return allMapObjects.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allMapObjects, searchQuery]);

  // Click directly on canvas map to drop a custom pinpoint pin
  const handleSvgMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setCustomHotspots((prev) => {
      const newName =
        lang === "zh"
          ? `自訂地標 #${prev.length + 1}`
          : `Dropped Pin #${prev.length + 1}`;
      const resolved = resolveLatLngLocal(newName, destination, x, y);
      const droppedTarget: MapTarget = {
        name: newName,
        x,
        y,
        lat: resolved.lat,
        lng: resolved.lng,
        type: "sight",
        traffic: "smooth",
        isCustom: true,
      };

      setTimeout(() => {
        handleSelectObject(droppedTarget);
      }, 0);

      return [droppedTarget, ...prev];
    });
  };

  // Search input register as a custom pin onto the layout
  const handleAddSearchLocation = () => {
    if (!searchQuery.trim()) return;
    const rx = Math.round(25 + Math.random() * 50);
    const ry = Math.round(25 + Math.random() * 50);
    const resolved = resolveLatLngLocal(searchQuery.trim(), destination, rx, ry);
    const newTarget: MapTarget = {
      name: searchQuery.trim(),
      x: rx,
      y: ry,
      lat: resolved.lat,
      lng: resolved.lng,
      type: "sight",
      traffic: "smooth",
      isCustom: true,
    };
    setCustomHotspots((prev) => [newTarget, ...prev]);
    handleSelectObject(newTarget);
    setSearchQuery("");
  };

  return {
    customHotspots,
    setCustomHotspots,
    selectedDayFilter,
    setSelectedDayFilter,
    searchQuery,
    setSearchQuery,
    itineraryPins,
    allMapObjects,
    filteredObjects,
    handleAddSearchLocation,
    handleSvgMapClick,
  };
}
