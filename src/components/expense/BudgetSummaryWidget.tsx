import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { translations } from "../../lib/translations";

interface BudgetSummaryWidgetProps {
  totalBudget: number;
  totalSpent: number;
  lang: "en" | "zh";
  onUpdateBudget?: (newBudget: number) => void;
}

export default function BudgetSummaryWidget({
  totalBudget,
  totalSpent,
  lang,
  onUpdateBudget,
}: BudgetSummaryWidgetProps) {
  const t = translations[lang];

  const [isBudgetCollapsed, setIsBudgetCollapsed] = useState<boolean>(false);
  const [editableBudget, setEditableBudget] = useState<number>(totalBudget);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsBudgetCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setEditableBudget(totalBudget);
  }, [totalBudget]);

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    setEditableBudget(val);
    if (onUpdateBudget && val > 0) {
      onUpdateBudget(val);
    }
  };

  const remainingBudget = editableBudget - totalSpent;
  const percentageSpent = Math.min((totalSpent / editableBudget) * 100, 100);

  return (
    <div className="glass-container rounded-2xl border border-white/10 shadow-lg animate-fadeIn overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsBudgetCollapsed(!isBudgetCollapsed)}
        className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/[0.04] transition select-none"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <ChevronRight
            size={16}
            className={`text-slate-400 transform transition-transform duration-200 shrink-0 ${
              isBudgetCollapsed ? "" : "rotate-90"
            }`}
          />
          <h3 className="font-extrabold text-white text-xs flex flex-col leading-tight truncate">
            <span>{t.tripBudgetTracking}</span>
            <span className="text-[10px] text-slate-400 font-normal truncate">
              {lang === "zh" ? "點擊展開預算與記帳統計" : "Interactive budget tracking limits"}
            </span>
          </h3>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 bg-slate-900/60 p-1 px-2 rounded-lg border border-white/5 shrink-0 ml-2"
        >
          <span className="text-[10px] font-bold text-slate-400 font-mono">Limit:</span>
          <input
            id="budget-limit-editor"
            type="number"
            value={editableBudget || ""}
            onChange={handleBudgetChange}
            className="w-16 bg-transparent border-0 font-extrabold text-blue-300 font-mono text-xs focus:ring-0 focus:outline-none p-0 text-right leading-none"
            placeholder="3000"
          />
        </div>
      </div>

      {/* Content */}
      {!isBudgetCollapsed && (
        <div className="p-4 space-y-4 animate-fadeIn text-left">
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4">
            <div>
              <span className="text-xs text-slate-400 block font-medium">
                {lang === "zh" ? "已勾選總支出" : "Checked Total"}
              </span>
              <span className="text-lg font-black text-white font-mono">${totalSpent.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">{t.remaining}</span>
              <span
                className={`text-lg font-black font-mono ${
                  remainingBudget < 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                ${remainingBudget.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="relative pt-1">
            <div className="overflow-hidden h-2 text-xs flex rounded-full bg-white/5 border border-white/5">
              <div
                style={{ width: `${percentageSpent}%` }}
                className={`flex flex-col text-center justify-center transition-all duration-500 rounded-full ${
                  percentageSpent > 90
                    ? "bg-rose-500"
                    : percentageSpent > 75
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
              <span>{percentageSpent.toFixed(0)}% {t.utilized}</span>
              {percentageSpent > 90 && <span className="text-rose-400 font-bold">{t.budgetAlert}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
