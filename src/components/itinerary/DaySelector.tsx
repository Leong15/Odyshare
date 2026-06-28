import React, { useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { ItineraryItem } from "../../types";
import { translations } from "../../lib/translations";

interface DaySelectorProps {
  totalDays: number;
  activeDay: number;
  itineraries: ItineraryItem[];
  lang: "en" | "zh";
  onSelectDay: (day: number) => void;
  onAddDay: () => void;
  onDeleteDay: () => void;
}

export default function DaySelector({
  totalDays,
  activeDay,
  itineraries,
  lang,
  onSelectDay,
  onAddDay,
  onDeleteDay,
}: DaySelectorProps) {
  const t = translations[lang];
  const dayTabsScrollRef = useRef<HTMLDivElement>(null);
  const daysToShow = Array.from({ length: totalDays }, (_, i) => i);

  const scrollDayTabs = (direction: "left" | "right") => {
    if (dayTabsScrollRef.current) {
      const scrollAmount = 180;
      dayTabsScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const scrollTabToCenter = () => {
      if (dayTabsScrollRef.current) {
        const activeTabEl = document.getElementById(`day-tab-${activeDay}`);
        if (activeTabEl) {
          const container = dayTabsScrollRef.current;
          const containerWidth = container.offsetWidth;
          const tabWidth = activeTabEl.offsetWidth;
          const tabOffsetLeft = activeTabEl.offsetLeft;

          const targetScrollLeft = tabOffsetLeft - containerWidth / 2 + tabWidth / 2;

          container.scrollTo({
            left: targetScrollLeft,
            behavior: "smooth",
          });
        }
      }
    };

    scrollTabToCenter();
    const timeoutId = setTimeout(scrollTabToCenter, 60);
    return () => clearTimeout(timeoutId);
  }, [activeDay, totalDays]);

  return (
    <div className="col-span-12 md:col-span-3 flex flex-col gap-5 md:sticky md:top-24 w-full max-w-full overflow-hidden">
      {/* Title / Heading */}
      <div className="hidden md:block pb-2.5 border-b border-white/10 text-left">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Calendar size={13} className="text-slate-400" />
          <span>{lang === "zh" ? "旅程日程" : "Trip Days"}</span>
        </h3>
        <p className="text-[11px] text-slate-500 mt-1.5">
          {totalDays} {lang === "zh" ? "天計畫" : "Days Planned"} • {itineraries.length} {lang === "zh" ? "個活動" : "Activities"}
        </p>
      </div>

      {/* Mobile: Horizontal Scrollable Tabs */}
      <div className="flex md:hidden items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md min-w-0 relative w-full overflow-hidden">
        <button
          type="button"
          onClick={() => scrollDayTabs("left")}
          className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          title={lang === "zh" ? "向左滾動" : "Scroll left"}
        >
          <ChevronLeft size={14} />
        </button>

        <div
          ref={dayTabsScrollRef}
          className="relative flex items-center gap-1.5 overflow-x-auto scroller-none scrollbar-none scroll-smooth whitespace-nowrap flex-1 py-1"
        >
          {daysToShow.map((dayIdx) => {
            const itemCount = itineraries.filter((item) => item.dayIndex === dayIdx).length;
            return (
              <button
                key={dayIdx}
                id={`day-tab-${dayIdx}`}
                onClick={() => onSelectDay(dayIdx)}
                className={`px-3.5 py-2 font-bold rounded-xl cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 text-xs shrink-0 flex items-center gap-1.5 h-12 md:h-auto ${
                  activeDay === dayIdx
                    ? "bg-blue-600 text-white shadow-sm font-extrabold"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>
                  {t.day} {dayIdx + 1}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                    activeDay === dayIdx ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
                  }`}
                >
                  {itemCount}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollDayTabs("right")}
          className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          title={lang === "zh" ? "向右滾動" : "Scroll right"}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Desktop: Vertical Sidebar List */}
      <div className="hidden md:flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
        {daysToShow.map((dayIdx) => {
          const itemCount = itineraries.filter((item) => item.dayIndex === dayIdx).length;
          return (
            <button
              key={dayIdx}
              onClick={() => onSelectDay(dayIdx)}
              className={`w-full px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 text-left flex items-center justify-between border ${
                activeDay === dayIdx
                  ? "bg-blue-600/10 text-blue-300 border-blue-500/40 shadow-sm font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <span className="text-xs font-semibold">
                {t.day} {dayIdx + 1} {lang === "zh" ? "天" : ""}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeDay === dayIdx ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-slate-400"
                }`}
              >
                {itemCount} {lang === "zh" ? "項目" : "items"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add/Remove Day Buttons */}
      <div className="flex items-center gap-2 w-full">
        <button
          type="button"
          onClick={onAddDay}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/30 text-blue-300 font-bold rounded-xl cursor-pointer transition-all text-xs shadow-sm h-11"
          title={lang === "zh" ? "增加天數" : "Add Day"}
        >
          <Plus size={14} className="shrink-0" />
          <span>{lang === "zh" ? "加天" : "Add"}</span>
        </button>

        {totalDays > 1 && (
          <button
            type="button"
            onClick={onDeleteDay}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 hover:border-rose-500/25 text-rose-400 font-bold rounded-xl cursor-pointer transition-all text-xs shadow-sm h-11"
            title={lang === "zh" ? "刪除目前這一天所有行程並移除此天" : "Delete active day and shift schedule"}
          >
            <Trash2 size={13} className="shrink-0" />
            <span>{lang === "zh" ? "刪天" : "Del"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
