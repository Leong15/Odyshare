import React, { useState, useEffect } from "react";
import { MapPin, Navigation, Download, CloudOff, RefreshCw, Signal, Search, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ItineraryItem } from "../types";
import { translations } from "../lib/translations";

interface OfflineMapSimulatorProps {
  itineraries: ItineraryItem[];
  onSelectLocation?: (item: ItineraryItem) => void;
  lang?: "en" | "zh";
}

export default function OfflineMapSimulator({ itineraries, onSelectLocation, lang = "en" }: OfflineMapSimulatorProps) {
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeItem, setActiveItem] = useState<ItineraryItem | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navStep, setNavStep] = useState<number>(0);

  const t = translations[lang];

  // Default key pins for map decoration
  const hotspots = [
    { name: lang === "zh" ? "新宿黃金街" : "Shinjuku Golden Gai", x: 25, y: 35, type: "food", traffic: "congested" },
    { name: lang === "zh" ? "澀谷展望台" : "Shibuya Sky", x: 40, y: 72, type: "sight", traffic: "moderate" },
    { name: lang === "zh" ? "明治神宮" : "Meiji Jingu Shrine", x: 42, y: 48, type: "sight", traffic: "smooth" },
    { name: lang === "zh" ? "淺草寺" : "Asakusa Sensoji", x: 72, y: 22, type: "sight", traffic: "congested" },
    { name: lang === "zh" ? "目黑川星巴克旗艦店" : "Meguro Starbucks Reserve", x: 34, y: 65, type: "food", traffic: "smooth" },
    { name: lang === "zh" ? "秋葉原電器街" : "Akihabara Electric Town", x: 62, y: 38, type: "shopping", traffic: "moderate" }
  ];

  // Map searches
  const filteredHotspots = hotspots.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleSelectHotspot = (spot: typeof hotspots[0]) => {
    const mockItem: ItineraryItem = {
      id: "spot-" + spot.name,
      dayIndex: 0,
      time: "12:00",
      title: spot.name,
      description: lang === "zh" 
        ? `探測到本地推薦景点！當前路況指示：${spot.traffic}` 
        : `Discovered local hotspot featuring ${spot.traffic} traffic indicators.`,
      locationName: spot.name,
      category: spot.type === "food" ? "restaurant" : "sight",
      cost: 0,
      votes: [],
      comments: [],
      coordinates: { x: spot.x, y: spot.y },
      trafficStatus: spot.traffic as any
    };
    setActiveItem(mockItem);
    if (onSelectLocation) onSelectLocation(mockItem);
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

  // Translate specific terms dynamically helper
  const getTrafficText = (traffic: string) => {
    if (traffic === "smooth") return t.trafficSmooth;
    if (traffic === "moderate") return t.trafficModerate;
    return t.trafficCongested;
  };

  return (
    <div className="glass-container rounded-2xl p-0 shadow-xl overflow-hidden flex flex-col md:flex-row h-[550px] border border-white/10 animate-fadeIn">
      {/* Left map controls */}
      <div className="w-full md:w-80 border-r border-white/5 p-5 flex flex-col h-full bg-slate-950/20 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${offlineMode ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'}`}>
              {offlineMode ? <CloudOff size={16} /> : <Signal size={16} />}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-xs leading-none">{t.offlineMaps}</h3>
              <p className="text-[10px] text-slate-400 mt-1">
                {offlineMode ? t.cachedLocal : t.realtimeGPS}
              </p>
            </div>
          </div>
          <button
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

        {/* Offline Cache Download Widget */}
        <div className="p-3.5 bg-white/3 border border-white/5 rounded-xl shadow-xs mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10.5px] font-bold text-slate-300">{t.offlinePackage}</span>
            <span className="text-[10px] text-slate-400 font-mono">Tokyo-Ginza (24.5 MB)</span>
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
              <span className="text-[9.5px] text-slate-400 font-mono mt-0.5 block">Decrypting packet: {downloadProgress}%</span>
            </div>
          ) : (
            <button
              id="download-offline-pack-btn"
              onClick={startDownload}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              <Download size={13} /> {t.downloadOfflinePack}
            </button>
          )}
        </div>

        {/* Search Input Box */}
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={13} />
          </span>
          <input
            id="map-search-input"
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 glass-input rounded-xl text-xs"
          />
        </div>

        {/* List of hotspots with traffic tags */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1">
            {t.locationsOnRoute}
          </span>
          {filteredHotspots.map((spot, i) => {
            const isSpotActive = activeItem?.locationName === spot.name;
            return (
              <button
                key={i}
                id={`hotspot-btn-${i}`}
                onClick={() => handleSelectHotspot(spot)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all duration-250 flex items-center justify-between cursor-pointer ${
                  isSpotActive
                    ? "bg-blue-550/15 border-blue-500 hover:bg-blue-550/20"
                    : "bg-white/3 border-white/5 hover:bg-white/6"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin size={13} className={isSpotActive ? "text-blue-400" : "text-slate-400"} />
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{spot.name}</h4>
                    <span className="text-[9.5px] text-slate-400 font-mono capitalize">{spot.type === "food" ? "Restaurant" : "Sightseeing"}</span>
                  </div>
                </div>
                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase leading-none ${
                  spot.traffic === "smooth"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                    : spot.traffic === "moderate"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                    : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                }`}>
                  {spot.traffic === "smooth" ? (lang === "zh" ? "暢通" : "Smooth") : spot.traffic === "moderate" ? (lang === "zh" ? "多車" : "Moderate") : (lang === "zh" ? "壅塞" : "Congested")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Canvas Map Area */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden min-h-[300px]">
        {/* Sky styling details */}
        <div className="absolute top-4 right-4 z-10 flex gap-1.5">
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 text-[9.5px] text-slate-300 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md font-mono">
            <div className={`w-1.5 h-1.5 rounded-full ${offlineMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
            {offlineMode ? "OFFLINE VECTOR SYNC" : "GPS TRAFFIC LIVE"}
          </div>
        </div>

        {/* Dynamic Navigation HUD overlay */}
        <AnimatePresence>
          {activeItem && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/90 border border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-xl text-white max-w-lg mx-auto"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full text-white uppercase ${
                      activeItem.trafficStatus === "smooth"
                        ? "bg-emerald-600"
                        : activeItem.trafficStatus === "moderate"
                        ? "bg-amber-600"
                        : "bg-red-600"
                    }`}>
                      {getTrafficText(activeItem.trafficStatus || "smooth")}
                    </span>
                    <span className="text-[10px] text-slate-450 font-mono">Coord: [x: {activeItem.coordinates?.x}, y: {activeItem.coordinates?.y}]</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-white">{activeItem.locationName}</h4>
                  <p className="text-xs text-slate-400 leading-normal line-clamp-1">{activeItem.description || "Vector map simulation module"}</p>
                </div>
                <div className="shrink-0 pl-2">
                  <button
                    id="navigate-btn"
                    onClick={startSimulatedNavigation}
                    disabled={isNavigating}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all cursor-pointer disabled:bg-blue-850/50"
                  >
                    <Navigation size={12} className={isNavigating ? "animate-spin" : ""} />
                    {isNavigating ? (lang === "zh" ? "正導航中..." : "Driving...") : t.cooperativeDrive}
                  </button>
                </div>
              </div>

              {/* Progress HUD bar for navigation */}
              {isNavigating && (
                <div className="mt-3 pt-3 border-t border-white/5 animate-fadeIn">
                  <div className="flex justify-between text-[10.5px] text-slate-400 mb-1 font-mono">
                    <span>{t.gpsActive}</span>
                    <span>Speed: {80 - Math.floor(navStep / 2.2)} km/h • {100 - navStep}% left</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${navStep}%` }}></div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vector SVG representation for Offline / traffic Map */}
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" style={{ background: "#0a0c14" }}>
          {/* Simulated Subway/Transit Grid Grids */}
          <g opacity="0.08">
            <path d="M 0 10 L 100 10" stroke="#fff" strokeWidth="0.08" />
            <path d="M 0 30 L 100 30" stroke="#fff" strokeWidth="0.08" />
            <path d="M 0 50 L 100 50" stroke="#fff" strokeWidth="0.08" />
            <path d="M 0 70 L 100 70" stroke="#fff" strokeWidth="0.08" />
            <path d="M 0 90 L 100 90" stroke="#fff" strokeWidth="0.08" />
            <path d="M 10 0 L 10 100" stroke="#fff" strokeWidth="0.08" />
            <path d="M 30 0 L 30 100" stroke="#fff" strokeWidth="0.08" />
            <path d="M 50 0 L 50 100" stroke="#fff" strokeWidth="0.08" />
            <path d="M 70 0 L 70 100" stroke="#fff" strokeWidth="0.08" />
            <path d="M 90 0 L 90 100" stroke="#fff" strokeWidth="0.08" />
          </g>

          {/* Simulated Google Maps Traffic Link polylines */}
          <path d="M 20 20 Q 50 10 80 20 T 90 80 T 20 80 Z" fill="none" stroke="#10b981" strokeWidth="0.4" strokeDasharray="1.5,1.5" opacity="0.3" />

          {/* Connection Highway 1: (Red - Congested) */}
          <path d="M 25 35 Q 30 50 34 65" fill="none" stroke="#f43f5e" strokeWidth="0.6" strokeLinecap="round" />
          {/* Connection Highway 2: (Orange - Moderate) */}
          <path d="M 25 35 L 40 72" fill="none" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
          {/* Connection Highway 3: (Green - Smooth) */}
          <path d="M 34 65 L 40 72" fill="none" stroke="#10b981" strokeWidth="0.6" strokeLinecap="round" />
          {/* Connection Highway 4: (Orange - Moderate) */}
          <path d="M 72 22 Q 45 25 25 35" fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeLinecap="round" />
          {/* Connection Highway 5: (Red - Congested) */}
          <path d="M 40 72 Q 60 50 72 22" fill="none" stroke="#f43f5e" strokeWidth="0.6" strokeLinecap="round" />

          {/* Navigation active route line drawing in neon blue */}
          {isNavigating && activeItem?.coordinates && (
            <motion.path
              d={`M 34 65 L ${activeItem.coordinates.x} ${activeItem.coordinates.y}`}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="1.2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 3, ease: "easeInOut" }}
            />
          )}

          {/* Hotspot Dots */}
          {hotspots.map((spot, index) => {
            const isSpotActive = activeItem?.locationName === spot.name;
            return (
              <g
                key={index}
                className="cursor-pointer group"
                onClick={() => handleSelectHotspot(spot)}
              >
                {isSpotActive && (
                  <circle
                    cx={spot.x}
                    cy={spot.y}
                    r="4.2"
                    fill="#3b82f6"
                    opacity="0.3"
                    className="animate-ping"
                  />
                )}
                <circle
                  cx={spot.x}
                  cy={spot.y}
                  r={isSpotActive ? "2.2" : "1.4"}
                  fill={
                    isSpotActive
                      ? "#3b82f6"
                      : spot.traffic === "smooth"
                      ? "#10b981"
                      : spot.traffic === "moderate"
                      ? "#f59e0b"
                      : "#ef4444"
                  }
                  stroke="#ffffff"
                  strokeWidth="0.3"
                />
                <text
                  x={spot.x}
                  y={spot.y - 3}
                  textAnchor="middle"
                  fill={isSpotActive ? "#3b82f6" : "#94a3b8"}
                  fontSize="2"
                  fontWeight={isSpotActive ? "bold" : "500"}
                  className="pointer-events-none text-[2.2px] font-sans"
                >
                  {spot.name.split(" ")[0]}
                </text>
              </g>
            );
          })}

          {/* Custom user active location GPS pinpoint icon indicator */}
          <g>
            <circle cx="34" cy="65" r="3.2" fill="#3b82f6" opacity="0.15" />
            <circle cx="34" cy="65" r="1.1" fill="#2563eb" stroke="#fff" strokeWidth="0.3" />
            <path d="M 34 61 L 34 69 M 30 65 L 38 65" stroke="#2563eb" strokeWidth="0.15" opacity="0.6" />
          </g>

          {/* Driving route marker visual car */}
          {isNavigating && activeItem?.coordinates && (
            <circle
              cx={34 + ((activeItem.coordinates.x - 34) * navStep) / 100}
              cy={65 + ((activeItem.coordinates.y - 65) * navStep) / 100}
              r="1.7"
              fill="#ec4899"
              stroke="#ffffff"
              strokeWidth="0.4"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
