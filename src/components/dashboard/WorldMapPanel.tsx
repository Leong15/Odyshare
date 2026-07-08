import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Trip } from "../../types";
import { MappedProject } from "./ProjectListPanel";

const WorldMapGeographies = React.memo(function WorldMapGeographies({ isLightTheme }: { isLightTheme: boolean }) {
  return (
    <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
      {({ geographies }) =>
        geographies.map((geo) => (
          <Geography
            key={geo.rsmKey}
            geography={geo}
            style={{
              default: {
                fill: isLightTheme ? "#cbd5e1" : "#111827",
                stroke: isLightTheme ? "#94a3b8" : "rgba(255,255,255,0.06)",
                strokeWidth: 0.35,
                outline: "none",
              },
              hover: { fill: isLightTheme ? "#94a3b8" : "#1f2937", outline: "none" },
              pressed: { fill: isLightTheme ? "#64748b" : "#374151", outline: "none" },
            }}
          />
        ))
      }
    </Geographies>
  );
});

export interface GroupedPin {
  key: string;
  destinationName: string;
  left: number;
  top: number;
  trips: MappedProject[];
  hasActive: boolean;
  id: string;
}

interface WorldMapPanelProps {
  groupedPins: GroupedPin[];
  activeTripId: string;
  trip: Trip;
  lang: "zh" | "en";
  onSwitchTrip: (tripId: string) => void;
}

export function WorldMapPanel({
  groupedPins,
  activeTripId,
  trip,
  lang,
  onSwitchTrip
}: WorldMapPanelProps) {
  const [hoveredLocationKey, setHoveredLocationKey] = useState<string | null>(null);
  const [lockedLocationKey, setLockedLocationKey] = useState<string | null>(null);
  const [lockedMousePos, setLockedMousePos] = useState<{ x: number, y: number } | null>(null);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const mouseMoveThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsLightTheme(document.body.classList.contains("light-theme"));
    const observer = new MutationObserver(() => {
      setIsLightTheme(document.body.classList.contains("light-theme"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mouseMoveThrottleRef.current) return;
    mouseMoveThrottleRef.current = setTimeout(() => {
      mouseMoveThrottleRef.current = null;
    }, 16); // ~60fps cap
    if (!cardContainerRef.current) return;
    const rect = cardContainerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  const getTooltipStyle = () => {
    if (!cardContainerRef.current) return { left: "0px", top: "0px" };
    const width = cardContainerRef.current.clientWidth;
    const height = cardContainerRef.current.clientHeight;

    const isMobile = (typeof window !== "undefined" && window.innerWidth < 768) || (width < 500);
    if (isMobile) {
      return {
        left: "12px",
        right: "12px",
        bottom: "12px",
        top: "auto",
        width: "auto",
        position: "fixed" as const,
        zIndex: 9999,
      };
    }

    const tooltipWidth = 260;  // Match our premium card styling dimensions
    const tooltipHeight = 185; // Estimated height for the statistics/bars

    const activeMouseX = lockedMousePos ? lockedMousePos.x : mousePos.x;
    const activeMouseY = lockedMousePos ? lockedMousePos.y : mousePos.y;

    let left = activeMouseX + 15;
    let top = activeMouseY + 15;

    // Flip horizontally if mouse is too close to the right edge
    if (left + tooltipWidth > width) {
      left = activeMouseX - tooltipWidth - 15;
    }
    // Flip vertically if mouse is too close to the bottom edge
    if (top + tooltipHeight > height) {
      top = activeMouseY - tooltipHeight - 15;
    }

    // Double guard limits to keep it perfectly within viewport padding boundaries
    left = Math.max(8, Math.min(width - tooltipWidth - 8, left));
    top = Math.max(8, Math.min(height - tooltipHeight - 8, top));

    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  };

  const hudGroup = useMemo(() => {
    const visibleKey = lockedLocationKey || hoveredLocationKey;
    if (!visibleKey) return null;
    return groupedPins.find(g => g.key === visibleKey) || null;
  }, [lockedLocationKey, hoveredLocationKey, groupedPins]);

  return (
    <div id="world-map-panel" className="lg:col-span-2 bg-slate-950 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl min-h-[220px] md:min-h-[400px] overflow-hidden relative">
      <div className="flex justify-between items-start gap-4">
        <div>
          <span className="text-xs text-blue-400 font-mono font-bold tracking-widest uppercase block">
            🗺️ {lang === "zh" ? "全域協作專案世界地圖" : "All Projects Global World Map"}
          </span>
          <h3 className="text-xs font-black text-white mt-1">
            {lang === "zh" ? "標註所有行程目的，點擊節點即可快速切換控制台" : "Visualizing all project destinations on Earth. Click a node to instantly switch workspace."}
          </h3>
        </div>
        <span className="text-xs bg-slate-900 border border-white/5 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
          PORTFOLIO SCAN
        </span>
      </div>

      <div
        ref={cardContainerRef}
        onMouseMove={handleMouseMove}
        onClick={() => {
          setLockedLocationKey(null);
          setLockedMousePos(null);
        }}
        className="relative w-full aspect-[2/1] select-none mt-4 rounded-xl border border-white/5 overflow-hidden glass-card bg-[#e0f2fe] dark:bg-[#0a1628]"
      >
        <ComposableMap
          projection="geoEquirectangular"
          width={800}
          height={400}
          style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
          projectionConfig={{
            scale: 128,
            center: [0, 0]
          }}
        >
          <WorldMapGeographies isLightTheme={isLightTheme} />
        </ComposableMap>

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

        <div className="absolute left-2 text-[8px] font-mono text-slate-500/70 pointer-events-none top-[33.3%] -translate-y-1/2">30° N</div>
        <div className="absolute left-2 text-[8px] font-mono text-slate-400/80 pointer-events-none top-[50%] -translate-y-1/2">0° (Equator)</div>
        <div className="absolute left-2 text-[8px] font-mono text-slate-500/70 pointer-events-none top-[66.7%] -translate-y-1/2">30° S</div>

        <div className="absolute inset-0">
          {groupedPins.map((g) => {
            const isHovered = hoveredLocationKey === g.key;
            const isActive = g.hasActive;
            return (
              <div
                key={g.key}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${g.left}%`, top: `${g.top}%`, zIndex: isActive ? 50 : 30 }}
                onMouseEnter={() => setHoveredLocationKey(g.key)}
                onMouseLeave={() => setHoveredLocationKey(null)}
              >
                <div className="relative flex items-center justify-center">
                  {isActive && (
                    <>
                      <div className="absolute w-12 h-12 rounded-full animate-ping border border-blue-500/40 bg-blue-500/10 pointer-events-none" />
                      <div className="absolute w-7 h-7 rounded-full border border-blue-400/30 pointer-events-none" />
                    </>
                  )}
                  {!isActive && isHovered && (
                    <div className="absolute w-7 h-7 rounded-full border border-indigo-400/30 bg-indigo-500/5 animate-pulse pointer-events-none" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (lockedLocationKey === g.key) {
                        setLockedLocationKey(null);
                        setLockedMousePos(null);
                      } else {
                        setLockedLocationKey(g.key);
                        setLockedMousePos({ x: mousePos.x, y: mousePos.y });
                      }
                    }}
                    className={`w-3.5 h-3.5 rounded-full border transition-all shadow-xl flex items-center justify-center cursor-pointer ${
                      isActive
                        ? "bg-blue-500 border-white scale-125 shadow-blue-500/50"
                        : "bg-indigo-600 border-slate-900 hover:scale-110 hover:bg-indigo-500 hover:border-white"
                    }`}
                    title={g.destinationName}
                  >
                    <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-white' : 'bg-slate-200'}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Dynamic HUD GPS Telemetry Panel is grouped to show multiple projects if identical locations exist */}
        {hudGroup && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`absolute w-[240px] md:w-[260px] bg-slate-950/95 backdrop-blur-[8px] border p-3.5 rounded-xl shadow-2xl z-50 text-[11px] text-slate-300 transition-transform duration-75 ease-out animate-in fade-in zoom-in-95 ${
              lockedLocationKey 
                ? "pointer-events-auto select-text border-blue-500/40" 
                : "pointer-events-none select-none border-white/15"
            }`}
            style={{
              ...getTooltipStyle(),
            }}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="font-extrabold text-white text-[11.5px] leading-none truncate max-w-[140px] flex items-center gap-1">
                📍 {hudGroup.destinationName}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {lockedLocationKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setLockedLocationKey(null);
                      setLockedMousePos(null);
                    }}
                    className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition cursor-pointer"
                    title={lang === "zh" ? "關閉" : "Close"}
                  >
                    <X size={11} />
                  </button>
                )}
                <span className="text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold leading-none bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                  {hudGroup.trips.length} {lang === "zh" ? "個專案" : "Projects"}
                </span>
              </div>
            </div>

            <div className="space-y-3 mt-2.5 max-h-[170px] overflow-y-auto pr-1">
              {hudGroup.trips.map((p, idx) => {
                const isActive = activeTripId === p.id;
                return (
                  <div 
                    key={p.id} 
                    onClick={() => {
                      if (lockedLocationKey) {
                        onSwitchTrip(p.id);
                        setLockedLocationKey(null);
                        setLockedMousePos(null);
                      }
                    }}
                    className={`space-y-1.5 p-2 rounded-xl border border-transparent transition-all select-none text-left ${
                      idx > 0 ? "mt-2.5" : ""
                    } ${
                      lockedLocationKey 
                        ? "cursor-pointer hover:bg-white/5 hover:border-white/10 active:scale-98 group/row" 
                        : ""
                    }`}
                    title={lockedLocationKey ? (lang === "zh" ? "點擊切換專案" : "Click anywhere to switch to this project") : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-black text-[11px] truncate max-w-[155px] transition-colors ${
                        isActive 
                          ? "text-blue-400 font-extrabold" 
                          : "text-white group-hover/row:text-blue-400"
                      }`}>
                        🌐 {p.name}
                      </span>
                      {isActive && (
                        <span className="text-[7.5px] bg-blue-500/15 border border-blue-500/30 text-blue-400 px-1 py-0.1 rounded uppercase scale-90 font-mono font-black shrink-0">
                          {lang === "zh" ? '啟用' : 'Active'}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-400 font-mono flex justify-between text-[10px]">
                      <span>👥 {lang === "zh" ? "協作人員" : "Operators"}:</span>
                      <span className="text-slate-300 font-bold">{p.membersCount} {lang === "zh" ? "人" : "Peers"}</span>
                    </p>

                    <p className="text-slate-400 font-mono flex justify-between text-[10px]">
                      <span>📅 {lang === "zh" ? "時程" : "Duration"}:</span>
                      <span className="text-slate-300 font-bold text-[9px]">{p.startDate} ~ {p.endDate}</span>
                    </p>

                    {/* Spending indicator */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold font-mono">
                        <span className="text-amber-400">💸 ${p.spent}</span>
                        <span className="text-slate-400">/ ${p.totalBudget}</span>
                      </div>
                      <div className="w-full bg-slate-900/80 h-1 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full rounded-full transition-all duration-550 ${
                            p.progressPercent > 80 ? 'bg-red-500' : p.progressPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${p.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
