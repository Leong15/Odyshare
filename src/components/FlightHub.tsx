import React, { useState } from "react";
import { Plane, Star, Clock, ThumbsUp, AlertCircle, RefreshCw, Sparkles, Calendar, Bell, BellOff, ArrowRight, ShieldCheck, TrendingDown } from "lucide-react";
import { FlightEstimate, Participant } from "../types";
import { translations } from "../lib/translations";
import { convertToUSD } from "../lib/constants";

interface FlightHubProps {
  flightEstimates: FlightEstimate[];
  participants: Participant[];
  currentUser: string;
  onVoteFlight: (flightId: string) => void;
  onFetchAIRec: (from: string, to: string, date: string, type?: string, returnDate?: string) => Promise<void>;
  lang?: "en" | "zh";
  tripId: string;
  flightSubscription?: any;
  onUpdateTripState?: (updatedTrip: any) => void;
}

const airportMap: Record<string, { zh: string; en: string }> = {
  TPE: { zh: "台北桃園 (TPE)", en: "Taipei Taoyuan (TPE)" },
  TSA: { zh: "台北松山 (TSA)", en: "Taipei Songshan (TSA)" },
  HKG: { zh: "香港國際機場 (HKG)", en: "Hong Kong Int'l (HKG)" },
  NRT: { zh: "東京成田 (NRT)", en: "Tokyo Narita (NRT)" },
  HND: { zh: "東京羽田 (HND)", en: "Tokyo Haneda (HND)" },
  TYO: { zh: "東京所有機場 (NRT/HND)", en: "Tokyo All Airports (NRT/HND)" },
  KIX: { zh: "大阪關西 (KIX)", en: "Osaka Kansai (KIX)" },
  ITM: { zh: "大阪伊丹 (ITM)", en: "Osaka Itami (ITM)" },
  LAX: { zh: "洛杉磯機場 (LAX)", en: "Los Angeles Int'l (LAX)" },
  SFO: { zh: "舊金山機場 (SFO)", en: "San Francisco Int'l (SFO)" },
  JFK: { zh: "紐約甘迺迪 (JFK)", en: "New York JFK (JFK)" },
  LHR: { zh: "倫敦希斯洛 (LHR)", en: "London Heathrow (LHR)" },
  CDG: { zh: "巴黎戴高樂 (CDG)", en: "Paris CDG (CDG)" },
  SIN: { zh: "新加坡樟宜 (SIN)", en: "Singapore Changi (SIN)" },
  ICN: { zh: "首爾仁川 (ICN)", en: "Seoul Incheon (ICN)" },
  GMP: { zh: "首爾金浦 (GMP)", en: "Seoul Gimpo (GMP)" },
  FUK: { zh: "福岡機場 (FUK)", en: "Fukuoka (FUK)" },
  OKA: { zh: "沖繩那霸 (OKA)", en: "Okinawa Naha (OKA)" },
  CTS: { zh: "札幌新千歲 (CTS)", en: "Sapporo Chitose (CTS)" },
  BKK: { zh: "曼谷蘇凡納布 (BKK)", en: "Bangkok Airport (BKK)" },
  DMK: { zh: "曼谷廊曼 (DMK)", en: "Bangkok Don Mueang (DMK)" },
  MFM: { zh: "澳門機場 (MFM)", en: "Macau (MFM)" },
  KHH: { zh: "高雄小港 (KHH)", en: "Kaohsiung (KHH)" },
  RMQ: { zh: "台中清泉崗 (RMQ)", en: "Taichung (RMQ)" },
};

export function getAirportDisplay(code: string, lang: 'zh' | 'en'): string {
  const upper = (code || "").trim().toUpperCase();
  if (airportMap[upper]) {
    return airportMap[upper][lang];
  }
  for (const [key, value] of Object.entries(airportMap)) {
    if (upper.includes(key)) {
      return value[lang];
    }
  }
  return upper;
}

export default function FlightHub({
  flightEstimates,
  participants,
  currentUser,
  onVoteFlight,
  onFetchAIRec,
  lang = "en",
  tripId,
  flightSubscription,
  onUpdateTripState
}: FlightHubProps) {
  const [fromCode, setFromCode] = useState<string>("LAX");
  const [toCode, setToCode] = useState<string>("TYO");
  const [dateStr, setDateStr] = useState<string>("2026-10-12");
  
  // Suggestions states
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  const filteredFromSuggestions = Object.keys(airportMap).filter(code => {
    if (!fromCode) return true;
    const search = fromCode.toLowerCase();
    const item = airportMap[code];
    return (
      code.toLowerCase().includes(search) || 
      item.zh.toLowerCase().includes(search) || 
      item.en.toLowerCase().includes(search)
    );
  });

  const filteredToSuggestions = Object.keys(airportMap).filter(code => {
    if (!toCode) return true;
    const search = toCode.toLowerCase();
    const item = airportMap[code];
    return (
      code.toLowerCase().includes(search) || 
      item.zh.toLowerCase().includes(search) || 
      item.en.toLowerCase().includes(search)
    );
  });
  
  // Trip style additions
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [returnDateStr, setReturnDateStr] = useState<string>("2026-10-19");
  
  const [loading, setLoading] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"price" | "rating" | "duration">("price");

  // Simulator states
  const [simPrice, setSimPrice] = useState<string>("13500");
  const [simStops, setSimStops] = useState<string>("0");
  const [simTime, setSimTime] = useState<string>("12:00");
  const [simulating, setSimulating] = useState<boolean>(false);
  const [submittingSub, setSubmittingSub] = useState<boolean>(false);

  const handleSubscribe = async (fl: any) => {
    setSubmittingSub(true);
    try {
      const res = await fetch(`/api/trip/${tripId}/flight-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromCode,
          to: toCode,
          date: dateStr,
          price: fl.price,
          carrier: fl.carrier,
          stops: fl.stops,
          duration: fl.duration,
          isDirect: fl.stops === 0,
          currency: fl.currency || "USD"
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trip && onUpdateTripState) {
          onUpdateTripState(data.trip);
        }
      }
    } catch (err) {
      console.error("Flight subscription activate error:", err);
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleUnsubscribe = async () => {
    setSubmittingSub(true);
    try {
      const res = await fetch(`/api/trip/${tripId}/flight-subscription`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trip && onUpdateTripState) {
          onUpdateTripState(data.trip);
        }
      }
    } catch (err) {
      console.error("Flight unsubscription error:", err);
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleSimulateCheck = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`/api/trip/${tripId}/simulate-price-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulatedPrice: Number(simPrice),
          simulatedStops: Number(simStops),
          checkTime: simTime
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trip && onUpdateTripState) {
          onUpdateTripState(data.trip);
        }
      }
    } catch (err) {
      console.error("Flight simulation price check error:", err);
    } finally {
      setSimulating(false);
    }
  };

  const t = translations[lang];

  const getCheapestFlightId = () => {
    if (flightEstimates.length === 0) return null;
    let cheapest = flightEstimates[0];
    let cheapestUSD = convertToUSD(cheapest.price, cheapest.currency || "USD");
    
    flightEstimates.forEach(f => {
      const fUSD = convertToUSD(f.price, f.currency || "USD");
      if (fUSD < cheapestUSD) {
        cheapest = f;
        cheapestUSD = fUSD;
      }
    });
    return cheapest.id;
  };

  const sortedEstimates = [...flightEstimates].sort((a, b) => {
    if (sortBy === "price") {
      const aUSD = convertToUSD(a.price, a.currency || "USD");
      const bUSD = convertToUSD(b.price, b.currency || "USD");
      return aUSD - bUSD;
    }
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "duration") return a.duration.localeCompare(b.duration);
    return 0;
  });

  const cheapestId = getCheapestFlightId();

  const handleRecommendFlights = async () => {
    setLoading(true);
    try {
      await onFetchAIRec(fromCode, toCode, dateStr, tripType, returnDateStr);
    } catch (err) {
      console.error("Flight fetching error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getVoterMeta = (voteList: string[]) => {
    return voteList.map(uid => participants.find(p => p.id === uid)).filter(Boolean) as Participant[];
  };

  const totalVotesCount = flightEstimates.reduce((sum, f) => sum + f.votes.length, 0);

  return (
    <div className="glass-container rounded-2xl p-5 shadow-xl border border-white/10 animate-fadeIn text-slate-100">
      
      {/* Title */}
      <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4 gap-4 flex-col sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/20">
            <Plane size={16} />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm">{t.flightHubTitle}</h3>
            <p className="text-xs text-slate-400">{t.flightHubDesc}</p>
          </div>
        </div>

        {/* Dynamic single vs roundtrip switcher */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-md text-xs font-bold leading-none shrink-0 self-center">
          <button
            type="button"
            onClick={() => setTripType("roundtrip")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              tripType === "roundtrip" 
                ? "bg-blue-600 text-white shadow font-black" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            {lang === "zh" ? "🔄 來回往返 (買來回)" : "🔄 Round-trip"}
          </button>
          <button
            type="button"
            onClick={() => setTripType("oneway")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              tripType === "oneway" 
                ? "bg-blue-600 text-white shadow font-black" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            {lang === "zh" ? "➡️ 單程機票" : "➡️ One-way"}
          </button>
        </div>
      </div>

      {/* Flight Search Panel: support for full city name and codes */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-slate-900/60 border border-white/8 p-5 md:p-6 rounded-2xl mb-6 text-sm">
        <div className="md:col-span-3 relative">
          <label className="block text-[12px] font-semibold text-slate-300 mb-2">
            {t.departureCity} {lang === "zh" ? "(全寫或縮寫，例如 LAX / 洛杉磯)" : "(Name / Airport code)"}
          </label>
          <input
            id="flight-from-input"
            type="text"
            value={fromCode}
            onChange={(e) => {
              setFromCode(e.target.value);
              setShowFromSuggestions(true);
            }}
            onFocus={() => setShowFromSuggestions(true)}
            onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
            placeholder="e.g. LAX / Tokyo"
            className="w-full bg-slate-950 border border-white/10 hover:border-white/25 rounded-xl px-4 py-2.5 font-bold text-white uppercase outline-none focus:border-blue-500"
          />
          {showFromSuggestions && filteredFromSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-slate-955 border border-white/10 rounded-xl shadow-2xl z-[150] divide-y divide-white/5 scrollbar-thin">
              {filteredFromSuggestions.map(code => {
                const item = airportMap[code];
                return (
                  <button
                    key={code}
                    type="button"
                    onMouseDown={() => {
                      setFromCode(code);
                      setShowFromSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white font-semibold flex justify-between items-center transition-colors text-xs"
                  >
                    <span>{lang === "zh" ? item.zh : item.en}</span>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold uppercase">{code}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="md:col-span-3 relative">
          <label className="block text-[12px] font-semibold text-slate-300 mb-2">
            {t.destinationCity} {lang === "zh" ? "(全寫或縮寫，例如 HND / 東京羽田)" : "(Name / Airport code)"}
          </label>
          <input
            id="flight-to-input"
            type="text"
            value={toCode}
            onChange={(e) => {
              setToCode(e.target.value);
              setShowToSuggestions(true);
            }}
            onFocus={() => setShowToSuggestions(true)}
            onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
            placeholder="e.g. HND / Osaka"
            className="w-full bg-slate-955 border border-white/10 hover:border-white/25 rounded-xl px-4 py-2.5 font-bold text-white uppercase outline-none focus:border-blue-500"
          />
          {showToSuggestions && filteredToSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-slate-950 border border-white/10 rounded-xl shadow-2xl z-[150] divide-y divide-white/5 scrollbar-thin">
              {filteredToSuggestions.map(code => {
                const item = airportMap[code];
                return (
                  <button
                    key={code}
                    type="button"
                    onMouseDown={() => {
                      setToCode(code);
                      setShowToSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-white font-semibold flex justify-between items-center transition-colors text-xs"
                  >
                    <span>{lang === "zh" ? item.zh : item.en}</span>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold uppercase">{code}</span>
                  </button>
                );
              })}
            </div>
          )}
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
            onClick={handleRecommendFlights}
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

      {/* OdyShareSmart On-Demand Flight Route Monitoring Section */}
      {flightSubscription && flightSubscription.isActive ? (
        <div id="flight-monitoring-sandbox" className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 shadow-md space-y-4 mb-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-white/5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h4 className="font-extrabold text-white text-xs">
                {lang === "zh" ? "✨ OdyShareSmart On-Demand 智能線路監控中" : "✨ OdyShareSmart On-Demand Flight Monitoring"}
              </h4>
              <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 font-bold border border-blue-500/25 rounded-md font-mono">
                {lang === "zh" ? "每天 2 次 (12:00 / 18:00)" : "Twice Daily (12:00 & 18:00)"}
              </span>
            </div>
            
            <button
              onClick={handleUnsubscribe}
              disabled={submittingSub}
              className="text-xs text-rose-300 hover:text-rose-100 font-bold underline transition cursor-pointer"
            >
              {lang === "zh" ? "🔕 關閉線路監控" : "Unsubscribe monitoring"}
            </button>
          </div>

          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] sm:grid-cols-4 gap-4 text-xs font-mono text-slate-300">
            <div className="space-y-0.5">
              <span className="block text-xs text-slate-400 uppercase tracking-widest">{lang === "zh" ? "監控航路" : "Route"}</span>
              <span className="font-bold text-white text-[12px] flex items-center gap-1">
                {flightSubscription.from} <ArrowRight size={10} className="text-slate-500" /> {flightSubscription.to}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-xs text-slate-400 uppercase tracking-widest">{lang === "zh" ? "最初基準價" : "Baseline Rate"}</span>
              <span className="font-extrabold text-blue-300 text-[13px]">{flightSubscription.currency || "USD"} ${flightSubscription.baselinePrice}</span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-xs text-slate-400 uppercase tracking-widest">{lang === "zh" ? "當前報價" : "Current Checked"}</span>
              <span className="font-extrabold text-white text-[13px] flex items-center gap-1.5 flex-wrap">
                {flightSubscription.currency || "USD"} ${flightSubscription.currentPrice}
                {flightSubscription.currentPrice < flightSubscription.baselinePrice ? (
                  <span className="text-[10px] text-emerald-300 font-black flex items-center gap-0.5 px-1 py-0.5 bg-emerald-500/10 rounded">
                    <TrendingDown size={11} />
                    -{Math.round(((flightSubscription.baselinePrice - flightSubscription.currentPrice)/flightSubscription.baselinePrice)*100)}%
                  </span>
                ) : null}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] text-slate-400 uppercase tracking-widest">{lang === "zh" ? "性價比指數" : "CP Value Score"}</span>
              <span className="font-bold flex items-center gap-1">
                <span className={`text-[13px] font-black ${
                  flightSubscription.score >= 80 ? "text-emerald-400 animate-pulse" : flightSubscription.score >= 60 ? "text-blue-300" : "text-rose-400"
                }`}>
                  {flightSubscription.score}
                </span>
                <span className="text-[10px] text-slate-500">/ 100</span>
              </span>
            </div>
          </div>

          {/* AI Simulator subpanel */}
          <div className="bg-white/3 border border-white/5 p-3 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="font-bold text-white text-[11px] uppercase tracking-wide">
                {lang === "zh" ? "⚡️ OdyShareSmart 測試沙盒：對時模擬與降價比對" : "⚡️ OdyShareSmart Sandbox: Time Matching & Drop Comparison Simulator"}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">{lang === "zh" ? "⏰ 模擬比對時刻" : "⏰ Simulated Check-time"}</label>
                <select
                  value={simTime}
                  onChange={(e) => setSimTime(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-white"
                >
                  <option value="12:00">{lang === "zh" ? "中午 12:00" : "12:00 PM (Lunch)"}</option>
                  <option value="18:00">{lang === "zh" ? "晚上 18:00" : "18:00 PM (Dinner)"}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">{lang === "zh" ? "💲 模擬機票報價 (USD)" : "💲 Simulated Rate (USD)"}</label>
                <input
                  type="number"
                  value={simPrice}
                  onChange={(e) => setSimPrice(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">{lang === "zh" ? "⛓️ 航班中轉轉機" : "⛓️ Layover Transit"}</label>
                <select
                  value={simStops}
                  onChange={(e) => setSimStops(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-white"
                >
                  <option value="0">{lang === "zh" ? "直飛不變 (常規直飛)" : "Direct (No stop)"}</option>
                  <option value="2">{lang === "zh" ? "大轉機 2 次 (爛轉機地獄)" : "Layover 2 stops (Transit hell)"}</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSimulateCheck}
                  disabled={simulating}
                  className="w-full py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold rounded-lg transition-all cursor-pointer text-[11px] flex items-center justify-center gap-1 shadow-md shrink-0"
                >
                  {simulating ? (
                    <>
                      <RefreshCw size={12} className="animate-spin text-white" />
                      <span>{lang === "zh" ? "比對中..." : "Analyzing CP..."}</span>
                    </>
                  ) : (
                    <>
                      <span>⚡️ {lang === "zh" ? "模擬對時比對" : "Trigger Simulation"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* History ledger logs */}
          {flightSubscription.history && flightSubscription.history.length > 0 && (
            <div className="pt-2 text-[10px] font-mono text-slate-400 border-t border-white/5">
              <span className="block font-bold text-slate-300 mb-1 uppercase tracking-wider">{lang === "zh" ? "🗃️ 監控比對日誌 history (最迎 3 筆)" : "🗃️ Monitoring ledger history (Last 3 checks)"}</span>
              <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-1 scrollbar-thin">
                {flightSubscription.history.slice(-3).reverse().map((item: any, idx: number) => (
                  <div key={idx} className="p-1 px-2.5 bg-white/3 rounded border border-white/5 flex items-start justify-between gap-4 animate-fadeIn">
                    <span className="text-[11px] leading-relaxed text-slate-300">
                      {item.message || `報價: $${item.price} • CP得分: ${item.score}/100`}
                    </span>
                    <span className="text-[9px] text-slate-500 whitespace-nowrap pt-0.5">
                      {new Date(item.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-white/3 border border-white/5 rounded-xl text-center text-xs text-slate-400 mb-5 animate-fadeIn">
          <span>🔔 {lang === "zh" ? "您尚未訂閱本趟旅程的航線監控。在下方航班卡片點擊「啟動線路監控」，即可鎖定基準線（Baseline）進行對時及低價通知！" : "No active flight monitoring subscription. Click 'Monitor Rate' on any card below to establish a price baseline and activate."}</span>
        </div>
      )}

      {/* Sorting bar & votes overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-4 pb-2 border-b border-white/5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400">{t.sortBy}:</span>
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 backdrop-blur-md">
            <button
              type="button"
              id="sort-price-btn"
              onClick={() => setSortBy("price")}
              className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-all ${sortBy === "price" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"}`}
            >
              {t.price}
            </button>
            <button
              type="button"
              id="sort-rating-btn"
              onClick={() => setSortBy("rating")}
              className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-all ${sortBy === "rating" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"}`}
            >
              {t.rating}
            </button>
            <button
              type="button"
              id="sort-duration-btn"
              onClick={() => setSortBy("duration")}
              className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-all ${sortBy === "duration" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"}`}
            >
              {t.duration}
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium font-mono">
          👥 {totalVotesCount} {t.totalVotes}
        </div>
      </div>

      {/* Flight comparison entries */}
      <div className="space-y-5 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
        {sortedEstimates.length === 0 ? (
          <div className="py-16 text-center bg-white/3 border border-white/5 rounded-2xl border-dashed">
            <p className="text-xs text-slate-400">
              {lang === "zh" ? "尚未生成航班建議。請點擊‘估算 AI 行程票價’獲取即時評估數據。" : "No comparative flights analyzed yet. Click 'Estimate AI Rates' to generate routes."}
            </p>
          </div>
        ) : (
          sortedEstimates.map((fl) => {
            const voterMetas = getVoterMeta(fl.votes);
            const userVoted = fl.votes.includes(currentUser);
            const isCheapest = fl.id === cheapestId;

            return (
              <div
                key={fl.id}
                id={`flight-card-${fl.id}`}
                className={`p-5 rounded-2xl border transition-all text-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 flight-card-interactive ${
                  isCheapest ? "border-emerald-500/35 bg-emerald-500/5 shadow-md" : "border-white/8 bg-slate-900/40 hover:bg-slate-800/20"
                }`}
              >
                {/* Airline details */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-lg shadow-inner select-none shrink-0 text-white">
                    {fl.carrierLogo || "✈️"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                       <span className="font-extrabold text-white text-xs">{fl.carrier}</span>
                      {isCheapest && (
                        <span className="text-xs font-extrabold tracking-widest uppercase px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 rounded-md">
                          {t.cheapest}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      {lang === "zh" ? "去程起飛：" : "Outbound: "} {fl.departureTime} • <span className="text-white font-bold">{getAirportDisplay(fl.from, lang)}</span> → <span className="text-white font-bold">{getAirportDisplay(fl.to, lang)}</span>
                    </p>
                    {fl.returnDepartureTime && (
                      <p className="text-xs text-amber-300 font-bold font-mono mt-0.5 whitespace-nowrap">
                        🔄 {lang === "zh" ? "回程起飛：" : "Return: "} {fl.returnDepartureTime} • <span className="text-white font-bold">{getAirportDisplay(fl.to, lang)}</span> → <span className="text-white font-bold">{getAirportDisplay(fl.from, lang)}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Transit duration metrics */}
                <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] md:grid-cols-1 gap-2 md:gap-1 text-slate-350 font-mono w-full md:w-auto">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock size={12} className="text-blue-400" />
                    <span>{fl.duration}</span>
                  </div>
                  <div className="text-xs">
                    {fl.stops === 0 ? (
                      <span className="text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-md">{t.directRoute}</span>
                    ) : (
                      <span className="text-amber-300 font-bold bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-md">{fl.stops} Stop{fl.stops > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>

                {/* Comparative Pricing */}
                <div className="flex flex-col md:items-end w-full md:w-auto">
                  <span className="text-xs text-slate-400">{lang === "zh" ? "預估全包價" : "Estimated Rate"}</span>
                  <span className="text-lg font-black text-white font-mono tracking-tight">
                    {fl.currency || "USD"} ${fl.price.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5 text-amber-400">
                    <Star size={11} fill="currentColor" />
                    <span className="text-xs font-bold text-slate-200 font-mono">{fl.rating}</span>
                  </div>
                </div>

                {/* Collective Voting */}
                <div className="flex flex-col gap-2 min-w-[140px] shrink-0 w-full md:w-auto">
                  <button
                    type="button"
                    id={`flight-vote-btn-${fl.id}`}
                    onClick={() => onVoteFlight(fl.id)}
                    className={`w-full py-2 px-3.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs ${
                      userVoted
                        ? "bg-blue-600 text-white border border-blue-500"
                        : "bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5"
                    }`}
                  >
                    <ThumbsUp size={11} />
                    <span>{userVoted ? t.preferred : t.voteBest}</span>
                  </button>

                  {(() => {
                    const queryParts = [
                      "flights",
                      "from",
                      fromCode,
                      "to",
                      toCode,
                      "on",
                      dateStr,
                    ];
                    if (tripType === "roundtrip" && returnDateStr) {
                      queryParts.push("returning");
                      queryParts.push(returnDateStr);
                    }
                    if (fl.carrier) {
                      queryParts.push(fl.carrier);
                    }
                    const query = encodeURIComponent(queryParts.join(" "));
                    const finalUrl = `https://www.google.com/flights?q=${query}`;
                    return (
                      <a
                        href={finalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/20 rounded-xl transition-all text-[10px] text-center flex items-center justify-center gap-1 hover:text-white"
                      >
                        <span>ℹ️ {lang === "zh" ? "線上比價預訂" : "Compare & Book online"}</span>
                      </a>
                    );
                  })()}

                  {/* On-Demand Subscribe Monitoring toggle */}
                  {flightSubscription && flightSubscription.isActive && flightSubscription.carrier === fl.carrier ? (
                    <div className="w-full py-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/15 rounded-xl font-bold font-mono text-[10px] text-center flex items-center justify-center gap-1 select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>{lang === "zh" ? "線路監控活動中" : "Actively Monitored"}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={submittingSub}
                      onClick={() => handleSubscribe(fl)}
                      className="w-full py-1.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 font-bold border border-blue-500/25 rounded-xl transition cursor-pointer text-[10px] flex items-center justify-center gap-1"
                    >
                      <Bell size={10} className="animate-bounce" />
                      <span>{lang === "zh" ? "啟動線路監控" : "Monitor Rate"}</span>
                    </button>
                  )}

                  {/* Voters initials bar */}
                  {voterMetas.length > 0 && (
                    <div className="flex items-center gap-1.5 self-center">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {voterMetas.map((voter) => (
                          <div
                            key={voter.id}
                            style={{ backgroundColor: voter.avatarColor }}
                            className="w-[16px] h-[16px] rounded-full border border-slate-950 text-[8px] font-extrabold text-white flex items-center justify-center"
                            title={voter.name}
                          >
                            {voter.name[0]}
                          </div>
                        ))}
                      </div>
                      <span className="text-[9.5px] text-slate-450 font-mono">({voterMetas.length} {lang === "zh" ? "人投票" : "voted"})</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-5 p-3 bg-blue-500/10 border border-blue-500/15 rounded-xl flex items-start gap-2.5">
        <AlertCircle size={15} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">
          {t.cachedNotice}
        </p>
      </div>
    </div>
  );
}
