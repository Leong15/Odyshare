import React from "react";
import { ArrowRight, TrendingDown, ShieldCheck, RefreshCw } from "lucide-react";

interface FlightMonitoringPanelProps {
  flightSubscription: any;
  submittingSub: boolean;
  onUnsubscribe: () => Promise<void>;
  simulating: boolean;
  simPrice: string;
  setSimPrice: (val: string) => void;
  simStops: string;
  setSimStops: (val: string) => void;
  simTime: string;
  setSimTime: (val: string) => void;
  onSimulateCheck: () => Promise<void>;
  lang: "en" | "zh";
}

export function FlightMonitoringPanel({
  flightSubscription,
  submittingSub,
  onUnsubscribe,
  simulating,
  simPrice,
  setSimPrice,
  simStops,
  setSimStops,
  simTime,
  setSimTime,
  onSimulateCheck,
  lang,
}: FlightMonitoringPanelProps): React.ReactElement {
  if (!flightSubscription || !flightSubscription.isActive) {
    return (
      <div className="p-3 bg-white/3 border border-white/5 rounded-xl text-center text-xs text-slate-400 mb-5 animate-fadeIn">
        <span>
          {lang === "zh"
            ? "🔔 您尚未訂閱本趟旅程的航線監控。在下方航班卡片點擊「啟動線路監控」，即可鎖定基準線（Baseline）進行對時及低價通知！"
            : "No active flight monitoring subscription. Click 'Monitor Rate' on any card below to establish a price baseline and activate."}
        </span>
      </div>
    );
  }

  return (
    <div id="flight-monitoring-sandbox" className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 shadow-md space-y-4 mb-5 animate-fadeIn text-sm text-slate-300">
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
          onClick={onUnsubscribe}
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
                -{Math.round(((flightSubscription.baselinePrice - flightSubscription.currentPrice) / flightSubscription.baselinePrice) * 100)}%
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
              onClick={onSimulateCheck}
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
  );
}
