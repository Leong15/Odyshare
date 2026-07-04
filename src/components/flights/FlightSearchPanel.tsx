import React from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { AutocompleteInput } from "../common/AutocompleteInput";
import { airportMap } from "./airportUtils";

interface FlightSearchPanelProps {
  fromCode: string;
  setFromCode: (val: string) => void;
  toCode: string;
  setToCode: (val: string) => void;
  dateStr: string;
  setDateStr: (val: string) => void;
  tripType: "roundtrip" | "oneway";
  setTripType: (val: "roundtrip" | "oneway") => void;
  returnDateStr: string;
  setReturnDateStr: (val: string) => void;
  loading: boolean;
  onSearch: () => void;
  lang: "en" | "zh";
  t: any;
}

export function FlightSearchPanel({
  fromCode,
  setFromCode,
  toCode,
  setToCode,
  dateStr,
  setDateStr,
  tripType,
  setTripType,
  returnDateStr,
  setReturnDateStr,
  loading,
  onSearch,
  lang,
  t,
}: FlightSearchPanelProps): React.ReactElement {
  const filteredFromSuggestions = Object.keys(airportMap).filter((code) => {
    if (!fromCode) return true;
    const search = fromCode.toLowerCase();
    const item = airportMap[code];
    return (
      code.toLowerCase().includes(search) ||
      item.zh.toLowerCase().includes(search) ||
      item.en.toLowerCase().includes(search)
    );
  });

  const filteredToSuggestions = Object.keys(airportMap).filter((code) => {
    if (!toCode) return true;
    const search = toCode.toLowerCase();
    const item = airportMap[code];
    return (
      code.toLowerCase().includes(search) ||
      item.zh.toLowerCase().includes(search) ||
      item.en.toLowerCase().includes(search)
    );
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-slate-900/60 border border-white/8 p-5 md:p-6 rounded-2xl mb-6 text-sm">
      <div className="md:col-span-3">
        <label className="block text-[12px] font-semibold text-slate-300 mb-2">
          {t.departureCity} {lang === "zh" ? "(全寫或縮寫，例如 LAX / 洛杉磯)" : "(Name / Airport code)"}
        </label>
        <AutocompleteInput
          id="flight-from-input"
          value={fromCode}
          onChange={setFromCode}
          onSelect={(code) => setFromCode(code)}
          suggestions={filteredFromSuggestions}
          placeholder="e.g. LAX / Tokyo"
          className="w-full bg-slate-950 border border-white/10 hover:border-white/25 rounded-xl px-4 py-2.5 font-bold text-white uppercase outline-none focus:border-blue-500"
          renderSuggestion={(code) => {
            const item = airportMap[code];
            return (
              <div className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white font-semibold flex justify-between items-center transition-colors text-xs">
                <span>{lang === "zh" ? item.zh : item.en}</span>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold uppercase">{code}</span>
              </div>
            );
          }}
        />
      </div>

      <div className="md:col-span-3">
        <label className="block text-[12px] font-semibold text-slate-300 mb-2">
          {t.destinationCity} {lang === "zh" ? "(全寫或縮寫，例如 HND / 東京羽田)" : "(Name / Airport code)"}
        </label>
        <AutocompleteInput
          id="flight-to-input"
          value={toCode}
          onChange={setToCode}
          onSelect={(code) => setToCode(code)}
          suggestions={filteredToSuggestions}
          placeholder="e.g. HND / Osaka"
          className="w-full bg-slate-955 border border-white/10 hover:border-white/25 rounded-xl px-4 py-2.5 font-bold text-white uppercase outline-none focus:border-blue-500"
          renderSuggestion={(code) => {
            const item = airportMap[code];
            return (
              <div className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white font-semibold flex justify-between items-center transition-colors text-xs">
                <span>{lang === "zh" ? item.zh : item.en}</span>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold uppercase">{code}</span>
              </div>
            );
          }}
        />
      </div>

      <div className={tripType === "roundtrip" ? "md:col-span-2" : "md:col-span-3"}>
        <label className="block text-[12px] font-semibold text-slate-300 mb-2">
          {lang === "zh" ? "📅 去程日期" : "📅 Outbound Date"}
        </label>
        <input
          id="flight-date-input"
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="w-full bg-slate-950 border border-white/10 focus:border-blue-500 px-4 py-2.5 rounded-xl font-bold font-mono text-white outline-none"
        />
      </div>

      {/* Conditional Return flight date selector */}
      {tripType === "roundtrip" && (
        <div className="md:col-span-2">
          <label className="block text-[12px] font-semibold text-slate-300 mb-2">
            {lang === "zh" ? "📅 回程日期" : "📅 Return Date"}
          </label>
          <input
            id="flight-return-date-input"
            type="date"
            value={returnDateStr}
            onChange={(e) => setReturnDateStr(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 focus:border-blue-500 px-4 py-2.5 rounded-xl font-bold font-mono text-white outline-none"
          />
        </div>
      )}

      <div className="md:col-span-2 flex items-end">
        <button
          id="query-flights-btn"
          onClick={onSearch}
          disabled={loading}
          className="w-full h-12 md:h-[45px] bg-blue-600 hover:bg-blue-505 text-white font-semibold rounded-xl text-[13px] md:text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow transition-all active:scale-[0.98]"
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin text-white" />
              <span>{t.aiAnalyzing}</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-blue-200 animate-pulse" />
              <span>{t.estimateAiRates}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
