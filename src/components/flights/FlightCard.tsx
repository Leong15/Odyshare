import React from "react";
import { Star, Clock, ThumbsUp, Bell } from "lucide-react";
import { FlightEstimate, Participant } from "../../types";
import { getAirportDisplay } from "./airportUtils";

interface FlightCardProps {
  key?: string;
  fl: FlightEstimate;
  participants: Participant[];
  currentUser: string;
  onVoteFlight: (flightId: string) => void;
  onSubscribe: (fl: any) => any;
  isCheapest: boolean;
  flightSubscription: any;
  submittingSub: boolean;
  lang: "en" | "zh";
  t: any;
  fromCode: string;
  toCode: string;
  dateStr: string;
  tripType: "roundtrip" | "oneway";
  returnDateStr: string;
}

export function FlightCard({
  fl,
  participants,
  currentUser,
  onVoteFlight,
  onSubscribe,
  isCheapest,
  flightSubscription,
  submittingSub,
  lang,
  t,
  fromCode,
  toCode,
  dateStr,
  tripType,
  returnDateStr,
}: FlightCardProps): React.ReactElement {
  const userVoted = fl.votes.includes(currentUser);

  const getVoterMeta = (voteList: string[]) => {
    return voteList
      .map((uid) => participants.find((p) => p.id === uid))
      .filter(Boolean) as Participant[];
  };

  const voterMetas = getVoterMeta(fl.votes);

  const queryParts = ["flights", "from", fromCode, "to", toCode, "on", dateStr];
  if (tripType === "roundtrip" && returnDateStr) {
    queryParts.push("returning");
    queryParts.push(returnDateStr);
  }
  if (fl.carrier) {
    queryParts.push(fl.carrier);
  }
  const query = encodeURIComponent(queryParts.join(" "));
  const googleFlightsUrl = `https://www.google.com/flights?q=${query}`;

  const isActiveMonitored =
    flightSubscription &&
    flightSubscription.isActive &&
    flightSubscription.carrier === fl.carrier;

  return (
    <div
      id={`flight-card-${fl.id}`}
      className={`p-5 rounded-2xl border transition-all text-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 flight-card-interactive ${
        isCheapest
          ? "border-emerald-500/35 bg-emerald-500/5 shadow-md"
          : "border-white/8 bg-slate-900/40 hover:bg-slate-800/20"
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
            {lang === "zh" ? "去程起飛：" : "Outbound: "} {fl.departureTime} •{" "}
            <span className="text-white font-bold">{getAirportDisplay(fl.from, lang)}</span> →{" "}
            <span className="text-white font-bold">{getAirportDisplay(fl.to, lang)}</span>
          </p>
          {fl.returnDepartureTime && (
            <p className="text-xs text-amber-300 font-bold font-mono mt-0.5 whitespace-nowrap">
              🔄 {lang === "zh" ? "回程起飛：" : "Return: "} {fl.returnDepartureTime} •{" "}
              <span className="text-white font-bold">{getAirportDisplay(fl.to, lang)}</span> →{" "}
              <span className="text-white font-bold">{getAirportDisplay(fl.from, lang)}</span>
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
            <span className="text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-md">
              {t.directRoute}
            </span>
          ) : (
            <span className="text-amber-300 font-bold bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-md">
              {fl.stops} Stop{fl.stops > 1 ? "s" : ""}
            </span>
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

        <a
          href={googleFlightsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/20 rounded-xl transition-all text-[10px] text-center flex items-center justify-center gap-1 hover:text-white"
        >
          <span>ℹ️ {lang === "zh" ? "線上比價預訂" : "Compare & Book online"}</span>
        </a>

        {/* On-Demand Subscribe Monitoring toggle */}
        {isActiveMonitored ? (
          <div className="w-full py-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/15 rounded-xl font-bold font-mono text-[10px] text-center flex items-center justify-center gap-1 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{lang === "zh" ? "線路監控活動中" : "Actively Monitored"}</span>
          </div>
        ) : (
          <button
            type="button"
            disabled={submittingSub}
            onClick={() => onSubscribe(fl)}
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
            <span className="text-[9.5px] text-slate-450 font-mono">
              ({voterMetas.length} {lang === "zh" ? "人投票" : "voted"})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
