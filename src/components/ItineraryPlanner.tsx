import React, { useState, useEffect, useRef } from "react";
import { Sparkles, RefreshCw, ChevronLeft, ChevronRight, Plus, Map, Route } from "lucide-react";
import { ItineraryItem, Participant } from "../types";
import { translations } from "../lib/translations";

import DaySelector from "./itinerary/DaySelector";
import ItineraryItemCard from "./itinerary/ItineraryItemCard";
import AddActivityForm from "./itinerary/AddActivityForm";
import AISidebarPanel from "./itinerary/AISidebarPanel";

interface ItineraryPlannerProps {
  itineraries: ItineraryItem[];
  participants: Participant[];
  currentUser: string;
  onVoteItinerary: (itemId: string) => void;
  onCommentItinerary: (itemId: string, text: string) => void;
  onAddItineraryItem: (item: Omit<ItineraryItem, "id" | "votes" | "comments" | "coordinates" | "trafficStatus">) => void;
  lang?: "en" | "zh";
  onApplyAIOptimization?: (optimizedItems: any[]) => void;
  onPostAISystemMessage?: (text: string) => void;
  backupItineraries?: ItineraryItem[];
  onRestoreItineraries?: () => void;
  onDeleteItineraryItem?: (itemId: string) => void;
  onUpdateItineraryItem?: (item: ItineraryItem) => void;
}

export default function ItineraryPlanner({
  itineraries,
  participants,
  currentUser,
  onVoteItinerary,
  onCommentItinerary,
  onAddItineraryItem,
  lang = "en",
  onApplyAIOptimization,
  onPostAISystemMessage,
  backupItineraries = [],
  onRestoreItineraries,
  onDeleteItineraryItem,
  onUpdateItineraryItem,
}: ItineraryPlannerProps) {
  const t = translations[lang];

  // Coordination-level state
  const [activeDay, setActiveDay] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeCommentDrawerId, setActiveCommentDrawerId] = useState<string | null>(null);

  const maxItineraryDay = itineraries.reduce((max, item) => Math.max(max, item.dayIndex), 0);
  const [totalDays, setTotalDays] = useState<number>(() => Math.max(3, maxItineraryDay + 1));

  useEffect(() => {
    const maxIdx = itineraries.reduce((max, item) => Math.max(max, item.dayIndex), 0);
    if (maxIdx >= totalDays) {
      setTotalDays(maxIdx + 1);
    }
  }, [itineraries]);

  const filteredItems = React.useMemo(() => {
    return itineraries
      .filter((item) => item.dayIndex === activeDay)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [itineraries, activeDay]);

  const handleMoveItem = async (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= filteredItems.length) return;

    const itemA = filteredItems[idx];
    const itemB = filteredItems[targetIdx];
    const tempTime = itemA.time;

    if (onUpdateItineraryItem) {
      await onUpdateItineraryItem({
        ...itemA,
        time: itemB.time,
      });
      await onUpdateItineraryItem({
        ...itemB,
        time: tempTime,
      });
    }
  };

  const handleDeleteDay = async () => {
    if (onDeleteItineraryItem) {
      const itemsOnDay = itineraries.filter((item) => item.dayIndex === activeDay);
      for (const item of itemsOnDay) {
        await onDeleteItineraryItem(item.id);
      }
      const subsequentItems = itineraries.filter((item) => item.dayIndex > activeDay);
      for (const item of subsequentItems) {
        if (onUpdateItineraryItem) {
          await onUpdateItineraryItem({
            ...item,
            dayIndex: item.dayIndex - 1,
          });
        }
      }
    }
    setTotalDays((prev) => Math.max(1, prev - 1));
    setActiveDay((prev) => Math.max(0, Math.min(totalDays - 2, prev)));
    setActiveCommentDrawerId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[repeat(3,minmax(0,1fr))] gap-6">
      {/* List Itineraries */}
      <div className={`${isSidebarOpen ? "lg:col-span-2" : "lg:col-span-3"} space-y-4 transition-all duration-300`}>
        {backupItineraries && backupItineraries.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs animate-fadeIn text-amber-200 gap-2.5 shadow-md">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="flex items-center gap-1.5 flex-wrap">
                <Sparkles size={13} className="text-amber-300 animate-pulse shrink-0" />
                <span>
                  {lang === "zh"
                    ? "OdyShareSmart AI 已成功進行網關日程智慧優化！如果您或其他組員不滿意，可隨時還原至優化前的項目配置。"
                    : "OdyShareSmart AI has optimized details! If you or others dislike this setup, feel free to restore original elements."}
                </span>
              </span>
            </div>
            <button
              onClick={onRestoreItineraries}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg border border-amber-500/30 transition cursor-pointer flex items-center gap-1 shrink-0 text-xs"
            >
              <RefreshCw size={11} className="shrink-0" />
              <span>{lang === "zh" ? "還原至舊版行程" : "Restore original"}</span>
            </button>
          </div>
        )}

        <div
          id="itinerary-timeline-container"
          className="glass-container rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl flex flex-col h-full min-h-[500px] w-full max-w-full overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start w-full max-w-full overflow-hidden">
            {/* Day Selector Sidebar */}
            <DaySelector
              totalDays={totalDays}
              activeDay={activeDay}
              itineraries={itineraries}
              lang={lang}
              onSelectDay={(day) => {
                setActiveDay(day);
                setActiveCommentDrawerId(null);
              }}
              onAddDay={() => {
                setTotalDays((prev) => prev + 1);
                setActiveDay(totalDays);
                setActiveCommentDrawerId(null);
              }}
              onDeleteDay={handleDeleteDay}
            />

            {/* Right Panel: Itinerary Main Contents */}
            <div className="col-span-12 md:col-span-9 space-y-6 w-full max-w-full overflow-hidden">
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-white/5 text-left">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight leading-none">
                    {lang === "zh" ? `第 ${activeDay + 1} 天 行程清單` : `Day ${activeDay + 1} Timeline`}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {filteredItems.length} {lang === "zh" ? "個選定活動景點" : "selected activities"}
                  </p>
                </div>

                {/* Other Actions Group (Map, Sidebar, Add Activity) */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !showMap;
                      setShowMap(nextState);
                      if (nextState) {
                        setIsSidebarOpen(true);
                      }
                    }}
                    className={`flex items-center gap-1.5 font-semibold py-2 px-3 rounded-xl cursor-pointer transition-all text-xs border shadow-sm shrink-0 h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      showMap
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                    }`}
                    title={lang === "zh" ? "切換地圖檢視模式" : "Toggle Split Map View"}
                    aria-label={lang === "zh" ? "切換地圖檢視模式" : "Toggle Split Map View"}
                  >
                    <Map size={13} className="shrink-0" />
                    <span>{lang === "zh" ? "地圖" : "Map"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`flex items-center gap-1.5 font-semibold py-2 px-3 rounded-xl cursor-pointer transition-all text-xs border shadow-sm shrink-0 h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isSidebarOpen
                        ? "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25"
                        : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                    }`}
                    title={lang === "zh" ? "顯示或隱藏 AI 與討論板側邊欄" : "Toggle AI & Chat sidebar"}
                    aria-label={lang === "zh" ? "顯示或隱藏 AI 與討論板側邊欄" : "Toggle AI & Chat sidebar"}
                  >
                    {isSidebarOpen ? (
                      <ChevronRight size={13} className="shrink-0" />
                    ) : (
                      <ChevronLeft size={13} className="shrink-0" />
                    )}
                    <span>{lang === "zh" ? "討論" : "Chat"}</span>
                  </button>

                  <button
                    id="add-itinerary-trigger"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1.5 glass-button-primary text-white font-semibold py-2 px-3.5 rounded-xl cursor-pointer shrink-0 text-xs shadow-sm h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    title={lang === "zh" ? "新增每日行程活動" : "Add daily activity"}
                    aria-label={lang === "zh" ? "新增每日行程活動" : "Add daily activity"}
                  >
                    <Plus size={14} /> {t.addDailyActivity}
                  </button>
                </div>
              </div>

              {/* Add Activity Form Overlay */}
              {showAddForm && (
                <AddActivityForm
                  activeDay={activeDay}
                  lang={lang}
                  onSubmit={(item) => onAddItineraryItem(item)}
                  onClose={() => setShowAddForm(false)}
                />
              )}

              {/* Activities list timeline view */}
              <div className="space-y-6 relative before:absolute before:left-[18px] md:before:left-[36px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                {filteredItems.length === 0 ? (
                  <div className="py-20 text-center bg-white/3 rounded-2xl border border-dashed border-white/5 p-4 pl-0 md:pl-16">
                    <p className="text-xs text-slate-400">{t.noCustomPosts}</p>
                  </div>
                ) : (
                  filteredItems.map((item, idx) => (
                    <ItineraryItemCard
                      key={item.id}
                      item={item}
                      participants={participants}
                      currentUser={currentUser}
                      isActive={activeCommentDrawerId === item.id}
                      lang={lang}
                      onVote={() => onVoteItinerary(item.id)}
                      onComment={(itemId) => {
                        setActiveCommentDrawerId(itemId);
                        setIsSidebarOpen(true);
                      }}
                      onDelete={() => onDeleteItineraryItem && onDeleteItineraryItem(item.id)}
                      onEdit={(updatedItem) => onUpdateItineraryItem && onUpdateItineraryItem(updatedItem)}
                      onMoveUp={() => handleMoveItem(idx, "up")}
                      onMoveDown={() => handleMoveItem(idx, "down")}
                      isFirst={idx === 0}
                      isLast={idx === filteredItems.length - 1}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Drawer comments & AI assistant sidebar */}
      {isSidebarOpen && (
        <div className="lg:col-span-1">
          <AISidebarPanel
            lang={lang}
            itineraries={itineraries}
            activeDay={activeDay}
            showMap={showMap}
            filteredItems={filteredItems}
            participants={participants}
            currentUser={currentUser}
            activeCommentDrawerId={activeCommentDrawerId}
            setActiveCommentDrawerId={setActiveCommentDrawerId}
            onApplyAIOptimization={onApplyAIOptimization}
            onPostAISystemMessage={onPostAISystemMessage}
            onAddItineraryItem={onAddItineraryItem}
            onCommentItinerary={onCommentItinerary}
          />
        </div>
      )}
    </div>
  );
}
