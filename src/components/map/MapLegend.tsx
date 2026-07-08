import React from "react";

interface MapLegendProps {
  lang: "zh" | "en";
}

export function MapLegend({ lang }: MapLegendProps) {
  return (
    <div className="absolute top-[82px] left-4 bg-slate-900/90 border border-white/10 p-2.5 rounded-xl text-[9px] font-mono text-slate-400 space-y-1.5 shadow-lg max-w-[170px] select-none">
      <div className="font-bold text-slate-350 uppercase tracking-widest leading-none pb-1 border-b border-white/5">
        {lang === "zh" ? "圖例說明" : "MAP LEGEND"}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
        <span>{lang === "zh" ? "日程規劃景點" : "Itinerary Spot"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ec4899]" />
        <span>{lang === "zh" ? "自訂點擊打點" : "Interactive Dropped"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
        <span>{lang === "zh" ? "OdyShare 暢通節點" : "OdyShare Smooth Traffic"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
        <span>{lang === "zh" ? "OdyShare 壅塞節點" : "OdyShare Congested Area"}</span>
      </div>
    </div>
  );
}
