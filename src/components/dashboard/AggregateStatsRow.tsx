import React from "react";

interface AggregateStats {
  totalWorkspaces: number;
  uniqueParticipantsCount: number;
  totalBudgetSum: number;
  totalSpentSum: number;
  totalWaypointsSum: number;
}

interface AggregateStatsRowProps {
  aggregateStats: AggregateStats;
  lang: "zh" | "en";
}

export function AggregateStatsRow({ aggregateStats, lang }: AggregateStatsRowProps) {
  const stats = [
    {
      title: lang === "zh" ? "團隊專案總數" : "Total Workspaces",
      value: `${aggregateStats.totalWorkspaces} ${lang === "zh" ? "組" : "Trips"}`,
      desc: lang === "zh" ? "使用者參與的所有專案" : "Aggregated total environments",
      color: "text-blue-400"
    },
    {
      title: lang === "zh" ? "共同協作特工 peers" : "Unique Companions",
      value: `${aggregateStats.uniqueParticipantsCount} ${lang === "zh" ? "位" : "Users"}`,
      desc: lang === "zh" ? "擁有一對密鑰的參與者" : "Co-travelers across all teams",
      color: "text-teal-400"
    },
    {
      title: lang === "zh" ? "跨專案預算累計" : "Portfolio Budget Limit",
      value: `$${aggregateStats.totalBudgetSum.toLocaleString()}`,
      desc: lang === "zh" ? "跨國行程序預留上限總和" : "Aggregated total spending caps",
      color: "text-amber-400"
    },
    {
      title: lang === "zh" ? "跨專案已登錄支出" : "Portfolio Spent Sum",
      value: `$${aggregateStats.totalSpentSum.toLocaleString()}`,
      desc: lang === "zh" ? "全部團隊共同記帳之累計" : "Logged expenses across all trips",
      color: "text-indigo-400"
    },
    {
      title: lang === "zh" ? "累積規劃航點總數" : "Total Active Waypoints",
      value: `${aggregateStats.totalWaypointsSum} ${lang === "zh" ? "點" : "Pins"}`,
      desc: lang === "zh" ? "各計畫精細地圖所標註" : "Global calculated itinerary items",
      color: "text-rose-400",
      hideOnMobile: true
    }
  ];

  return (
    <div id="dashboard-aggregate-stats-row" className="grid grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-5 gap-4">
      {stats.map((stat, i) => (
        <div 
          key={i} 
          id={`aggregate-stat-card-${i}`}
          className={`bg-slate-900/45 border border-white/5 rounded-2xl p-4 space-y-1 ${stat.hideOnMobile ? 'hidden lg:block' : ''}`}
        >
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
            {stat.title}
          </span>
          <h4 className={`text-xl font-black ${stat.color} font-mono`}>{stat.value}</h4>
          <p className="text-xs text-slate-500 font-medium truncate leading-none mt-0.5">{stat.desc}</p>
        </div>
      ))}
    </div>
  );
}
