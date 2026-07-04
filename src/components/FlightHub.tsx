import React, { useState } from "react";
import { Plane, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { FlightEstimate, Participant } from "../types";
import { translations } from "../lib/translations";
import { convertToUSD } from "../lib/constants";

// Modular Subcomponents
import { FlightSearchPanel } from "./flights/FlightSearchPanel";
import { FlightMonitoringPanel } from "./flights/FlightMonitoringPanel";
import { FlightCard } from "./flights/FlightCard";

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

export default function FlightHub({
  flightEstimates,
  participants,
  currentUser,
  onVoteFlight,
  onFetchAIRec,
  lang = "en",
  tripId,
  flightSubscription,
  onUpdateTripState,
}: FlightHubProps) {
  const [fromCode, setFromCode] = useState<string>("LAX");
  const [toCode, setToCode] = useState<string>("TYO");
  const [dateStr, setDateStr] = useState<string>("2026-10-12");

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

  const t = translations[lang];

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
          currency: fl.currency || "USD",
        }),
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
        method: "DELETE",
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
          checkTime: simTime,
        }),
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

  const getCheapestFlightId = () => {
    if (flightEstimates.length === 0) return null;
    let cheapest = flightEstimates[0];
    let cheapestUSD = convertToUSD(cheapest.price, cheapest.currency || "USD");

    flightEstimates.forEach((f) => {
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
      <FlightSearchPanel
        fromCode={fromCode}
        setFromCode={setFromCode}
        toCode={toCode}
        setToCode={setToCode}
        dateStr={dateStr}
        setDateStr={setDateStr}
        tripType={tripType}
        setTripType={setTripType}
        returnDateStr={returnDateStr}
        setReturnDateStr={setReturnDateStr}
        loading={loading}
        onSearch={handleRecommendFlights}
        lang={lang}
        t={t}
      />

      {/* OdyShareSmart On-Demand Flight Route Monitoring Section */}
      <FlightMonitoringPanel
        flightSubscription={flightSubscription}
        submittingSub={submittingSub}
        onUnsubscribe={handleUnsubscribe}
        simulating={simulating}
        simPrice={simPrice}
        setSimPrice={setSimPrice}
        simStops={simStops}
        setSimStops={setSimStops}
        simTime={simTime}
        setSimTime={setSimTime}
        onSimulateCheck={handleSimulateCheck}
        lang={lang}
      />

      {/* Sorting bar & votes overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-4 pb-2 border-b border-white/5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400">{t.sortBy}:</span>
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 backdrop-blur-md">
            <button
              type="button"
              id="sort-price-btn"
              onClick={() => setSortBy("price")}
              className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-all ${
                sortBy === "price" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              {t.price}
            </button>
            <button
              type="button"
              id="sort-rating-btn"
              onClick={() => setSortBy("rating")}
              className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-all ${
                sortBy === "rating" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              {t.rating}
            </button>
            <button
              type="button"
              id="sort-duration-btn"
              onClick={() => setSortBy("duration")}
              className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-all ${
                sortBy === "duration" ? "bg-white/10 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
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
              {lang === "zh"
                ? "尚未生成航班建議。請點擊‘估算 AI 行程票價’獲取即時評估數據。"
                : "No comparative flights analyzed yet. Click 'Estimate AI Rates' to generate routes."}
            </p>
          </div>
        ) : (
          sortedEstimates.map((fl) => (
            <FlightCard
              key={fl.id}
              fl={fl}
              participants={participants}
              currentUser={currentUser}
              onVoteFlight={onVoteFlight}
              onSubscribe={handleSubscribe}
              isCheapest={fl.id === cheapestId}
              flightSubscription={flightSubscription}
              submittingSub={submittingSub}
              lang={lang}
              t={t}
              fromCode={fromCode}
              toCode={toCode}
              dateStr={dateStr}
              tripType={tripType}
              returnDateStr={returnDateStr}
            />
          ))
        )}
      </div>

      <div className="mt-5 p-3 bg-blue-500/10 border border-blue-500/15 rounded-xl flex items-start gap-2.5">
        <AlertCircle size={15} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">{t.cachedNotice}</p>
      </div>
    </div>
  );
}
