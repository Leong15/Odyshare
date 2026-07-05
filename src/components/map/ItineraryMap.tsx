import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { ItineraryItem } from "../../types";
import { MapPin, Navigation, Globe } from "lucide-react";
import { resolveLatLng } from "../../utils/mapHelpers";

interface ItineraryMapProps {
  destination?: string;
  items: ItineraryItem[];
  lang?: "en" | "zh";
}

export default function ItineraryMap({
  destination = "Tokyo",
  items = [],
  lang = "en"
}: ItineraryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [mapError, setMapError] = useState<boolean>(false);

  // Extract day markers with coordinates
  const markersData = React.useMemo(() => {
    return items.map((item, idx) => {
      const coords = resolveLatLng(
        item.locationName || item.title,
        destination,
        item.coordinates?.x || 30 + (idx * 8) % 40,
        item.coordinates?.y || 40 + (idx * 6) % 40,
        item.lat,
        item.lng
      );
      return {
        ...coords,
        title: item.title,
        time: item.time,
        locationName: item.locationName,
        category: item.category,
        order: idx + 1
      };
    });
  }, [items, destination]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      if (!mapRef.current) {
        // Initialize Map
        const centerLat = markersData.length > 0 ? markersData[0].lat : resolveLatLng(destination, destination).lat;
        const centerLng = markersData.length > 0 ? markersData[0].lng : resolveLatLng(destination, destination).lng;

        const mapInstance = L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: 13,
          zoomControl: true,
          attributionControl: false
        });

        // Add Dark elegant map layer
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
          attribution: '© CartoDB'
        }).addTo(mapInstance);

        const markersGroup = L.layerGroup().addTo(mapInstance);
        markersGroupRef.current = markersGroup;
        mapRef.current = mapInstance;
      }
    } catch (err) {
      console.error("Leaflet initialization failed in ItineraryMap:", err);
      setMapError(true);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      if (markersGroupRef.current) {
        markersGroupRef.current.clearLayers();
        markersGroupRef.current.remove();
        markersGroupRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers and Polyline when items/data changes
  useEffect(() => {
    const map = mapRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    // Clear previous markers
    group.clearLayers();

    // Clear previous polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (markersData.length === 0) return;

    const latlngs: L.LatLngExpression[] = [];

    markersData.forEach((marker) => {
      latlngs.push([marker.lat, marker.lng]);

      // Create beautiful numbered custom HTML icon
      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-7 h-7 bg-indigo-500 border-2 border-white rounded-full flex items-center justify-center text-white text-[11px] font-black font-mono shadow-lg shadow-indigo-500/50 animate-fadeIn">
              ${marker.order}
            </div>
            <div class="w-3 h-3 bg-indigo-400 rounded-full animate-ping absolute opacity-70"></div>
          </div>
        `,
        className: "custom-div-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupContent = `
        <div class="p-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white max-w-[200px]">
          <div class="flex items-center gap-1.5 font-bold mb-1 border-b border-white/5 pb-1">
            <span class="bg-indigo-500 text-white rounded-md px-1 py-0.5 text-[9px] font-mono leading-none">${marker.time}</span>
            <span class="text-[11px] font-black text-white leading-tight truncate">${marker.title}</span>
          </div>
          <div class="text-[10px] text-slate-350 flex items-center gap-1">
            <span>📍</span>
            <span class="truncate">${marker.locationName}</span>
          </div>
        </div>
      `;

      const mapMarker = L.marker([marker.lat, marker.lng], { icon: customIcon })
        .addTo(group)
        .bindPopup(popupContent, {
          closeButton: false,
          className: "custom-leaflet-popup"
        });
    });

    // Draw route path line
    if (latlngs.length > 1) {
      const pathLine = L.polyline(latlngs, {
        color: "#6366f1",
        weight: 3.5,
        opacity: 0.85,
        dashArray: "6, 6",
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      polylineRef.current = pathLine;
    }

    // Auto fit map bounds
    try {
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } catch (e) {
      // Fallback centering
      map.setView([markersData[0].lat, markersData[0].lng], 13);
    }

  }, [markersData]);

  if (mapError) {
    return (
      <div className="w-full h-full min-h-[350px] bg-slate-950 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
        <Globe className="text-slate-500 mb-2 animate-spin" size={28} />
        <p className="text-xs text-slate-400">{lang === "zh" ? "地圖服務加載中..." : "Loading Map View..."}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[350px] rounded-2xl overflow-hidden border border-white/10 shadow-xl relative bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full min-h-[350px] absolute inset-0 z-10" />
    </div>
  );
}
