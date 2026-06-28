import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Download, CloudOff, RefreshCw, Signal, Search, CheckCircle, PlusCircle, Flag, Info, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import L from "leaflet";
import { ItineraryItem, Participant } from "../types";
import { translations } from "../lib/translations";
import { resolveLatLng } from "../utils/mapHelpers";
import { MAP_CONFIG } from "../lib/constants";

// Polyline decoder to convert Google Maps Encoded Polyline algorithm format to latlng arrays
const decodePolyline = (encoded: string): [number, number][] => {
  const points: [number, number][] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
};

interface OfflineMapSimulatorProps {
  destination?: string;
  itineraries: ItineraryItem[];
  onSelectLocation?: (item: ItineraryItem) => void;
  onAddItineraryItem?: (item: Omit<ItineraryItem, "id" | "votes" | "comments" | "coordinates" | "trafficStatus"> & { coordinates?: { x: number; y: number } }) => Promise<void>;
  onUpdateItineraryItem?: (item: ItineraryItem) => Promise<void>;
  onDeleteItineraryItem?: (itemId: string) => Promise<void>;
  lang?: "en" | "zh";
  participants?: Participant[];
  currentUserId?: string;
  tripLat?: number;
  tripLng?: number;
}

interface MapTarget {
  name: string;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  type: string;
  traffic: "smooth" | "moderate" | "congested";
  isCustom?: boolean;
  isItinerary?: boolean;
  originalItem?: ItineraryItem;
  dayIndex?: number;
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

export default function OfflineMapSimulator({
  destination = "Tokyo",
  itineraries = [],
  onSelectLocation,
  onAddItineraryItem,
  onUpdateItineraryItem,
  onDeleteItineraryItem,
  lang = "en",
  participants = [],
  currentUserId,
  tripLat,
  tripLng
}: OfflineMapSimulatorProps) {
  const [viewMode, setViewMode] = useState<"simulator" | "leaflet">("leaflet");
  const [selectedDayFilter, setSelectedDayFilter] = useState<number>(-1); // -1 means "All Days"
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeItem, setActiveItem] = useState<ItineraryItem | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navStep, setNavStep] = useState<number>(0);

  // Leaflet references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Geolocation and navigation
  const [currentGeoLocation, setCurrentGeoLocation] = useState<{ lat: number; lng: number }>(() => {
    if (tripLat !== undefined && tripLat !== null && tripLng !== undefined && tripLng !== null && !isNaN(Number(tripLat)) && !isNaN(Number(tripLng))) {
      return { lat: Number(tripLat), lng: Number(tripLng) };
    }
    return resolveLatLng(destination, destination, 34, 65);
  });
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSimulatedMoving, setIsSimulatedMoving] = useState<boolean>(true); // Walking loop simulation starts active by default

  // Form states for adding or editing itinerary plans
  const [isEditingActiveItem, setIsEditingActiveItem] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editLocation, setEditLocation] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("12:00");
  const [editDay, setEditDay] = useState<number>(0);
  const [editCategory, setEditCategory] = useState<"sight" | "food" | "hotel">("sight");
  const [editCost, setEditCost] = useState<number>(0);

  // Custom user-dropped landmarks/pins
  const [customHotspots, setCustomHotspots] = useState<MapTarget[]>([]);

  // Google Routes API States
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeMeta, setRouteMeta] = useState<{ distanceMsg: string; durationMsg: string; mode: "WALKING" | "DRIVE" | null } | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const clearRouteState = () => {
    setRoutePoints([]);
    setRouteMeta(null);
    setRouteError(null);
  };

  const t = translations[lang];

  // Helper to convert real Lat/Lng standard coordinates to pseudo canvas X/Y
  const getSvgCoordsFromLatLng = (lat: number, lng: number): { x: number; y: number } => {
    let center = { lat: 35.6762, lng: 139.6503 }; // Tokyo default
    if (tripLat !== undefined && tripLat !== null && tripLng !== undefined && tripLng !== null && !isNaN(Number(tripLat)) && !isNaN(Number(tripLng))) {
      center = { lat: Number(tripLat), lng: Number(tripLng) };
    } else {
      const d = destination.toLowerCase();
      if (d.includes("hong") || d.includes("hkg") || d.includes("香港")) {
        center = { lat: 22.3193, lng: 114.1694 };
      } else if (d.includes("paris") || d.includes("巴黎")) {
        center = { lat: 48.8566, lng: 2.3522 };
      } else if (d.includes("london") || d.includes("倫敦")) {
        center = { lat: 51.5074, lng: -0.1278 };
      } else if (d.includes("taipei") || d.includes("台北") || d.includes("taiwan")) {
        center = { lat: 25.0330, lng: 121.5654 };
      } else if (d.includes("new york") || d.includes("nyc")) {
        center = { lat: 40.7128, lng: -74.0060 };
      }
    }

    const y = 50 - (lat - center.lat) / 0.0015;
    const x = 50 + (lng - center.lng) / 0.0018;

    return {
      x: Math.round(Math.min(Math.max(5, x), 95)),
      y: Math.round(Math.min(Math.max(5, y), 95))
    };
  };

  // Synchronise edit form values whenever the active node focuses
  useEffect(() => {
    if (activeItem) {
      setEditTitle(activeItem.title || "");
      
      const isPlaceholderName = activeItem.title?.startsWith("自訂") || activeItem.title?.startsWith("Dropped Pin") || !activeItem.locationName;
      if (isPlaceholderName && activeItem.lat && activeItem.lng) {
        setEditLocation(`${activeItem.lat.toFixed(6)}, ${activeItem.lng.toFixed(6)}`);
      } else {
        setEditLocation(activeItem.locationName || "");
      }

      setEditDesc(activeItem.description || "");
      setEditTime(activeItem.time || "12:00");
      setEditDay(activeItem.dayIndex || 0);
      setEditCategory(activeItem.category === "restaurant" ? "food" : activeItem.category === "hotel" ? "hotel" : "sight");
      setEditCost(activeItem.cost || 0);
      setIsEditingActiveItem(false);
    } else {
      setIsEditingActiveItem(false);
    }
  }, [activeItem]);

  // Automated simulated walking movement loop updates
  useEffect(() => {
    if (!isSimulatedMoving || !currentGeoLocation) return;

    let angle = Math.random() * 2 * Math.PI;
    const interval = setInterval(() => {
      const stepSize = MAP_CONFIG.WALK_STEP_SIZE; // smooth increment step
      angle += (Math.random() - 0.5) * MAP_CONFIG.WALK_ANGLE_DRIFT; // random OdyShareing course drift
      
      setCurrentGeoLocation(prev => {
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
          lng: position.coords.longitude
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
          "x-user-id": targetUserId
        },
        body: JSON.stringify({
          lat: currentGeoLocation.lat,
          lng: currentGeoLocation.lng
        })
      }).catch(err => {
        console.warn("Telemetry reporting error:", err);
      });
    }, MAP_CONFIG.LOCATION_REPORT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [currentGeoLocation, currentUserId]);

  // Reset active node, routes and custom user landmarks when destination changes
  useEffect(() => {
    setActiveItem(null);
    clearRouteState();
    setCustomHotspots([]);
    setCurrentGeoLocation(resolveLatLng(destination, destination, 34, 65));
  }, [destination]);

  // Dynamic list of unique days in the itinerary
  const uniqueDays = React.useMemo(() => {
    const days = new Set<number>();
    (itineraries || []).forEach(item => {
      if (typeof item.dayIndex === "number") {
        days.add(item.dayIndex);
      }
    });
    const daysList = Array.from(days).sort((a, b) => a - b);
    if (daysList.length === 0) {
      return [0];
    }
    return daysList;
  }, [itineraries]);

  // Combine dynamic local itinerary plans so they display on map!
  const itineraryPins = React.useMemo(() => {
    return (itineraries || []).map((item, index) => {
      return {
        name: item.title,
        // Distribute pseudo-coordinates around the quadrant nicely
        x: item.coordinates?.x || (18 + (index * 19) % 65),
        y: item.coordinates?.y || (22 + (index * 23) % 55),
        lat: item.lat,
        lng: item.lng,
        type: item.category === "hotel" ? "hotel" : item.category === "restaurant" ? "food" : "sight",
        traffic: (index % 3 === 0 ? "congested" : index % 3 === 1 ? "moderate" : "smooth") as any,
        isItinerary: true,
        originalItem: item,
        dayIndex: item.dayIndex || 0
      };
    });
  }, [itineraries, destination]);

  // Master merged map objects - NO HARDCODED LANDMARKS (AS REQUESTED: "hard code data不要了")
  const allMapObjects = React.useMemo(() => {
    const filteredPins = selectedDayFilter === -1
      ? itineraryPins
      : itineraryPins.filter(pin => pin.dayIndex === selectedDayFilter);
    return [...filteredPins, ...customHotspots];
  }, [itineraryPins, customHotspots, selectedDayFilter]);

  // Cache other active participants with broadcast geolocations
  const otherParticipants = React.useMemo(() => {
    return (participants || []).filter(
      p => p.id !== currentUserId && p.lat !== undefined && p.lng !== undefined
    );
  }, [participants, currentUserId]);

  // Filter map list based on search query
  const filteredObjects = React.useMemo(() => {
    return allMapObjects.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allMapObjects, searchQuery]);

  // Fetch route parameters and decode polyline from our secure Google Routes API proxy
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
      ? resolveLatLng(activeItem.locationName || activeItem.title, destination, activeItem.coordinates.x, activeItem.coordinates.y, activeItem.lat, activeItem.lng)
      : null;

    if (!activeCoords) {
      setRouteError(lang === "zh" ? "無法解析目的地座標。" : "Unable to resolve target coordinates.");
      setRouteLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/trip/google-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          origin: currentGeoLocation,
          destination: activeCoords,
          travelMode: mode
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || (lang === "zh" ? "獲取路線規劃失敗" : "Failed to retrieve route."));
      }

      const backendData = await res.json();
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
            mode: mode
          });
        } else {
          throw new Error(lang === "zh" ? "無效的二進位路徑資料。" : "No polyline data found in the response.");
        }
      } else {
        throw new Error(lang === "zh" ? "本區域兩起終點間暫無可用路線規劃。" : "No routes found between these locations.");
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
      ? resolveLatLng(activeItem.locationName || activeItem.title, destination, activeItem.coordinates.x, activeItem.coordinates.y, activeItem.lat, activeItem.lng)
      : null;
    if (!activeCoords) return "";
    return `https://www.google.com/maps/dir/?api=1&origin=${currentGeoLocation.lat},${currentGeoLocation.lng}&destination=${activeCoords.lat},${activeCoords.lng}&travelmode=transit`;
  };

  const startDownload = () => {
    setDownloadProgress(0);
    setIsDownloaded(false);
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloaded(true);
          setTimeout(() => setDownloadProgress(null), 1000);
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  const handleSaveToItineraryPlan = async () => {
    if (!editTitle.trim()) return;
    if (onAddItineraryItem) {
      await onAddItineraryItem({
        title: editTitle,
        locationName: editLocation || editTitle,
        description: editDesc,
        time: editTime,
        dayIndex: Number(editDay) || 0,
        category: editCategory === "food" ? "restaurant" : editCategory === "hotel" ? "hotel" : "sight",
        cost: Number(editCost) || 0,
        coordinates: activeItem?.coordinates || { x: 50, y: 50 },
        lat: activeItem?.lat,
        lng: activeItem?.lng
      });
      if (activeItem) {
        setCustomHotspots(prev => prev.filter(c => {
          const nameMatches = c.name !== activeItem.title && c.name !== activeItem.locationName;
          const coordMatches = !(c.lat && activeItem.lat && Math.abs(c.lat - activeItem.lat) < 0.0001 && Math.abs(c.lng - activeItem.lng) < 0.0001);
          return nameMatches && coordMatches;
        }));
      }
      setActiveItem(null);
      setIsEditingActiveItem(false);
    }
  };

  const handleUpdateExistingItineraryPlan = async () => {
    if (!editTitle.trim() || !activeItem) return;
    if (onUpdateItineraryItem) {
      const pinName = editLocation || editTitle;
      // Pre-resolve coordinates client-side for immediate response
      const localCoords = resolveLatLng(pinName, destination || "", 50, 50);
      const updated = {
        ...activeItem,
        title: editTitle,
        locationName: pinName,
        description: editDesc,
        time: editTime,
        dayIndex: Number(editDay) || 0,
        category: editCategory === "food" ? ("restaurant" as const) : editCategory === "hotel" ? ("hotel" as const) : ("sight" as const),
        cost: Number(editCost) || 0,
        lat: localCoords.lat,
        lng: localCoords.lng,
        coordinates: {
          x: Math.round(50 + (localCoords.lng - (tripLng || 139.6503)) / 0.0018),
          y: Math.round(50 - (localCoords.lat - (tripLat || 35.6762)) / 0.0015)
        }
      };
      await onUpdateItineraryItem(updated);
      setActiveItem(updated);
      setIsEditingActiveItem(false);
    }
  };

  const handleUpdateCustomPinOnly = () => {
    if (!editTitle.trim() || !activeItem) return;
    setCustomHotspots(prev => prev.map(c => {
      if (c.name === activeItem.locationName) {
        return {
          ...c,
          name: editTitle,
          lat: activeItem.coordinates ? resolveLatLng(editTitle, destination, activeItem.coordinates.x, activeItem.coordinates.y).lat : c.lat,
          lng: activeItem.coordinates ? resolveLatLng(editTitle, destination, activeItem.coordinates.x, activeItem.coordinates.y).lng : c.lng
        };
      }
      return c;
    }));
    const updated = {
      ...activeItem,
      title: editTitle,
      locationName: editTitle,
      description: editDesc,
      time: editTime,
      cost: editCost,
      category: editCategory === "food" ? "restaurant" as const : editCategory === "hotel" ? "hotel" as const : "sight" as const
    };
    setActiveItem(updated);
    setIsEditingActiveItem(false);
  };

  const handleDeleteOrCreateNode = async () => {
    if (!activeItem) return;
    const isRealItinerary = activeItem.id && activeItem.id.startsWith("it-");
    if (isRealItinerary) {
      if (onDeleteItineraryItem) {
        await onDeleteItineraryItem(activeItem.id);
      }
    } else {
      setCustomHotspots(prev => prev.filter(c => {
        const nameMatches = c.name !== activeItem.title && c.name !== activeItem.locationName;
        const coordMatches = !(c.lat && activeItem.lat && Math.abs(c.lat - activeItem.lat) < 0.0001 && Math.abs(c.lng - activeItem.lng) < 0.0001);
        return nameMatches && coordMatches;
      }));
    }
    setActiveItem(null);
    setIsEditingActiveItem(false);
  };

  const handleSelectObject = (spot: MapTarget) => {
    clearRouteState();
    const mockItem: ItineraryItem = spot.originalItem || {
      id: "spot-" + spot.name,
      dayIndex: 0,
      time: "10:00",
      title: spot.name,
      description: lang === "zh"
        ? `偵測到該地區的熱門推薦！當前路況判定：${spot.traffic === "smooth" ? "暢通" : spot.traffic === "moderate" ? "多車" : "壅塞"}`
        : `Explore local hotspot '${spot.name}' in active destination ${destination}. Traffic indicator: ${spot.traffic}`,
      locationName: spot.lat && spot.lng && spot.isCustom ? `${spot.lat.toFixed(6)}, ${spot.lng.toFixed(6)}` : spot.name,
      category: spot.type === "food" ? "restaurant" : "sight",
      cost: 0,
      votes: [],
      comments: [],
      coordinates: { x: spot.x, y: spot.y },
      trafficStatus: spot.traffic as any,
      lat: spot.lat,
      lng: spot.lng
    };

    setActiveItem(mockItem);
    if (onSelectLocation) onSelectLocation(mockItem);
  };

  // Click directly on canvas map to drop a custom pinpoint pin
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setCustomHotspots(prev => {
      const newName = lang === "zh"
        ? `自訂地標 #${prev.length + 1}`
        : `Dropped Pin #${prev.length + 1}`;
      const resolved = resolveLatLng(newName, destination, x, y);
      const droppedTarget: MapTarget = {
        name: newName,
        x,
        y,
        lat: resolved.lat,
        lng: resolved.lng,
        type: "sight",
        traffic: "smooth",
        isCustom: true
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
    const resolved = resolveLatLng(searchQuery.trim(), destination, rx, ry);
    const newTarget: MapTarget = {
      name: searchQuery.trim(),
      x: rx,
      y: ry,
      lat: resolved.lat,
      lng: resolved.lng,
      type: "sight",
      traffic: "smooth",
      isCustom: true
    };
    setCustomHotspots(prev => [newTarget, ...prev]);
    handleSelectObject(newTarget);
    setSearchQuery("");
  };

  const startSimulatedNavigation = () => {
    if (!activeItem) return;
    setIsNavigating(true);
    setNavStep(0);
  };

  useEffect(() => {
    let timer: any;
    if (isNavigating) {
      timer = setInterval(() => {
        setNavStep(prev => {
          if (prev >= 100) {
            setIsNavigating(false);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    }
    return () => clearInterval(timer);
  }, [isNavigating]);

  // Leaflet Map Initialization Effect
  useEffect(() => {
    if (viewMode !== "leaflet" || !mapContainerRef.current) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    if (!mapRef.current) {
      const centerLat = tripLat !== undefined && tripLat !== null && !isNaN(Number(tripLat)) ? Number(tripLat) : resolveLatLng(destination, destination, 50, 50).lat;
      const centerLng = tripLng !== undefined && tripLng !== null && !isNaN(Number(tripLng)) ? Number(tripLng) : resolveLatLng(destination, destination, 50, 50).lng;
      const mapInstance = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 12,
        attributionControl: false
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance);

      const group = L.layerGroup().addTo(mapInstance);
      markersGroupRef.current = group;
      mapRef.current = mapInstance;

      // Drop pin on double-click or simple click
      mapInstance.on("click", (e: L.LeafletMouseEvent) => {
        const latlng = e.latlng;
        // Dynamically map standard Lat/Lng coords to grid x/y coords for perfect cross-view persistence
        const pseudoCoords = getSvgCoordsFromLatLng(latlng.lat, latlng.lng);

        setCustomHotspots(prev => {
          const newName = lang === "zh"
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
            isCustom: true
          };

          setTimeout(() => {
            handleSelectObject(droppedTarget);
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
  }, [viewMode, destination]);

  // Helper to resolve coordinates
  const getSpotCoords = (spot: any): { lat: number; lng: number } => {
    if (!spot) {
      return resolveLatLng("", destination || "", 50, 50);
    }

    // Check direct lat/lng fields first
    const latNum = Number(spot.lat);
    const lngNum = Number(spot.lng);
    if (spot.lat !== undefined && spot.lat !== null && !isNaN(latNum) &&
        spot.lng !== undefined && spot.lng !== null && !isNaN(lngNum)) {
      return { lat: latNum, lng: lngNum };
    }

    // Calculate x & y mapping onto the city canvas
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

  // Sync / Paint markers in Leaflet Group
  // One-time pan to active landmark selection
  useEffect(() => {
    if (!activeItem) return;
    if (!mapRef.current) return;
    const pos = getSpotCoords(activeItem);
    mapRef.current.panTo([pos.lat, pos.lng], { animate: true });
  }, [activeItem?.id, activeItem?.title, activeItem?.coordinates?.x, activeItem?.coordinates?.y]);

  // One-time fitBounds to loaded route so user can adjust camera zoom freely afterwards
  useEffect(() => {
    if (!mapRef.current || !routePoints || routePoints.length === 0) return;
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
    if (!mapRef.current || !markersGroupRef.current) return;

    const group = markersGroupRef.current;
    group.clearLayers();

    // Paint current real GPS geolocation if available
    if (currentGeoLocation) {
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
        iconAnchor: [16, 24]
      });

      L.marker([currentGeoLocation.lat, currentGeoLocation.lng], { icon: geoIcon })
        .addTo(group);
    }

    // Paint other active participants' live positions in team project
    otherParticipants.forEach(p => {
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
        iconAnchor: [18, 26]
      });

      L.marker([p.lat!, p.lng!], { icon: pIcon })
        .addTo(group)
        .bindPopup(`<strong>${p.name}</strong><br/>${lang === "zh" ? "成員即時位置" : "Participant Live Location"}`);
    });

    // Paint other targets
    allMapObjects.forEach(spot => {
      const pos = getSpotCoords(spot);
      const isSpotActive = activeItem?.locationName === spot.name;

      const markerColor = spot.isItinerary
        ? getDayColor(spot.dayIndex || 0) // dynamic color for different days
        : spot.isCustom
        ? "#ec4899" // hot pink for custom pins
        : spot.traffic === "smooth"
        ? "#10b981"
        : spot.traffic === "moderate"
        ? "#f59e0b"
        : "#ef4444";

      const badgeIcon = spot.isItinerary
        ? `D${(spot.dayIndex || 0) + 1}`
        : spot.type === "food"
        ? "🍴"
        : "📍";

      const pinIcon = L.divIcon({
        className: `custom-leaflet-pin-wrapper`,
        html: `
          <div class="flex flex-col items-center ${isSpotActive ? 'scale-115 z-50' : 'opacity-90'} transition-transform duration-200">
            <div class="w-7.5 h-7.5 rounded-full border-2 border-white flex items-center justify-center shadow-md text-white text-[9.5px] font-black font-mono leading-none" style="background-color: ${markerColor}; ${isSpotActive ? 'box-shadow: 0 0 10px ' + markerColor + '; border-color: #fbbf24;' : ''}">
              ${badgeIcon}
            </div>
            <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 text-white text-[9px] font-bold whitespace-nowrap leading-none shadow-sm ${isSpotActive ? 'text-amber-300 border-amber-400 font-extrabold bg-slate-950 scale-105' : ''}">
              ${spot.name.split(" (")[0]}
            </div>
          </div>
        `,
        iconSize: [30, 46],
        iconAnchor: [15, 46]
      });

      L.marker([pos.lat, pos.lng], { icon: pinIcon })
        .addTo(group)
        .on("click", () => {
          handleSelectObject(spot);
        });
    });

    // Draw calculated Google-Routes-API polyline path on Leaflet
    if (routePoints && routePoints.length > 0) {
      L.polyline(routePoints, {
        color: routeMeta?.mode === "WALKING" ? "#3b82f6" : "#10b981",
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
        dashArray: routeMeta?.mode === "WALKING" ? "5, 10" : undefined
      }).addTo(group);
    }

  }, [allMapObjects, activeItem, currentGeoLocation, viewMode, routePoints, routeMeta, otherParticipants]);

  // Request actual Geolocation using navigator.geolocation
  const requestUserLocation = () => {
    setIsLocating(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError(lang === "zh" ? "流覽器不支援 GPS 定位服務。" : "Geolocation is not supported by your browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
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
          isCustom: true
        };
        setCustomHotspots(prev => [userSpot, ...prev]);
        handleSelectObject(userSpot);
      },
      (error) => {
        console.warn("Geolocation failure:", error);
        let errMsg = lang === "zh" ? "無法取得您的位置。請確認已開啟定位權限。" : "Unable to retrieve position. Check location permission.";
        if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
          errMsg = lang === "zh"
            ? "安全限制：手機瀏覽器要求必須在加密安全連線 (HTTPS) 協定下，才允許呼叫 GPS 定位服務！請使用 HTTPS 連線。"
            : "HTTPS Required: Mobile browsers strictly require HTTPS secure protocols to summon live GPS geolocation.";
        }
        setGeoError(errMsg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getTrafficText = (traffic: string) => {
    if (traffic === "smooth") return t.trafficSmooth;
    if (traffic === "moderate") return t.trafficModerate;
    return t.trafficCongested;
  };

  return (
    <div className="glass-container rounded-2xl p-0 shadow-xl overflow-visible md:overflow-hidden flex flex-col md:flex-row h-auto md:h-[580px] border border-white/10 animate-fadeIn font-sans">
      
      {/* Left map controls panel */}
      <div className="w-full md:w-80 border-r border-white/5 p-5 flex flex-col h-[380px] md:h-full overflow-y-auto bg-slate-950/20 backdrop-blur-md shrink-0">
        
        {/* Live GPS positioning control for HTTPS compliant environments */}
        {viewMode === "leaflet" && (
          <div className="mb-4 shrink-0 space-y-1.5">
            <button
              type="button"
              onClick={requestUserLocation}
              disabled={isLocating}
              className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 text-emerald-300 hover:text-white font-bold rounded-xl text-[10.5px] tracking-tight cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isLocating ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>{lang === "zh" ? "取得定位中..." : "Locating..."}</span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span>{lang === "zh" ? "獲得實時 GPS 定位" : "Get Live GPS Location"}</span>
                </>
              )}
            </button>
            {geoError && (
              <p className="text-[9px] text-rose-300 leading-tight bg-rose-500/10 border border-rose-500/15 p-2 rounded-lg">
                ⚠️ {geoError}
              </p>
            )}
            {currentGeoLocation && (
              <div className="space-y-1.5">
                <p className="text-[9px] text-emerald-400 text-center font-mono bg-emerald-500/5 p-1 rounded-md">
                  ✅ Lat: {currentGeoLocation.lat.toFixed(4)}, Lng: {currentGeoLocation.lng.toFixed(4)}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${offlineMode ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'}`}>
              {offlineMode ? <CloudOff size={16} /> : <Signal size={16} />}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-xs leading-none">
                {lang === "zh" ? `${destination} 地理視窗` : `${destination} Map Space`}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-wider">
                {offlineMode ? t.cachedLocal : t.realtimeGPS}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="toggle-offline-btn"
            onClick={() => setOfflineMode(!offlineMode)}
            className={`text-[10px] px-2.5 py-1.5 font-bold rounded-full cursor-pointer transition-all ${
              offlineMode
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-white/10 hover:bg-white/25 text-slate-250 border border-white/5"
            }`}
          >
            {offlineMode ? t.goLive : t.goOffline}
          </button>
        </div>

        {/* Offline Cache Package Download Widget */}
        <div className="p-3 bg-white/3 border border-white/5 rounded-xl shadow-xs mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10.5px] font-bold text-slate-300">{t.offlinePackage}</span>
            <span className="text-[9.5px] text-slate-400 font-mono capitalize">{destination} offline (18.4 MB)</span>
          </div>
          {isDownloaded ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10.5px] font-bold">
              <CheckCircle size={13} /> {t.completedEncrypted}
            </div>
          ) : downloadProgress !== null ? (
            <div className="w-full">
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-blue-500" style={{ width: `${downloadProgress}%` }}></div>
              </div>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">Syncing packet: {downloadProgress}%</span>
            </div>
          ) : (
            <button
              type="button"
              id="download-offline-pack-btn"
              onClick={startDownload}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              <Download size={13} /> {t.downloadOfflinePack}
            </button>
          )}
        </div>

        {/* Search Input Box with Custom Location Register button */}
        <div className="space-y-2 mb-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              <Search size={13} />
            </span>
            <input
              id="map-search-input"
              type="text"
              placeholder={lang === "zh" ? "搜尋或自訂景點..." : "Search or add place..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-sans"
            />
          </div>

          {searchQuery.trim() && (
            <button
              type="button"
              onClick={handleAddSearchLocation}
              className="w-full py-1.5 bg-blue-500/20 hover:bg-blue-500/35 border border-blue-500/30 text-blue-300 rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1 transition"
            >
              <PlusCircle size={12} />
              <span>{lang === "zh" ? `新增「${searchQuery}」至地圖上` : `Add "${searchQuery}" map node`}</span>
            </button>
          )}
        </div>

        {/* Day Filter Selector */}
        <div className="mb-4 shrink-0">
          <label className="block text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            {lang === "zh" ? "📅 選擇查看天數" : "📅 Filter by Day"}
          </label>
          <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-none">
            <button
              type="button"
              id="day-filter-btn-all"
              onClick={() => setSelectedDayFilter(-1)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all shrink-0 cursor-pointer border ${
                selectedDayFilter === -1
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-white/5"
              }`}
            >
              {lang === "zh" ? "全部天數" : "All Days"}
            </button>
            {uniqueDays.map((dayIdx) => {
              const dayColor = getDayColor(dayIdx);
              const isActive = selectedDayFilter === dayIdx;
              return (
                <button
                  key={dayIdx}
                  type="button"
                  id={`day-filter-btn-${dayIdx}`}
                  onClick={() => setSelectedDayFilter(dayIdx)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border`}
                  style={{
                    backgroundColor: isActive ? dayColor : "rgba(15, 23, 42, 0.6)",
                    borderColor: isActive ? dayColor : "rgba(255, 255, 255, 0.05)",
                    color: isActive ? "#ffffff" : "rgb(148, 163, 184)"
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? "#ffffff" : dayColor }}></span>
                  <span>{lang === "zh" ? `第 ${dayIdx + 1} 天` : `Day ${dayIdx + 1}`}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List of elements in map viewport */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          <div className="flex items-center justify-between block mb-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              {lang === "zh" ? "📌 規劃路線上的航點" : t.locationsOnRoute}
            </span>
            <span className="text-xs px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">
              {filteredObjects.length} pts
            </span>
          </div>

          {filteredObjects.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-white/5 text-center text-xs text-slate-500">
              {lang === "zh" ? "無符合地標。在地圖點擊可手動新增！" : "No nodes match query. Click anywhere on map canvas to plant one."}
            </div>
          ) : (
            filteredObjects.map((spot, i) => {
              const isSpotActive = activeItem?.locationName === spot.name;
              return (
                <button
                  key={i}
                  id={`hotspot-btn-${i}`}
                  onClick={() => handleSelectObject(spot)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer min-w-0 overflow-hidden ${
                    isSpotActive
                      ? "bg-blue-600/15 border-blue-500/80 hover:bg-blue-600/20"
                      : "bg-white/3 border-white/5 hover:bg-white/6"
                  }`}
                >
                  <div className="flex items-center gap-2 max-w-[70%] min-w-0 overflow-hidden">
                    <MapPin
                      size={13}
                      style={{
                        color: spot.isItinerary
                          ? getDayColor(spot.dayIndex || 0)
                          : isSpotActive
                          ? "#3b82f6"
                          : "rgb(148, 163, 184)"
                      }}
                    />
                    <div className="truncate min-w-0">
                      <h4 className="text-xs font-bold text-white leading-tight truncate">{spot.name}</h4>
                      <span className="text-xs text-slate-400 font-mono capitalize truncate block">
                        {spot.isItinerary 
                          ? (lang === "zh" ? `★ 第 ${ (spot.dayIndex || 0) + 1 } 天日程` : `★ Day ${ (spot.dayIndex || 0) + 1 } Plan`) 
                          : spot.isCustom 
                          ? (lang === "zh" ? "自訂探查地標" : "User dropped pin") 
                          : (lang === "zh" ? "本地精選推薦" : "OdyShareSmart spot")}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full uppercase leading-none shrink-0 ${
                    spot.traffic === "smooth"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/15"
                      : spot.traffic === "moderate"
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/15"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/15"
                  }`}>
                    {spot.traffic === "smooth" ? (lang === "zh" ? "暢通" : "Smooth") : spot.traffic === "moderate" ? (lang === "zh" ? "多車" : "Moderate") : (lang === "zh" ? "壅塞" : "Congested")}
                  </span>
                </button>
              );
            })
          )}
        </div>
        
        {/* Instruction guide under left drawer */}
        <div className="mt-2 text-xs leading-relaxed text-slate-500 italic border-t border-white/5 pt-2 select-none">
          {lang === "zh" ? "💡 提示：您可直接點擊右側地圖的任何角落，手動標記新的 GPS 自訂探路點！" : "💡 Pro Tip: Click any area on the map to manually register a new custom landing point."}
        </div>
      </div>

      {/* Right Canvas Map Area with beautiful custom topographic styling background */}
      <div className="flex-1 relative bg-[#0f111a] overflow-hidden min-h-[300px] h-[500px] md:h-full">
        
        {/* Top HUD float info bar */}
        <div className="absolute top-4 left-4 right-4 z-[4000] flex justify-between items-center pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 text-[10px] text-slate-350 px-3 py-1.5 rounded-xl shadow-lg font-mono font-bold flex items-center gap-1.5">
            <Flag size={11} className="text-blue-400" />
            <span>GEO ID: {destination.toUpperCase()} TRANSIT GRID</span>
          </div>
          
          <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 text-[9.5px] text-slate-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg font-mono font-black">
            <div className={`w-1.5 h-1.5 rounded-full ${offlineMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
            {offlineMode ? "OFFLINE CACHE ACTIVE" : "REAL-TIME GEO-ROUTING"}
          </div>
        </div>

        {/* Dynamic Navigation UI HUD Overlay with editable forms and deletions */}
        <AnimatePresence>
          {activeItem && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-4 left-4 right-4 z-[4000] bg-slate-900/95 border border-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-2xl text-white max-w-lg mx-auto overflow-y-auto max-h-[220px] md:max-h-[310px]"
            >
              {!isEditingActiveItem ? (
                // VIEW INFO MODE
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 max-w-[70%]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full text-white uppercase ${
                          activeItem.trafficStatus === "smooth"
                            ? "bg-emerald-600"
                            : activeItem.trafficStatus === "moderate"
                            ? "bg-amber-600"
                            : "bg-red-600"
                        }`}>
                          {getTrafficText(activeItem.trafficStatus || "smooth")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {activeItem.id && activeItem.id.startsWith("it-") 
                            ? `📅 ${lang === "zh" ? "日程安排" : "Itinerary Plan"}` 
                            : `📍 ${lang === "zh" ? "自訂探針" : "Custom Drop"}`}
                        </span>
                        {activeItem.time && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded font-bold text-amber-300 font-mono">
                            🕒 {activeItem.time}
                          </span>
                        )}
                        {activeItem.cost > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded font-bold text-emerald-400 font-mono font-bold">
                            💰 ${activeItem.cost}
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-sm text-white truncate">{activeItem.title}</h4>
                      {activeItem.locationName && activeItem.locationName !== activeItem.title && (
                        <p className="text-[11px] text-slate-400 font-medium truncate">📍 {activeItem.locationName}</p>
                      )}
                      <p className="text-xs text-slate-400 leading-normal line-clamp-2">{activeItem.description || "Scenic location tracking pinpoint"}</p>
                    </div>
                    <div className="shrink-0 pl-2 space-y-2">
                      <button
                        type="button"
                        onClick={startSimulatedNavigation}
                        disabled={isNavigating}
                        className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-1.8 px-3 rounded-lg transition-all cursor-pointer disabled:bg-blue-900/50"
                      >
                        <Navigation size={11} className={isNavigating ? "animate-spin" : ""} />
                        <span>{isNavigating ? (lang === "zh" ? "行駛..." : "Nav...") : t.cooperativeDrive}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditingActiveItem(true)}
                        className="w-full block text-center bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-1.8 px-3 rounded-lg transition cursor-pointer"
                      >
                        ✏️ {lang === "zh" ? "編輯行程" : "Edit Node"}
                      </button>
                    </div>
                  </div>

                  {/* Google Routes API Live Routing Panel */}
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-extrabold tracking-wider uppercase flex items-center gap-1">
                        🗺️ {lang === "zh" ? "地圖實時路徑規劃 (Routes API)" : "Google Live Route Planning"}
                      </span>
                      {routeLoading && (
                        <span className="text-xs text-blue-400 animate-pulse font-mono">
                          {lang === "zh" ? "計算中..." : "Calculating..."}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5">
                      {/* Shortest Walk Button */}
                      <button
                        type="button"
                        onClick={() => fetchGoogleRoute("WALKING")}
                        disabled={routeLoading || !currentGeoLocation}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          routeMeta?.mode === "WALKING"
                            ? "bg-blue-600 text-white border-blue-450"
                            : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/5 disabled:opacity-50"
                        }`}
                      >
                        <span>🚶‍♂️</span>
                        <span>{lang === "zh" ? "步行最短" : "Shortest Walk"}</span>
                      </button>

                      {/* Drive Button */}
                      <button
                        type="button"
                        onClick={() => fetchGoogleRoute("DRIVE")}
                        disabled={routeLoading || !currentGeoLocation}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          routeMeta?.mode === "DRIVE"
                            ? "bg-emerald-600 text-white border-emerald-450"
                            : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/5 disabled:opacity-50"
                        }`}
                      >
                        <span>🚗</span>
                        <span>{lang === "zh" ? "自駕路線" : "Driving Route"}</span>
                      </button>

                      {/* Public Transit Button */}
                      <a
                        href={currentGeoLocation ? getPublicTransitUrl() : "#"}
                        target={currentGeoLocation ? "_blank" : undefined}
                        rel="noreferrer"
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1 border text-center ${
                          currentGeoLocation
                            ? "bg-amber-600/20 hover:bg-amber-600/35 border-amber-500/30 text-amber-300 cursor-pointer"
                            : "bg-slate-900 text-slate-500 border-white/5 cursor-not-allowed pointer-events-none"
                        }`}
                      >
                        <span>🚌</span>
                        <span>{lang === "zh" ? "公眾交通" : "Public Transit"}</span>
                      </a>
                    </div>

                    {/* Display route duration & distance */}
                    {routeMeta && (
                      <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/15 rounded-lg px-2.5 py-1.5 text-xs">
                        <span className="text-blue-300 font-bold flex items-center gap-1">
                          {routeMeta.mode === "WALKING" ? "🚶‍♂️ " : "🚗 "}
                          {routeMeta.mode === "WALKING" ? (lang === "zh" ? "步行路徑" : "Walk Path") : (lang === "zh" ? "自駕路徑" : "Drive Path")}
                        </span>
                        <div className="font-mono text-white font-black space-x-1.5 text-right">
                          <span>📍 {routeMeta.distanceMsg}</span>
                          <span className="text-amber-300">⏱️ {routeMeta.durationMsg}</span>
                        </div>
                      </div>
                    )}

                    {routeError && (
                      <p className="text-[10px] font-medium text-rose-300 leading-normal bg-rose-500/10 border border-rose-500/15 p-2 rounded-lg">
                        ⚠️ {routeError}
                      </p>
                    )}

                    {!currentGeoLocation && (
                      <p className="text-[9.5px] text-slate-400 text-center italic">
                        {lang === "zh" ? "💡 請先點選左上角「獲得實時 GPS 定位」解鎖導航路徑" : "💡 Click 'Get Live GPS Location' on left to unlock dynamic pathing"}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex gap-2 pt-2 border-t border-white/5 text-xs font-bold justify-between">
                    {activeItem.id && activeItem.id.startsWith("it-") ? (
                      // Itinerary item deletion
                      <button
                        type="button"
                        onClick={handleDeleteOrCreateNode}
                        className="px-3 py-1.5 bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 rounded-lg hover:text-white transition cursor-pointer flex items-center gap-1.5"
                      >
                        🗑️ {lang === "zh" ? "自日程刪除" : "Delete Plan"}
                      </button>
                    ) : (
                      // Custom dropped pin actions
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingActiveItem(true);
                          }}
                          className="px-3 py-1.5 bg-amber-600/25 hover:bg-amber-600/45 text-amber-300 rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          💾 {lang === "zh" ? "儲存至行程" : "Save to Schedule"}
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteOrCreateNode}
                          className="px-3 py-1.5 bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 rounded-lg hover:text-white transition cursor-pointer flex items-center gap-1"
                        >
                          ❌ {lang === "zh" ? "移除自訂標記" : "Remove Pin"}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveItem(null)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-350 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      {lang === "zh" ? "關閉" : "Close"}
                    </button>
                  </div>
                </div>
              ) : (
                // EDIT & SAVE MODE FORM
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <h4 className="font-extrabold text-xs text-amber-400 font-mono tracking-wide uppercase">
                      🔧 {lang === "zh" ? "編輯航點細節" : "Edit Landmark Parameters"}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">[{activeItem.coordinates?.x}, {activeItem.coordinates?.y}]</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">{lang === "zh" ? "航點標題 / 活動" : "Landmark Name"}</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                        placeholder={lang === "zh" ? "輸入標題..." : "E.g., Tokyo Sea-Tac Plaza"}
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">{lang === "zh" ? "詳細地址 / 位置" : "Map Address"}</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none"
                        placeholder={lang === "zh" ? "輸入位置..." : "Specific address"}
                      />
                      {activeItem?.lat !== undefined && activeItem?.lng !== undefined && (
                        <p className="text-[10px] mt-1 text-slate-400 font-mono">
                          📍 {lang === "zh" ? "點擊座標" : "Coordinates"}: {activeItem.lat.toFixed(6)}, {activeItem.lng.toFixed(6)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">{lang === "zh" ? "航點說明" : "Description / Notes"}</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-950 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none leading-normal"
                        placeholder={lang === "zh" ? "輸入備註與計畫..." : "E.g., taste fresh fish, walk to next terminal"}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-0.5">{lang === "zh" ? "出發時間" : "Time"}</label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 p-1 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-0.5">{lang === "zh" ? "預算 ($)" : "Budget ($)"}</label>
                        <input
                          type="number"
                          value={editCost}
                          onChange={(e) => setEditCost(Number(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-white/10 p-1 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-0.5">{lang === "zh" ? "哪一天" : "Day Number"}</label>
                        <select
                          value={editDay}
                          onChange={(e) => setEditDay(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/10 p-1 rounded text-xs text-white"
                        >
                          <option value={0}>{lang === "zh" ? "第 1 天" : "Day 1"}</option>
                          <option value={1}>{lang === "zh" ? "第 2 天" : "Day 2"}</option>
                          <option value={2}>{lang === "zh" ? "第 3 天" : "Day 3"}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-0.5">{lang === "zh" ? "活動分類" : "Category"}</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as any)}
                          className="w-full bg-slate-950 border border-white/10 p-1 rounded text-xs text-white"
                        >
                          <option value="sight">🏞️ {lang === "zh" ? "景點" : "Sight"}</option>
                          <option value="food">🍴 {lang === "zh" ? "美食" : "Food"}</option>
                          <option value="hotel">🏨 {lang === "zh" ? "住宿" : "Hotel"}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-white/5 justify-end font-bold text-xs">
                    <button
                      type="button"
                      onClick={() => setIsEditingActiveItem(false)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-slate-300 rounded-lg transition cursor-pointer"
                    >
                      ↩️ {lang === "zh" ? "返回" : "Back"}
                    </button>

                    {activeItem.id && activeItem.id.startsWith("it-") ? (
                      <button
                        type="button"
                        onClick={handleUpdateExistingItineraryPlan}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer"
                      >
                        💾 {lang === "zh" ? "保存行程" : "Update Destination"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleUpdateCustomPinOnly}
                          className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-350 border border-amber-500/25 rounded-lg transition cursor-pointer"
                        >
                          ✏️ {lang === "zh" ? "僅修改標記名字" : "Rename Pin Only"}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveToItineraryPlan}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer"
                        >
                          💾 {lang === "zh" ? "加入行程" : "Insert to Itinerary"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Beautiful interactive Leaflet OpenStreetMap view or Simulator view */}
        {viewMode === "leaflet" ? (
          <div className="w-full h-full relative min-h-[350px]">
            <div
              ref={mapContainerRef}
              className="w-full h-full text-slate-900 min-h-full bg-[#0b0e14]"
            />
          </div>
        ) : (
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full cursor-crosshair select-none bg-slate-950/40"
            onClick={handleMapClick}
          >
            {/* Aesthetic Water River flowing through the land (Neon cyan curving polyline) */}
            <path
              d="M -10 20 C 30 15, 40 45, 60 55 C 80 65, 90 90, 110 95"
              fill="none"
              stroke="#14b8a6"
              strokeWidth="3.2"
              strokeOpacity="0.15"
              strokeLinecap="round"
            />
            <path
              d="M -10 20 C 30 15, 40 45, 60 55 C 80 65, 90 90, 110 95"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.1"
              strokeOpacity="0.4"
              strokeLinecap="round"
            />

            {/* Park Boundaries / Forest Reserves (Translucent green shapes) */}
            <path
              d="M 12 10 Q 25 5, 32 18 T 16 35 Z"
              fill="#10b981"
              fillOpacity="0.06"
              stroke="#10b981"
              strokeWidth="0.2"
              strokeOpacity="0.15"
            />
            <path
              d="M 70 70 Q 85 75, 92 82 T 72 94 Z"
              fill="#10b981"
              fillOpacity="0.06"
              stroke="#10b981"
              strokeWidth="0.2"
              strokeOpacity="0.15"
            />

            {/* Grid coordinates grid overlay lines */}
            <g opacity="0.05">
              {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(coord => (
                <React.Fragment key={coord}>
                  <line x1={coord} y1="0" x2={coord} y2="100" stroke="#fff" strokeWidth="0.08" />
                  <line x1="0" y1={coord} x2="100" y2={coord} stroke="#fff" strokeWidth="0.08" />
                </React.Fragment>
              ))}
            </g>

            {/* Secondary Arterial Road networks */}
            <path d="M 0 35 L 100 35" stroke="#ffffff" strokeWidth="0.15" strokeOpacity="0.1" />
            <path d="M 45 0 L 45 100" stroke="#ffffff" strokeWidth="0.15" strokeOpacity="0.1" />
            <path d="M 0 75 Q 50 60 100 75" fill="none" stroke="#ffffff" strokeWidth="0.15" strokeOpacity="0.08" />

            {/* Primary simulated highways showing traffic condition colors (Red / Orange / Green) */}
            <path d="M 10 10 L 90 90" fill="none" stroke="#22c55e" strokeWidth="0.3" strokeOpacity="0.25" strokeLinecap="round" />
            <path d="M 15 85 L 85 15" fill="none" stroke="#f59e0b" strokeWidth="0.3" strokeOpacity="0.25" strokeLinecap="round" strokeDasharray="1,1" />

            {/* Connection Lines between selected Active Item and GPS Point */}
            {activeItem?.coordinates && (
              <line
                x1="34"
                y1="65"
                x2={activeItem.coordinates.x}
                y2={activeItem.coordinates.y}
                stroke="#ef4444"
                strokeWidth="0.3"
                strokeDasharray="1.5,1.5"
                opacity="0.3"
              />
            )}

            {isNavigating && activeItem?.coordinates && (
              <motion.path
                d={`M 34 65 L ${activeItem.coordinates.x} ${activeItem.coordinates.y}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 3, ease: "easeInOut" }}
              />
            )}

            {allMapObjects.map((spot, index) => {
              const isSpotActive = activeItem?.locationName === spot.name;
              return (
                <g
                  key={index}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation(); // Avoid triggering backdrop handleMapClick
                    handleSelectObject(spot);
                  }}
                >
                  {/* Active selection pulsing radar */}
                  {isSpotActive && (
                    <circle
                      cx={spot.x}
                      cy={spot.y}
                      r="4.5"
                      fill={spot.isItinerary ? "#f59e0b" : "#3b82f6"}
                      opacity="0.25"
                      className="animate-ping"
                    />
                  )}

                  {/* Main pin circle */}
                  <circle
                    cx={spot.x}
                    cy={spot.y}
                    r={isSpotActive ? (spot.isItinerary ? "2.6" : "2.2") : "1.4"}
                    fill={
                      isSpotActive
                        ? spot.isItinerary ? getDayColor(spot.dayIndex || 0) : "#3b82f6"
                        : spot.isItinerary
                        ? getDayColor(spot.dayIndex || 0) // dynamic color for different days
                        : spot.isCustom
                        ? "#ec4899" // hot pink for user custom-added coordinates
                        : spot.traffic === "smooth"
                        ? "#10b981"
                        : spot.traffic === "moderate"
                        ? "#f59e0b"
                        : "#ef4444"
                    }
                    stroke="#ffffff"
                    strokeWidth="0.3"
                  />

                  {/* Tiny text label representing day inside the pin */}
                  {spot.isItinerary && (
                    <text
                      x={spot.x}
                      y={spot.y + 0.4}
                      fill="#ffffff"
                      fontSize="1.1"
                      fontWeight="black"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      {((spot.dayIndex || 0) + 1).toString()}
                    </text>
                  )}

                  {/* Labeled text underneath point */}
                  <text
                    x={spot.x}
                    y={spot.y - 3}
                    textAnchor="middle"
                    fill={spot.isItinerary ? "#fbbf24" : isSpotActive ? "#3b82f6" : "#cbd5e1"}
                    fontSize="2.2"
                    fontWeight="bold"
                    className="pointer-events-none drop-shadow-md font-sans text-[2.2px] uppercase select-none font-sans"
                  >
                    {spot.name.split(" ")[0]}
                  </text>
                </g>
              );
            })}

            {/* Main Simulated User current starting location placeholder */}
            <g>
              <circle cx="34" cy="65" r="3.2" fill="#3b82f6" opacity="0.12" />
              <circle cx="34" cy="65" r="1.1" fill="#2563eb" stroke="#ffffff" strokeWidth="0.3" />
              <path d="M 34 61 L 34 69 M 30 65 L 38 65" stroke="#2563eb" strokeWidth="0.15" opacity="0.5" />
              <text
                x="34"
                y="61"
                textAnchor="middle"
                fill="#3b82f6"
                fontSize="2.4"
                fontWeight="black"
                className="pointer-events-none drop-shadow-md select-none font-sans font-extrabold animate-pulse"
              >
                {lang === "zh" ? "📍 您在此處" : "📍 You're Here"}
              </text>
            </g>

            {/* Visual navigation avatar driving on track */}
            {isNavigating && activeItem?.coordinates && (
              <circle
                cx={34 + ((activeItem.coordinates.x - 34) * navStep) / 100}
                cy={65 + ((activeItem.coordinates.y - 65) * navStep) / 100}
                r="1.6"
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth="0.4"
              />
            )}
          </svg>
        )}

        {/* Map legend bottom sidebar container */}
        <div className="absolute top-[82px] left-4 bg-slate-900/90 border border-white/10 p-2.5 rounded-xl text-[9px] font-mono text-slate-400 space-y-1.5 shadow-lg max-w-[170px] select-none">
          <div className="font-bold text-slate-350 uppercase tracking-widest leading-none pb-1 border-b border-white/5">{lang === "zh" ? "圖例說明" : "MAP LEGEND"}</div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
            <span>{lang === "zh" ? "日程規劃景點" : "Itinerary Spot"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ec4899]" />
            <span>{lang === "zh" ? "自訂點擊打點" : "Interactive Dropped"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>{lang === "zh" ? "WSmart 畅通航點" : "WS Smooth Traffic"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            <span>{lang === "zh" ? "WSmart 壅塞航點" : "WS Congested Area"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
