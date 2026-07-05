import React, { useMemo, useState, useCallback } from "react";
import { ArrowRightLeft, Trash2, Edit, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Trip, TripSummary } from "../types";
import { MAP_BOUNDS } from "../lib/constants";
import { AggregateStatsRow } from "./dashboard/AggregateStatsRow";
import { TripMetaEditForm } from "./dashboard/TripMetaEditForm";
import { ProjectListPanel } from "./dashboard/ProjectListPanel";
import { WorldMapPanel } from "./dashboard/WorldMapPanel";
import { ConfirmModal } from "./common/ConfirmModal";

export type DashboardTrip = TripSummary;


interface TripDashboardProps {
  trip: Trip;
  trips: DashboardTrip[];
  lang: "zh" | "en";
  onSwitchTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onEditTripMeta: (updatedData: { name: string; destination: string; totalBudget: number; status?: "active" | "inactive" }) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
}

export function gpsToPercent(lat: number, lng: number): { left: number; top: number } {
  const clampedLat = Math.max(MAP_BOUNDS.LAT_MIN, Math.min(MAP_BOUNDS.LAT_MAX, Number(lat)));
  const clampedLng = Math.max(MAP_BOUNDS.LON_MIN, Math.min(MAP_BOUNDS.LON_MAX, Number(lng)));
  return {
    left: ((clampedLng - MAP_BOUNDS.LON_MIN) / (MAP_BOUNDS.LON_MAX - MAP_BOUNDS.LON_MIN)) * 100,
    top:  ((MAP_BOUNDS.LAT_MAX - clampedLat) / (MAP_BOUNDS.LAT_MAX - MAP_BOUNDS.LAT_MIN)) * 100,
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
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const aggregateStats = useMemo(() => {
    const totalWorkspaces = trips.length;
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
      const left = Math.max(1, Math.min(99, basePos.left));
      const top  = Math.max(1, Math.min(99, basePos.top));
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

  const groupedPins = useMemo(() => {
    const groups: { [key: string]: typeof mappedProjects } = {};
    mappedProjects.forEach(p => {
      const key = p.destination.toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(p);
    });

    return Object.keys(groups).map((key) => {
      const list = groups[key];
      const hasActive = list.some(o => trip?.id === o.id);
      const activeItem = list.find(o => trip?.id === o.id) || list[0];
      return {
        key,
        destinationName: activeItem.destination,
        left: activeItem.left,
        top: activeItem.top,
        trips: list,
        hasActive,
        id: activeItem.id
      };
    });
  }, [mappedProjects, trip]);

  const handleDeleteProject = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const performDeleteProject = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDeleteTrip(trip.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  }, [trip?.id, onDeleteTrip]);

  const handleSaveMeta = useCallback(async (updatedData: { name: string; destination: string; totalBudget: number; status?: "active" | "inactive" }) => {
    try {
      await onEditTripMeta(updatedData);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  }, [onEditTripMeta]);

  const handleTriggerTripSwitch = useCallback(async (id: string) => {
    setSwitchingTo(id);
    onSwitchTrip(id);
    setTimeout(() => {
      setSwitchingTo(null);
    }, 850);
  }, [onSwitchTrip]);

  return (
    <div id="trip-dashboard-root" className="space-y-6">
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
              <TripMetaEditForm 
                trip={trip} 
                lang={lang} 
                onSave={handleSaveMeta} 
                onCancel={() => setIsEditing(false)} 
              />
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
                id="btn-edit-active-trip"
                onClick={() => setIsEditing(true)}
                className="flex-1 md:flex-initial px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-white/5 transition flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer"
              >
                <Edit size={12} className="text-blue-400" />
                <span>{lang === "zh" ? "快速修改此專案" : "Edit Active Trip"}</span>
              </button>

              <button
                id="btn-delete-active-trip"
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
      <AggregateStatsRow aggregateStats={aggregateStats} lang={lang} />

      {/* Premium Constellation World Map section + Hover frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-[repeat(3,minmax(0,1fr))] gap-6">
        <WorldMapPanel 
          groupedPins={groupedPins} 
          activeTripId={trip.id} 
          trip={trip} 
          lang={lang} 
          onSwitchTrip={handleTriggerTripSwitch} 
        />
        <ProjectListPanel 
          trips={mappedProjects} 
          activeTripId={trip.id} 
          lang={lang} 
          onSwitch={handleTriggerTripSwitch} 
          onCreateTrip={onCreateTrip} 
        />
      </div>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={lang === "zh" ? "確認刪除專案" : "Delete Project Workspace"}
        message={
          lang === "zh" 
            ? `確定要永久刪除「${trip?.name}」這項協作專案嗎？此操作將使所有團員的通訊包、預算明細、離線定位數據永久消逝且不可復原！`
            : `Are you sure you want to permanently delete workspace '${trip?.name}'? This deletes all co-travel chats, document vaults, budgets, and data for all participants and is non-reversible!`
        }
        confirmText={lang === "zh" ? "確認刪除" : "Confirm Delete"}
        cancelText={lang === "zh" ? "取消" : "Cancel"}
        onConfirm={performDeleteProject}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
