import React from "react";
import { Navigation } from "lucide-react";
import { motion } from "motion/react";
import { isItineraryItem } from "../../lib/constants";

interface MapNodeEditorProps {
  lang: "zh" | "en";
  t: any;
  activeItem: any;
  setActiveItem: (item: any) => void;
  isEditingActiveItem: boolean;
  setIsEditingActiveItem: (val: boolean) => void;
  isNavigating: boolean;
  startSimulatedNavigation: () => void;
  routeLoading: boolean;
  currentGeoLocation: any;
  fetchGoogleRoute: (mode: "WALKING" | "DRIVE") => void;
  routeMeta: any;
  getPublicTransitUrl: () => string;
  routeError: string | null;
  handleDeleteOrCreateNode: () => void;
  
  // Edit form state & setters
  editTitle: string;
  setEditTitle: (val: string) => void;
  editLocation: string;
  setEditLocation: (val: string) => void;
  editDesc: string;
  setEditDesc: (val: string) => void;
  editTime: string;
  setEditTime: (val: string) => void;
  editCost: number;
  setEditCost: (val: number) => void;
  editDay: number;
  setEditDay: (val: number) => void;
  editCategory: "sight" | "food" | "hotel";
  setEditCategory: (val: "sight" | "food" | "hotel") => void;

  // Actions
  handleUpdateExistingItineraryPlan: () => void;
  handleUpdateCustomPinOnly: () => void;
  handleSaveToItineraryPlan: () => void;
}

export function MapNodeEditor({
  lang,
  t,
  activeItem,
  setActiveItem,
  isEditingActiveItem,
  setIsEditingActiveItem,
  isNavigating,
  startSimulatedNavigation,
  routeLoading,
  currentGeoLocation,
  fetchGoogleRoute,
  routeMeta,
  getPublicTransitUrl,
  routeError,
  handleDeleteOrCreateNode,
  editTitle,
  setEditTitle,
  editLocation,
  setEditLocation,
  editDesc,
  setEditDesc,
  editTime,
  setEditTime,
  editCost,
  setEditCost,
  editDay,
  setEditDay,
  editCategory,
  setEditCategory,
  handleUpdateExistingItineraryPlan,
  handleUpdateCustomPinOnly,
  handleSaveToItineraryPlan,
}: MapNodeEditorProps) {
  if (!activeItem) return null;

  return (
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
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeItem.id && isItineraryItem(activeItem.id)
                    ? `📅 ${t.mapItineraryPlan}`
                    : `📍 ${t.mapCustomDrop}`}
                </span>
                {activeItem.time && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded font-bold text-amber-300 font-mono">
                    🕒 {activeItem.time}
                  </span>
                )}
                {activeItem.cost > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded font-bold text-emerald-400 font-mono">
                    💰 ${activeItem.cost}
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-white truncate">{activeItem.title}</h4>
              {activeItem.locationName && activeItem.locationName !== activeItem.title && (
                <p className="text-[11px] text-slate-400 font-medium truncate">📍 {activeItem.locationName}</p>
              )}
              <p className="text-xs text-slate-400 leading-normal line-clamp-2">
                {activeItem.description || "Scenic location tracking pinpoint"}
              </p>
            </div>
            <div className="shrink-0 pl-2 space-y-2">
              <button
                type="button"
                onClick={startSimulatedNavigation}
                disabled={isNavigating}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-1.8 px-3 rounded-lg transition-all cursor-pointer disabled:bg-blue-900/50"
              >
                <Navigation size={11} className={isNavigating ? "animate-spin" : ""} />
                <span>{isNavigating ? t.mapNavigatingStatus : t.cooperativeDrive}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditingActiveItem(true)}
                className="w-full block text-center bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-1.8 px-3 rounded-lg transition cursor-pointer"
              >
                ✏️ {t.editNode}
              </button>
            </div>
          </div>

          {/* Google Routes API Live Routing Panel */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-extrabold tracking-wider uppercase flex items-center gap-1">
                🗺️ {t.mapRoutePlanning}
              </span>
              {routeLoading && (
                <span className="text-xs text-blue-400 animate-pulse font-mono">
                  {t.routeCalculating}
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
                <span>{t.shortestWalk}</span>
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
                <span>{t.drivingRoute}</span>
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
                <span>{t.publicTransit}</span>
              </a>
            </div>

            {/* Display route duration & distance */}
            {routeMeta && (
              <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/15 rounded-lg px-2.5 py-1.5 text-xs">
                <span className="text-blue-300 font-bold flex items-center gap-1">
                  {routeMeta.mode === "WALKING" ? "🚶‍♂️ " : "🚗 "}
                  {routeMeta.mode === "WALKING"
                    ? t.mapWalkPath
                    : t.mapDrivePath}
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
                {t.mapGpsHint}
              </p>
            )}
          </div>

          {/* Actions Bar */}
          <div className="flex gap-2 pt-2 border-t border-white/5 text-xs font-bold justify-between">
            {activeItem.id && isItineraryItem(activeItem.id) ? (
              // Itinerary item deletion
              <button
                type="button"
                onClick={handleDeleteOrCreateNode}
                className="px-3 py-1.5 bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 rounded-lg hover:text-white transition cursor-pointer flex items-center gap-1.5"
              >
                🗑️ {t.mapDeletePlan}
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
                  💾 {t.saveToSchedule}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrCreateNode}
                  className="px-3 py-1.5 bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 rounded-lg hover:text-white transition cursor-pointer flex items-center gap-1"
                >
                  ❌ {t.removePin}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-350 hover:text-white rounded-lg transition cursor-pointer"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      ) : (
        // EDIT & SAVE MODE FORM
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <h4 className="font-extrabold text-xs text-amber-400 font-mono tracking-wide uppercase">
              🔧 {t.mapEditLandmark}
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              [{activeItem.coordinates?.x}, {activeItem.coordinates?.y}]
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                {t.mapLandmarkName}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder={t.mapTitlePlaceholder}
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                {t.mapAddressLabel}
              </label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none"
                placeholder={t.mapAddressPlaceholder}
              />
              {activeItem?.lat !== undefined && activeItem?.lng !== undefined && (
                <p className="text-[10px] mt-1 text-slate-400 font-mono">
                  📍 {t.mapCoordinatesLabel}: {activeItem.lat.toFixed(6)}, {activeItem.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                {t.mapDescLabel}
              </label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none leading-normal"
                placeholder={t.mapDescPlaceholder}
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">
                  {t.mapTimeLabel}
                </label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 p-1 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">
                  {t.mapBudgetLabel}
                </label>
                <input
                  type="number"
                  value={editCost}
                  onChange={(e) => setEditCost(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-white/10 p-1 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">
                  {t.mapDayLabel}
                </label>
                <select
                  value={editDay}
                  onChange={(e) => setEditDay(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 p-1 rounded text-xs text-white"
                >
                  <option value={0}>{t.mapDayOption1}</option>
                  <option value={1}>{t.mapDayOption2}</option>
                  <option value={2}>{t.mapDayOption3}</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">
                  {t.mapCategoryLabel}
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 p-1 rounded text-xs text-white"
                >
                  <option value="sight">🏞️ {t.mapSightOption}</option>
                  <option value="food">🍴 {t.mapFoodOption}</option>
                  <option value="hotel">🏨 {t.mapHotelOption}</option>
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
              ↩️ {t.backBtn}
            </button>

            {activeItem.id && isItineraryItem(activeItem.id) ? (
              <button
                type="button"
                onClick={handleUpdateExistingItineraryPlan}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer"
              >
                💾 {t.mapUpdateDestination}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleUpdateCustomPinOnly}
                  className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-350 border border-amber-500/25 rounded-lg transition cursor-pointer"
                >
                  ✏️ {t.mapRenamePinOnly}
                </button>
                <button
                  type="button"
                  onClick={handleSaveToItineraryPlan}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer"
                >
                  💾 {t.mapInsertToItinerary}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
