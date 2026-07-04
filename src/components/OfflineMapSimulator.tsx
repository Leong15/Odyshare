import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Download, CloudOff, RefreshCw, Signal, Search, CheckCircle, PlusCircle, Flag, Info, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type L_TYPE from "leaflet";
let L: typeof L_TYPE | null = null;
import { ItineraryItem, Participant } from "../types";
import { translations } from "../lib/translations";
import { resolveLatLng, getDayColor } from "../utils/mapHelpers";
import { MAP_CONFIG, isItineraryItem } from "../lib/constants";
import { MapTarget } from "../hooks/map/types";
import { useMapGeolocation } from "../hooks/map/useMapGeolocation";
import { useLeafletMap } from "../hooks/map/useLeafletMap";
import { useMapRouting } from "../hooks/map/useMapRouting";
import { useMapPins } from "../hooks/map/useMapPins";
import { mapEditCategoryToItemCategory } from "../utils/categoryUtils";
import { MapNodeEditor } from "./map/MapNodeEditor";
import { MapLegend } from "./map/MapLegend";

// Polyline decoder was removed as it was migrated to useMapRouting.ts

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
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(true);
  const [activeItem, setActiveItem] = useState<ItineraryItem | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navStep, setNavStep] = useState<number>(0);

  // Form states for adding or editing itinerary plans
  const [isEditingActiveItem, setIsEditingActiveItem] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editLocation, setEditLocation] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("12:00");
  const [editDay, setEditDay] = useState<number>(0);
  const [editCategory, setEditCategory] = useState<"sight" | "food" | "hotel">("sight");
  const [editCost, setEditCost] = useState<number>(0);

  const t = translations[lang];

  const handleSelectObject = (spot: MapTarget) => {
    clearRouteState();
    const mockItem: ItineraryItem = spot.originalItem || {
      id: "spot-" + spot.name,
      dayIndex: 0,
      time: "10:00",
      title: spot.name,
      description: lang === "zh"
        ? `偵測到該地區的熱門推薦！`
        : `Explore local hotspot '${spot.name}' in active destination ${destination}.`,
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

  // 1. Pins Custom Hook (Pins, custom dropped hotspots, filters, searches)
  const {
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
    handleSvgMapClick
  } = useMapPins({
    itineraries,
    destination,
    lang,
    handleSelectObject: (spot) => handleSelectObject(spot)
  });

  // 2. Geolocation Hook
  const mapRef = useRef<any | null>(null);
  const {
    currentGeoLocation,
    setCurrentGeoLocation,
    geoError,
    isLocating,
    isSimulatedMoving,
    setIsSimulatedMoving,
    requestUserLocation
  } = useMapGeolocation({
    destination,
    tripLat,
    tripLng,
    currentUserId,
    lang,
    setCustomHotspots,
    handleSelectObject: (spot) => handleSelectObject(spot),
    mapRef
  });

  // 3. Routing Hook
  const {
    routePoints,
    routeMeta,
    routeLoading,
    routeError,
    fetchGoogleRoute,
    clearRouteState,
    getPublicTransitUrl
  } = useMapRouting({
    currentGeoLocation,
    activeItem,
    destination,
    lang
  });

  // Derived other participants with geolocations
  const otherParticipants = React.useMemo(() => {
    return (participants || []).filter(
      p => p.id !== currentUserId && p.lat !== undefined && p.lng !== undefined
    );
  }, [participants, currentUserId]);

  // 4. Leaflet Map Hook
  const {
    mapContainerRef,
    leafletLoaded
  } = useLeafletMap({
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
    onSelectObject: (spot) => handleSelectObject(spot),
    setCustomHotspots,
    lang,
    mapRef
  });

  // Reset active node, routes and custom user landmarks when destination changes
  useEffect(() => {
    setActiveItem(null);
    clearRouteState();
    setCustomHotspots([]);
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
        category: mapEditCategoryToItemCategory(editCategory),
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
        category: mapEditCategoryToItemCategory(editCategory),
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
      category: mapEditCategoryToItemCategory(editCategory)
    };
    setActiveItem(updated);
    setIsEditingActiveItem(false);
  };

  const handleDeleteOrCreateNode = async () => {
    if (!activeItem) return;
    const isRealItinerary = activeItem.id && isItineraryItem(activeItem.id);
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

  const handleMapClick = handleSvgMapClick;

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
            <MapNodeEditor
              lang={lang}
              t={t}
              activeItem={activeItem}
              setActiveItem={setActiveItem}
              isEditingActiveItem={isEditingActiveItem}
              setIsEditingActiveItem={setIsEditingActiveItem}
              isNavigating={isNavigating}
              startSimulatedNavigation={startSimulatedNavigation}
              routeLoading={routeLoading}
              currentGeoLocation={currentGeoLocation}
              fetchGoogleRoute={fetchGoogleRoute}
              routeMeta={routeMeta}
              getPublicTransitUrl={getPublicTransitUrl}
              routeError={routeError}
              handleDeleteOrCreateNode={handleDeleteOrCreateNode}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editLocation={editLocation}
              setEditLocation={setEditLocation}
              editDesc={editDesc}
              setEditDesc={setEditDesc}
              editTime={editTime}
              setEditTime={setEditTime}
              editCost={editCost}
              setEditCost={setEditCost}
              editDay={editDay}
              setEditDay={setEditDay}
              editCategory={editCategory}
              setEditCategory={setEditCategory}
              handleUpdateExistingItineraryPlan={handleUpdateExistingItineraryPlan}
              handleUpdateCustomPinOnly={handleUpdateCustomPinOnly}
              handleSaveToItineraryPlan={handleSaveToItineraryPlan}
            />
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

            {/* Primary arterial highways */}
            <path d="M 10 10 L 90 90" fill="none" stroke="#ffffff" strokeWidth="0.15" strokeOpacity="0.1" strokeLinecap="round" />
            <path d="M 15 85 L 85 15" fill="none" stroke="#ffffff" strokeWidth="0.15" strokeOpacity="0.1" strokeLinecap="round" strokeDasharray="1,1" />

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
                        : "#64748b"
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
        <MapLegend lang={lang} />
      </div>
    </div>
  );
}
