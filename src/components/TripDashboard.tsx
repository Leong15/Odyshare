import React, { useMemo, useState, useEffect, useRef } from "react";
// @ts-ignore
import worldMapImg from "../assets/images/world_map_plate_carree.png";
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Compass, 
  Plus, 
  Edit, 
  Shield,
  Layers,
  ChevronRight,
  Calendar,
  DollarSign,
  Wallet,
  Activity,
  ArrowRightLeft,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Trip } from "../types";

export interface DashboardTrip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  status?: "active" | "inactive";
  participants?: any[];
  expenses?: any[];
  itineraries?: any[];
  lat?: number;
  lng?: number;
}

interface TripDashboardProps {
  trip: Trip;
  trips: DashboardTrip[];
  lang: "zh" | "en";
  onSwitchTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onEditTripMeta: (updatedData: { name: string; destination: string; totalBudget: number; status?: "active" | "inactive" }) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
}

export const MAP_LON_MIN = -172.0;
export const MAP_LON_MAX =  185.0;
export const MAP_LAT_MAX =  97.0;
export const MAP_LAT_MIN = -90.0;

export function gpsToPercent(lat: number, lng: number): { left: number; top: number } {
  const clampedLat = Math.max(MAP_LAT_MIN, Math.min(MAP_LAT_MAX, Number(lat)));
  const clampedLng = Math.max(MAP_LON_MIN, Math.min(MAP_LON_MAX, Number(lng)));
  return {
    left: ((clampedLng - MAP_LON_MIN) / (MAP_LON_MAX - MAP_LON_MIN)) * 100,
    top:  ((MAP_LAT_MAX - clampedLat) / (MAP_LAT_MAX - MAP_LAT_MIN)) * 100,
  };
}

export function getCoordinatesForDestination(dest: string, lat?: number, lng?: number): { left: number; top: number } {
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    return gpsToPercent(Number(lat), Number(lng));
  }
  const canonical = dest.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    hash = canonical.charCodeAt(i) + ((hash << 5) - hash);
  }
  return {
    left: 15 + Math.abs((hash * 43) % 70),
    top:  10 + Math.abs((hash * 29) % 60),
  };
}

export default function TripDashboard({
  trip,
  trips,
  lang,
  onSwitchTrip,
  onCreateTrip,
  onEditTripMeta,
  onDeleteTrip
}: TripDashboardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(trip?.name || "");
  const [editDestination, setEditDestination] = useState(trip?.destination || "Tokyo");
  const [editBudget, setEditBudget] = useState(trip?.totalBudget || 3000);
  const [editStatus, setEditStatus] = useState<"active" | "inactive">(trip?.status || "active");
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mouse coordinate and boundaries tracking for dynamic follow-cursor Tooltip
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardContainerRef.current) return;
    const rect = cardContainerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const getTooltipStyle = () => {
    if (!cardContainerRef.current) return { left: "0px", top: "0px" };
    const width = cardContainerRef.current.clientWidth;
    const height = cardContainerRef.current.clientHeight;

    const tooltipWidth = 240;  // Match our premium card styling dimensions
    const tooltipHeight = 185; // Estimated height for the statistics/bars

    let left = mousePos.x + 15;
    let top = mousePos.y + 15;

    // Flip horizontally if mouse is too close to the right edge
    if (left + tooltipWidth > width) {
      left = mousePos.x - tooltipWidth - 15;
    }
    // Flip vertically if mouse is too close to the bottom edge
    if (top + tooltipHeight > height) {
      top = mousePos.y - tooltipHeight - 15;
    }

    // Double guard limits to keep it perfectly within viewport padding boundaries
    left = Math.max(8, Math.min(width - tooltipWidth - 8, left));
    top = Math.max(8, Math.min(height - tooltipHeight - 8, top));

    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  };

  // Sync edit values when active trip updates
  useEffect(() => {
    if (trip) {
      setEditName(trip.name);
      setEditDestination(trip.destination);
      setEditBudget(trip.totalBudget);
      setEditStatus(trip.status || "active");
    }
  }, [trip]);

  // Core cross-project statistics aggregations
  const aggregateStats = useMemo(() => {
    const totalWorkspaces = trips.length;

    // Count unique safe operator emails across all user's projects
    const uniqueParticipants = new Set<string>();
    trips.forEach(t => {
      t.participants?.forEach(p => {
        uniqueParticipants.add(p.id || p.email);
      });
    });

    const totalBudgetSum = trips.reduce((sum, t) => sum + (t.totalBudget || 0), 0);

    const totalSpentSum = trips.reduce((sum, t) => {
      const tripSpent = t.expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0;
      return sum + tripSpent;
    }, 0);

    const totalWaypointsSum = trips.reduce((sum, t) => sum + (t.itineraries?.length || 0), 0);

    return {
      totalWorkspaces,
      uniqueParticipantsCount: uniqueParticipants.size || 1,
      totalBudgetSum,
      totalSpentSum,
      totalWaypointsSum
    };
  }, [trips]);

  const mappedProjects = useMemo(() => {
    return trips.map((t) => {
      const basePos = getCoordinatesForDestination(t.destination, t.lat, t.lng);
      const identical = trips.filter(o => o.destination.toLowerCase().trim() === t.destination.toLowerCase().trim());
      const selfIndex = identical.findIndex(o => o.id === t.id);
      let left = basePos.left;
      let top = basePos.top;
      if (identical.length > 1) {
        const angle = (selfIndex * (2 * Math.PI)) / identical.length;
        left += Math.cos(angle) * 2;
        top  += Math.sin(angle) * 2;
      }
      left = Math.max(1, Math.min(99, left));
      top  = Math.max(1, Math.min(99, top));
      const spent = t.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const budget = t.totalBudget || 3000;
      return {
        ...t,
        left,
        top,
        spent,
        progressPercent: Math.min(100, Math.round((spent / budget) * 100)),
        membersCount: t.participants?.length || 1,
        itinerariesCount: t.itineraries?.length || 0,
      };
    });
  }, [trips]);

  // Find which trip to display in the hover HUD panel (ONLY when hovering over a node)
  const hudTrip = useMemo(() => {
    if (!hoveredTripId) return null;
    return mappedProjects.find(p => p.id === hoveredTripId) || null;
  }, [hoveredTripId, mappedProjects]);

  const handleDeleteProject = async () => {
    const confirmMsg = lang === "zh" 
      ? `🚨 警告：確定要永久刪除「${trip?.name}」這項協作專案嗎？此操作將使所有團員的通訊包、預算明細、離線定位數據永久消逝且不可復原！`
      : `🚨 WARNING: Are you sure you want to permanently delete workspace '${trip?.name}'? This deletes all co-travel chats, document vaults, budgets, and data for all participants and is non-reversible!`;
    if (window.confirm(confirmMsg)) {
      setIsDeleting(true);
      try {
        await onDeleteTrip(trip.id);
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onEditTripMeta({
        name: editName.trim(),
        destination: editDestination.trim(),
        totalBudget: Number(editBudget) || 3000,
        status: editStatus
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerTripSwitch = async (id: string) => {
    setSwitchingTo(id);
    onSwitchTrip(id);
    setTimeout(() => {
      setSwitchingTo(null);
    }, 850);
  };

  return (
    <div className="space-y-6">
      {/* ⚠️ Portal Sync Overlay feedback */}
      <AnimatePresence>
        {switchingTo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[999] pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center space-y-4 max-w-sm px-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-400/40 flex items-center justify-center text-blue-400 mx-auto animate-spin duration-[4000ms]">
                <ArrowRightLeft size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider font-sans">
                  {lang === "zh" ? "終端核心載入中" : "Calibrating Workspace"}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
                  {lang === "zh" 
                    ? "正在調閱與同步該協作目標之端到端加密通訊及支出預算單據..." 
                    : "Synchronizing cryptographic database shards and group channels..."}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Dashboard Welcome Header area */}
      <div className="bg-gradient-to-r from-blue-700/35 via-indigo-950/20 to-slate-950 border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-[40%] h-full opacity-5 bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:16px_16px] pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="space-y-1.5 flex-1 w-full max-w-xl">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold uppercase tracking-widest">
              <Shield size={11} />
              <span>{lang === "zh" ? "OdyShareSync 全域特工控制台" : "OdyShareSync Travel Portfolio Cockpit"}</span>
            </div>
            
            {isEditing ? (
              <form onSubmit={handleSaveMeta} className="space-y-3 pt-1 w-full">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
                      {lang === "zh" ? "專案名稱" : "Project Name"}
                    </span>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
                      {lang === "zh" ? "目的地 (可任意輸入任何地方)" : "Destination (Any Location)"}
                    </span>
                    <input
                      type="text"
                      value={editDestination}
                      onChange={(e) => setEditDestination(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                      required
                      placeholder="e.g. 宜蘭, 沖繩, 巴黎"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
                      {lang === "zh" ? "經費預算 (USD)" : "Budget ($)"}
                    </span>
                    <input
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(Number(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
                      {lang === "zh" ? "專案狀態" : "Project Status"}
                    </span>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer"
                    >
                      <option value="active">{lang === "zh" ? "Active (啟用中)" : "Active"}</option>
                      <option value="inactive">{lang === "zh" ? "Inactive (已停用 / 歸檔)" : "Inactive"}</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10.5px] font-extrabold transition uppercase tracking-wide cursor-pointer">
                    {lang === "zh" ? "儲存變更" : "Save Changes"}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-[10.5px] font-extrabold transition cursor-pointer">
                    {lang === "zh" ? "取消" : "Cancel"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>{lang === "zh" ? "歡迎回到系統控制台" : "OdyShareSync Command Center"}</span>
                  <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
                    SECURE PORTFOLIO
                  </span>
                </h2>
                <p className="text-[11.5px] text-zinc-400 font-medium leading-relaxed max-w-lg">
                  {lang === "zh" 
                    ? `您正在檢視跨專案全域整合資訊。點擊下方專案集隨時開拓、切換或在地圖上檢視各目標。當前選定之漫遊專案為「${trip?.name}」。`
                    : `You are looking at your complete travel portfolio. Click on any project node below or target pin on the interactive map to jump directly into its group workspace.`}
                </p>
              </>
            )}
          </div>

          {!isEditing && (
            <div className="flex gap-2 flex-wrap md:flex-nowrap flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 md:flex-initial px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-white/5 transition flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer"
              >
                <Edit size={12} className="text-blue-400" />
                <span>{lang === "zh" ? "快速修改此專案" : "Edit Active Trip"}</span>
              </button>

              <button
                onClick={handleDeleteProject}
                disabled={isDeleting || trips.length <= 1}
                className="flex-1 md:flex-initial px-3.5 py-2 bg-rose-950/20 hover:bg-rose-900 border border-rose-500/20 text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer"
              >
                <Trash2 size={12} />
                <span>{lang === "zh" ? "刪除此漫遊" : "Delete Current"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid cross-project aggregated statistics highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            title: lang === "zh" ? "團隊專案總數" : "Total Workspaces",
            value: `${aggregateStats.totalWorkspaces} ${lang === "zh" ? "組" : "Trips"}`,
            desc: lang === "zh" ? "使用者參與的所有專案" : "Aggregated total environments",
            color: "text-blue-400"
          },
          {
            title: lang === "zh" ? "共同協作特工 peers" : "Unique Companions",
            value: `${aggregateStats.uniqueParticipantsCount} ${lang === "zh" ? "位" : "Users"}`,
            desc: lang === "zh" ? "擁有一對密鑰的參與者" : "Co-travelers across all teams",
            color: "text-teal-400"
          },
          {
            title: lang === "zh" ? "跨專案預算累計" : "Portfolio Budget Limit",
            value: `$${aggregateStats.totalBudgetSum.toLocaleString()}`,
            desc: lang === "zh" ? "跨國行程序預留上限總和" : "Aggregated total spending caps",
            color: "text-amber-400"
          },
          {
            title: lang === "zh" ? "跨專案已登錄支出" : "Portfolio Spent Sum",
            value: `$${aggregateStats.totalSpentSum.toLocaleString()}`,
            desc: lang === "zh" ? "全部團隊共同記帳之累計" : "Logged expenses across all trips",
            color: "text-indigo-400"
          },
          {
            title: lang === "zh" ? "累積規劃航點總數" : "Total Active Waypoints",
            value: `${aggregateStats.totalWaypointsSum} ${lang === "zh" ? "點" : "Pins"}`,
            desc: lang === "zh" ? "各計畫精細地圖所標註" : "Global calculated itinerary items",
            color: "text-rose-400",
            hideOnMobile: true
          }
        ].map((stat, i) => (
          <div key={i} className={`bg-slate-900/45 border border-white/5 rounded-2xl p-4 space-y-1 ${stat.hideOnMobile ? 'hidden lg:block' : ''}`}>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {stat.title}
            </span>
            <h4 className={`text-xl font-black ${stat.color} font-mono`}>{stat.value}</h4>
            <p className="text-[9.5px] text-slate-500 font-medium truncate leading-none mt-0.5">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Premium Constellation World Map section + Hover frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Tactical Cyber Map View */}
        <div className="lg:col-span-2 bg-slate-950 border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl min-h-[400px] overflow-hidden relative">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] text-blue-400 font-mono font-bold tracking-widest uppercase block">
                🗺️ {lang === "zh" ? "全域協作專案世界地圖" : "All Projects Global World Map"}
              </span>
              <h3 className="text-xs font-black text-white mt-1">
                {lang === "zh" ? "標註所有行程目的，點擊節點即可快速切換控制台" : "Visualizing all project destinations on Earth. Click a node to instantly switch workspace."}
              </h3>
            </div>
            <span className="text-[9px] bg-slate-900 border border-white/5 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
              PORTFOLIO SCAN
            </span>
          </div>

          <div
            ref={cardContainerRef}
            onMouseMove={handleMouseMove}
            className="relative w-full select-none mt-4 rounded-xl border border-white/5 overflow-hidden bg-slate-950"
            style={{ aspectRatio: '2 / 1' }}
          >
            <img
              src={worldMapImg}
              alt="World Map"
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{
                objectFit: 'fill',
                filter: 'invert(1) brightness(0.35) sepia(1) hue-rotate(180deg) saturate(3)',
                opacity: 1
              }}
            />

            <svg
              viewBox="0 0 360 180"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full opacity-20 pointer-events-none select-none"
            >
              <line x1="0" y1="90" x2="360" y2="90" stroke="#475569" strokeWidth="0.5" />
              <line x1="0" y1="60" x2="360" y2="60" stroke="#334155" strokeWidth="0.4" strokeDasharray="2,4" />
              <line x1="0" y1="120" x2="360" y2="120" stroke="#334155" strokeWidth="0.4" strokeDasharray="2,4" />
              <line x1="180" y1="0" x2="180" y2="180" stroke="#475569" strokeWidth="0.5" />
            </svg>

            <div className="absolute left-2 text-[8px] font-mono text-slate-500/70 pointer-events-none"
              style={{ top: '33.3%', transform: 'translateY(-50%)' }}>30° N</div>
            <div className="absolute left-2 text-[8px] font-mono text-slate-400/80 pointer-events-none"
              style={{ top: '50%', transform: 'translateY(-50%)' }}>0° (Equator)</div>
            <div className="absolute left-2 text-[8px] font-mono text-slate-500/70 pointer-events-none"
              style={{ top: '66.7%', transform: 'translateY(-50%)' }}>30° S</div>

            <div className="absolute inset-0">
              {mappedProjects.map((p) => {
                const isHovered = hoveredTripId === p.id;
                const isActive = trip?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.left}%`, top: `${p.top}%`, zIndex: isActive ? 50 : 30 }}
                    onMouseEnter={() => setHoveredTripId(p.id)}
                    onMouseLeave={() => setHoveredTripId(null)}
                  >
                    <div className="relative flex items-center justify-center">
                      {isActive && (
                        <>
                          <div className="absolute w-12 h-12 rounded-full animate-ping border border-blue-500/40 bg-blue-500/10" style={{ pointerEvents: 'none' }} />
                          <div className="absolute w-7 h-7 rounded-full border border-blue-400/30" style={{ pointerEvents: 'none' }} />
                        </>
                      )}
                      {!isActive && isHovered && (
                        <div className="absolute w-7 h-7 rounded-full border border-indigo-400/30 bg-indigo-500/5 animate-pulse" style={{ pointerEvents: 'none' }} />
                      )}
                      <button
                        type="button"
                        onClick={() => handleTriggerTripSwitch(p.id)}
                        className={`w-3.5 h-3.5 rounded-full border transition-all shadow-xl flex items-center justify-center cursor-pointer ${
                          isActive
                            ? "bg-blue-500 border-white scale-125 shadow-blue-500/50"
                            : "bg-indigo-600 border-slate-900 hover:scale-110 hover:bg-indigo-500 hover:border-white"
                        }`}
                        title={p.name}
                      >
                        <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-white' : 'bg-slate-200'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Dynamic HUD GPS Telemetry Panel (Follows mouse cursor and clamped inside map bounds) */}
            {hudTrip && (
              <div 
                className="absolute w-[220px] md:w-[240px] bg-slate-950/95 backdrop-blur-[8px] border border-white/15 p-3.5 rounded-xl shadow-2xl z-50 text-[11px] text-slate-300 pointer-events-none select-none transition-transform duration-75 ease-out animate-in fade-in zoom-in-95"
                style={{
                  ...getTooltipStyle(),
                }}
              >
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="font-extrabold text-white text-[11px] leading-none truncate max-w-[130px] flex items-center gap-1">
                    🌐 {hudTrip.name}
                  </span>
                  <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold leading-none ${
                    trip?.id === hudTrip.id ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400' : 'bg-slate-900 border border-white/5 text-slate-400'
                  }`}>
                    {trip?.id === hudTrip.id ? (lang === "zh" ? '當前啟用' : 'Active') : (lang === "zh" ? '可點擊切換' : 'Jump')}
                  </span>
                </div>

                <div className="space-y-1.5 mt-2.5">
                  <p className="text-[10px] text-indigo-300 font-medium">
                    📍 {lang === "zh" ? "漫遊站點：" : "Destination: "} <span className="font-extrabold text-white">{hudTrip.destination}</span>
                  </p>
                  
                  <p className="text-slate-400 font-mono flex justify-between">
                    <span>👥 {lang === "zh" ? "協作人數" : "Operators"}:</span>
                    <span className="text-slate-300 font-bold">{hudTrip.membersCount} {lang === "zh" ? "員" : "Peers"}</span>
                  </p>

                  <p className="text-slate-400 font-mono flex justify-between">
                    <span>📅 {lang === "zh" ? "旅行日期" : "Duration"}:</span>
                    <span className="text-slate-300 font-bold text-[9px]">{hudTrip.startDate} ~ {hudTrip.endDate}</span>
                  </p>

                  {/* Progress spending bar spent/budget */}
                  <div className="space-y-1 pt-1.5 border-t border-white/5">
                    <div className="flex justify-between text-[9px] font-bold font-mono">
                      <span className="text-amber-400">💸 {lang === "zh" ? "累計花費:" : "Spent:"} ${hudTrip.spent}</span>
                      <span className="text-slate-400">/ ${hudTrip.totalBudget}</span>
                    </div>
                    <div className="w-full bg-slate-900/80 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          hudTrip.progressPercent > 80 ? 'bg-red-500' : hudTrip.progressPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${hudTrip.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Project Selector List Quick Jump */}
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
              📁 {lang === "zh" ? "協作專案集合集" : "Project Collections"}
            </span>
            <h4 className="text-xs text-slate-400 font-medium">
              {lang === "zh" ? "點擊切換當前漫遊目標" : "Quickly switch active workspace"}
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[250px] pr-1.5 scrollbar-none">
            {mappedProjects.map((t) => {
              const isActive = trip?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTriggerTripSwitch(t.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                    isActive 
                      ? "bg-blue-600/10 border-blue-500/80 text-white shadow-lg" 
                      : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/15 hover:bg-slate-950/60"
                  }`}
                >
                  <div className="truncate pr-2 w-full">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-black truncate ${isActive ? "text-blue-400" : "text-white"}`}>
                        {t.name}
                      </p>
                      {isActive ? (
                        <span className="text-[8px] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-1 py-0.2 rounded shrink-0">
                          {t.status === "inactive" ? (lang === "zh" ? "當前啟用 (已停用)" : "ACTIVE (INACTIVE)") : (lang === "zh" ? "當前啟用" : "ACTIVE")}
                        </span>
                      ) : (
                        <span className={`text-[8px] px-1 py-0.2 rounded shrink-0 border ${
                          t.status === "inactive" 
                            ? "bg-slate-800/20 border-slate-700 text-slate-500" 
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}>
                          {t.status === "inactive" ? (lang === "zh" ? "已停用" : "INACTIVE") : (lang === "zh" ? "啟用中" : "ACTIVE")}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-sans">
                      📍 {t.destination || "Tokyo, Japan"}
                    </p>

                    <div className="flex justify-between text-[8.5px] text-slate-500 font-mono mt-1.5 border-t border-white/5 pt-1">
                      <span>👤 {t.membersCount} {lang === "zh" ? "位成員" : "peers"}</span>
                      <span>💸 ${t.spent} / ${t.totalBudget}</span>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-500 shrink-0 select-none ml-1" />
                </button>
              );
            })}
          </div>

          <button
            onClick={onCreateTrip}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wide"
          >
            <Plus size={14} />
            <span>{lang === "zh" ? "開拓新漫遊專案" : "Create New Trip"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
