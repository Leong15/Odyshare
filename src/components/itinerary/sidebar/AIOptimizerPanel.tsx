import React, { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { ItineraryItem } from "../../../types";
import { translations } from "../../../lib/translations";
import { Toast } from "../../common/Toast";
import { CollapsibleSection } from "../../common/CollapsibleSection";
import { useToast } from "../../../hooks/useToast";
import { apiClient } from "../../../lib/apiClient";

interface AIOptimizerPanelProps {
  lang: "en" | "zh";
  itineraries: ItineraryItem[];
  activeDay: number;
  onApplyAIOptimization?: (items: ItineraryItem[]) => void;
  onPostAISystemMessage?: (text: string) => void;
}

export default function AIOptimizerPanel({
  lang,
  itineraries,
  activeDay,
  onApplyAIOptimization,
  onPostAISystemMessage,
}: AIOptimizerPanelProps) {
  const t = translations[lang];

  const [prefInput, setPrefInput] = useState<string>("");
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [tspOptimizing, setTspOptimizing] = useState<boolean>(false);
  const { toast, showToast, closeToast } = useToast();

  const handleOptimize = async () => {
    if (optimizing) return;
    setOptimizing(true);
    try {
      const response = await apiClient.post("/api/ai/optimize-itinerary", {
        itineraries,
        preferences: prefInput,
        lang,
      });

      if (response.success && response.data) {
        const { optimizedItems, voiceSummary, audioBase64 } = response.data;

        // format items
        const formatted = optimizedItems.map((item: any, idx: number) => ({
          ...item,
          id: `item-${Date.now()}-${idx}`,
          votes: [],
          comments: [],
        }));

        if (onApplyAIOptimization) {
          onApplyAIOptimization(formatted);
        }

        if (voiceSummary) {
          window.dispatchEvent(
            new CustomEvent("playVoiceSummary", {
              detail: { voiceSummary, audioBase64 },
            })
          );
        }

        if (onPostAISystemMessage) {
          onPostAISystemMessage(
            lang === "zh"
              ? "🔮 智慧行程升級完畢！已成功根據您的團體旅行偏好與景點熱度重新優化！"
              : "🔮 Intelligent schedule overhaul complete! Restructured using Gemini model based on your vibes."
          );
        }
      } else {
        showToast(
          "error",
          lang === "zh" ? "優化失敗" : "Optimization Failed",
          lang === "zh" ? "升級行程時發生伺服器錯誤" : "A server error occurred during itinerary upgrade"
        );
      }
    } catch (err) {
      console.error(err);
      showToast(
        "error",
        lang === "zh" ? "優化失敗" : "Optimization Failed",
        lang === "zh" ? "升級行程時發生伺服器錯誤" : "A server error occurred during itinerary upgrade"
      );
    } finally {
      setOptimizing(false);
    }
  };

  const handleTSPOptimization = async () => {
    if (tspOptimizing) return;
    setTspOptimizing(true);
    try {
      const currentDayItems = itineraries.filter((i) => i.dayIndex === activeDay);
      if (currentDayItems.length < 2) {
        showToast(
          "warning",
          lang === "zh" ? "路徑優化提示" : "Route Notice",
          lang === "zh"
            ? "當天項目少於 2 個，無須進行 TSP 最短路徑排列！"
            : "Requires at least 2 items on the active day to calculate TSP route!"
        );
        return;
      }

      const response = await apiClient.post("/api/ai/optimize-tsp", {
        items: currentDayItems,
        lang,
      });

      if (response.success && response.data) {
        const { optimizedItems } = response.data;

        // Replace day items while retaining other days
        const otherDaysItems = itineraries.filter((i) => i.dayIndex !== activeDay);
        const combined = [...otherDaysItems, ...optimizedItems];

        if (onApplyAIOptimization) {
          onApplyAIOptimization(combined);
        }

        if (onPostAISystemMessage) {
          onPostAISystemMessage(
            lang === "zh"
              ? `🗺️ 第 ${activeDay + 1} 天 TSP 地理路徑優化完成！已成功按經緯度距離安排最短出行耗時。`
              : `🗺️ Day ${activeDay + 1} geographical TSP routing complete! Preserved coordinates sequence optimized.`
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTspOptimizing(false);
    }
  };

  const panelTitle = (
    <div className="flex items-center gap-1.5">
      <span className="p-0.5 px-1.5 bg-blue-500/15 text-blue-300 rounded border border-blue-500/25 text-[9px] font-mono font-bold leading-none flex items-center">
        {t.geminiEngine}
      </span>
      <h4 className="font-extrabold text-white text-xs leading-none">{t.optimizerTitle}</h4>
    </div>
  );

  return (
    <>
      <CollapsibleSection title={panelTitle} ariaLabel={lang === "zh" ? "Gemini 智慧行程優化器" : "Gemini Intelligent Schedule Optimizer"}>
        <p className="text-[10.5px] text-slate-400 leading-relaxed">
          {t.optimizerDesc}
        </p>
        <div className="space-y-1.5 text-xs">
          <label className="block text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            {t.groupVibe}
          </label>
          <input
            id="ai-preferences-input"
            type="text"
            value={prefInput}
            onChange={(e) => setPrefInput(e.target.value)}
            placeholder="e.g. Sushi crawl, cultural shrines..."
            className="w-full text-xs px-2.5 py-1.5 glass-input rounded-lg text-white font-medium"
          />
          <div className="flex gap-1">
            <button
              id="ai-optimize-btn"
              onClick={handleOptimize}
              disabled={optimizing}
              className="flex-1 py-1.5 glass-button-primary text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 animate-pulse-subtle"
            >
              {optimizing ? (
                <>
                  <RefreshCw size={12} className="animate-spin text-white" />
                  <span>{t.generatingPath}</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} className="text-blue-200" />
                  <span>{t.rebuildItinerary}</span>
                </>
              )}
            </button>

            <button
              id="ai-tsp-btn"
              type="button"
              onClick={handleTSPOptimization}
              disabled={tspOptimizing}
              className="py-1.5 px-3 bg-indigo-600/90 hover:bg-indigo-650 border border-indigo-500/10 text-white font-bold rounded-lg text-xs cursor-pointer transition-all shrink-0"
              title={
                lang === "zh"
                  ? "TSP 經緯度最短路徑排序"
                  : "Optimize geographical shortest paths"
              }
            >
              {tspOptimizing ? "..." : lang === "zh" ? "最短路徑" : "Shortest Route"}
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={closeToast}
        />
      )}
    </>
  );
}
