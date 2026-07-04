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
                    ? `📅 ${lang === "zh" ? "日程安排" : "Itinerary Plan"}`
                    : `📍 ${lang === "zh" ? "自訂探針" : "Custom Drop"}`}
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
                  {routeMeta.mode === "WALKING"
                    ? lang === "zh" ? "步行路徑" : "Walk Path"
                    : lang === "zh" ? "自駕路徑" : "Drive Path"}
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
                {lang === "zh"
                  ? "💡 請先點選左上角「獲得實時 GPS 定位」解鎖導航路徑"
                  : "💡 Click 'Get Live GPS Location' on left to unlock dynamic pathing"}
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
            <span className="text-[10px] text-slate-500 font-mono">
              [{activeItem.coordinates?.x}, {activeItem.coordinates?.y}]
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                {lang === "zh" ? "航點標題 / 活動" : "Landmark Name"}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 p-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder={lang === "zh" ? "輸入標題..." : "E.g., Tokyo Sea-Tac Plaza"}
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                {lang === "zh" ? "詳細地址 / 位置" : "Map Address"}
              </label>
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
              <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                {lang === "zh" ? "航點說明" : "Description / Notes"}
              </label>
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
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">
                  {lang === "zh" ? "出發時間" : "Time"}
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
                  {lang === "zh" ? "預算 ($)" : "Budget ($)"}
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
                  {lang === "zh" ? "哪一天" : "Day Number"}
                </label>
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
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">
                  {lang === "zh" ? "活動分類" : "Category"}
                </label>
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

            {activeItem.id && isItineraryItem(activeItem.id) ? (
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
  );
}
