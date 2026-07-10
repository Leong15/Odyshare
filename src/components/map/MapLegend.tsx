import React from "react";
import { translations } from "../../lib/translations";

interface MapLegendProps {
  lang: "zh" | "en";
}

export function MapLegend({ lang }: MapLegendProps) {
  const t = translations[lang];
  return (
    <div className="absolute top-[82px] left-4 bg-slate-900/90 border border-white/10 p-2.5 rounded-xl text-[9px] font-mono text-slate-400 space-y-1.5 shadow-lg max-w-[170px] select-none">
      <div className="font-bold text-slate-350 uppercase tracking-widest leading-none pb-1 border-b border-white/5">
        {t.mapLegendTitle}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
        <span>{t.legendItinerarySpot}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ec4899]" />
        <span>{t.legendInteractiveDropped}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
        <span>{t.legendOdyShareSmooth}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
        <span>{t.legendOdyShareCongested}</span>
      </div>
    </div>
  );
}
