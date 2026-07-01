import React, { useState, useMemo } from "react";
import { Search, X, ChevronRight, Plus } from "lucide-react";

export interface MappedProject {
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
  left: number;
  top: number;
  spent: number;
  progressPercent: number;
  membersCount: number;
  itinerariesCount: number;
}

interface ProjectListPanelProps {
  trips: MappedProject[];
  activeTripId: string;
  lang: "zh" | "en";
  onSwitch: (id: string) => void;
  onCreateTrip: () => void;
}

export function ProjectListPanel({
  trips,
  activeTripId,
  lang,
  onSwitch,
  onCreateTrip
}: ProjectListPanelProps) {
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return trips;
    const q = projectSearchQuery.toLowerCase().trim();
    return trips.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.destination?.toLowerCase().includes(q)
    );
  }, [projectSearchQuery, trips]);

  return (
    <div id="project-list-panel" className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl space-y-4">
      <div className="space-y-1">
        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
          📁 {lang === "zh" ? "協作專案集合集" : "Project Collections"}
        </span>
        <h4 className="text-xs text-slate-400 font-medium">
          {lang === "zh" ? "點擊切換當前漫遊目標" : "Quickly switch active workspace"}
        </h4>
      </div>

      {/* Autocomplete Search input */}
      <div className="relative">
        <div className="relative flex items-center bg-slate-950/60 rounded-xl border border-white/10 px-3 py-2 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
          <Search size={14} className="text-slate-400 shrink-0 mr-2" />
          <input
            id="project-search-input"
            type="text"
            value={projectSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              // Small timeout to allow suggestion click events to register
              setTimeout(() => setIsSearchFocused(false), 200);
            }}
            onChange={(e) => setProjectSearchQuery(e.target.value)}
            placeholder={lang === "zh" ? "搜尋漫遊專案或目的地..." : "Search project or destination..."}
            className="bg-transparent text-xs text-white placeholder-slate-500 w-full focus:outline-none"
          />
          {projectSearchQuery && (
            <button
              id="clear-project-search"
              type="button"
              onClick={() => setProjectSearchQuery("")}
              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Auto-complete Suggestions Dropdown */}
        {isSearchFocused && projectSearchQuery.trim() && (
          <div id="project-search-suggestions" className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[180px] overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-[11px]">
                {lang === "zh" ? "找不到匹配的專案" : "No projects found"}
              </div>
            ) : (
              filteredProjects.map((p) => (
                <button
                  key={`suggest-${p.id}`}
                  id={`project-suggest-${p.id}`}
                  type="button"
                  onMouseDown={() => {
                    onSwitch(p.id);
                    setProjectSearchQuery("");
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-blue-600/10 hover:text-white transition flex flex-col gap-0.5 border-b border-white/5 last:border-b-0 cursor-pointer"
                >
                  <span className="text-xs font-bold text-white leading-tight truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    📍 {p.destination}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div id="project-list-scroll" className="flex-1 overflow-y-auto space-y-2.5 max-h-[220px] pr-1.5 scrollbar-none">
        {filteredProjects.length === 0 ? (
          <div className="p-5 text-center text-slate-500 text-[11px] bg-slate-950/20 border border-white/5 rounded-xl">
            {lang === "zh" ? "無符合搜尋條件的漫遊專案" : "No matching trip workspaces"}
          </div>
        ) : (
          filteredProjects.map((t) => {
            const isActive = activeTripId === t.id;
            return (
              <button
                key={t.id}
                id={`project-list-item-${t.id}`}
                onClick={() => onSwitch(t.id)}
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
          })
        )}
      </div>

      <button
        id="btn-create-new-trip"
        onClick={onCreateTrip}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wide"
      >
        <Plus size={14} />
        <span>{lang === "zh" ? "開拓新漫遊專案" : "Create New Trip"}</span>
      </button>
    </div>
  );
}
